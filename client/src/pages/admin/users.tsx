// components/user-management.tsx
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, UserRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, UserPlus, Copy, Mail, UserCheck, UserX, Phone, Calendar, MapPin, Briefcase, Shield } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
}

export function UserManagement() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserCredentials, setNewUserCredentials] = useState<{email: string; password: string} | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      return await apiRequest("POST", "/api/users", userData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      setNewUserCredentials({
        email: variables.email,
        password: variables.password
      });
      toast({
        title: "User created successfully",
        description: "New user account has been created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error.message || "Unable to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      if (isActive) {
        return await apiRequest("PATCH", `/api/users/${userId}/reactivate`, {});
      } else {
        return await apiRequest("DELETE", `/api/users/${userId}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: variables.isActive ? "User activated" : "User deactivated",
        description: `User has been ${variables.isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    },
  });

  const filteredUsers = users?.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.department?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateUser = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
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

  const getRoleBadge = (role: UserRole) => {
    const variants = {
      [UserRole.ADMIN]: "destructive",
      [UserRole.EMPLOYEE]: "default",
      [UserRole.CLIENT]: "secondary",
    } as const;

    return (
      <Badge variant={variants[role]} className="capitalize">
        {role}
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

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>User Management</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account. The user will receive these credentials to login.
                  </DialogDescription>
                </DialogHeader>
                <CreateUserForm 
                  onSubmit={handleCreateUser}
                  isSubmitting={createUserMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => handleViewUser(user)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profileImage} />
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
                    <TableCell onClick={() => handleViewUser(user)}>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell onClick={() => handleViewUser(user)}>
                      {user.department || "N/A"}
                    </TableCell>
                    <TableCell onClick={() => handleViewUser(user)}>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                          title="View details"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleUserStatusMutation.mutate({
                            userId: user._id,
                            isActive: !user.isActive
                          })}
                          disabled={toggleUserStatusMutation.isPending}
                          title={user.isActive ? "Deactivate user" : "Activate user"}
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4 text-destructive" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <UserDetails user={selectedUser} />
          )}
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={!!newUserCredentials} onOpenChange={() => setNewUserCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              Share these credentials with the user. They can use these to login to the system.
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

// User Details Component
function UserDetails({ user }: { user: User }) {
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield className="h-4 w-4" />;
      case UserRole.EMPLOYEE: return <Briefcase className="h-4 w-4" />;
      default: return <UserCheck className="h-4 w-4" />;
    }
  };

  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="employment">Employment</TabsTrigger>
        <TabsTrigger value="contact">Contact</TabsTrigger>
      </TabsList>
      
      <TabsContent value="personal" className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.profileImage} />
            <AvatarFallback className="text-lg">
              {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{user.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {getRoleIcon(user.role)}
              <Badge variant="outline" className="capitalize">
                {user.role}
              </Badge>
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{user.email}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Phone</label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{user.phone || "N/A"}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Department</label>
            <Badge variant="outline">{user.department || "N/A"}</Badge>
          </div>
          {user.dateOfBirth && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Date of Birth</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(user.dateOfBirth).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>

        {user.skills && user.skills.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Skills</label>
            <div className="flex flex-wrap gap-1">
              {user.skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="employment" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Employee ID</label>
            <div>{user.employeeId || "N/A"}</div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Job Title</label>
            <div>{user.jobTitle || "N/A"}</div>
          </div>
          {user.employmentDetails && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Hire Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{user.employmentDetails.hireDate ? new Date(user.employmentDetails.hireDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Employment Type</label>
                <Badge variant="outline" className="capitalize">
                  {user.employmentDetails.employmentType}
                </Badge>
              </div>
              {user.employmentDetails.salary && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Salary</label>
                  <div>${user.employmentDetails.salary.toLocaleString()}</div>
                </div>
              )}
              {user.employmentDetails.reportsTo && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Reports To</label>
                  <div>{user.employmentDetails.reportsTo}</div>
                </div>
              )}
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="contact" className="space-y-4">
        {user.address ? (
          <div className="space-y-4">
            <h4 className="font-medium">Address</h4>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div className="space-y-1">
                <label className="text-sm font-medium">Street</label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{user.address.street || "N/A"}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City</label>
                <div>{user.address.city || "N/A"}</div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">State</label>
                <div>{user.address.state || "N/A"}</div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">ZIP Code</label>
                <div>{user.address.zipCode || "N/A"}</div>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Country</label>
                <div>{user.address.country || "N/A"}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No address information available
          </div>
        )}

        {user.emergencyContact ? (
          <div className="space-y-4">
            <h4 className="font-medium">Emergency Contact</h4>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div className="space-y-1">
                <label className="text-sm font-medium">Contact Name</label>
                <div>{user.emergencyContact.name}</div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Relationship</label>
                <div>{user.emergencyContact.relationship}</div>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Phone</label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.emergencyContact.phone}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No emergency contact information available
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function CreateUserForm({ 
  onSubmit, 
  isSubmitting 
}: { 
  onSubmit: (data: CreateUserForm) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<CreateUserForm>({
    name: "",
    email: "",
    password: "",
    role: UserRole.CLIENT,
    department: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
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

      <div className="space-y-2">
        <label className="text-sm font-medium">Role</label>
        <select
          className="w-full p-2 border rounded-md"
          value={formData.role}
          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
        >
          <option value={UserRole.CLIENT}>Client</option>
          <option value={UserRole.EMPLOYEE}>Employee</option>
          <option value={UserRole.ADMIN}>Admin</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Department</label>
        <Input
          placeholder="IT Support"
          value={formData.department}
          onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}