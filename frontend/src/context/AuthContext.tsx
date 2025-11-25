import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from "react";
import { authService, type User, getStoredUser } from "@/services/authService";
import { STORAGE, getToken } from "@/services/api";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthContextType = {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { email: string; password: string; full_name?: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getTokenExpMs(): number | null {
  const raw = localStorage.getItem(STORAGE.TOKEN_EXP);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function msUntilExpiry(): number | null {
  const expMs = getTokenExpMs();
  if (!expMs) return null;
  const delta = expMs - Date.now();
  return delta > 0 ? delta : 0;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const expiryTimer = useRef<number | null>(null);

  const clearExpiryTimer = () => {
    if (expiryTimer.current) {
      window.clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
  };
  const logout = useCallback(() => {
    authService.logout(); // clears storage
    setUser(null);
    setTokenState(null);
    setStatus("unauthenticated");
    // cross-tab logout ping
    localStorage.setItem("tc-auth-logout", String(Date.now()));
    window.dispatchEvent(new Event("tc-auth-logout"));
  }, []);

  const scheduleAutoLogout = useCallback(() => {
    clearExpiryTimer();
    const ms = msUntilExpiry();
    if (ms == null) return;
    expiryTimer.current = window.setTimeout(() => logout(), Math.max(1000, ms + 1000));
  }, [logout]);

  const setAuthed = (u: User | null, t: string | null) => {
    setUser(u);
    setTokenState(t);
    scheduleAutoLogout();
  };

  // initial load
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      setStatus("loading");
      const t = getToken();
      if (!t) {
        setStatus("unauthenticated");
        return;
      }
      const cached = getStoredUser();
      if (cached) {
        setUser(cached);
        setStatus("authenticated");
      }
      try {
        const me = await authService.me();
        if (!cancelled) {
          setAuthed(me, t);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) logout();
      }
    };
    boot();
    return () => { cancelled = true; clearExpiryTimer(); };
  }, [logout, scheduleAutoLogout]);

  // cross-tab listeners
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tc-auth-logout") {
        logout();
      }
      if (e.key === STORAGE.TOKEN) {
        // Another tab logged in / changed token — setToken() triggers this naturally
        const t = getToken();
        if (t) {
          authService.me().then(me => {
            setAuthed(me, t);
            setStatus("authenticated");
          }).catch(() => logout());
        } else {
          logout();
        }
      }
    };
    window.addEventListener("storage", onStorage);
    const sameTabLogout = () => logout();
    window.addEventListener("tc-auth-logout", sameTabLogout as any);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tc-auth-logout", sameTabLogout as any);
    };
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setStatus("loading");
    try {
      const { user: me } = await authService.login(email, password);
      setAuthed(me ?? null, getToken());
      setStatus("authenticated");
    } catch (e: any) {
      setStatus("unauthenticated");  // <-- important
      throw (e instanceof Error ? e : new Error(e?.message || "Login failed"));
    }
  }, []);

  const signup = useCallback(async (payload: { email: string; password: string; full_name?: string }) => {
    setStatus("loading");
    try {
      const { user: me } = await authService.signup(payload);
      setAuthed(me ?? null, getToken());
      setStatus("authenticated");
    } catch (e: any) {
      setStatus("unauthenticated");  // <-- important
      throw (e instanceof Error ? e : new Error(e?.message || "Sign up failed"));
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const t = getToken();
    if (!t) return logout();
    const me = await authService.me();
    setAuthed(me, t);
  }, [logout]);

  const value = useMemo<AuthContextType>(() => ({
    status, user, token, login, signup, logout, refreshMe
  }), [status, user, token, login, signup, logout, refreshMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
