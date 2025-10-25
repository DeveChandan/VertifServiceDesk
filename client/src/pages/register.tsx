import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser, UserRole, AuthResponse } from "@shared/schema";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Extend Window interface for VANTA
declare global {
  interface Window {
    VANTA: any;
  }
}

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: UserRole.CLIENT,
      phone: "",
      department: "",
      skills: [],
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      return await apiRequest<AuthResponse>("POST", "/api/auth/register", userData);
    },
    onSuccess: (data) => {
      login(data);
      toast({
        title: "Account created!",
        description: "Your account has been successfully created.",
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
        title: "Registration failed",
        description: error.message || "Unable to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertUser) => {
    registerMutation.mutate(data);
  };

  // VANTA birds animation setup
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
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black p-4"
    >
      {/* Light overlay for better readability */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Register Form */}
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center">
            {/* Vertifit Solutions Logo */}
            <img 
              src="https://vertifitsolutions.com/wp-content/uploads/2017/04/logo-8.png" 
              alt="Vertifit Solutions"
              className="h-16 w-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-white text-center">
              ServiceDesk Register
            </h1>
          </div>
        </div>

        <Card className="bg-background/95 backdrop-blur-md shadow-2xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Create Account
            </CardTitle>
            <CardDescription className="text-center">
              Register to access ServiceDesk Pro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          data-testid="input-name"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your@email.com"
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
                      <FormLabel>Password</FormLabel>
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
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger 
                            data-testid="select-role"
                            className="bg-background/80 border-border"
                          >
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UserRole.CLIENT}>Client</SelectItem>
                          <SelectItem value={UserRole.EMPLOYEE}>Employee</SelectItem>
                          <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setLocation("/login")}
                data-testid="link-login"
                className="text-primary hover:text-primary/80"
              >
                Already have an account? Sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
