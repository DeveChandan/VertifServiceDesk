import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchParams] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast({
        title: "Invalid reset link",
        description: "No reset token found in the URL.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      return await apiRequest("POST", "/api/auth/reset-password", data);
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      toast({
        title: "Password reset successful",
        description: data.message || "Your password has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleResetPassword = () => {
    if (!token) {
      toast({
        title: "Invalid reset link",
        description: "Please use the reset link from your email.",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Password Reset Successful!</CardTitle>
            <CardDescription>
              Your password has been updated successfully. You can now log in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setLocation("/login")}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <Button
            variant="ghost"
            onClick={() => setLocation("/login")}
            className="w-fit p-0 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least 6 characters long.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={handleResetPassword}
            disabled={resetPasswordMutation.isPending}
            className="w-full"
          >
            {resetPasswordMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}