import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import * as audioStore from "../../store/audioStore";
import * as viewportStore from "../../store/viewportStore";
import { OlympicStream, ViewportState } from "../../types";
import { VideoGrid } from "./VideoGrid";

// Mock the stores
const mockRemoveStream = vi.fn();
const mockSetSelectedViewport = vi.fn();

const createMockViewport = (
  index: number,
  stream: OlympicStream | null = null,
  error: string | null = null,
): ViewportState => ({
  index,
  stream,
  error,
  volume: 1,
});

const createMockStream = (id: string, title: string): OlympicStream => ({
  id,
  title,
  description: "Test",
  sport: "Hockey",
  status: "live",
  start_time: "2024-01-01T00:00:00Z",
  end_time: null,
  thumbnail_url: "",
  stream_url: "",
  requires_auth: false,
  is_premium: false,
});

describe("VideoGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correct number of viewports for single viewport", () => {
    vi.spyOn(viewportStore, "useViewportStore").mockReturnValue({
      viewports: [createMockViewport(0)],
      removeStream: mockRemoveStream,
      selectedViewport: 0,
      setSelectedViewport: mockSetSelectedViewport,
      viewportCount: 1 as viewportStore.ViewportCount,
    });

    vi.spyOn(audioStore, "useAudioStore").mockReturnValue({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
      setAudioOnForViewport: vi.fn(),
      setMasterVolume: vi.fn(),
      toggleMute: vi.fn(),
    });

    render(<VideoGrid />);

    expect(screen.getByText("Viewport 1")).toBeInTheDocument();
    expect(screen.queryByText("Viewport 2")).not.toBeInTheDocument();
  });

  it("renders correct number of viewports for two viewports", () => {
    vi.spyOn(viewportStore, "useViewportStore").mockReturnValue({
      viewports: [createMockViewport(0), createMockViewport(1)],
      removeStream: mockRemoveStream,
      selectedViewport: 0,
      setSelectedViewport: mockSetSelectedViewport,
      viewportCount: 2 as viewportStore.ViewportCount,
    });

    vi.spyOn(audioStore, "useAudioStore").mockReturnValue({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
      setAudioOnForViewport: vi.fn(),
      setMasterVolume: vi.fn(),
      toggleMute: vi.fn(),
    });

    render(<VideoGrid />);

    expect(screen.getByText("Viewport 1")).toBeInTheDocument();
    expect(screen.getByText("Viewport 2")).toBeInTheDocument();
    expect(screen.queryByText("Viewport 3")).not.toBeInTheDocument();
  });

  it("renders correct number of viewports for four viewports", () => {
    vi.spyOn(viewportStore, "useViewportStore").mockReturnValue({
      viewports: [
        createMockViewport(0),
        createMockViewport(1),
        createMockViewport(2),
        createMockViewport(3),
      ],
      removeStream: mockRemoveStream,
      selectedViewport: 0,
      setSelectedViewport: mockSetSelectedViewport,
      viewportCount: 4 as viewportStore.ViewportCount,
    });

    vi.spyOn(audioStore, "useAudioStore").mockReturnValue({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
      setAudioOnForViewport: vi.fn(),
      setMasterVolume: vi.fn(),
      toggleMute: vi.fn(),
    });

    render(<VideoGrid />);

    expect(screen.getByText("Viewport 1")).toBeInTheDocument();
    expect(screen.getByText("Viewport 2")).toBeInTheDocument();
    expect(screen.getByText("Viewport 3")).toBeInTheDocument();
    expect(screen.getByText("Viewport 4")).toBeInTheDocument();
  });

  it("passes correct props to viewports with streams", () => {
    const stream1 = createMockStream("1", "Stream One");
    const stream2 = createMockStream("2", "Stream Two");

    vi.spyOn(viewportStore, "useViewportStore").mockReturnValue({
      viewports: [createMockViewport(0, stream1), createMockViewport(1, stream2)],
      removeStream: mockRemoveStream,
      selectedViewport: 1,
      setSelectedViewport: mockSetSelectedViewport,
      viewportCount: 2 as viewportStore.ViewportCount,
    });

    vi.spyOn(audioStore, "useAudioStore").mockReturnValue({
      viewportWithAudioActive: 1,
      masterVolume: 0.5,
      isMuted: false,
      setAudioOnForViewport: vi.fn(),
      setMasterVolume: vi.fn(),
      toggleMute: vi.fn(),
    });

    render(<VideoGrid />);

    // Stream one should show but not be selected or have audio
    expect(screen.getByText("Stream One")).toBeInTheDocument();

    // Stream two should show and be selected with audio
    expect(screen.getByText("Stream Two")).toBeInTheDocument();
  });

  it("uses viewport stream id as key when available", () => {
    const stream = createMockStream("abc123", "My Stream");

    vi.spyOn(viewportStore, "useViewportStore").mockReturnValue({
      viewports: [createMockViewport(0, stream)],
      removeStream: mockRemoveStream,
      selectedViewport: 0,
      setSelectedViewport: mockSetSelectedViewport,
      viewportCount: 1 as viewportStore.ViewportCount,
    });

    vi.spyOn(audioStore, "useAudioStore").mockReturnValue({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
      setAudioOnForViewport: vi.fn(),
      setMasterVolume: vi.fn(),
      toggleMute: vi.fn(),
    });

    render(<VideoGrid />);
    expect(screen.getByText("My Stream")).toBeInTheDocument();
  });

  it("passes errors to viewports with streams", () => {
    const stream = createMockStream("1", "Test Stream");

    vi.spyOn(viewportStore, "useViewportStore").mockReturnValue({
      viewports: [createMockViewport(0, stream, "Connection failed")],
      removeStream: mockRemoveStream,
      selectedViewport: 0,
      setSelectedViewport: mockSetSelectedViewport,
      viewportCount: 1 as viewportStore.ViewportCount,
    });

    vi.spyOn(audioStore, "useAudioStore").mockReturnValue({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
      setAudioOnForViewport: vi.fn(),
      setMasterVolume: vi.fn(),
      toggleMute: vi.fn(),
    });

    render(<VideoGrid />);
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
    expect(screen.getByText("Connection failed")).toHaveClass("text-red-400");
  });

  it("has correct grid classes for single viewport", () => {
    vi.spyOn(viewportStore, "useViewportStore").mockReturnValue({
      viewports: [createMockViewport(0)],
      removeStream: mockRemoveStream,
      selectedViewport: 0,
      setSelectedViewport: mockSetSelectedViewport,
      viewportCount: 1 as viewportStore.ViewportCount,
    });

    vi.spyOn(audioStore, "useAudioStore").mockReturnValue({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
      setAudioOnForViewport: vi.fn(),
      setMasterVolume: vi.fn(),
      toggleMute: vi.fn(),
    });

    const { container } = render(<VideoGrid />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1");
    expect(grid).toHaveClass("grid-rows-1");
  });

  it("has correct grid classes for two viewports", () => {
    vi.spyOn(viewportStore, "useViewportStore").mockReturnValue({
      viewports: [createMockViewport(0), createMockViewport(1)],
      removeStream: mockRemoveStream,
      selectedViewport: 0,
      setSelectedViewport: mockSetSelectedViewport,
      viewportCount: 2 as viewportStore.ViewportCount,
    });

    vi.spyOn(audioStore, "useAudioStore").mockReturnValue({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
      setAudioOnForViewport: vi.fn(),
      setMasterVolume: vi.fn(),
      toggleMute: vi.fn(),
    });

    const { container } = render(<VideoGrid />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-2");
    expect(grid).toHaveClass("grid-rows-1");
  });

  it("has correct grid classes for four viewports", () => {
    vi.spyOn(viewportStore, "useViewportStore").mockReturnValue({
      viewports: [
        createMockViewport(0),
        createMockViewport(1),
        createMockViewport(2),
        createMockViewport(3),
      ],
      removeStream: mockRemoveStream,
      selectedViewport: 0,
      setSelectedViewport: mockSetSelectedViewport,
      viewportCount: 4 as viewportStore.ViewportCount,
    });

    vi.spyOn(audioStore, "useAudioStore").mockReturnValue({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
      setAudioOnForViewport: vi.fn(),
      setMasterVolume: vi.fn(),
      toggleMute: vi.fn(),
    });

    const { container } = render(<VideoGrid />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-2");
    expect(grid).toHaveClass("grid-rows-2");
  });

  it("uses index as fallback key when no stream is present", () => {
    vi.spyOn(viewportStore, "useViewportStore").mockReturnValue({
      viewports: [createMockViewport(0)],
      removeStream: mockRemoveStream,
      selectedViewport: 0,
      setSelectedViewport: mockSetSelectedViewport,
      viewportCount: 1 as viewportStore.ViewportCount,
    });

    vi.spyOn(audioStore, "useAudioStore").mockReturnValue({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
      setAudioOnForViewport: vi.fn(),
      setMasterVolume: vi.fn(),
      toggleMute: vi.fn(),
    });

    render(<VideoGrid />);
    expect(screen.getByText("Viewport 1")).toBeInTheDocument();
  });
});
