import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthSession } from "../types";

import { useAuthStore } from "./authStore";

const mockInvoke = invoke as unknown as ReturnType<typeof vi.fn>;

describe("useAuthStore", () => {
  const mockSession: AuthSession = {
    cookies: { session_id: "test-session" },
    user_id: "123",
    expires_at: Date.now() / 1000 + 3600,
  };

  beforeEach(() => {
    mockInvoke.mockClear();
    useAuthStore.setState({
      isAuthenticated: false,
      session: null,
    });
  });

  describe("login", () => {
    it("sets auth session via backend and updates store", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await useAuthStore.getState().login(mockSession);

      expect(mockInvoke).toHaveBeenCalledWith("set_auth_session", {
        session: mockSession,
      });
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.session).toEqual(mockSession);
    });
  });

  describe("logout", () => {
    beforeEach(() => {
      useAuthStore.setState({ isAuthenticated: true, session: mockSession });
    });

    it("logs out via backend and clears store", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      expect(mockInvoke).toHaveBeenCalledWith("logout");
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.session).toBeNull();
    });
  });

  describe("checkSession", () => {
    describe("with valid persisted session", () => {
      beforeEach(() => {
        useAuthStore.setState({ isAuthenticated: true, session: mockSession });
      });

      it("restores session when backend confirms it", async () => {
        mockInvoke.mockResolvedValue(mockSession);

        await useAuthStore.getState().checkSession();

        expect(mockInvoke).toHaveBeenCalledWith("check_auth_status");
        expect(mockInvoke).toHaveBeenCalledWith("set_auth_session", {
          session: mockSession,
        });
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.session).toEqual(mockSession);
      });

      it("keeps persisted session when backend returns null", async () => {
        let callCount = 0;
        mockInvoke.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(undefined);
          if (callCount === 2) return Promise.resolve(null);
          if (callCount === 3) return Promise.resolve(null);
          return Promise.resolve(undefined);
        });

        await useAuthStore.getState().checkSession();

        expect(mockInvoke).toHaveBeenCalledWith("set_auth_session", {
          session: mockSession,
        });
        expect(mockInvoke).toHaveBeenCalledWith("check_auth_status");
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.session).toEqual(mockSession);
      });
    });

    describe("with expired persisted session", () => {
      const expiredSession: AuthSession = {
        ...mockSession,
        expires_at: Date.now() / 1000 - 3600,
      };

      beforeEach(() => {
        useAuthStore.setState({
          isAuthenticated: true,
          session: expiredSession,
        });
      });

      it("clears auth state and calls logout", async () => {
        mockInvoke.mockResolvedValue(undefined);

        await useAuthStore.getState().checkSession();

        expect(mockInvoke).toHaveBeenCalledWith("logout");
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.session).toBeNull();
      });
    });

    describe("with no persisted session", () => {
      it("sets auth state when backend returns valid session", async () => {
        mockInvoke.mockResolvedValue(mockSession);

        await useAuthStore.getState().checkSession();

        expect(mockInvoke).toHaveBeenCalledWith("check_auth_status");
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.session).toEqual(mockSession);
      });

      it("keeps not authenticated when backend returns invalid session", async () => {
        mockInvoke.mockResolvedValue(null);

        await useAuthStore.getState().checkSession();

        expect(mockInvoke).toHaveBeenCalledWith("check_auth_status");
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.session).toBeNull();
      });

      it("clears auth state when backend session is expired", async () => {
        const expiredSession: AuthSession = {
          ...mockSession,
          expires_at: Date.now() / 1000 - 3600,
        };
        let callCount = 0;
        mockInvoke.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(expiredSession);
          if (callCount === 2) return Promise.resolve(undefined);
          return Promise.resolve(undefined);
        });

        await useAuthStore.getState().checkSession();

        expect(mockInvoke).toHaveBeenCalledWith("check_auth_status");
        expect(mockInvoke).toHaveBeenCalledWith("logout");
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.session).toBeNull();
      });
    });

    describe("error handling", () => {
      beforeEach(() => {
        useAuthStore.setState({ isAuthenticated: true, session: mockSession });
      });

      it("clears auth state on error", async () => {
        const error = new Error("Test error");
        mockInvoke.mockRejectedValue(error);

        await useAuthStore.getState().checkSession();

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.session).toBeNull();
      });
    });
  });
});
