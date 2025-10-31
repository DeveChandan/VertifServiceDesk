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

// Page imports
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

// ==================== COMPONENTS ====================

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function VANTABackground({ children }: { children: React.ReactNode }) {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);

  useEffect(() => {
    const initVanta = () => {
      if (window.VANTA && vantaRef.current) {
        if (vantaEffect.current) {
          vantaEffect.current.destroy();
        }

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

    const loadScripts = () => {
      const threeJsLoaded = document.querySelector('script[src*="three.js"]');
      const vantaLoaded = document.querySelector('script[src*="vanta"]');

      if (!threeJsLoaded) {
        const threeScript = document.createElement('script');
        threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js';
        threeScript.onload = () => {
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
        const vantaScript = document.createElement('script');
        vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.birds.min.js';
        vantaScript.onload = initVanta;
        document.head.appendChild(vantaScript);
      } else {
        initVanta();
      }
    };

    const timer = setTimeout(loadScripts, 100);

    const handleResize = () => {
      if (vantaEffect.current && typeof vantaEffect.current.onResize === 'function') {
        setTimeout(() => {
          vantaEffect.current.onResize();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);

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
    <div ref={vantaRef} className="min-h-screen relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-black/5" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <VANTABackground>
      <SidebarProvider style={style}>
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

// ==================== ROUTE COMPONENTS ====================

function HomeRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Role-based redirection
  const roleRoutes = {
    [UserRole.ADMIN]: "/admin/dashboard",
    [UserRole.EMPLOYEE]: "/employee/dashboard",
    [UserRole.CLIENT]: "/client/dashboard",
    [UserRole.CLIENT_USER]: "/clientUser/dashboard",
  };

  const redirectTo = roleRoutes[user?.role as UserRole] || "/login";
  return <Redirect to={redirectTo} />;
}

// Route configuration helper
interface RouteConfig {
  path: string;
  component: React.ComponentType;
  allowedRoles: UserRole[];
  layout?: boolean;
}

const protectedRoutes: RouteConfig[] = [
  // Client User Routes
  { path: "/clientUser/dashboard", component: ClientUserDashboard, allowedRoles: [UserRole.CLIENT_USER] },
  { path: "/clientUser/create-ticket", component: ClientUserCreateTicketPage, allowedRoles: [UserRole.CLIENT_USER] },
  { path: "/clientUser/tickets", component: ClientUserDashboard, allowedRoles: [UserRole.CLIENT_USER] },
  { path: "/clientUser/tickets/:id", component: TicketDetailPage, allowedRoles: [UserRole.CLIENT_USER] },
  { path: "/clientUser/profile", component: ProfilePage, allowedRoles: [UserRole.CLIENT_USER] },

  // Client Routes
  { path: "/client/dashboard", component: ClientDashboard, allowedRoles: [UserRole.CLIENT] },
  { path: "/client/clientUserManagement", component: ClientUserManagement, allowedRoles: [UserRole.CLIENT] },
  { path: "/client/clientUserTickets/:userId", component: ClientUserTickets, allowedRoles: [UserRole.CLIENT] },
  { path: "/client/create-ticket", component: CreateTicketPage, allowedRoles: [UserRole.CLIENT] },
  { path: "/client/create-user", component: ClientUserCreate, allowedRoles: [UserRole.CLIENT] },
  { path: "/client/tickets", component: ClientTicketsPage, allowedRoles: [UserRole.CLIENT] },
  { path: "/client/tickets/:id", component: TicketDetailPage, allowedRoles: [UserRole.CLIENT] },
  { path: "/client/profile", component: ProfilePage, allowedRoles: [UserRole.CLIENT] },

  // Employee Routes
  { path: "/employee/dashboard", component: EmployeeDashboard, allowedRoles: [UserRole.EMPLOYEE] },
  { path: "/employee/profile", component: ProfilePage, allowedRoles: [UserRole.EMPLOYEE] },
  { path: "/employee/tickets/:id", component: TicketDetailPage, allowedRoles: [UserRole.EMPLOYEE] },

  // Admin Routes
  { path: "/admin/dashboard", component: AdminDashboard, allowedRoles: [UserRole.ADMIN] },
  { path: "/admin/tickets", component: AdminTicketsPage, allowedRoles: [UserRole.ADMIN] },
  { path: "/admin/tickets/:id", component: TicketDetailPage, allowedRoles: [UserRole.ADMIN] },
  { path: "/admin/employees", component: EmployeesPage, allowedRoles: [UserRole.ADMIN] },
  { path: "/admin/users", component: UserManagement, allowedRoles: [UserRole.ADMIN] },
  { path: "/admin/clients", component: ClientsPage, allowedRoles: [UserRole.ADMIN] },
  { path: "/admin/analytics", component: AnalyticsPage, allowedRoles: [UserRole.ADMIN] },
  { path: "/admin/profile", component: ProfilePage, allowedRoles: [UserRole.ADMIN] },

  // Generic Routes
  { path: "/ticket-detail/:id", component: TicketDetailPage, allowedRoles: [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CLIENT, UserRole.CLIENT_USER] },
];

const publicRoutes = [
  { path: "/login", component: LoginPage },
  { path: "/register", component: RegisterPage },
  { path: "/reset-password", component: ResetPasswordPage },
];

// Route renderer component
function ProtectedRouteRenderer({ route }: { route: RouteConfig }) {
  const { isAuthenticated } = useAuth();
  const Component = route.component;

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  const content = (
    <ProtectedRoute allowedRoles={route.allowedRoles}>
      <Component />
    </ProtectedRoute>
  );

  return route.layout !== false ? (
    <AuthenticatedLayout>{content}</AuthenticatedLayout>
  ) : (
    content
  );
}

// ==================== ROUTER ====================

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen while auth is being validated
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Switch>
      {/* Root route */}
      <Route path="/" component={HomeRedirect} />

      {/* Public routes */}
      {publicRoutes.map(({ path, component: Component }) => (
        <Route key={path} path={path}>
          {isAuthenticated ? <HomeRedirect /> : <Component />}
        </Route>
      ))}

      {/* Protected routes */}
      {protectedRoutes.map((route) => (
        <Route key={route.path} path={route.path}>
          <ProtectedRouteRenderer route={route} />
        </Route>
      ))}

      {/* 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// ==================== MAIN APP ====================

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
