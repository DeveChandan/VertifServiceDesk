import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProtectedRoute } from "@/components/protected-route";
import { UserRole } from "@shared/schema";

import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ClientDashboard from "@/pages/client/dashboard";
import CreateTicketPage from "@/pages/client/create-ticket";
import ClientTicketsPage from "@/pages/client/tickets";
import EmployeeDashboard from "@/pages/employee/dashboard";
import AdminDashboard from "@/pages/admin/dashboard";
import EmployeesPage from "@/pages/admin/employees";
import ClientsPage from "@/pages/admin/clients";
import AdminTicketsPage from "@/pages/admin/tickets";
import AnalyticsPage from "@/pages/admin/analytics";
import TicketDetailPage from "@/pages/ticket-detail";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (user?.role === UserRole.ADMIN) {
    return <Redirect to="/admin/dashboard" />;
  } else if (user?.role === UserRole.EMPLOYEE) {
    return <Redirect to="/employee/dashboard" />;
  } else {
    return <Redirect to="/client/dashboard" />;
  }
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      <Route path="/client/dashboard">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT]}>
              <ClientDashboard />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/client/create-ticket">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT]}>
              <CreateTicketPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/client/tickets">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT]}>
              <ClientTicketsPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/client/tickets/:id">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT]}>
              <TicketDetailPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/employee/dashboard">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.EMPLOYEE]}>
              <EmployeeDashboard />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/employee/tickets/:id">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.EMPLOYEE]}>
              <TicketDetailPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/admin/dashboard">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AdminDashboard />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/admin/tickets">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AdminTicketsPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/admin/tickets/:id">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <TicketDetailPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/admin/employees">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <EmployeesPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/admin/clients">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <ClientsPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/admin/analytics">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AnalyticsPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
