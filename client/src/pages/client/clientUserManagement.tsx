// components/client-user-management.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, 
  UserPlus, 
  Copy, 
  Mail, 
  UserCheck, 
  UserX, 
  Phone, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Shield,
  Download,
  RefreshCw,
  Activity,
  Users,
  UserCog,
  MoreVertical,
  ListPlus
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types based on your API response
interface ClientUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  department: string;
  skills: string[];
  jobTitle: string;
  employeeId: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  emergencyContact: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };
  employmentDetails: {
    employmentType?: string;
    startDate?: string;
    endDate?: string;
    salary?: number;
    designation?: string;
  };
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  companyCode: string;
  clientUserDetails?: {
    accessLevel: 'basic' | 'standard' | 'admin';
  };
  ticketCount?: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ClientUsersResponse {
  users: ClientUser[];
  pagination: PaginationInfo;
}

interface ClientUserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByAccessLevel: {
    basic: number;
    standard: number;
    admin: number;
  };
  recentUsers: number;
  usersWithRecentLogin: number;
}

interface CreateClientUserForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  jobTitle: string;
  department: string;
  accessLevel: 'basic' | 'standard' | 'admin';
}

interface FilterState {
  search: string;
  status: string;
  accessLevel: string;
  sortBy: string;
  sortOrder: string;
}

