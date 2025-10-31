import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Shield, Mail, Phone, Building, Users, BarChart3 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Updated validation schema with optional companyCode
const clientUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  companyCode: z.string().optional(), // ✅ Added optional companyCode
  clientUserDetails: z.object({
    permissions: z.array(z.string()).default([]),
    accessLevel: z.enum(["basic", "standard", "admin"]).default("basic"),
    isPrimaryContact: z.boolean().default(false)
  })
});

type ClientUserFormData = z.infer<typeof clientUserSchema>;

interface ClientUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  employeeId: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  clientUserDetails: {
    permissions: string[];
    accessLevel: 'basic' | 'standard' | 'admin';
    isPrimaryContact: boolean;
  };
}

interface ClientStats {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    recentUsers: number;
    usersByAccessLevel: {
      basic: number;
      standard: number;
      admin: number;
    };
  };
  clientInfo: {
    companyName: string;
    companyCode: string;
  };
}

// Available permissions
const PERMISSION_OPTIONS = [
  { id: "read_projects", label: "View Projects", description: "Can view all projects" },
  { id: "create_tickets", label: "Create Tickets", description: "Can create support tickets" },
  { id: "view_reports", label: "View Reports", description: "Can access reports and analytics" },
  { id: "manage_assets", label: "Manage Assets", description: "Can manage company assets" },
  { id: "view_billing", label: "View Billing", description: "Can view billing information" },
  { id: "export_data", label: "Export Data", description: "Can export data and reports" },
];

