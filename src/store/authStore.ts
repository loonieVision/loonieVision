import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AuthState, AuthSession } from "../types";

interface AuthStore extends AuthState {
  login: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      session: null,

      login: async (session: AuthSession) => {
        await invoke("set_auth_session", { session });
        set({
          isAuthenticated: true,
          session,
        });
      },

      logout: async () => {
        await invoke("logout");
        set({
          isAuthenticated: false,
          session: null,
        });
      },

      checkSession: async () => {
        try {
          // First check if we have a persisted session in the frontend
          const persistedSession = (useAuthStore.getState() as AuthStore).session;

          if (persistedSession) {
            // Check if session is expired
            const now = Date.now() / 1000;
            if (persistedSession.expires_at > now) {
              // Restore session to backend
              console.log("[AuthStore] Restoring persisted session to backend");
              await invoke("set_auth_session", { session: persistedSession });

              // Verify it was set
              const backendSession = await invoke<AuthSession | null>("check_auth_status");
              if (backendSession) {
                console.log("[AuthStore] Session restored successfully");
                set({
                  isAuthenticated: true,
                  session: persistedSession,
                });
                return;
              } else {
                console.warn("[AuthStore] Failed to restore session to backend");
              }
            } else {
              // Session expired, clear it
              console.log("[AuthStore] Persisted session expired");
              await invoke("logout");
              set({
                isAuthenticated: false,
                session: null,
              });
              return;
            }
          }

          // No persisted session, check backend directly
          const session = await invoke<AuthSession | null>("check_auth_status");
          if (session) {
            // Check if session is expired
            const now = Date.now() / 1000;
            if (session.expires_at > now) {
              set({
                isAuthenticated: true,
                session,
              });
            } else {
              // Session expired, clear it
              await invoke("logout");
              set({
                isAuthenticated: false,
                session: null,
              });
            }
          }
        } catch (error) {
          console.error("Failed to check session:", error);
          set({
            isAuthenticated: false,
            session: null,
          });
        }
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
