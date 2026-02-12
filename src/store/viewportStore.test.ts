import { describe, it, expect, beforeEach } from "vitest";
import { useViewportStore } from "./viewportStore";
import { OlympicStream } from "../types";

describe("useViewportStore", () => {
  beforeEach(() => {
    const { setViewportCount, setSelectedViewport, viewports } = useViewportStore.getState();
    const resetViewports = viewports.map((_, i) => ({ index: i, stream: null, error: null, volume: 1 }));
    useViewportStore.setState({ viewports: resetViewports });
    setViewportCount(4);
    setSelectedViewport(0);
  });

  describe("initial state", () => {
    it("should initialize with 4 empty viewports", () => {
      const { viewports } = useViewportStore.getState();

      expect(viewports).toHaveLength(4);
      expect(viewports[0]).toEqual({ index: 0, stream: null, error: null, volume: 1 });
      expect(viewports[1]).toEqual({ index: 1, stream: null, error: null, volume: 1 });
      expect(viewports[2]).toEqual({ index: 2, stream: null, error: null, volume: 1 });
      expect(viewports[3]).toEqual({ index: 3, stream: null, error: null, volume: 1 });
    });

    it("should initialize with selectedViewport as 0", () => {
      const { selectedViewport } = useViewportStore.getState();

      expect(selectedViewport).toBe(0);
    });
  });

  describe("assignStream", () => {
    it("should assign a stream to a viewport", () => {
      const mockStream = { id: "1", title: "Test Stream" } as OlympicStream;
      const { assignStream } = useViewportStore.getState();

      assignStream(mockStream, 1);

      const { viewports } = useViewportStore.getState();

      expect(viewports[1].stream).toEqual(mockStream);
      expect(viewports[1].error).toBe(null);
    });

    it("should clear error when assigning a stream", () => {
      const mockStream = { id: "1", title: "Test Stream" } as OlympicStream;
      const { setError, assignStream } = useViewportStore.getState();

      setError(1, "Previous error");
      assignStream(mockStream, 1);

      const { viewports } = useViewportStore.getState();

      expect(viewports[1].error).toBe(null);
    });

    it("should preserve other viewports when assigning a stream", () => {
      const mockStream = { id: "1", title: "Test Stream" } as OlympicStream;
      const { assignStream } = useViewportStore.getState();

      assignStream(mockStream, 2);

      const { viewports } = useViewportStore.getState();

      expect(viewports[0]).toEqual({ index: 0, stream: null, error: null, volume: 1 });
      expect(viewports[1]).toEqual({ index: 1, stream: null, error: null, volume: 1 });
      expect(viewports[3]).toEqual({ index: 3, stream: null, error: null, volume: 1 });
    });
  });

  describe("removeStream", () => {
    it("should remove a stream from a viewport", () => {
      const mockStream = { id: "1", title: "Test Stream" } as OlympicStream;
      const { assignStream, removeStream } = useViewportStore.getState();

      assignStream(mockStream, 1);
      removeStream(1);

      const { viewports } = useViewportStore.getState();

      expect(viewports[1].stream).toBe(null);
      expect(viewports[1].error).toBe(null);
      expect(viewports[1].volume).toBe(1);
    });

    it("should reset viewport to empty state", () => {
      const mockStream = { id: "1", title: "Test Stream" } as OlympicStream;
      const { assignStream, removeStream } = useViewportStore.getState();

      assignStream(mockStream, 1);
      removeStream(1);

      const { viewports } = useViewportStore.getState();

      expect(viewports[1]).toEqual({ index: 1, stream: null, error: null, volume: 1 });
    });
  });

  describe("setError", () => {
    it("should set error on a viewport", () => {
      const { setError } = useViewportStore.getState();

      setError(1, "Stream failed to load");

      const { viewports } = useViewportStore.getState();

      expect(viewports[1].error).toBe("Stream failed to load");
    });

    it("should allow clearing error with null", () => {
      const { setError } = useViewportStore.getState();

      setError(1, "Stream failed to load");
      setError(1, null);

      const { viewports } = useViewportStore.getState();

      expect(viewports[1].error).toBe(null);
    });

    it("should only affect the specified viewport", () => {
      const { setError } = useViewportStore.getState();

      setError(2, "Error");

      const { viewports } = useViewportStore.getState();

      expect(viewports[0].error).toBe(null);
      expect(viewports[1].error).toBe(null);
      expect(viewports[2].error).toBe("Error");
      expect(viewports[3].error).toBe(null);
    });
  });

  describe("setSelectedViewport", () => {
    it("should set the selected viewport index", () => {
      const { setSelectedViewport } = useViewportStore.getState();

      setSelectedViewport(2);

      const { selectedViewport } = useViewportStore.getState();

      expect(selectedViewport).toBe(2);
    });

    it("should update to index 0", () => {
      useViewportStore.getState().setSelectedViewport(3);
      const { setSelectedViewport } = useViewportStore.getState();

      setSelectedViewport(0);

      const { selectedViewport } = useViewportStore.getState();

      expect(selectedViewport).toBe(0);
    });
  });

  describe("setViewportCount", () => {
    it("should change viewport count to 1", () => {
      const mockStream = { id: "1", title: "Test Stream" } as OlympicStream;
      const { assignStream, setViewportCount } = useViewportStore.getState();

      assignStream(mockStream, 0);
      setViewportCount(1);

      const { viewports, viewportCount, selectedViewport } = useViewportStore.getState();

      expect(viewports).toHaveLength(1);
      expect(viewportCount).toBe(1);
      expect(selectedViewport).toBe(0);
      expect(viewports[0].stream).toEqual(mockStream);
    });

    it("should change viewport count to 2", () => {
      const { setViewportCount } = useViewportStore.getState();

      setViewportCount(2);

      const { viewports, viewportCount } = useViewportStore.getState();

      expect(viewports).toHaveLength(2);
      expect(viewportCount).toBe(2);
    });

    it("should change viewport count to 4", () => {
      const { setViewportCount } = useViewportStore.getState();

      setViewportCount(1);
      setViewportCount(4);

      const { viewports, viewportCount } = useViewportStore.getState();

      expect(viewports).toHaveLength(4);
      expect(viewportCount).toBe(4);
    });

    it("should preserve existing streams when reducing viewport count", () => {
      const mockStream1 = { id: "1", title: "Stream 1" } as OlympicStream;
      const mockStream2 = { id: "2", title: "Stream 2" } as OlympicStream;
      const { assignStream, setViewportCount } = useViewportStore.getState();

      assignStream(mockStream1, 0);
      assignStream(mockStream2, 1);
      setViewportCount(2);

      const { viewports } = useViewportStore.getState();

      expect(viewports).toHaveLength(2);
      expect(viewports[0].stream).toEqual(mockStream1);
      expect(viewports[1].stream).toEqual(mockStream2);
    });

    it("should preserve existing streams when increasing viewport count", () => {
      const mockStream = { id: "1", title: "Stream 1" } as OlympicStream;
      const { assignStream, setViewportCount } = useViewportStore.getState();

      setViewportCount(1);
      assignStream(mockStream, 0);
      setViewportCount(4);

      const { viewports } = useViewportStore.getState();

      expect(viewports).toHaveLength(4);
      expect(viewports[0].stream).toEqual(mockStream);
      expect(viewports[1].stream).toBe(null);
      expect(viewports[2].stream).toBe(null);
      expect(viewports[3].stream).toBe(null);
    });

    it("should preserve errors when changing viewport count", () => {
      const { setError, setViewportCount } = useViewportStore.getState();

      setError(0, "Error 0");
      setError(1, "Error 1");
      setViewportCount(2);

      const { viewports } = useViewportStore.getState();

      expect(viewports[0].error).toBe("Error 0");
      expect(viewports[1].error).toBe("Error 1");
    });

    it("should adjust selectedViewport if out of bounds", () => {
      const { setSelectedViewport, setViewportCount } = useViewportStore.getState();

      setSelectedViewport(3);
      setViewportCount(2);

      const { selectedViewport } = useViewportStore.getState();

      expect(selectedViewport).toBe(1);
    });

    it("should keep selectedViewport unchanged if within bounds", () => {
      const { setSelectedViewport, setViewportCount } = useViewportStore.getState();

      setSelectedViewport(1);
      setViewportCount(4);

      const { selectedViewport } = useViewportStore.getState();

      expect(selectedViewport).toBe(1);
    });

    it("should preserve volume when changing viewport count", () => {
      const { assignStream, setViewportCount } = useViewportStore.getState();

      assignStream({ id: "1", title: "Test" } as OlympicStream, 0);
      useViewportStore.setState((state) => ({
        viewports: state.viewports.map((vp, i) =>
          i === 0 ? { ...vp, volume: 0.5 } : vp
        ),
      }));

      const preChangeVolume = useViewportStore.getState().viewports[0].volume;

      setViewportCount(2);

      const postChangeViewports = useViewportStore.getState().viewports;

      expect(postChangeViewports[0].volume).toBe(preChangeVolume);
    });
  });
});