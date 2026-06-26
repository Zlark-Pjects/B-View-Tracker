import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, User, setAuthTokenGetter } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("bview_token"));
  const [, setLocation] = useLocation();

  // Set the global getter so customFetch can attach the token
  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("bview_token"));
  }, []);

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: ["/api/auth/me"],
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (isError) {
      setToken(null);
      localStorage.removeItem("bview_token");
      setLocation("/login");
    }
  }, [isError, setLocation]);

  const login = (newToken: string, user: User) => {
    setToken(newToken);
    localStorage.setItem("bview_token", newToken);
    setLocation("/");
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("bview_token");
    setLocation("/login");
  };

  // Only show children when we're sure about auth state
  if (token && isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: user || null, token, login, logout, isLoading }}>
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
