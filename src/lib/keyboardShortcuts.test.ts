import { renderHook, cleanup } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../store/audioStore", () => {
  const mockSetAudioOnForViewport = vi.fn();
  const mockSetMasterVolume = vi.fn();
  const mockToggleMute = vi.fn();
  const mockGetState = vi.fn(() => ({
    viewportWithAudioActive: 0,
    masterVolume: 0.5,
    isMuted: false,
  }));

  const state = {
    viewportWithAudioActive: 0,
    masterVolume: 0.5,
    isMuted: false,
    setAudioOnForViewport: mockSetAudioOnForViewport,
    setMasterVolume: mockSetMasterVolume,
    toggleMute: mockToggleMute,
  };

  return {
    useAudioStore: Object.assign(
      vi.fn(() => state),
      {
        getState: mockGetState,
        mockSetAudioOnForViewport,
        mockSetMasterVolume,
        mockToggleMute,
      },
    ),
  };
});

vi.mock("../store/uiStore", () => {
  const mockToggleSidebar = vi.fn();
  return {
    useUIStore: Object.assign(
      vi.fn(() => ({
        isSidebarCollapsed: false,
        toggleSidebar: mockToggleSidebar,
      })),
      {
        mockToggleSidebar,
      },
    ),
  };
});

vi.mock("../store/viewportStore", () => {
  const mockRemoveStream = vi.fn();
  return {
    useViewportStore: Object.assign(
      vi.fn(() => ({
        viewports: [],
        selectedViewport: 0,
        viewportCount: 4,
        assignStream: vi.fn(),
        removeStream: mockRemoveStream,
        setError: vi.fn(),
        setSelectedViewport: vi.fn(),
        setViewportCount: vi.fn(),
      })),
      {
        mockRemoveStream,
      },
    ),
  };
});

import { useAudioStore } from "../store/audioStore";
import { useUIStore } from "../store/uiStore";
import { useViewportStore } from "../store/viewportStore";
import { useKeyboardShortcuts } from "./keyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  let mockVideo: HTMLVideoElement;
  let mockFullscreenElement: HTMLElement | null = null;
  let mockRequestFullscreen: ReturnType<typeof vi.fn>;
  let mockExitFullscreen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequestFullscreen = vi.fn();
    mockExitFullscreen = vi.fn();

    mockVideo = document.createElement("video");
    mockVideo.requestFullscreen = mockRequestFullscreen as never;
    document.body.appendChild(mockVideo);

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => mockFullscreenElement,
    });

    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: mockExitFullscreen,
    });

    Object.defineProperty(document, "querySelectorAll", {
      configurable: true,
      value: vi.fn(() => [mockVideo]),
    });
  });

  afterEach(() => {
    cleanup();
    document.body.removeChild(mockVideo);
    mockFullscreenElement = null;
  });

  describe("Number keys 1-4", () => {
    it("sets audio for viewport 1", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "1" });
      expect((useAudioStore as any).mockSetAudioOnForViewport).toHaveBeenCalledWith(0);
    });

    it("sets audio for viewport 2", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "2" });
      expect((useAudioStore as any).mockSetAudioOnForViewport).toHaveBeenCalledWith(1);
    });

    it("sets audio for viewport 3", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "3" });
      expect((useAudioStore as any).mockSetAudioOnForViewport).toHaveBeenCalledWith(2);
    });

    it("sets audio for viewport 4", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "4" });
      expect((useAudioStore as any).mockSetAudioOnForViewport).toHaveBeenCalledWith(3);
    });
  });

  describe("F key - Fullscreen", () => {
    it("enters fullscreen when F is pressed and no fullscreen active", () => {
      mockFullscreenElement = null;
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "f" });
      expect(mockRequestFullscreen).toHaveBeenCalled();
    });

    it("enters fullscreen when uppercase F is pressed", () => {
      mockFullscreenElement = null;
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "F" });
      expect(mockRequestFullscreen).toHaveBeenCalled();
    });

    it("exits fullscreen when F is pressed and fullscreen is active", () => {
      mockFullscreenElement = mockVideo;
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "f" });
      expect(mockExitFullscreen).toHaveBeenCalled();
    });
  });

  describe("M key - Mute", () => {
    it("toggles mute when m is pressed", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "m" });
      expect((useAudioStore as any).mockToggleMute).toHaveBeenCalled();
    });

    it("toggles mute when uppercase M is pressed", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "M" });
      expect((useAudioStore as any).mockToggleMute).toHaveBeenCalled();
    });
  });

  describe("S key - Toggle Sidebar", () => {
    it("toggles sidebar when s is pressed", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "s" });
      expect((useUIStore as any).mockToggleSidebar).toHaveBeenCalled();
    });

    it("toggles sidebar when uppercase S is pressed", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "S" });
      expect((useUIStore as any).mockToggleSidebar).toHaveBeenCalled();
    });
  });

  describe("Arrow keys - Volume", () => {
    it("increases volume by 0.1 when ArrowUp is pressed", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "ArrowUp" });
      expect((useAudioStore as any).mockSetMasterVolume).toHaveBeenCalledWith(0.6);
    });

    it("decreases volume by 0.1 when ArrowDown is pressed", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "ArrowDown" });
      expect((useAudioStore as any).mockSetMasterVolume).toHaveBeenCalledWith(0.4);
    });
  });

  describe("Delete/Backspace - Remove Stream", () => {
    it("removes stream from active viewport when Delete is pressed", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "Delete" });
      expect((useViewportStore as any).mockRemoveStream).toHaveBeenCalledWith(0);
    });

    it("removes stream from active viewport when Backspace is pressed", () => {
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "Backspace" });
      expect((useViewportStore as any).mockRemoveStream).toHaveBeenCalledWith(0);
    });
  });

  describe("Escape - Exit Fullscreen", () => {
    it("exits fullscreen when Escape is pressed and fullscreen is active", () => {
      mockFullscreenElement = mockVideo;
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "Escape" });
      expect(mockExitFullscreen).toHaveBeenCalled();
    });

    it("does not exit fullscreen when Escape is pressed and no fullscreen active", () => {
      mockFullscreenElement = null;
      renderHook(() => useKeyboardShortcuts());
      fireEvent.keyDown(window, { key: "Escape" });
      expect(mockExitFullscreen).not.toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("removes event listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
      const { unmount } = renderHook(() => useKeyboardShortcuts());
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    });
  });
});
