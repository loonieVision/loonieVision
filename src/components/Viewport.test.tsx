import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OlympicStream } from "../types";
import { Viewport } from "./Viewport";

// Mock HlsPlayer component
vi.mock("./HlsPlayer", () => ({
  HlsPlayer: ({ stream }: { stream: OlympicStream }) => (
    <div data-testid="hls-player">{stream.title}</div>
  ),
}));

const mockStream: OlympicStream = {
  id: "stream1",
  title: "Test Stream",
  description: "Test Description",
  sport: "Hockey",
  status: "live",
  start_time: "2024-01-01T00:00:00Z",
  end_time: null,
  thumbnail_url: "https://example.com/thumb.jpg",
  stream_url: "https://example.com/stream.m3u8",
  requires_auth: false,
  is_premium: false,
};

describe("Viewport", () => {
  it("renders placeholder when no stream is assigned", () => {
    render(
      <Viewport
        index={0}
        stream={null}
        isAudioActive={false}
        isSelected={false}
        volume={1}
        error={null}
        onClick={vi.fn()}
        onRemoveStream={vi.fn()}
      />,
    );

    expect(screen.getByText("Viewport 1")).toBeInTheDocument();
    expect(screen.getByText("Click to select, then choose a stream")).toBeInTheDocument();
  });

  it("renders selected state with different styling", () => {
    render(
      <Viewport
        index={1}
        stream={null}
        isAudioActive={false}
        isSelected={true}
        volume={1}
        error={null}
        onClick={vi.fn()}
        onRemoveStream={vi.fn()}
      />,
    );

    expect(screen.getByText("Viewport 2")).toBeInTheDocument();
    expect(screen.getByText("Selected, choose a stream")).toBeInTheDocument();
  });

  it("calls onClick when clicking the placeholder", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Viewport
        index={0}
        stream={null}
        isAudioActive={false}
        isSelected={false}
        volume={1}
        error={null}
        onClick={onClick}
        onRemoveStream={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Viewport 1").closest("div")!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders HlsPlayer when stream is assigned", () => {
    render(
      <Viewport
        index={0}
        stream={mockStream}
        isAudioActive={false}
        isSelected={false}
        volume={1}
        error={null}
        onClick={vi.fn()}
        onRemoveStream={vi.fn()}
      />,
    );

    expect(screen.getByTestId("hls-player")).toBeInTheDocument();
  });

  it("displays error overlay when error is present", () => {
    render(
      <Viewport
        index={0}
        stream={mockStream}
        isAudioActive={false}
        isSelected={false}
        volume={1}
        error="Failed to load stream"
        onClick={vi.fn()}
        onRemoveStream={vi.fn()}
      />,
    );

    expect(screen.getByText("Failed to load stream")).toBeInTheDocument();
    expect(screen.getByText("Failed to load stream")).toHaveClass("text-red-400");
  });

  it("shows stream title in overlay", () => {
    const { container } = render(
      <Viewport
        index={0}
        stream={mockStream}
        isAudioActive={false}
        isSelected={false}
        volume={1}
        error={null}
        onClick={vi.fn()}
        onRemoveStream={vi.fn()}
      />,
    );

    // Find the overlay title div
    const titleDiv = container.querySelector(".max-w-\\[70\\%\\].truncate");
    expect(titleDiv).toHaveTextContent("Test Stream");
    expect(titleDiv).toHaveClass("text-white");
  });

  it("calls onRemoveStream when clicking remove button", async () => {
    const user = userEvent.setup();
    const onRemoveStream = vi.fn();

    render(
      <Viewport
        index={0}
        stream={mockStream}
        isAudioActive={false}
        isSelected={false}
        volume={1}
        error={null}
        onClick={vi.fn()}
        onRemoveStream={onRemoveStream}
      />,
    );

    const removeButton = screen.getByRole("button");
    await user.click(removeButton);

    expect(onRemoveStream).toHaveBeenCalledTimes(1);
  });

  it("does not bubble click event when clicking remove button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onRemoveStream = vi.fn();

    render(
      <Viewport
        index={0}
        stream={mockStream}
        isAudioActive={false}
        isSelected={false}
        volume={1}
        error={null}
        onClick={onClick}
        onRemoveStream={onRemoveStream}
      />,
    );

    const removeButton = screen.getByRole("button");
    await user.click(removeButton);

    expect(onRemoveStream).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("passes isAudioActive to HlsPlayer", () => {
    const { rerender } = render(
      <Viewport
        index={0}
        stream={mockStream}
        isAudioActive={true}
        isSelected={false}
        volume={1}
        error={null}
        onClick={vi.fn()}
        onRemoveStream={vi.fn()}
      />,
    );

    expect(screen.getByTestId("hls-player")).toBeInTheDocument();

    rerender(
      <Viewport
        index={0}
        stream={mockStream}
        isAudioActive={false}
        isSelected={false}
        volume={0.5}
        error={null}
        onClick={vi.fn()}
        onRemoveStream={vi.fn()}
      />,
    );

    expect(screen.getByTestId("hls-player")).toBeInTheDocument();
  });

  it("handles multiple viewport indices correctly", () => {
    render(
      <Viewport
        index={3}
        stream={null}
        isAudioActive={false}
        isSelected={false}
        volume={1}
        error={null}
        onClick={vi.fn()}
        onRemoveStream={vi.fn()}
      />,
    );

    expect(screen.getByText("Viewport 4")).toBeInTheDocument();
  });

  it("has ring styling when selected", () => {
    const { container } = render(
      <Viewport
        index={0}
        stream={null}
        isAudioActive={false}
        isSelected={true}
        volume={1}
        error={null}
        onClick={vi.fn()}
        onRemoveStream={vi.fn()}
      />,
    );

    const viewport = container.firstChild as HTMLElement;
    expect(viewport).toHaveClass("ring-blue-500");
  });

  it("has transparent ring when not selected", () => {
    const { container } = render(
      <Viewport
        index={0}
        stream={null}
        isAudioActive={false}
        isSelected={false}
        volume={1}
        error={null}
        onClick={vi.fn()}
        onRemoveStream={vi.fn()}
      />,
    );

    const viewport = container.firstChild as HTMLElement;
    expect(viewport).toHaveClass("ring-transparent");
  });
});
