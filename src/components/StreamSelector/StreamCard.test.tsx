import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OlympicStream } from "../../types";
import { StreamCard } from "./StreamCard";

const createMockStream = (overrides: Partial<OlympicStream> = {}): OlympicStream => ({
  id: "test-stream-1",
  title: "Test Stream Title",
  description: "Test description",
  sport: "Hockey",
  status: "live",
  start_time: "2024-01-01T00:00:00Z",
  end_time: null,
  thumbnail_url: "https://example.com/thumbnail.jpg",
  stream_url: "https://example.com/stream.m3u8",
  requires_auth: true,
  is_premium: true,
  ...overrides,
});

describe("StreamCard", () => {
  it("renders stream information correctly", () => {
    const stream = createMockStream();
    const onClick = vi.fn();

    render(<StreamCard stream={stream} onClick={onClick} />);

    expect(screen.getByText("Test Stream Title")).toBeInTheDocument();
    expect(screen.getByText("Hockey")).toBeInTheDocument();
    expect(screen.getByText("● Live")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const stream = createMockStream();
    const onClick = vi.fn();

    render(<StreamCard stream={stream} onClick={onClick} />);

    await user.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables button when stream has ended", () => {
    const stream = createMockStream({ status: "ended" });
    const onClick = vi.fn();

    render(<StreamCard stream={stream} onClick={onClick} />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables button when stream is upcoming", () => {
    const stream = createMockStream({ status: "upcoming" });
    const onClick = vi.fn();

    render(<StreamCard stream={stream} onClick={onClick} />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows replay badge for replay status", () => {
    const stream = createMockStream({ status: "replay" });
    const onClick = vi.fn();

    render(<StreamCard stream={stream} onClick={onClick} />);

    expect(screen.getByText("Replay")).toBeInTheDocument();
    expect(screen.queryByText("● Live")).not.toBeInTheDocument();
  });

  it("truncates long titles with title attribute", () => {
    const longTitle = "A very long stream title that should be truncated in the UI";
    const stream = createMockStream({ title: longTitle });
    const onClick = vi.fn();

    render(<StreamCard stream={stream} onClick={onClick} />);

    expect(screen.getByText(longTitle)).toHaveAttribute("title", longTitle);
  });
});
