import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { User, ExternalLink, Info, Loader2, X, AlertCircle, CheckCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

import { useAuthStore } from "../store/authStore";
import { AuthSession } from "../types";

type AuthStatus =
  | "idle"
  | "opening"
  | "waiting"
  | "extracting"
  | "success"
  | "error"
  | "cancelled"
  | "timeout";

const LoginModal = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showHelp, setShowHelp] = useState(false);
  const { login } = useAuthStore();

  // Listen for auth events from Rust backend
  useEffect(() => {
    const unlistenSuccess = listen<AuthSession>("cbc-auth-success", (event) => {
      setAuthStatus("extracting");
      // Store the session
      login(event.payload)
        .then(() => {
          setAuthStatus("success");
        })
        .catch((err) => {
          setAuthStatus("error");
          setErrorMessage("Failed to store session: " + String(err));
        });
    });

    const unlistenCancelled = listen("cbc-auth-cancelled", () => {
      setAuthStatus("cancelled");
      // Reset after showing cancellation message briefly
      setTimeout(() => {
        setAuthStatus("idle");
        setErrorMessage("");
      }, 2000);
    });

    const unlistenError = listen<string>("cbc-auth-error", (event) => {
      setAuthStatus("error");
      setErrorMessage(event.payload);
    });

    const unlistenTimeout = listen("cbc-auth-timeout", () => {
      setAuthStatus("timeout");
      setErrorMessage("Login timed out after 5 minutes");
    });

    return () => {
      unlistenSuccess.then((f) => f());
      unlistenCancelled.then((f) => f());
      unlistenError.then((f) => f());
      unlistenTimeout.then((f) => f());
    };
  }, [login]);

  const handleLogin = useCallback(async () => {
    setAuthStatus("opening");
    setErrorMessage("");

    try {
      await invoke("start_cbc_auth");
      setAuthStatus("waiting");
    } catch (error) {
      setAuthStatus("error");
      setErrorMessage("Failed to open login window: " + String(error));
    }
  }, []);

  const handleCancel = useCallback(async () => {
    try {
      await invoke("cancel_cbc_auth");
    } catch (error) {
      console.error("Failed to cancel auth:", error);
    }
  }, []);

  const getStatusDisplay = () => {
    switch (authStatus) {
      case "opening":
        return { icon: <Loader2 className="h-5 w-5 animate-spin" />, text: "Opening CBC login..." };
      case "waiting":
        return { icon: <Loader2 className="h-5 w-5 animate-spin" />, text: "Waiting for login..." };
      case "extracting":
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin" />,
          text: "Extracting session...",
        };
      case "success":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: "Login successful!",
        };
      case "cancelled":
        return { icon: <X className="h-5 w-5 text-slate-400" />, text: "Login cancelled" };
      case "timeout":
        return {
          icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
          text: "Login timed out",
        };
      case "error":
        return { icon: <AlertCircle className="h-5 w-5 text-red-500" />, text: errorMessage };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();
  const isLoading =
    authStatus === "opening" || authStatus === "waiting" || authStatus === "extracting";
  const showLoginButton =
    authStatus === "idle" || authStatus === "error" || authStatus === "timeout";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">LoonieVision</h1>
          <p className="text-slate-400">Multi-viewer for CBC GEM Olympic streams</p>
        </div>

        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <h2 className="mb-2 text-lg font-semibold text-white">Welcome</h2>
          <p className="mb-4 text-sm text-slate-400">
            Sign in with your CBC GEM account to access Olympic streams.
          </p>
          <p className="text-xs text-slate-500">
            This is an unofficial third-party application and is not affiliated with CBC.
          </p>
        </div>

        {/* Status Display */}
        {statusDisplay && (
          <div
            className={`mb-6 flex items-center space-x-3 rounded-lg border p-4 ${
              authStatus === "error" || authStatus === "timeout"
                ? "border-red-700 bg-red-900/20 text-red-400"
                : authStatus === "success"
                  ? "border-green-700 bg-green-900/20 text-green-400"
                  : "border-slate-700 bg-slate-800 text-slate-300"
            }`}
          >
            {statusDisplay.icon}
            <span className="text-sm">{statusDisplay.text}</span>
          </div>
        )}

        <div className="space-y-3">
          {showLoginButton && (
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <User className="h-5 w-5" />
                  <span>Sign in with CBC</span>
                </>
              )}
            </button>
          )}

          {(authStatus === "waiting" || authStatus === "opening") && (
            <button
              onClick={handleCancel}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-slate-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-slate-600"
            >
              <X className="h-5 w-5" />
              <span>Cancel</span>
            </button>
          )}

          {(authStatus === "error" || authStatus === "timeout") && (
            <button
              onClick={() => {
                setAuthStatus("idle");
                setErrorMessage("");
              }}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-slate-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-slate-600"
            >
              <span>Try Again</span>
            </button>
          )}

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex w-full items-center justify-center space-x-1 py-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <Info className="h-4 w-4" />
            <span>How does this work?</span>
          </button>
        </div>

        {showHelp && (
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
            <h3 className="mb-2 font-semibold text-white">Authentication</h3>
            <p className="mb-2">
              LoonieVision requires a CBC GEM account to stream content. Your credentials are
              securely handled by CBC's official login system.
            </p>
            <p className="mb-2">
              <strong className="text-white">How it works:</strong>
            </p>
            <ol className="mb-3 list-inside list-decimal space-y-1 text-slate-400">
              <li>Click "Sign in with CBC" to open the official CBC login page</li>
              <li>Enter your CBC GEM credentials in the secure window</li>
              <li>We automatically extract your session cookies</li>
              <li>You're now logged in and can watch streams!</li>
            </ol>
            <p className="mb-2">
              <strong className="text-white">Features:</strong>
            </p>
            <ul className="list-inside list-disc space-y-1 text-slate-400">
              <li>Watch up to 4 streams simultaneously</li>
              <li>Click any viewport to switch audio focus</li>
              <li>Keyboard shortcuts for quick control</li>
              <li>Auto-refreshing stream list</li>
            </ul>
            <div className="mt-3 border-t border-slate-700 pt-3">
              <a
                href="https://gem.cbc.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-red-400 hover:text-red-300"
              >
                <span>Don't have an account? Sign up at CBC GEM</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-slate-700 pt-6 text-center">
          <p className="text-xs text-slate-500">
            MIT License • Not affiliated with CBC/Radio-Canada
          </p>
        </div>
      </div>
    </div>
  );
};

export { LoginModal };
