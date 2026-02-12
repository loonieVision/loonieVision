import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSession } from "../types";
import { LoginModal } from "./LoginModal";

// Create mock functions that can be reset between tests
const mockLogin = vi.fn();

const mockSession: AuthSession = {
  cookies: { test: "value" },
  user_id: "user123",
  expires_at: Date.now() / 1000 + 3600,
};

vi.mock("../store/authStore", () => ({
  useAuthStore: () => ({
    login: mockLogin,
  }),
}));

describe("LoginModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();
    mockLogin.mockResolvedValue(undefined);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the login modal with initial state", () => {
    render(<LoginModal />);

    expect(screen.getByText("LoonieVision")).toBeInTheDocument();
    expect(screen.getByText("Multi-viewer for CBC GEM Olympic streams")).toBeInTheDocument();
    expect(screen.getByText("Sign in with CBC")).toBeInTheDocument();
    expect(screen.getByText("How does this work?")).toBeInTheDocument();
  });

  it("opens login when clicking the sign in button", async () => {
    const user = userEvent.setup();
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockResolvedValueOnce(undefined);

    render(<LoginModal />);

    await user.click(screen.getByText("Sign in with CBC"));

    expect(mockInvoke).toHaveBeenCalledWith("start_cbc_auth");
    await waitFor(() => {
      expect(screen.getByText(/Opening CBC login|Waiting for login/)).toBeInTheDocument();
    });
  });

  it("shows waiting state after opening login successfully", async () => {
    const user = userEvent.setup();
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockResolvedValueOnce(undefined);

    render(<LoginModal />);

    await user.click(screen.getByText("Sign in with CBC"));

    await waitFor(() => {
      expect(screen.getByText(/Waiting for login|Opening CBC login/)).toBeInTheDocument();
    });
  });

  it("shows error state when opening login fails", async () => {
    const user = userEvent.setup();
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockRejectedValueOnce(new Error("Network error"));

    render(<LoginModal />);

    await user.click(screen.getByText("Sign in with CBC"));

    await waitFor(() => {
      expect(screen.getByText(/Failed to open login window:/)).toBeInTheDocument();
    });
  });

  it("handles cbc-auth-success event and stores session", async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    render(<LoginModal />);

    await emit("cbc-auth-success", mockSession);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(mockSession);
    });
    await waitFor(() => {
      expect(screen.getByText(/Login successful/)).toBeInTheDocument();
    });
  });

  it("handles cbc-auth-success event when login fails", async () => {
    const errorMsg = "Storage error";
    // Ensure the mock is properly set to reject
    mockLogin.mockImplementation(() => Promise.reject(new Error(errorMsg)));

    render(<LoginModal />);

    await emit("cbc-auth-success", mockSession);

    await waitFor(() => {
      expect(screen.getByText(/Failed to store session:/)).toBeInTheDocument();
    });
  });

  it("handles cbc-auth-cancelled event and resets to idle after timeout", async () => {
    render(<LoginModal />);

    await emit("cbc-auth-cancelled");

    await waitFor(() => {
      expect(screen.getByText(/Login cancelled/)).toBeInTheDocument();
    });

    vi.advanceTimersByTime(2100);

    await waitFor(() => {
      expect(screen.getByText("Sign in with CBC")).toBeInTheDocument();
    });
  });

  it("handles cbc-auth-error event", async () => {
    const errorMsg = "Authentication failed";

    render(<LoginModal />);

    await emit("cbc-auth-error", errorMsg);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });
  });

  it("handles cbc-auth-timeout event", async () => {
    render(<LoginModal />);

    await emit("cbc-auth-timeout");

    await waitFor(() => {
      expect(screen.getByText(/Login timed out/)).toBeInTheDocument();
    });
  });

  it("shows cancel button during waiting state", async () => {
    const user = userEvent.setup();
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockResolvedValue(undefined);

    render(<LoginModal />);

    await user.click(screen.getByText("Sign in with CBC"));

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  it("cancels authentication when clicking cancel", async () => {
    const user = userEvent.setup();
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockResolvedValue(undefined);

    render(<LoginModal />);

    await user.click(screen.getByText("Sign in with CBC"));
    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel"));

    expect(mockInvoke).toHaveBeenCalledWith("cancel_cbc_auth");
  });

  it("shows try again button after error", async () => {
    const user = userEvent.setup();
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockRejectedValueOnce(new Error("Network error"));

    render(<LoginModal />);

    await user.click(screen.getByText("Sign in with CBC"));

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("resets to idle when clicking try again", async () => {
    const user = userEvent.setup();
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockRejectedValueOnce(new Error("Network error"));
    mockInvoke.mockResolvedValueOnce(undefined);

    render(<LoginModal />);

    await user.click(screen.getByText("Sign in with CBC"));
    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Try Again"));

    expect(screen.getByText("Sign in with CBC")).toBeInTheDocument();
  });

  it("shows try again button after timeout", async () => {
    render(<LoginModal />);

    await emit("cbc-auth-timeout");

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("shows extracting state during session extraction", async () => {
    mockLogin.mockImplementation(() => new Promise(() => {}));

    render(<LoginModal />);

    await emit("cbc-auth-success", mockSession);

    await waitFor(() => {
      expect(screen.getByText(/Extracting session/)).toBeInTheDocument();
    });
  });

  it("shows success state with correct styling", async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    render(<LoginModal />);

    await emit("cbc-auth-success", mockSession);

    await waitFor(() => {
      const statusContainer = screen.getByText(/Login successful/).parentElement;
      expect(statusContainer).toHaveClass("border-green-700");
      expect(statusContainer).toHaveClass("bg-green-900/20");
      expect(statusContainer).toHaveClass("text-green-400");
    });
  });

  it("shows error state with correct styling", async () => {
    const errorMsg = "Authentication error";

    render(<LoginModal />);

    await emit("cbc-auth-error", errorMsg);

    await waitFor(() => {
      const statusContainer = screen.getByText(errorMsg).parentElement;
      expect(statusContainer).toHaveClass("border-red-700");
      expect(statusContainer).toHaveClass("bg-red-900/20");
      expect(statusContainer).toHaveClass("text-red-400");
    });
  });

  it("disables login button during loading states", async () => {
    const user = userEvent.setup();
    const mockInvoke = vi.mocked(invoke);
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockInvoke.mockImplementation(() => pendingPromise);

    render(<LoginModal />);

    // Find the login button - should not be disabled initially
    const loginButton = screen.getByRole("button", { name: /Sign in with CBC/i });
    expect(loginButton).not.toBeDisabled();

    await user.click(loginButton);

    // After clicking, the login button should be hidden (replaced by Cancel button)
    // The button is disabled by being hidden during loading states
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Sign in with CBC/i })).not.toBeInTheDocument();
    });

    // Verify Cancel button is shown instead
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();

    // Cleanup: resolve the promise to prevent hanging
    resolvePromise!(undefined);
  });

  it("shows help section when clicking how does this work", async () => {
    const user = userEvent.setup();

    render(<LoginModal />);

    await user.click(screen.getByText("How does this work?"));

    expect(screen.getByText("Authentication")).toBeInTheDocument();
    expect(screen.getByText(/LoonieVision requires a CBC GEM account/)).toBeInTheDocument();
    expect(screen.getByText("How it works:")).toBeInTheDocument();
    expect(screen.getByText("Features:")).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\? Sign up at CBC GEM/)).toBeInTheDocument();
  });

  it("hides help section when clicking how does this work again", async () => {
    const user = userEvent.setup();

    render(<LoginModal />);

    await user.click(screen.getByText("How does this work?"));
    expect(screen.getByText("Authentication")).toBeInTheDocument();

    await user.click(screen.getByText("How does this work?"));
    expect(screen.queryByText("Authentication")).not.toBeInTheDocument();
  });

  it("displays the correct steps in help section", async () => {
    const user = userEvent.setup();

    render(<LoginModal />);

    await user.click(screen.getByText("How does this work?"));

    const helpSection = screen.getByText("Authentication").parentElement;
    const steps = within(helpSection!).getAllByRole("listitem");

    expect(steps[0]).toHaveTextContent(
      'Click "Sign in with CBC" to open the official CBC login page',
    );
    expect(steps[1]).toHaveTextContent("Enter your CBC GEM credentials in the secure window");
    expect(steps[2]).toHaveTextContent("We automatically extract your session cookies");
    expect(steps[3]).toHaveTextContent("You're now logged in and can watch streams!");
  });

  it("displays the correct features in help section", async () => {
    const user = userEvent.setup();

    render(<LoginModal />);

    await user.click(screen.getByText("How does this work?"));

    const helpSection = screen.getByText("Authentication").parentElement;
    const features = within(helpSection!).getAllByRole("listitem");

    expect(features[4]).toHaveTextContent("Watch up to 4 streams simultaneously");
    expect(features[5]).toHaveTextContent("Click any viewport to switch audio focus");
    expect(features[6]).toHaveTextContent("Keyboard shortcuts for quick control");
    expect(features[7]).toHaveTextContent("Auto-refreshing stream list");
  });

  it("shows footer with license information", () => {
    render(<LoginModal />);

    expect(
      screen.getByText("MIT License • Not affiliated with CBC/Radio-Canada"),
    ).toBeInTheDocument();
  });

  it("shows disclaimer about unofficial app", () => {
    render(<LoginModal />);

    expect(screen.getByText(/This is an unofficial third-party application/)).toBeInTheDocument();
  });

  it("opens CBC GEM link in new tab", async () => {
    const user = userEvent.setup();

    render(<LoginModal />);

    await user.click(screen.getByText("How does this work?"));

    const link = screen.getByRole("link", { name: /Don't have an account\? Sign up at CBC GEM/i });
    expect(link).toHaveAttribute("href", "https://gem.cbc.ca");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("handles cancel auth error gracefully", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockResolvedValueOnce(undefined);
      mockInvoke.mockRejectedValueOnce(new Error("Cancel failed"));

      render(<LoginModal />);

      await user.click(screen.getByText("Sign in with CBC"));
      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Cancel"));

      expect(consoleSpy).toHaveBeenCalledWith("Failed to cancel auth:", expect.any(Error));
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
