// app/profile/page.tsx
import { useAuth } from "@/lib/auth-context";
import { ProfileForm } from "@/components/profile-form";
import { PasswordChangeForm } from "@/components/password-change-form";
import { UserProfileCard } from "@/components/user-profile-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, User, Lock, Ticket, Settings } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-semibold">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and personal information
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Sidebar - User Info */}
        <div className="lg:col-span-1 space-y-6">
          <UserProfileCard />
        </div>

        {/* Main Content - Forms */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="role-info" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PasswordChangeForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="role-info" className="space-y-6">
              <RoleSpecificInfo />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Role-specific information component
function RoleSpecificInfo() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      {user.role === 'admin' && <AdminRoleInfo />}
      {user.role === 'employee' && <EmployeeRoleInfo />}
      {user.role === 'client' && <ClientRoleInfo />}
    </div>
  );
}

function AdminRoleInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Administrator Access
        </CardTitle>
        <CardDescription>
          Your role as an administrator grants you full system access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">User Management</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Create and manage user accounts</li>
              <li>• Assign roles and permissions</li>
              <li>• Activate/deactivate users</li>
            </ul>
          </div>
          
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">Ticket Management</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View all system tickets</li>
              <li>• Assign tickets to employees</li>
              <li>• Monitor ticket progress</li>
            </ul>
          </div>
          
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">Analytics</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Access performance metrics</li>
              <li>• View employee statistics</li>
              <li>• Generate system reports</li>
            </ul>
          </div>
          
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">System Settings</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Configure system parameters</li>
              <li>• Manage departments</li>
              <li>• Oversee all operations</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeRoleInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Employee Access
        </CardTitle>
        <CardDescription>
          Your role as an employee allows you to manage assigned tickets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">Assigned Tickets</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View tickets assigned to you</li>
              <li>• Update ticket status</li>
              <li>• Add comments and attachments</li>
            </ul>
          </div>
          
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">Ticket Actions</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Mark tickets as in progress</li>
              <li>• Resolve completed tickets</li>
              <li>• Request additional information</li>
            </ul>
          </div>
          
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">Communication</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Communicate with clients</li>
              <li>• Collaborate with team members</li>
              <li>• Provide status updates</li>
            </ul>
          </div>
          
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">Workload Management</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Track your active tickets</li>
              <li>• Monitor completion rates</li>
              <li>• Manage your availability</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClientRoleInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Client Access
        </CardTitle>
        <CardDescription>
          Your role as a client allows you to create and track support tickets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">Ticket Creation</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Create new support tickets</li>
              <li>• Add detailed descriptions</li>
              <li>• Attach relevant files</li>
            </ul>
          </div>
          
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">Ticket Tracking</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View all your submitted tickets</li>
              <li>• Track ticket status and progress</li>
              <li>• Receive status notifications</li>
            </ul>
          </div>
          
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">Communication</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Communicate with support staff</li>
              <li>• Add comments to your tickets</li>
              <li>• Provide additional information</li>
            </ul>
          </div>
          
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold">History</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View your ticket history</li>
              <li>• Access resolved tickets</li>
              <li>• Review past interactions</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}