export default function ClientUserManagement() {
   const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    accessLevel: "",
    sortBy: "createdAt",
    sortOrder: "desc"
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClientUser | null>(null);
  const [newUserCredentials, setNewUserCredentials] = useState<{email: string; password: string} | null>(null);

  // Fetch client users with filters and pagination
  const { 
    data: usersData, 
    isLoading, 
    error,
    refetch 
  } = useQuery<ClientUsersResponse>({
    queryKey: ["/api/users/client-user", filters, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.accessLevel && { accessLevel: filters.accessLevel }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });
      
      return await apiRequest("GET", `/api/users/client-user?${params}`);
    },
  });

  // Fetch client user statistics
  const { data: stats } = useQuery<ClientUserStats>({
    queryKey: ["/api/users/client-user/stats"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/users/client-user/stats");
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateClientUserForm) => {
      return await apiRequest("POST", "/api/users/client-user", userData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/client-user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/client-user/stats"] });
      setIsCreateDialogOpen(false);
      setNewUserCredentials({
        email: variables.email,
        password: variables.password
      });
      toast({
        title: "Client user created successfully",
        description: "New client user account has been created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create client user",
        description: error.message || "Unable to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const endpoint = isActive 
        ? `/api/users/client-user/${userId}/reactivate`
        : `/api/users/client-user/${userId}/deactivate`;
      
      return await apiRequest("PATCH", endpoint, {});
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/client-user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/client-user/stats"] });
      toast({
        title: variables.isActive ? "User activated" : "User deactivated",
        description: `User has been ${variables.isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Operation failed",
        description: error.message || "Unable to update user status.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<ClientUser> }) => {
      return await apiRequest("PATCH", `/api/users/client-user/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/client-user"] });
      setIsViewDialogOpen(false);
      toast({
        title: "User updated successfully",
        description: "User details have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Unable to update user details.",
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? '' : value }));
    setCurrentPage(1);
  };

  const handleCreateUser = (data: CreateClientUserForm) => {
    createUserMutation.mutate(data);
  };

  const handleViewUser = (user: ClientUser) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const handleUpdateUser = (userId: string, data: Partial<ClientUser>) => {
    updateUserMutation.mutate({ userId, data });
  };

  const copyCredentials = () => {
    if (newUserCredentials) {
      const text = `Email: ${newUserCredentials.email}\nPassword: ${newUserCredentials.password}`;
      navigator.clipboard.writeText(text);
      toast({
        title: "Credentials copied",
        description: "User credentials copied to clipboard.",
      });
      setNewUserCredentials(null);
    }
  };

  const getAccessLevelBadge = (accessLevel: string) => {
    const variants = {
      basic: "secondary",
      standard: "default",
      admin: "destructive"
    } as const;

    return (
      <Badge variant={variants[accessLevel as keyof typeof variants]} className="capitalize">
        {accessLevel}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? "default" : "secondary"}>
        {isActive ? "Active" : "Inactive"}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["/api/users/client-user/stats"] });
  };

  const exportUsers = () => {
    // Simple CSV export implementation
    if (!usersData?.users) return;
    
    const headers = ['Name', 'Email', 'Phone', 'Job Title', 'Department', 'Access Level', 'Status', 'Last Login'];
    const csvData = usersData.users.map(user => [
      user.name,
      user.email,
      user.phone,
      user.jobTitle,
      user.department,
      user.clientUserDetails?.accessLevel || 'basic',
      user.isActive ? 'Active' : 'Inactive',
      user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export completed",
      description: "Client users data exported successfully.",
    });
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Failed to load client users. Please check your authentication.</p>
              <Button onClick={() => refetch()} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl text-white font-bold tracking-tight">Client User Management</h1>
          <p className="text-muted-foreground">
            Manage client users and their access permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportUsers} disabled={!usersData?.users}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
               <Button onClick={() => setLocation('/client/create-user')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Client User
          </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Client User</DialogTitle>
                <DialogDescription>
                  Create a new client user account with specific access permissions.
                </DialogDescription>
              </DialogHeader>
              <CreateClientUserForm 
                onSubmit={handleCreateUser}
                isSubmitting={createUserMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<Users className="h-4 w-4" />}
            description="All client users"
          />
          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            icon={<UserCheck className="h-4 w-4" />}
            description="Currently active"
          />
          <StatCard
            title="Recent Logins"
            value={stats.usersWithRecentLogin}
            icon={<Activity className="h-4 w-4" />}
            description="Last 7 days"
          />
          <StatCard
            title="New Users"
            value={stats.recentUsers}
            icon={<UserCog className="h-4 w-4" />}
            description="Last 30 days"
          />
        </div>
      )}

      {/* Access Level Distribution */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.usersByAccessLevel.basic}</div>
                  <div className="text-sm text-muted-foreground">Basic Access</div>
                </div>
                <Badge variant="secondary">Basic</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.usersByAccessLevel.standard}</div>
                  <div className="text-sm text-muted-foreground">Standard Access</div>
                </div>
                <Badge variant="default">Standard</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.usersByAccessLevel.admin}</div>
                  <div className="text-sm text-muted-foreground">Admin Access</div>
                </div>
                <Badge variant="destructive">Admin</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Client Users</CardTitle>
            <div className="text-sm text-muted-foreground">
              {usersData?.pagination.totalUsers || 0} users found
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or job title..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.accessLevel || 'all'} onValueChange={(value) => handleFilterChange('accessLevel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Access Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Access</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="lastLoginAt">Last Login</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : usersData?.users && usersData.users.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData.users.map((user) => (
                    <TableRow key={user._id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{user.phone}</div>
                          <div className="text-muted-foreground">{user.companyCode}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{user.jobTitle}</div>
                          <div className="text-muted-foreground">{user.department}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getAccessLevelBadge(user.clientUserDetails?.accessLevel || 'basic')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.ticketCount !== undefined ? user.ticketCount : 0}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.isActive)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/client/clientUserTickets/${user._id}`)}
                            title="View Tickets"
                          >
                            <ListPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                            title="View details"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => toggleUserStatusMutation.mutate({
                                  userId: user._id,
                                  isActive: !user.isActive
                                })}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'} User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {usersData.pagination && usersData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {usersData.pagination.currentPage} of {usersData.pagination.totalPages}
                    {' '}({usersData.pagination.totalUsers} total users)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(usersData.pagination.currentPage - 1)}
                      disabled={!usersData.pagination.hasPrev}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(usersData.pagination.currentPage + 1)}
                      disabled={!usersData.pagination.hasNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No client users found</p>
              <p className="text-sm">Try adjusting your search filters or create a new user</p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)} 
                className="mt-4"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Client User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <ClientUserDetails 
              user={selectedUser} 
              onUpdate={handleUpdateUser}
              isUpdating={updateUserMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={!!newUserCredentials} onOpenChange={() => setNewUserCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              Share these credentials with the client user. They can use these to login to the system.
            </DialogDescription>
          </DialogHeader>
          {newUserCredentials && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Email:</span>
                    <code className="text-sm">{newUserCredentials.email}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Password:</span>
                    <code className="text-sm">{newUserCredentials.password}</code>
                  </div>
                </div>
              </div>
              <Button onClick={copyCredentials} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy Credentials
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, description }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  description: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Client User Details Component
function ClientUserDetails({ 
  user, 
  onUpdate, 
  isUpdating 
}: { 
  user: ClientUser; 
  onUpdate: (userId: string, data: Partial<ClientUser>) => void;
  isUpdating: boolean;
}) {
  const [editData, setEditData] = useState<Partial<ClientUser>>({});

  const handleSave = () => {
    onUpdate(user._id, editData);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="employment">Employment</TabsTrigger>
        <TabsTrigger value="contact">Contact</TabsTrigger>
      </TabsList>
      
      <TabsContent value="personal" className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{user.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize">
                {user.role}
              </Badge>
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Phone</label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Employee ID</label>
              <div className="mt-1">{user.employeeId}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Code</label>
              <div className="mt-1">{user.companyCode}</div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Department</label>
              <div className="mt-1">{user.department}</div>
            </div>

            <div>
              <label className="text-sm font-medium">Last Login</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never logged in'}</span>
              </div>
            </div>
          </div>
        </div>

        {user.skills && user.skills.length > 0 && (
          <div>
            <label className="text-sm font-medium">Skills</label>
            <div className="flex flex-wrap gap-1 mt-2">
              {user.skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="employment" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium">Job Title</label>
            <div className="mt-1">{user.jobTitle}</div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Department</label>
            <div className="mt-1">{user.department}</div>
          </div>

          {user.employmentDetails && (
            <>
              <div>
                <label className="text-sm font-medium">Employment Type</label>
                <div className="mt-1 capitalize">{user.employmentDetails.employmentType || 'N/A'}</div>
              </div>
              
              {user.employmentDetails.startDate && (
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(user.employmentDetails.startDate)}</span>
                  </div>
                </div>
              )}

              {user.employmentDetails.salary && (
                <div>
                  <label className="text-sm font-medium">Salary</label>
                  <div className="mt-1">${user.employmentDetails.salary.toLocaleString()}</div>
                </div>
              )}

              {user.employmentDetails.designation && (
                <div>
                  <label className="text-sm font-medium">Designation</label>
                  <div className="mt-1">{user.employmentDetails.designation}</div>
                </div>
              )}
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="contact" className="space-y-6">
        {user.address && (
          <div>
            <h4 className="font-medium mb-4">Address Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <label className="text-sm font-medium">Street</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{user.address.street || "N/A"}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">City</label>
                <div className="mt-1">{user.address.city || "N/A"}</div>
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <div className="mt-1">{user.address.state || "N/A"}</div>
              </div>
              <div>
                <label className="text-sm font-medium">ZIP Code</label>
                <div className="mt-1">{user.address.zipCode || "N/A"}</div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Country</label>
                <div className="mt-1">{user.address.country || "N/A"}</div>
              </div>
            </div>
          </div>
        )}

        {user.emergencyContact && user.emergencyContact.name && (
          <div>
            <h4 className="font-medium mb-4">Emergency Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <label className="text-sm font-medium">Contact Name</label>
                <div className="mt-1">{user.emergencyContact.name}</div>
              </div>
              <div>
                <label className="text-sm font-medium">Relationship</label>
                <div className="mt-1">{user.emergencyContact.relationship}</div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Phone</label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.emergencyContact.phone}</span>
                </div>
              </div>
              {user.emergencyContact.email && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user.emergencyContact.email}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// Create Client User Form
function CreateClientUserForm({ 
  onSubmit, 
  isSubmitting 
}: { 
  onSubmit: (data: CreateClientUserForm) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<CreateClientUserForm>({
    name: "",
    email: "",
    password: "",
    phone: "",
    jobTitle: "Support Engineer",
    department: "Clients",
    accessLevel: "basic"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Full Name</label>
        <Input
          placeholder="John Doe"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Phone</label>
        <Input
          type="tel"
          placeholder="+1-555-123-4567"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
          />
          <Button type="button" variant="outline" onClick={generatePassword}>
            Generate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Job Title</label>
          <Input
            placeholder="Support Engineer"
            value={formData.jobTitle}
            onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Department</label>
          <Input
            placeholder="Clients"
            value={formData.department}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Access Level</label>
        <Select 
          value={formData.accessLevel} 
          onValueChange={(value: 'basic' | 'standard' | 'admin') => 
            setFormData(prev => ({ ...prev, accessLevel: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Client User"}
      </Button>
    </form>
  );
}