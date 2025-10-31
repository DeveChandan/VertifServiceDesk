import { useEffect, useRef } from "react";
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
import { UserManagement } from "./pages/admin/users";
import ProfilePage from "./pages/ProfilePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { ClientUserCreate } from "./pages/client/ClientUserCreate";
import ClientUserCreateTicketPage from "./pages/clientUser/create-ticket";
import ClientUserDashboard from "./pages/clientUser/dashboard";
import ClientUserManagement from "./pages/client/clientUserManagement";
import ClientUserTickets from "./pages/client/clientUserTickets";

// Extend Window interface for VANTA
declare global {
  interface Window {
    VANTA: any;
  }
}

function VANTABackground({ children }: { children: React.ReactNode }) {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);

  useEffect(() => {
    const initVanta = () => {
      if (window.VANTA && vantaRef.current) {
        // Destroy existing effect if any
        if (vantaEffect.current) {
          vantaEffect.current.destroy();
        }

        // Initialize VANTA BIRDS
        vantaEffect.current = window.VANTA.BIRDS({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          colorMode: "variance",
          backgroundColor: 0x0a0a0a,
          birdSize: 1.20,
          wingSpan: 15.00,
          speedLimit: 3.00,
          separation: 40.00,
          alignment: 15.00,
          cohesion: 25.00,
          quantity: 3.00,
        });
      }
    };

    // Check if scripts are already loaded
    const threeJsLoaded = document.querySelector('script[src*="three.js"]');
    const vantaLoaded = document.querySelector('script[src*="vanta"]');

    const loadScripts = () => {
      // Load Three.js if not already loaded
      if (!threeJsLoaded) {
        const threeScript = document.createElement('script');
        threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js';
        threeScript.onload = () => {
          // Load VANTA after Three.js is loaded
          if (!vantaLoaded) {
            const vantaScript = document.createElement('script');
            vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.birds.min.js';
            vantaScript.onload = initVanta;
            document.head.appendChild(vantaScript);
          } else {
            initVanta();
          }
        };
        document.head.appendChild(threeScript);
      } else if (!vantaLoaded) {
        // Three.js is loaded but VANTA is not
        const vantaScript = document.createElement('script');
        vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.birds.min.js';
        vantaScript.onload = initVanta;
        document.head.appendChild(vantaScript);
      } else {
        // Both scripts are already loaded
        initVanta();
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadScripts, 100);

    // Handle window resize
    const handleResize = () => {
      if (vantaEffect.current && typeof vantaEffect.current.onResize === 'function') {
        setTimeout(() => {
          vantaEffect.current.onResize();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (vantaEffect.current) {
        try {
          vantaEffect.current.destroy();
        } catch (error) {
          console.error('Error destroying VANTA effect:', error);
        }
      }
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      className="min-h-screen relative overflow-hidden bg-black"
    >
      {/* Very light overlay to ensure content readability */}
      <div className="absolute inset-0 bg-black/5" />
      
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <VANTABackground>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-card/80 backdrop-blur-sm z-20">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto p-6 relative z-10">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </VANTABackground>
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
  } else if (user?.role=== UserRole.CLIENT) {
    return <Redirect to="/client/dashboard" />;
  } else {
    return <Redirect to="/clientUser/dashboard" />;
  }
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
<Route path="/reset-password" component={ResetPasswordPage} />
      {/* All authenticated routes will now have VANTA background */}
{/*new logic for clientuser routes*/}

 <Route path="/clientUser/dashboard">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT_USER]}>
              <ClientUserDashboard />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

<Route path="/clientUser/create-ticket">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT_USER]}>
              <ClientUserCreateTicketPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
      <Route path="/clientUser/tickets">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT_USER]}>
              <ClientUserDashboard />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/clientUser/tickets/:id">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT_USER]}>
              <TicketDetailPage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/clientUser/profile">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT_USER]}>
              <ProfilePage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
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
 <Route path="/client/clientUserManagement">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT]}>
              <ClientUserManagement />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
      <Route path="/client/clientUserTickets/:userId">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT]}>
              <ClientUserTickets />
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
 <Route path="/client/create-user">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT]}>
              <ClientUserCreate />
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

      <Route path="/employee/profile">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.EMPLOYEE]}>
              <ProfilePage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/admin/profile">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <ProfilePage />
            </ProtectedRoute>
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/client/profile">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.CLIENT]}>
              <ProfilePage />
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

      <Route path="/admin/users">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <UserManagement />
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

      {/* Generic Ticket Detail Page - accessible by all authenticated roles with proper backend authorization */}
      <Route path="/ticket-detail/:id">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            {/* No specific role check here, as TicketDetailPage handles internal authorization */}
            <TicketDetailPage />
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