export function ClientUserCreate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current user to get company code
  const { data: currentUser } = useQuery({
    queryKey: ['/api/users/me'],
  });

  // Fetch client dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<ClientStats>({
    queryKey: ['/api/client/dashboard/stats'],
  });

  // Fetch recent client users
  const { data: recentUsers, isLoading: usersLoading } = useQuery<{ users: ClientUser[] }>({
    queryKey: ['/api/users/client-user', { limit: 5 }],
  });

  const form = useForm<ClientUserFormData>({
    resolver: zodResolver(clientUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      jobTitle: "",
      companyCode: "", // ✅ Initialize companyCode
      clientUserDetails: {
        permissions: ["read_projects", "create_tickets"],
        accessLevel: "basic",
        isPrimaryContact: false
      }
    }
  });

  // Create client user mutation
  const createClientUserMutation = useMutation({
    mutationFn: async (userData: ClientUserFormData) => {
      const res = await apiRequest("POST", "/api/users/client-user", userData);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/client-user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/dashboard/stats'] });
      form.reset();
      toast({
        title: "Team Member Created",
        description: "New team member has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create team member",
        description: error.message || "Unable to create team member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchAccessLevel = form.watch("clientUserDetails.accessLevel");

  // Set default permissions based on access level
  React.useEffect(() => {
    const currentPermissions = form.getValues("clientUserDetails.permissions");
    let defaultPermissions: string[] = [];

    switch (watchAccessLevel) {
      case "basic":
        defaultPermissions = ["read_projects", "create_tickets"];
        break;
      case "standard":
        defaultPermissions = ["read_projects", "create_tickets", "view_reports", "manage_assets"];
        break;
      case "admin":
        defaultPermissions = PERMISSION_OPTIONS.map(perm => perm.id);
        break;
    }

    // Only update if permissions are different from current
    if (JSON.stringify(currentPermissions.sort()) !== JSON.stringify(defaultPermissions.sort())) {
      form.setValue("clientUserDetails.permissions", defaultPermissions);
    }
  }, [watchAccessLevel, form]);

  const onSubmit = async (data: ClientUserFormData) => {
    setIsSubmitting(true);
    
    // If company code is available from stats, use it instead of manual input
    const submitData = {
      ...data,
      companyCode: stats?.clientInfo?.companyCode || data.companyCode
    };
    
    createClientUserMutation.mutate(submitData);
    setIsSubmitting(false);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const currentPermissions = form.getValues("clientUserDetails.permissions");
    
    if (checked) {
      form.setValue("clientUserDetails.permissions", [...currentPermissions, permissionId]);
    } else {
      form.setValue("clientUserDetails.permissions", currentPermissions.filter(id => id !== permissionId));
    }
  };

  const selectAllPermissions = () => {
    form.setValue("clientUserDetails.permissions", PERMISSION_OPTIONS.map(perm => perm.id));
  };

  const clearAllPermissions = () => {
    form.setValue("clientUserDetails.permissions", []);
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'standard': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if we need to show manual company code input
  const showCompanyCodeInput = !stats?.clientInfo?.companyCode && !currentUser?.companyCode;

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl text-white font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage your team members and their access levels
          </p>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>
          Back to Dashboard
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Team Members</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.userStats.totalUsers || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserPlus className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.userStats.activeUsers || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recent (30d)</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.userStats.recentUsers || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admin Users</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.userStats.usersByAccessLevel.admin || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create User Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Team Member
              </CardTitle>
              <CardDescription>
                Fill in the details for the new team member. They will receive an email with login instructions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Company Info - WITH CONDITIONAL INPUT */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">
                          {stats?.clientInfo?.companyName || currentUser?.company || 'Your Organization'}
                        </h3>

                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          Company Code:
                          {stats?.clientInfo?.companyCode || currentUser?.companyCode ? (
                            // ✅ Show badge if company code exists
                            <Badge variant="secondary">
                              {stats?.clientInfo?.companyCode || currentUser?.companyCode}
                            </Badge>
                          ) : (
                            // 📝 Otherwise show manual input field
                            <FormField
                              control={form.control}
                              name="companyCode"
                              render={({ field }) => (
                                <FormItem className="w-40">
                                  <FormControl>
                                    <Input 
                                      placeholder="Enter Company Code" 
                                      {...field}
                                      className="h-7 text-sm"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          {showCompanyCodeInput 
                            ? "Please enter your company code to add team members"
                            : "Team members will automatically be added to your organization"
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="user@company.com" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="+1 (555) 123-4567" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Project Manager" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Access Level */}
                  <FormField
                    control={form.control}
                    name="clientUserDetails.accessLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Access Level
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select access level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="basic">
                              <div className="flex flex-col">
                                <span>Basic</span>
                                <span className="text-xs text-muted-foreground">
                                  View projects and create tickets
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="standard">
                              <div className="flex flex-col">
                                <span>Standard</span>
                                <span className="text-xs text-muted-foreground">
                                  Basic + reports and asset management
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex flex-col">
                                <span>Administrator</span>
                                <span className="text-xs text-muted-foreground">
                                  Full access within your organization
                                </span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the appropriate access level for this team member
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Permissions */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel>Permissions</FormLabel>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions}>
                          Select All
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={clearAllPermissions}>
                          Clear All
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PERMISSION_OPTIONS.map((permission) => (
                        <div key={permission.id} className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                          <Checkbox
                            checked={form.watch("clientUserDetails.permissions").includes(permission.id)}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(permission.id, checked as boolean)
                            }
                          />
                          <div className="space-y-1 leading-none">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {permission.label}
                            </label>
                            <p className="text-sm text-muted-foreground">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Selected Permissions Badges */}
                    <div className="flex flex-wrap gap-2">
                      {form.watch("clientUserDetails.permissions").map((permissionId) => {
                        const permission = PERMISSION_OPTIONS.find(p => p.id === permissionId);
                        return permission ? (
                          <Badge key={permissionId} variant="secondary">
                            {permission.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Primary Contact */}
                  <FormField
                    control={form.control}
                    name="clientUserDetails.isPrimaryContact"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Set as Primary Contact
                          </FormLabel>
                          <FormDescription>
                            This user will be the main point of contact for support and communications
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting || createClientUserMutation.isPending || (showCompanyCodeInput && !form.watch('companyCode'))}
                      className="min-w-32"
                    >
                      {(isSubmitting || createClientUserMutation.isPending) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create Team Member
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                      disabled={isSubmitting || createClientUserMutation.isPending}
                    >
                      Reset Form
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Recent Users Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Team Members
              </CardTitle>
              <CardDescription>
                Recently added team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentUsers?.users && recentUsers.users.length > 0 ? (
                <div className="space-y-4">
                  {recentUsers.users.slice(0, 5).map((user) => (
                    <div key={user._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={`text-xs ${getAccessLevelColor(user.clientUserDetails.accessLevel)}`}
                          >
                            {user.clientUserDetails.accessLevel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No team members yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Access Level Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Access Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 bg-muted rounded animate-pulse w-20" />
                      <div className="h-4 bg-muted rounded animate-pulse w-8" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats?.userStats.usersByAccessLevel || {}).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${
                          level === 'basic' ? 'bg-blue-500' :
                          level === 'standard' ? 'bg-green-500' : 'bg-purple-500'
                        }`} />
                        <span className="text-sm font-medium capitalize">{level}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}