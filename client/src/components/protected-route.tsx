import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { UserRole } from "@shared/schema";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      if (user.role === UserRole.ADMIN) {
        setLocation("/admin/dashboard");
      } else if (user.role === UserRole.EMPLOYEE) {
        setLocation("/employee/dashboard");
      } else {
        setLocation("/client/dashboard");
      }
    }
  }, [isAuthenticated, user, allowedRoles, setLocation]);

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
