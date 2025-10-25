import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTicketSchema, InsertTicket, TicketPriority, TicketCategory, TicketStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Upload, X, Eye, Loader2, Building } from "lucide-react";
import { useState, useEffect } from "react";

interface PendingFile {
  name: string;
  file: File;
  localUrl: string;
}

export default function CreateTicketPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const form = useForm<InsertTicket & { department?: string }>({
    resolver: zodResolver(insertTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: TicketPriority.MEDIUM,
      category: TicketCategory.OTHER,
      status: TicketStatus.OPEN,
      clientId: user?._id || "",
      attachments: [],
      department: user?.department || "Production",
    },
  });

  // Update department when user data is available
  useEffect(() => {
    if (user?.department) {
      form.setValue("department", user.department);
    }
  }, [user, form]);

  // Mutation for uploading files - matches your backend endpoint
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file); // Your backend expects "file" field, not "attachments"
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        // Note: Your backend doesn't seem to require authentication for uploads
      });

      console.log("Upload response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result; // Your backend returns { message: "File uploaded successfully", fileUrl: "/uploads/filename" }
    }
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { 
      ticketData: InsertTicket & { department?: string }; 
      files: File[] 
    }) => {
      let fileUrls: string[] = [];

      // Upload files first if any - one by one since your backend handles single files
      if (data.files.length > 0) {
        setUploadingFiles(new Set(data.files.map(f => f.name)));
        try {
          const uploadPromises = data.files.map(file => 
            uploadFileMutation.mutateAsync(file)
          );
          const uploadResults = await Promise.all(uploadPromises);
          fileUrls = uploadResults.map(result => result.fileUrl);
        } finally {
          setUploadingFiles(new Set());
        }
      }

      // Then create ticket - your backend expects attachments as array of URLs
      const ticketPayload = {
        ...data.ticketData,
        attachments: fileUrls, // Your backend expects array of file URLs
        department: data.ticketData.department || user?.department || "Production",
      };

      console.log("Creating ticket with payload:", ticketPayload);

      return await apiRequest("POST", "/api/tickets", ticketPayload);
    },
    onSuccess: (data) => {
      // Clean up all local URLs
      pendingFiles.forEach(file => {
        URL.revokeObjectURL(file.localUrl);
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/my-tickets"] });
      toast({
        title: "Ticket created successfully",
        description: `Ticket ${data.ticketNumber} has been created.`,
      });
      setLocation("/client/dashboard");
    },
    onError: (error: any) => {
      console.error("Ticket creation error:", error);
      toast({
        title: "Failed to create ticket",
        description: error.message || "Unable to create ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertTicket & { department?: string }) => {
    console.log("Form submitted with data:", data);
    createTicketMutation.mutate({ 
      ticketData: data, 
      files: pendingFiles.map(f => f.file) 
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (pendingFiles.length + newFiles.length > 5) {
      toast({
        title: "Too many files",
        description: "Maximum 5 files allowed per ticket.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    // Add files to pending files with local URLs for preview only
    const newPendingFiles: PendingFile[] = newFiles.map(file => ({
      name: file.name,
      file: file,
      localUrl: URL.createObjectURL(file)
    }));

    setPendingFiles(prev => [...prev, ...newPendingFiles]);
    
    // Clear the file input
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    const fileToRemove = pendingFiles[index];
    
    // Clean up the local URL
    URL.revokeObjectURL(fileToRemove.localUrl);
    
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setUploadingFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileToRemove.name);
      return newSet;
    });
  };

  const viewFilePreview = (localUrl: string) => {
    window.open(localUrl, "_blank");
  };

  const isUploading = (fileName: string) => {
    return uploadingFiles.has(fileName);
  };

  const isAnyFileUploading = uploadingFiles.size > 0;
  const isSubmitting = createTicketMutation.isPending;

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
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

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/client/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">Create Ticket</h1>
          <p className="text-muted-foreground mt-1">
            Submit a new support request
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
          <CardDescription>
            Provide detailed information about your issue to help us assist you better
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of the issue"
                        data-testid="input-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed description of the issue, including steps to reproduce..."
                        className="min-h-32 resize-none"
                        data-testid="input-description"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide as much detail as possible to help us resolve your issue
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
                          <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
                          <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={TicketCategory.HARDWARE}>Hardware</SelectItem>
                          <SelectItem value={TicketCategory.SOFTWARE}>Software</SelectItem>
                          <SelectItem value={TicketCategory.NETWORK}>Network</SelectItem>
                          <SelectItem value={TicketCategory.OTHER}>Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Department Field */}
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[
                          "Production",
                          "Maintenance",
                          "Quality",
                          "Store",
                          "HR",
                          "Finance",
                          "Dispatch",
                        ].map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              {dept}
                              {dept === user?.department && " (Your Department)"}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {user?.department 
                        ? `Your department is ${user.department}. You can change it if needed.`
                        : "Select the department this ticket relates to."
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Attachments Section */}
              <FormItem>
                <FormLabel>Attachments</FormLabel>
                <FormControl>
                  <div className="border-2 border-dashed border-input rounded-lg p-6 text-center hover:bg-accent/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      data-testid="input-file"
                      disabled={isSubmitting || isAnyFileUploading}
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.log,.zip,.rar"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {isAnyFileUploading ? "Uploading files..." : "Click to upload files"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Maximum 5 files • 10MB per file • Files will be uploaded when ticket is created
                      </p>
                    </label>
                  </div>
                </FormControl>
                
                {pendingFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">
                      Selected files ({pendingFiles.length}/5)
                    </p>
                    {pendingFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isUploading(file.name) ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          ) : (
                            <span className="text-lg">{getFileIcon(file.name)}</span>
                          )}
                          <span 
                            className={`text-sm truncate ${
                              isUploading(file.name) ? 'text-muted-foreground' : ''
                            }`}
                            title={file.name}
                          >
                            {file.name}
                            {isUploading(file.name) && ' (Uploading...)'}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(file.file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {!isUploading(file.name) && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => viewFilePreview(file.localUrl)}
                                className="h-8 w-8"
                                title="Preview file"
                                disabled={isSubmitting}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removePendingFile(index)}
                                className="h-8 w-8 text-destructive hover:text-destructive/90"
                                title="Remove file"
                                disabled={isSubmitting || isAnyFileUploading}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FormItem>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || isAnyFileUploading}
                  data-testid="button-submit"
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isAnyFileUploading ? "Uploading files..." : "Creating ticket..."}
                    </>
                  ) : (
                    "Create Ticket"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Clean up all local URLs when canceling
                    pendingFiles.forEach(file => {
                      URL.revokeObjectURL(file.localUrl);
                    });
                    setLocation("/client/dashboard");
                  }}
                  data-testid="button-cancel"
                  disabled={isSubmitting || isAnyFileUploading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
