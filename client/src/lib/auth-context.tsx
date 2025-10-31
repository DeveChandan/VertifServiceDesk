import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, AuthResponse } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (response: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean; // Add loading state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Track loading state

  useEffect(() => {
    const validateToken = async () => {
      try {
        setIsLoading(true);
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        console.log('🔄 AuthProvider: Validating token on app load...');
        console.log('Stored token exists:', !!storedToken);
        console.log('Stored user exists:', !!storedUser);

        if (!storedToken || !storedUser) {
          console.log('❌ No stored token or user found');
          setUser(null);
          setToken(null);
          return;
        }

        // Basic validation before making API call
        if (storedUser === "undefined" || storedUser === "null") {
          console.log('❌ Invalid user data in storage');
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setToken(null);
          return;
        }

        let parsedUser: User;
        try {
          parsedUser = JSON.parse(storedUser);
        } catch (parseError) {
          console.log('❌ Failed to parse user data:', parseError);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setToken(null);
          return;
        }

        // First, set the token and user from localStorage immediately
        // This prevents flash of login page while validating
        setToken(storedToken);
        setUser(parsedUser);

        // Then validate with the server
        console.log('🔐 Making validation request to /api/users/me...');
        const res = await fetch("/api/users/me", {
          headers: {
            "Authorization": `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const fetchedUser = await res.json();
          console.log('✅ Token validation successful:', fetchedUser.email);
          setUser(fetchedUser); // Update with fresh user data
          localStorage.setItem("user", JSON.stringify(fetchedUser));
        } else {
          // Token is invalid or expired on the backend
          console.warn("❌ Token validation failed. Status:", res.status);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        console.error("⚠️ Error during token validation:", error);
        // Don't clear storage on network errors, keep the stored values
        // This prevents logout due to temporary network issues
        console.log('🔄 Keeping stored auth data due to network error');
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, []);

  const login = (response: AuthResponse) => {
    console.log('🔐 Login called with:', response.user.email);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem("token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
  };

  const logout = () => {
    console.log('🚪 Logout called');
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
   isLoading, // ✅ Include in context value
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
