import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface User {
  id: string;
  pseudonym: string;
  email: string | null;
  did: string;
  role: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  pseudonymStableSince: string | null;
  status: string;
  createdAt: string;
}

interface OwnedIssuer {
  id: string;
  name: string;
  slug: string;
  verificationStatus: string;
}

interface AuthContextType {
  user: User | null;
  ownedIssuers: OwnedIssuer[];
  loading: boolean;
  login: (pseudonym: string, password: string) => Promise<void>;
  register: (pseudonym: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ownedIssuers, setOwnedIssuers] = useState<OwnedIssuer[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user || null);
      setOwnedIssuers(data.ownedIssuers || []);
    } catch {
      setUser(null);
      setOwnedIssuers([]);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (pseudonym: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudonym, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Login failed");
    }
    await refreshUser();
  };

  const register = async (pseudonym: string, password: string, email?: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudonym, password, email: email || undefined }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Registration failed");
    }
    await refreshUser();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOwnedIssuers([]);
  };

  return (
    <AuthContext.Provider value={{ user, ownedIssuers, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
