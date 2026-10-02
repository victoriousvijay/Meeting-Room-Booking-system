"use client";

// Who is logged in. Restores the session on page load and drops it when the
// server says the token is no longer valid.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SESSION_EXPIRED_EVENT, api, tokenStore } from "./api";
import type { AuthResponse, Me } from "./types";

type AuthState = { status: "loading" } | { status: "anonymous" } | { status: "authenticated"; user: Me };

type AuthContextValue = {
  state: AuthState;
  signIn: (session: AuthResponse) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let ignore = false;
    api.me().then(
      (user) => !ignore && setState({ status: "authenticated", user }),
      () => !ignore && setState({ status: "anonymous" }),
    );
    const onExpired = () => setState({ status: "anonymous" });
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      ignore = true;
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    };
  }, []);

  const signIn = useCallback((session: AuthResponse) => {
    tokenStore.set(session.token);
    setState({ status: "authenticated", user: session.user });
  }, []);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setState({ status: "anonymous" });
  }, []);

  return <AuthContext.Provider value={{ state, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** The logged-in user. Only for pages inside the app area, which requires a login. */
export function useUser(): Me {
  const { state } = useAuth();
  if (state.status !== "authenticated") throw new Error("useUser called without a logged-in user");
  return state.user;
}
