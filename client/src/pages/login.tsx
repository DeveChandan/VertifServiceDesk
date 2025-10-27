import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginCredentials, UserRole } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AuthResponse } from "@shared/schema";
import { Loader2, Mail } from "lucide-react";

// Extend Window interface for VANTA
declare global {
  interface Window {
    VANTA: any;
  }
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Initialize the form
  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      return await apiRequest<AuthResponse>("POST", "/api/auth/login", credentials);
    },
    onSuccess: (data) => {
      login(data);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });

      if (data.user.role === UserRole.ADMIN) {
        setLocation("/admin/dashboard");
      } else if (data.user.role === UserRole.EMPLOYEE) {
        setLocation("/employee/dashboard");
      } else {
        setLocation("/client/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/auth/forgot-password", { email });
    },
    onSuccess: (data) => {
      setForgotPasswordOpen(false);
      setResetEmail("");
      toast({
        title: "Reset mail sent",
        description: data.message || "Check your mail for password reset instructions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send reset mail",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Handle submit
  const onSubmit = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    if (!resetEmail) {
      toast({
        title: "Mail required",
        description: "Please enter your Mail address.",
        variant: "destructive",
      });
      return;
    }

    forgotPasswordMutation.mutate(resetEmail);
  };

  // VANTA birds animation setup
  useEffect(() => {
    const initVanta = () => {
      if (window.VANTA && vantaRef.current) {
        // Destroy existing effect if any
        if (vantaEffect.current) {
          vantaEffect.current.destroy();
        }

        // Initialize VANTA BIRDS with your exact configuration
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
          backgroundColor: 0x0,
          birdSize: 1.50,
          wingSpan: 20.00,
          speedLimit: 4.00,
          separation: 50.00,
          alignment: 20.00,
          cohesion: 30.00,
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
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black"
    >
      {/* Reduced opacity overlay - NO BLUR to see the animation */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md p-4">
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center">
            {/* Vertifit Solutions Logo */}
            <img 
              src="https://vertifitsolutions.com/wp-content/uploads/2017/04/logo-8.png" 
              alt="Vertifit Solutions"
              className="h-16 w-auto mb-4"
            />
          </div>
        </div>

        <Card className="bg-background/95 backdrop-blur-md shadow-2xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Vertif ServiceDesk Login
            </CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Mail</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your@mail.com"
                          type="email"
                          data-testid="input-email"
                          className="bg-background/80 border-border"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="••••••••"
                          type="password"
                          data-testid="input-password"
                          className="bg-background/80 border-border"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center space-y-2">
              <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="link"
                    className="text-primary hover:text-primary/80 text-sm"
                  >
                    Forgot your password?
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Reset Your Password
                    </DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="your@mail.com"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full"
                    />
                    <Button
                      onClick={handleForgotPassword}
                      disabled={forgotPasswordMutation.isPending}
                      className="w-full"
                    >
                      {forgotPasswordMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Sending reset link...
                        </>
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              {/*
              <div>
                <Button
                  variant="link"
                  onClick={() => setLocation("/register")}
                  data-testid="link-register"
                  className="text-primary hover:text-primary/80"
                >
                  Don't have an account? Register
                </Button>
              </div>
              */}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
