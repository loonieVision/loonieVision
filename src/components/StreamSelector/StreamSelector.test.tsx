import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { useAuthStore } from "../../store/authStore";
import { useStreamStore } from "../../store/streamStore";
import { useUIStore } from "../../store/uiStore";
import { OlympicStream } from "../../types";
import { StreamSelector } from "./StreamSelector";

// Mock the stores
vi.mock("../../store/authStore");
vi.mock("../../store/streamStore");
vi.mock("../../store/uiStore");

// Create mock streams
const createMockStream = (overrides: Partial<OlympicStream> = {}): OlympicStream => ({
  id: `stream-${overrides.id || Math.random().toString(36).substr(2, 9)}`,
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

const mockLiveStreams = [
  createMockStream({ id: "1", title: "Live Stream 1", status: "live", sport: "Hockey" }),
  createMockStream({ id: "2", title: "Live Stream 2", status: "live", sport: "Figure Skating" }),
];

const mockReplayStreams = [
  createMockStream({ id: "3", title: "Replay Stream 1", status: "replay", sport: "Curling" }),
];

const mockUpcomingStreams = [
  createMockStream({ id: "4", title: "Upcoming Stream 1", status: "upcoming", sport: "Skiing" }),
];

describe("StreamSelector", () => {
  const mockFetchStreams = vi.fn();
  const mockToggleSidebar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Set up default mock implementations
    (useAuthStore as any).mockReturnValue({
      session: {
        cookies: { test: "value" },
        user_id: "user123",
        expires_at: Date.now() / 1000 + 3600,
      },
    });

    (useStreamStore as any).mockReturnValue({
      streams: [...mockLiveStreams, ...mockReplayStreams, ...mockUpcomingStreams],
      isLoading: false,
      error: null,
      lastUpdated: new Date("2024-01-01T12:00:00"),
      fetchStreams: mockFetchStreams,
    });

    (useUIStore as any).mockReturnValue({
      isSidebarCollapsed: false,
      toggleSidebar: mockToggleSidebar,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the stream selector with streams", () => {
    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.getByText("Olympic Streams")).toBeInTheDocument();
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
    expect(screen.getByText("Live Now (2)")).toBeInTheDocument();
    expect(screen.getByText("Replays (1)")).toBeInTheDocument();
    expect(screen.getByText("Upcoming (1)")).toBeInTheDocument();
  });

  it("renders collapsed sidebar when isSidebarCollapsed is true", () => {
    (useUIStore as any).mockReturnValue({
      isSidebarCollapsed: true,
      toggleSidebar: mockToggleSidebar,
    });

    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    const expandButton = screen.getByTitle("Expand sidebar");
    expect(expandButton).toBeInTheDocument();
  });

  it("calls onSelectStream when a stream card is clicked", async () => {
    const user = userEvent.setup();
    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={2} />);

    const liveStreamButton = screen.getByText("Live Stream 1").closest("button");
    await user.click(liveStreamButton!);

    expect(onSelectStream).toHaveBeenCalledTimes(1);
    expect(onSelectStream).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        title: "Live Stream 1",
        status: "live",
      }),
      2,
    );
  });

  it("displays live streams correctly", () => {
    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.getByText("Live Stream 1")).toBeInTheDocument();
    expect(screen.getByText("Live Stream 2")).toBeInTheDocument();
    expect(screen.getAllByText("● Live").length).toBe(2);
  });

  it("displays replay streams correctly", () => {
    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.getByText("Replay Stream 1")).toBeInTheDocument();
    expect(screen.getByText("Replay")).toBeInTheDocument();
  });

  it("displays upcoming streams correctly", () => {
    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.getByText("Upcoming Stream 1")).toBeInTheDocument();
  });

  it("shows loading state when isLoading is true and no streams", () => {
    (useStreamStore as any).mockReturnValue({
      streams: [],
      isLoading: true,
      error: null,
      lastUpdated: null,
      fetchStreams: mockFetchStreams,
    });

    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows error message when there is an error", () => {
    const errorMessage = "Failed to fetch streams";

    (useStreamStore as any).mockReturnValue({
      streams: [],
      isLoading: false,
      error: errorMessage,
      lastUpdated: null,
      fetchStreams: mockFetchStreams,
    });

    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("fetches streams on mount when session is available", () => {
    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(mockFetchStreams).toHaveBeenCalledWith({ test: "value" });
  });

  it("does not fetch streams when session is not available", () => {
    (useAuthStore as any).mockReturnValue({
      session: null,
    });

    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(mockFetchStreams).not.toHaveBeenCalled();
  });

  it("refreshes streams every 2 minutes", () => {
    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(mockFetchStreams).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(120000);

    expect(mockFetchStreams).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(120000);

    expect(mockFetchStreams).toHaveBeenCalledTimes(3);
  });

  it("clears interval on unmount", () => {
    const onSelectStream = vi.fn();

    const { unmount } = render(
      <StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />,
    );

    expect(mockFetchStreams).toHaveBeenCalledTimes(1);

    unmount();

    vi.advanceTimersByTime(120000);

    expect(mockFetchStreams).toHaveBeenCalledTimes(1);
  });

  it("displays correct last updated time", () => {
    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.getByText(/Updated:/)).toHaveTextContent("Updated: 12:00:00 PM");
  });

  it("does not show last updated time when lastUpdated is null", () => {
    (useStreamStore as any).mockReturnValue({
      streams: mockLiveStreams,
      isLoading: false,
      error: null,
      lastUpdated: null,
      fetchStreams: mockFetchStreams,
    });

    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.queryByText(/Updated:/)).not.toBeInTheDocument();
  });

  it("calls toggleSidebar when collapse button is clicked", async () => {
    const user = userEvent.setup();
    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    const collapseButton = screen.getByTitle("Collapse sidebar");
    await user.click(collapseButton);

    expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it("calls toggleSidebar when expand button is clicked in collapsed mode", async () => {
    const user = userEvent.setup();
    const onSelectStream = vi.fn();

    (useUIStore as any).mockReturnValue({
      isSidebarCollapsed: true,
      toggleSidebar: mockToggleSidebar,
    });

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    const expandButton = screen.getByTitle("Expand sidebar");
    await user.click(expandButton);

    expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it("does not show replay section when no replay streams", () => {
    (useStreamStore as any).mockReturnValue({
      streams: mockLiveStreams,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      fetchStreams: mockFetchStreams,
    });

    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.queryByText(/Replays/)).not.toBeInTheDocument();
  });

  it("does not show upcoming section when no upcoming streams", () => {
    (useStreamStore as any).mockReturnValue({
      streams: [...mockLiveStreams, ...mockReplayStreams],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      fetchStreams: mockFetchStreams,
    });

    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.queryByText(/Upcoming/)).not.toBeInTheDocument();
  });

  it("shows only live section when only live streams exist", () => {
    (useStreamStore as any).mockReturnValue({
      streams: mockLiveStreams,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      fetchStreams: mockFetchStreams,
    });

    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.getByText("Live Now (2)")).toBeInTheDocument();
    expect(screen.queryByText(/Replays/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upcoming/)).not.toBeInTheDocument();
  });

  it("handles stream selection with different viewport indices", async () => {
    const user = userEvent.setup();
    const onSelectStream = vi.fn();

    const { rerender } = render(
      <StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />,
    );

    const liveStreamButton = screen.getByText("Live Stream 1").closest("button");
    await user.click(liveStreamButton!);

    expect(onSelectStream).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }), 0);

    rerender(<StreamSelector onSelectStream={onSelectStream} selectedViewport={3} />);

    await user.click(liveStreamButton!);

    expect(onSelectStream).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }), 3);
  });

  it("renders stream cards with correct props", () => {
    const onSelectStream = vi.fn();

    render(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(screen.getByText("Hockey")).toBeInTheDocument();
    expect(screen.getByText("Figure Skating")).toBeInTheDocument();
    expect(screen.getByText("Curling")).toBeInTheDocument();
    expect(screen.getByText("Skiing")).toBeInTheDocument();
  });

  it("handles session change by fetching streams", () => {
    const onSelectStream = vi.fn();

    (useAuthStore as any).mockReturnValue({
      session: null,
    });

    const { rerender } = render(
      <StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />,
    );

    expect(mockFetchStreams).not.toHaveBeenCalled();

    (useAuthStore as any).mockReturnValue({
      session: {
        cookies: { new: "value" },
        user_id: "user123",
        expires_at: Date.now() / 1000 + 3600,
      },
    });

    rerender(<StreamSelector onSelectStream={onSelectStream} selectedViewport={0} />);

    expect(mockFetchStreams).toHaveBeenCalledWith({ new: "value" });
  });
});
