import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Ticket, Comment, TicketStatus } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useRef } from "react";
import { ArrowLeft, Send, Paperclip, Eye, Download, X, Upload, Loader2, Mail, Phone, Building } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserRole } from "@shared/schema";

interface PendingCommentFile {
  name: string;
  file: File;
  localUrl: string;
}

// Extended Comment type to include attachments
interface CommentWithAttachments extends Comment {
  attachments?: string[];
}

export default function TicketDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [newStatus, setNewStatus] = useState<TicketStatus | null>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [commentAttachments, setCommentAttachments] = useState<PendingCommentFile[]>([]);
  const [uploadingCommentFiles, setUploadingCommentFiles] = useState<Set<string>>(new Set());
  const [assigneesDialogOpen, setAssigneesDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticketId = params.id;

  const { data: ticket, isLoading: ticketLoading } = useQuery<Ticket>({
    queryKey: ["/api/tickets", ticketId],
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<CommentWithAttachments[]>({
    queryKey: ["/api/tickets", ticketId, "comments"],
  });

  const assignedEmployees = ticket?.assignedEmployees || [];

  const employeeDetailsQueries = useQueries({
    queries: assignedEmployees.map(employee => {
      return {
        queryKey: ['/api/users', employee.employeeId],
        queryFn: () => apiRequest('GET', `/api/users/${employee.employeeId}`),
        enabled: !!employee.employeeId,
      }
    })
  })

  // Check if current user can access this ticket
  const canAccessTicket = () => {
    if (!user || !ticket) return false;
    
    // Admin and employees can access all tickets
    if (user.role === UserRole.ADMIN || user.role === UserRole.EMPLOYEE) {
      return true;
    }
    
    // Clients and Client Users can only access tickets within their company code
    if (user.role === UserRole.CLIENT || user.role === UserRole.CLIENT_USER) {
      return ticket.companyCode === user.companyCode;
    }
    
    return false;
  };



  // File upload mutation for comment attachments
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    }
  });

  // Enhanced comment mutation with proper attachment handling
  const addCommentMutation = useMutation({
    mutationFn: async (data: { content: string; attachments?: File[] }) => {
      let fileUrls: string[] = [];

      // Upload files first if any
      if (data.attachments && data.attachments.length > 0) {
        setUploadingCommentFiles(new Set(data.attachments.map(f => f.name)));
        try {
          const uploadPromises = data.attachments.map(file => 
            uploadFileMutation.mutateAsync(file)
          );
          const uploadResults = await Promise.all(uploadPromises);
          fileUrls = uploadResults.map(result => result.fileUrl);
        } finally {
          setUploadingCommentFiles(new Set());
        }
      }

      // Then create comment with attachment URLs
      const commentData = {
        content: data.content,
        attachments: fileUrls,
      };

      console.log("Sending comment data:", commentData);

      return await apiRequest("POST", `/api/tickets/${ticketId}/comments`, commentData);
    },
    onSuccess: (data) => {
      console.log("Comment created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "comments"] });
      setComment("");
      setCommentAttachments([]);
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Comment creation error:", error);
      toast({
        title: "Failed to add comment",
        description: error.message || "Unable to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: TicketStatus) => {
      return await apiRequest("PATCH", `/api/tickets/${ticketId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/my-tickets"] });
      setNewStatus(null);
      toast({
        title: "Status updated",
        description: "Ticket status has been updated successfully.",
      });
    },
  });

  const handleGoBack = () => {
    if (user?.role === UserRole.ADMIN) {
      setLocation("/admin/tickets");
    } else if (user?.role === UserRole.EMPLOYEE) {
      setLocation("/employee/dashboard");
    } else if (user?.role === UserRole.CLIENT) { 
      setLocation("/client/tickets");
    } else if (user?.role === UserRole.CLIENT_USER) {  
      setLocation("/clientUser/tickets");
    } else { 
      setLocation("/"); 
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) {
      return '🖼';
    } else if (['pdf'].includes(ext || '')) {
      return '📄';
    } else if (['doc', 'docx'].includes(ext || '')) {
      return '📝';
    } else if (['xls', 'xlsx'].includes(ext || '')) {
      return '📊';
    } else if (['txt', 'log'].includes(ext || '')) {
      return '📃';
    } else {
      return '📎';
    }
  };

  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'file';
    } catch {
      return 'file';
    }
  };

  const handleViewAttachment = (url: string) => {
    setSelectedAttachment(url);
  };

  const handleDownloadAttachment = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenAllAttachments = () => {
    setAttachmentDialogOpen(true);
  };

  // Comment attachment handlers
  const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    
    // Validate files
    for (const file of newFiles) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit.`,
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
    }

    // Check total files limit
    if (commentAttachments.length + newFiles.length > 5) {
      toast({
        title: "Too many files",
        description: "Maximum 5 files allowed per comment.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    // Add files to pending files with local URLs for preview only
    const newPendingFiles: PendingCommentFile[] = newFiles.map(file => ({
      name: file.name,
      file: file,
      localUrl: URL.createObjectURL(file)
    }));

    setCommentAttachments(prev => [...prev, ...newPendingFiles]);
    
    // Clear the file input
    e.target.value = "";
  };

  const removeCommentAttachment = (index: number) => {
    const fileToRemove = commentAttachments[index];
    
    // Clean up the local URL
    URL.revokeObjectURL(fileToRemove.localUrl);
    
    setCommentAttachments(prev => prev.filter((_, i) => i !== index));
    setUploadingCommentFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileToRemove.name);
      return newSet;
    });
  };

  const viewCommentFilePreview = (localUrl: string) => {
    window.open(localUrl, "_blank");
  };

  const isCommentFileUploading = (fileName: string) => {
    return uploadingCommentFiles.has(fileName);
  };

  const isAnyCommentFileUploading = uploadingCommentFiles.size > 0;

  const handleAddComment = () => {
    if (comment.trim() || commentAttachments.length > 0) {
      addCommentMutation.mutate({
        content: comment,
        attachments: commentAttachments.map(f => f.file)
      });
    }
  };

  if (ticketLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return <div>Ticket not found</div>;
  }

  // Check if user can access this ticket
  if (!canAccessTicket()) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Access Denied</h1>
            <p className="text-muted-foreground mt-1">
              You don't have permission to view this ticket.
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
              <p className="text-muted-foreground mb-4">
                This ticket belongs to a different client. You can only view tickets from your own organization.
              </p>
              <Button onClick={handleGoBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tickets
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleGoBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl text-white font-semibold">Ticket #{ticket.ticketNumber}</h1>
            <StatusBadge status={ticket.status} />
          </div>
          <p className="text-muted-foreground mt-1">{ticket.title}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap mb-6">{ticket.description}</p>
              
              {/* Enhanced Attachments Section */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium">Attachments ({ticket.attachments.length})</h4>
                    {ticket.attachments.length > 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenAllAttachments}
                      >
                        View All
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ticket.attachments.slice(0, 4).map((attachment, index) => {
                      const filename = getFileNameFromUrl(attachment);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-lg">{getFileIcon(filename)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" title={filename}>
                                {filename}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {attachment.length > 30 ? `${attachment.substring(0, 30)}...` : attachment}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewAttachment(attachment)}
                              className="h-8 w-8"
                              title="View file"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadAttachment(attachment, filename)}
                              className="h-8 w-8"
                              title="Download file"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {ticket.attachments.length > 4 && (
                      <div className="flex items-center justify-center p-3 border rounded-lg bg-muted/20">
                        <Button
                          variant="ghost"
                          onClick={handleOpenAllAttachments}
                          className="text-sm"
                        >
                          +{ticket.attachments.length - 4} more files
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {commentsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment._id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {comment.userName ? getInitials(comment.userName) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{comment.userName}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {comment.userRole}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        
                        {/* Comment Attachments Display */}
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {comment.attachments.map((attachment, index) => {
                              const filename = getFileNameFromUrl(attachment);
                              return (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 border rounded-md bg-muted/20 text-xs max-w-md"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-sm">{getFileIcon(filename)}</span>
                                    <span className="truncate" title={filename}>
                                      {filename}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleViewAttachment(attachment)}
                                      className="h-6 w-6"
                                      title="View file"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDownloadAttachment(attachment, filename)}
                                      className="h-6 w-6"
                                      title="Download file"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet
                </p>
              )}

              <div className="pt-4 border-t">
                {/* Comment Attachments Preview */}
                {commentAttachments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    <p className="text-sm font-medium">Attachments to upload:</p>
                    {commentAttachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-md bg-muted/20"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {isCommentFileUploading(file.name) ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          ) : (
                            <span className="text-lg">{getFileIcon(file.name)}</span>
                          )}
                          <span 
                            className={`text-sm truncate ${
                              isCommentFileUploading(file.name) ? 'text-muted-foreground' : ''
                            }`}
                            title={file.name}
                          >
                            {file.name}
                            {isCommentFileUploading(file.name) && ' (Uploading...)'}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(file.file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {!isCommentFileUploading(file.name) && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => viewCommentFilePreview(file.localUrl)}
                                className="h-6 w-6"
                                title="Preview file"
                                disabled={addCommentMutation.isPending}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCommentAttachment(index)}
                                className="h-6 w-6 text-destructive hover:text-destructive/90"
                                title="Remove file"
                                disabled={addCommentMutation.isPending || isAnyCommentFileUploading}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mb-3 min-h-24"
                  data-testid="input-comment"
                  disabled={addCommentMutation.isPending}
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleCommentFileChange}
                      multiple
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.log,.zip,.rar"
                      disabled={addCommentMutation.isPending || isAnyCommentFileUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={addCommentMutation.isPending || isAnyCommentFileUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add Attachment
                    </Button>
                    {commentAttachments.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {commentAttachments.length} file{commentAttachments.length !== 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleAddComment}
                    disabled={(!comment.trim() && commentAttachments.length === 0) || addCommentMutation.isPending || isAnyCommentFileUploading}
                    data-testid="button-add-comment"
                  >
                    {addCommentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {isAnyCommentFileUploading ? "Uploading..." : "Posting..."}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Post Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Priority</p>
                <PriorityBadge priority={ticket.priority} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Category</p>
                <p className="text-sm font-medium capitalize">{ticket.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <StatusBadge status={ticket.status} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Client</p>
                <p className="text-sm font-medium">{ticket.clientName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">CompanyCode</p>
                <p className="text-sm font-medium">{ticket.companyCode}</p>
              </div>
             
{ticket.assignedEmployeeNames && ticket.assignedEmployeeNames.length > 0 && (
  <div>
    <p className="text-sm text-muted-foreground mb-2">Assigned To ({ticket.assignedEmployeeNames.length})</p>
    <div className="flex flex-wrap gap-2">
      {ticket.assignedEmployees && ticket.assignedEmployees.slice(0, 3).map((assignedEmployee, index) => {
        const employeeDetails = employeeDetailsQueries[index]?.data;

        return (
          <div
            key={index}
            className="group relative"
          >
            <div className="flex items-center space-x-2 bg-green-600 border border-blue-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-blue-500 transition-colors">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {assignedEmployee.employeeName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{assignedEmployee.employeeName}</span>
              <Eye className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            {/* Employee Details Tooltip */}
            {employeeDetails && (
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-green-600  border border-gray-900 rounded-lg shadow-lg z-50 p-4 min-w-64">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-black text-lg font-medium">
                    {employeeDetails.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{employeeDetails.name}</h4>
                    <p className="text-sm text-gray-900">{employeeDetails.jobTitle || "Support Engineer"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-900" />
                    <span>{employeeDetails.email}</span>
                  </div>
                  {employeeDetails.phone && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-900" />
                      <span>{employeeDetails.phone}</span>
                    </div>
                  )}
                  {employeeDetails.department && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Building className="h-4 w-4 text-gray-900" />
                      <span>{employeeDetails.department}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
      {ticket.assignedEmployeeNames.length > 3 && (
        <button onClick={() => setAssigneesDialogOpen(true)} className="text-pink-600 hover:text-blue-800 text-sm font-medium underline">
          View all {ticket.assignedEmployeeNames.length} assignees
        </button>
      )}
    </div>
  </div>
)}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created</p>
                <p className="text-sm font-medium">
                  {ticket.createdAt
                    ? new Date(ticket.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : "N/A"}
                </p>
              </div>
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Attachments</p>
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {ticket.attachments.length} file{ticket.attachments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {(user?.role === UserRole.EMPLOYEE || user?.role === UserRole.ADMIN) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={newStatus || ticket.status}
                  onValueChange={(value) => setNewStatus(value as TicketStatus)}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                    <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
                    <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                    <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => newStatus && updateStatusMutation.mutate(newStatus)}
                  disabled={!newStatus || newStatus === ticket.status || updateStatusMutation.isPending}
                  className="w-full"
                  data-testid="button-update-status"
                >
                  {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Attachment View Dialog */}
      <Dialog open={!!selectedAttachment} onOpenChange={() => setSelectedAttachment(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              {selectedAttachment ? getFileNameFromUrl(selectedAttachment) : 'Attachment'}
            </DialogTitle>
            <DialogDescription>
              Viewing attachment from Ticket #{ticket.ticketNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0">
            {selectedAttachment && (
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0 border rounded-lg bg-muted/20">
                  {selectedAttachment.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                    <img
                      src={selectedAttachment}
                      alt={getFileNameFromUrl(selectedAttachment)}
                      className="w-full h-full object-contain max-h-[60vh]"
                    />
                  ) : selectedAttachment.match(/\.pdf$/i) ? (
                    <iframe
                      src={selectedAttachment}
                      className="w-full h-full min-h-[60vh] border-0"
                      title={getFileNameFromUrl(selectedAttachment)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Paperclip className="h-16 w-16 mb-4" />
                      <p className="text-lg mb-2">File Preview Not Available</p>
                      <p className="text-sm">Please download the file to view its contents</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => handleDownloadAttachment(selectedAttachment, getFileNameFromUrl(selectedAttachment))}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download File
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center pt-4 mt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {getFileNameFromUrl(selectedAttachment)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDownloadAttachment(selectedAttachment, getFileNameFromUrl(selectedAttachment))}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      onClick={() => setSelectedAttachment(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* All Attachments Dialog */}
      <Dialog open={attachmentDialogOpen} onOpenChange={setAttachmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              All Attachments - Ticket #{ticket.ticketNumber}
            </DialogTitle>
            <DialogDescription>
              {ticket.attachments?.length} file{ticket.attachments?.length !== 1 ? 's' : ''} attached to this ticket
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {ticket.attachments && ticket.attachments.map((attachment, index) => {
              const filename = getFileNameFromUrl(attachment);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg">{getFileIcon(filename)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={filename}>
                        {filename}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" title={attachment}>
                        {attachment}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewAttachment(attachment)}
                      className="h-8 w-8"
                      title="View file"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownloadAttachment(attachment, filename)}
                      className="h-8 w-8"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setAttachmentDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Assignees Dialog */}
      <Dialog open={assigneesDialogOpen} onOpenChange={setAssigneesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>All Assignees</DialogTitle>
            <DialogDescription>
              {assignedEmployees.length} people are assigned to this ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto p-4">
            {employeeDetailsQueries.map((query, index) => {
              const employeeDetails = query.data;
              const assignedEmployee = assignedEmployees[index];

              if (query.isLoading) {
                return <Skeleton key={index} className="h-12 w-full" />
              }

              if (!employeeDetails) {
                return (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded-lg">
                    <div className="w-8 h-8 bg-gray-500 rounded-full" />
                    <span className="text-sm font-medium text-muted-foreground">Error loading details for {assignedEmployee.employeeName}</span>
                  </div>
                )
              }

              return (
                <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-black text-sm font-medium">
                    {employeeDetails.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{employeeDetails.name}</p>
                    <p className="text-xs text-muted-foreground">{employeeDetails.email}</p>
                    {employeeDetails.phone && <p className="text-xs text-muted-foreground">{employeeDetails.phone}</p>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setAssigneesDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
