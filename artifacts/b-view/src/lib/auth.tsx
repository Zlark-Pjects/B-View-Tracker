import { createContext, useContext, ReactNode } from "react";
import { useAuth as useClerkAuth, useClerk } from "@clerk/react";
import { useGetMe, type User } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: User | null;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const { signOut } = useClerk();

  const { data: user, isLoading: userLoading } = useGetMe({
    query: {
      queryKey: ["/api/auth/me"],
      enabled: !!isSignedIn,
      retry: false,
    },
  });

  const logout = () => {
    signOut();
  };

  const isLoading = !clerkLoaded || (!!isSignedIn && userLoading);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: user ?? null, logout, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
