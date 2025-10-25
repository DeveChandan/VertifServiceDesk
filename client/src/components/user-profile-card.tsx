// components/user-profile-card.tsx
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, Calendar, MapPin, Briefcase, Shield, User, Ticket } from "lucide-react";

export function UserProfileCard() {
  const { user } = useAuth();

  if (!user) return null;

  const getRoleIcon = () => {
    switch (user.role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'employee': return <Briefcase className="h-4 w-4" />;
      case 'client': return <Ticket className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = () => {
    switch (user.role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'employee': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'client': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  return (
    <Card>
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.profileImage} />
            <AvatarFallback className="text-lg">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">{user.name}</CardTitle>
        <div className="flex justify-center items-center gap-2 mt-2">
          {getRoleIcon()}
          <Badge variant="outline" className={`capitalize ${getRoleColor()}`}>
            {user.role}
          </Badge>
          <Badge variant={user.isActive ? "default" : "secondary"}>
            {user.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{user.email}</span>
        </div>
        
        {user.phone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{user.phone}</span>
          </div>
        )}
        
        {user.department && (
          <div className="flex items-center gap-3 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span>{user.department}</span>
          </div>
        )}
        
        {user.jobTitle && (
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{user.jobTitle}</span>
          </div>
        )}
        
        {user.employeeId && (
          <div className="flex items-center gap-3 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span>ID: {user.employeeId}</span>
          </div>
        )}
        
        {user.lastLoginAt && (
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Last login: {new Date(user.lastLoginAt).toLocaleDateString()}</span>
          </div>
        )}
        
        {user.createdAt && (
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Member since: {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}