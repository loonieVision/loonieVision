import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./store/authStore", () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
    checkSession: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("./store/audioStore", () => ({
  useAudioStore: vi.fn(() => ({
    viewportWithAudioActive: 0,
    isMuted: false,
    masterVolume: 0.8,
    toggleMute: vi.fn().mockResolvedValue(undefined),
    setMasterVolume: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("./store/viewportStore", () => ({
  useViewportStore: vi.fn(() => ({
    viewports: [
      { stream: null, error: null },
      { stream: null, error: null },
      { stream: null, error: null },
      { stream: null, error: null },
    ],
    removeStream: vi.fn(),
    selectedViewport: 0,
    setSelectedViewport: vi.fn(),
    viewportCount: 1,
    assignStream: vi.fn().mockResolvedValue(undefined),
    setViewportCount: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("./lib/keyboardShortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders main app when authenticated", () => {
    render(<App />);

    expect(screen.getByText("LoonieVision")).toBeInTheDocument();
    expect(screen.getAllByText("Viewport 1")).toHaveLength(2);
  });

  it("renders viewport count selector with correct options", () => {
    render(<App />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("1 Viewport")).toBeInTheDocument();
    expect(screen.getByText("2 Viewports")).toBeInTheDocument();
    expect(screen.getByText("4 Viewports")).toBeInTheDocument();
  });

  it("displays active viewport indicator", () => {
    render(<App />);

    expect(
      screen.getByText("Viewport 1", { selector: ".font-medium.text-white" }),
    ).toBeInTheDocument();
  });

  it("displays logout button", () => {
    render(<App />);

    const logoutButton = screen.getByRole("button", { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
  });

  it("displays volume slider with correct value", () => {
    render(<App />);

    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue("0.8");
  });

  it("displays header with LoonieVision title", () => {
    render(<App />);

    expect(screen.getByText("LoonieVision")).toBeInTheDocument();
  });

  it("has correct layout structure", () => {
    const { container } = render(<App />);

    expect(container.querySelector(".flex.h-screen.w-screen")).toBeInTheDocument();
  });

  it("hides volume slider on small screens", () => {
    render(<App />);

    const slider = screen.getByRole("slider");
    expect(slider).toHaveClass("hidden", "sm:block");
  });
});
