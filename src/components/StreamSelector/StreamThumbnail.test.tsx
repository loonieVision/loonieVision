import { render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { OlympicStream } from "../../types";
import { StreamThumbnail } from "./StreamThumbnail";

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

// Track mock observers for triggering callbacks
let mockObserverInstances: Array<{
  triggerIntersect: (isIntersecting: boolean) => void;
  disconnect: () => void;
}> = [];
let lastObserverOptions: IntersectionObserverInit | undefined;

// Mock IntersectionObserver implementation that stores callbacks
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  private disconnectMock: () => void;
  observe = vi.fn();
  unobserve = vi.fn();

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    lastObserverOptions = options;
    this.disconnectMock = vi.fn();
    mockObserverInstances.push({
      triggerIntersect: (isIntersecting: boolean) => {
        this.callback(
          [{ isIntersecting } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      },
      disconnect: this.disconnectMock,
    });
  }

  disconnect = () => {
    this.disconnectMock();
  };
}

describe("StreamThumbnail", () => {
  let OriginalImage: typeof Image;

  beforeEach(() => {
    vi.clearAllMocks();
    mockObserverInstances = [];
    lastObserverOptions = undefined;
    OriginalImage = window.Image;

    // Mock IntersectionObserver
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;

    // Mock Image to simulate successful load
    window.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      set src(value: string) {
        this._src = value;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }

      get src(): string {
        return this._src;
      }
    } as unknown as typeof Image;
  });

  afterEach(() => {
    window.Image = OriginalImage;
    vi.restoreAllMocks();
  });

  const triggerIntersect = (isIntersecting: boolean) => {
    mockObserverInstances.forEach((instance) => instance.triggerIntersect(isIntersecting));
  };

  it("renders without image initially", () => {
    const stream = createMockStream();
    const cardRef = createRef<HTMLButtonElement>();

    render(
      <button ref={cardRef}>
        <StreamThumbnail stream={stream} cardRef={cardRef} />
      </button>,
    );

    const img = screen.getByAltText(stream.title) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe("");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("observes the element with IntersectionObserver", () => {
    const stream = createMockStream();
    const cardRef = createRef<HTMLButtonElement>();

    render(
      <button ref={cardRef}>
        <StreamThumbnail stream={stream} cardRef={cardRef} />
      </button>,
    );

    expect(mockObserverInstances.length).toBeGreaterThan(0);
  });

  it("loads image when element becomes visible", async () => {
    const stream = createMockStream();
    const cardRef = createRef<HTMLButtonElement>();

    render(
      <button ref={cardRef}>
        <StreamThumbnail stream={stream} cardRef={cardRef} />
      </button>,
    );

    triggerIntersect(true);

    await waitFor(() => {
      const img = screen.getByAltText(stream.title) as HTMLImageElement;
      expect(img.src).toBe(stream.thumbnail_url);
    });
  });

  it("disconnects observer on unmount", () => {
    const stream = createMockStream();
    const cardRef = createRef<HTMLButtonElement>();

    const { unmount } = render(
      <button ref={cardRef}>
        <StreamThumbnail stream={stream} cardRef={cardRef} />
      </button>,
    );

    const observerInstance = mockObserverInstances[mockObserverInstances.length - 1];
    expect(observerInstance).toBeDefined();

    unmount();

    // Verify that disconnect was called
    expect(observerInstance.disconnect).toHaveBeenCalled();
  });

  it("handles image load error gracefully", async () => {
    const stream = createMockStream();
    const cardRef = createRef<HTMLButtonElement>();

    // Override Image mock to simulate error
    window.Image = class MockImageError {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      set src(_value: string) {
        setTimeout(() => {
          if (this.onerror) this.onerror();
        }, 0);
      }

      get src(): string {
        return this._src;
      }
    } as unknown as typeof Image;

    render(
      <button ref={cardRef}>
        <StreamThumbnail stream={stream} cardRef={cardRef} />
      </button>,
    );

    triggerIntersect(true);

    await waitFor(() => {
      // Wait for the image error to be processed
      const img = screen.getByAltText(stream.title) as HTMLImageElement;
      expect(img).toBeInTheDocument();
    });

    const img = screen.getByAltText(stream.title) as HTMLImageElement;
    expect(img.src).toBe("");
  });

  it("uses custom alt text from stream title", () => {
    const stream = createMockStream({ title: "Custom Stream Title" });
    const cardRef = createRef<HTMLButtonElement>();

    render(
      <button ref={cardRef}>
        <StreamThumbnail stream={stream} cardRef={cardRef} />
      </button>,
    );

    expect(screen.getByAltText("Custom Stream Title")).toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    const stream = createMockStream();
    const cardRef = createRef<HTMLButtonElement>();

    render(
      <button ref={cardRef}>
        <StreamThumbnail stream={stream} cardRef={cardRef} />
      </button>,
    );

    const img = screen.getByAltText(stream.title);
    expect(img).toHaveClass("h-16");
    expect(img).toHaveClass("w-24");
    expect(img).toHaveClass("flex-shrink-0");
    expect(img).toHaveClass("rounded");
    expect(img).toHaveClass("bg-slate-700");
    expect(img).toHaveClass("object-cover");
  });

  it("does not reload image if already visible", async () => {
    const stream = createMockStream();
    const cardRef = createRef<HTMLButtonElement>();

    render(
      <button ref={cardRef}>
        <StreamThumbnail stream={stream} cardRef={cardRef} />
      </button>,
    );

    triggerIntersect(true);

    await waitFor(() => {
      const img = screen.getByAltText(stream.title) as HTMLImageElement;
      expect(img.src).toBe(stream.thumbnail_url);
    });

    triggerIntersect(true);

    await waitFor(() => {
      const img = screen.getByAltText(stream.title) as HTMLImageElement;
      expect(img.src).toBe(stream.thumbnail_url);
    });
  });

  it("only loads image when isVisible becomes true", async () => {
    const stream = createMockStream();
    const cardRef = createRef<HTMLButtonElement>();

    render(
      <button ref={cardRef}>
        <StreamThumbnail stream={stream} cardRef={cardRef} />
      </button>,
    );

    const img = screen.getByAltText(stream.title) as HTMLImageElement;
    expect(img.src).toBe("");

    triggerIntersect(false);

    expect(img.src).toBe("");

    triggerIntersect(true);

    await waitFor(() => {
      expect(img.src).toBe(stream.thumbnail_url);
    });
  });

  it("handles null cardRef gracefully", () => {
    const stream = createMockStream();
    const nullRef = { current: null };

    expect(() => {
      render(
        <div>
          <StreamThumbnail stream={stream} cardRef={nullRef as any} />
        </div>,
      );
    }).not.toThrow();
  });

  it("uses observer with correct options", () => {
    const stream = createMockStream();
    const cardRef = createRef<HTMLButtonElement>();

    render(
      <button ref={cardRef}>
        <StreamThumbnail stream={stream} cardRef={cardRef} />
      </button>,
    );

    expect(lastObserverOptions).toMatchObject({
      rootMargin: "50px",
      threshold: 0.1,
    });
  });

  it("cleans up and recreates observer on ref change", () => {
    const stream = createMockStream();
    const cardRef1 = createRef<HTMLButtonElement>();
    const cardRef2 = createRef<HTMLButtonElement>();

    const { rerender } = render(
      <button ref={cardRef1}>
        <StreamThumbnail stream={stream} cardRef={cardRef1} />
      </button>,
    );

    const initialObserverCount = mockObserverInstances.length;
    expect(initialObserverCount).toBeGreaterThan(0);

    rerender(
      <button ref={cardRef2}>
        <StreamThumbnail stream={stream} cardRef={cardRef2} />
      </button>,
    );

    // A new observer should have been created
    expect(mockObserverInstances.length).toBeGreaterThan(initialObserverCount);
  });
});
