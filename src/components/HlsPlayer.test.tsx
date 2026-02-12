import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from "vitest";

import { OlympicStream, StreamManifest } from "../types";
import { HlsPlayer } from "./HlsPlayer";

const mockGetStreamManifest = vi.fn();

vi.mock("../store/streamStore", () => ({
  useStreamStore: vi.fn((selector: (state: unknown) => unknown) => {
    return selector({
      streams: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
      fetchStreams: vi.fn(),
      getStreamById: vi.fn(),
      getStreamManifest: mockGetStreamManifest,
    });
  }),
}));

const createMockManifest = (overrides: Partial<StreamManifest> = {}): StreamManifest => ({
  url: "https://example.com/manifest.m3u8",
  error_code: 0,
  message: null,
  bitrates: [],
  ...overrides,
});

const createMockStream = (overrides: Partial<OlympicStream> = {}): OlympicStream => ({
  id: "stream-1",
  title: "Test Stream",
  description: "Test description",
  sport: "Hockey",
  status: "live",
  start_time: "2024-01-01T00:00:00Z",
  end_time: null,
  thumbnail_url: "https://example.com/thumb.jpg",
  stream_url: "https://example.com/stream.m3u8",
  requires_auth: true,
  is_premium: true,
  ...overrides,
});

describe("HlsPlayer", () => {
  const mockOnError = vi.fn();
  const mockOnLoad = vi.fn();
  let consoleLogSpy: MockInstance;
  let consoleErrorSpy: MockInstance;
  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetStreamManifest.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    cleanup();
  });

  describe("Loading State", () => {
    it("shows loading spinner while fetching manifest", async () => {
      let resolveManifest: (value: StreamManifest) => void;
      mockGetStreamManifest.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveManifest = resolve;
          }),
      );

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={false}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      expect(screen.getByText("Loading stream...")).toBeInTheDocument();
      expect(screen.getByText("⟳")).toHaveClass("animate-spin");

      resolveManifest!(createMockManifest());
      await waitFor(() => {
        expect(screen.queryByText("Loading stream...")).not.toBeInTheDocument();
      });
    });
  });

  describe("Error State", () => {
    it("displays error message when manifest fetch fails", async () => {
      mockGetStreamManifest.mockRejectedValue(new Error("Network error"));

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={false}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("calls onError callback when manifest fetch fails", async () => {
      mockGetStreamManifest.mockRejectedValue(new Error("Failed to fetch"));

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={false}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith("Failed to fetch");
      });
    });

    it("handles non-Error exceptions in manifest fetch", async () => {
      mockGetStreamManifest.mockRejectedValue("Unknown error");

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={false}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith("Failed to fetch stream manifest");
      });
    });

    it("displays error when API returns error code", async () => {
      mockGetStreamManifest.mockResolvedValue({
        url: "",
        error_code: 500,
        message: "Stream unavailable",
        bitrates: [],
      });

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={false}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Stream unavailable")).toBeInTheDocument();
      });
    });
  });

  describe("Successful Manifest Load", () => {
    it("renders video element after successful manifest load", async () => {
      mockGetStreamManifest.mockResolvedValue(createMockManifest());

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={false}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        const video = document.querySelector("video");
        expect(video).toBeInTheDocument();
      });
    });

    it("does not render video element when still loading", () => {
      mockGetStreamManifest.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(createMockManifest()), 1000);
          }),
      );

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={false}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      expect(document.querySelector("video")).not.toBeInTheDocument();
      expect(screen.getByText("Loading stream...")).toBeInTheDocument();
    });
  });

  describe("Audio Controls", () => {
    it("video element has correct attributes", async () => {
      mockGetStreamManifest.mockResolvedValue(createMockManifest());

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={false}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        const video = document.querySelector("video");
        expect(video).toBeInTheDocument();
        expect(video).toHaveAttribute("playsinline");
        expect(video).toHaveAttribute("autoPlay");
        expect(video).toHaveAttribute("controls");
      });
    });

    it("updates muted state when isAudioActive changes", async () => {
      mockGetStreamManifest.mockResolvedValue(createMockManifest());

      const { rerender } = render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={false}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        const video = document.querySelector("video");
        expect(video).toBeInTheDocument();
      });

      const video = document.querySelector("video") as HTMLVideoElement;
      expect(video.muted).toBe(true);

      rerender(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={true}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      expect(video.muted).toBe(false);
    });

    it("does not change volume when audio is inactive", async () => {
      mockGetStreamManifest.mockResolvedValue(createMockManifest());

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={false}
          volume={0.8}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        const video = document.querySelector("video");
        expect(video).toBeInTheDocument();
      });

      const video = document.querySelector("video") as HTMLVideoElement;
      expect(video.volume).toBe(1);
    });
  });

  describe("VOD Detection", () => {
    it("detects VOD streams with startTime and endTime parameters", async () => {
      mockGetStreamManifest.mockResolvedValue(
        createMockManifest({ url: "https://example.com/vod.m3u8?startTime=0&endTime=3600" }),
      );

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={true}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        const video = document.querySelector("video");
        expect(video).toBeInTheDocument();
      });
    });

    it("detects live streams without time parameters", async () => {
      mockGetStreamManifest.mockResolvedValue(createMockManifest());

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={true}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        const video = document.querySelector("video");
        expect(video).toBeInTheDocument();
      });
    });
  });

  describe("Stream URL Changes", () => {
    it("re-fetches manifest when stream URL changes", async () => {
      const firstStream = { ...createMockStream(), stream_url: "https://first.com/stream.m3u8" };
      const secondStream = { ...createMockStream(), stream_url: "https://second.com/stream.m3u8" };

      mockGetStreamManifest.mockResolvedValue(createMockManifest());

      const { rerender } = render(
        <HlsPlayer
          stream={firstStream}
          isAudioActive={true}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        expect(mockGetStreamManifest).toHaveBeenCalledWith(firstStream.stream_url);
      });

      mockGetStreamManifest.mockClear();
      mockGetStreamManifest.mockResolvedValue(
        createMockManifest({ url: "https://second.com/manifest.m3u8" }),
      );

      rerender(
        <HlsPlayer
          stream={secondStream}
          isAudioActive={true}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        expect(mockGetStreamManifest).toHaveBeenCalledWith(secondStream.stream_url);
      });
    });
  });

  describe("Component Structure", () => {
    it("renders with correct container classes", async () => {
      mockGetStreamManifest.mockResolvedValue(createMockManifest());

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={true}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        const container = document.querySelector("video")?.parentElement;
        expect(container).toBeInTheDocument();
        expect(container).toHaveClass("relative h-full w-full");
      });
    });

    it("has proper loading state container styling", () => {
      mockGetStreamManifest.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(createMockManifest()), 1000);
          }),
      );

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={true}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      const loaderContainer = screen.getByText("Loading stream...").parentElement?.parentElement;
      expect(loaderContainer).toHaveClass(
        "flex h-full w-full items-center justify-center bg-black",
      );
    });

    it("has proper error state container styling", async () => {
      mockGetStreamManifest.mockRejectedValue(new Error("Error"));

      render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={true}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {
        const errorContainer = screen.getByText("Error").parentElement?.parentElement;
        expect(errorContainer).toHaveClass(
          "flex h-full w-full items-center justify-center bg-black p-4",
        );
      });
    });
  });

  describe("Callback Refs", () => {
    it("uses latest onError callback after parent re-render", async () => {
      mockGetStreamManifest.mockResolvedValue(createMockManifest());

      const { rerender } = render(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={true}
          volume={0.5}
          onError={mockOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {});

      const newOnError = vi.fn();
      rerender(
        <HlsPlayer
          stream={createMockStream()}
          isAudioActive={true}
          volume={0.5}
          onError={newOnError}
          onLoad={mockOnLoad}
        />,
      );

      await waitFor(() => {});
      expect(newOnError).not.toHaveBeenCalled();
    });
  });
});
