import { invoke } from "@tauri-apps/api/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OlympicStream, StreamManifest } from "../types";
import { useStreamStore } from "./streamStore";

const mockInvoke = invoke as unknown as ReturnType<typeof vi.fn>;

const mockStreams: OlympicStream[] = [
  {
    id: "stream-1",
    title: "Stream 1",
    description: "Description 1",
    sport: "Hockey",
    status: "live",
    start_time: "2026-02-11T10:00:00Z",
    end_time: null,
    thumbnail_url: "https://example.com/thumb1.jpg",
    stream_url: "https://example.com/stream1.m3u8",
    requires_auth: true,
    is_premium: false,
  },
  {
    id: "stream-2",
    title: "Stream 2",
    description: "Description 2",
    sport: "Figure Skating",
    status: "upcoming",
    start_time: "2026-02-11T12:00:00Z",
    end_time: "2026-02-11T14:00:00Z",
    thumbnail_url: "https://example.com/thumb2.jpg",
    stream_url: "https://example.com/stream2.m3u8",
    requires_auth: false,
    is_premium: true,
  },
];

const mockManifest: StreamManifest = {
  url: "https://example.com/stream1.m3u8",
  error_code: 0,
  message: null,
  bitrates: [
    {
      bitrate: 5000000,
      width: 1920,
      height: 1080,
      lines: "1080p",
    },
    {
      bitrate: 2500000,
      width: 1280,
      height: 720,
      lines: "720p",
    },
  ],
};

describe("useStreamStore", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    useStreamStore.setState({
      streams: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
  });

  afterEach(() => {
    useStreamStore.setState({
      streams: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      expect(useStreamStore.getState()).toEqual({
        streams: [],
        isLoading: false,
        error: null,
        lastUpdated: null,
        fetchStreams: expect.any(Function),
        getStreamById: expect.any(Function),
        getStreamManifest: expect.any(Function),
      });
    });
  });

  describe("fetchStreams", () => {
    it("should fetch streams successfully", async () => {
      mockInvoke.mockResolvedValue(mockStreams);

      await useStreamStore.getState().fetchStreams({ session_id: "test123" });

      const state = useStreamStore.getState();
      expect(state.streams).toEqual(mockStreams);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeInstanceOf(Date);
    });

    it("should set loading state when fetching streams", async () => {
      mockInvoke.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockStreams), 100)),
      );

      const promise = useStreamStore.getState().fetchStreams({});
      expect(useStreamStore.getState().isLoading).toBe(true);
      await promise;
      expect(useStreamStore.getState().isLoading).toBe(false);
    });

    it("should handle error when fetching streams fails", async () => {
      const error = new Error("Network error");
      mockInvoke.mockRejectedValue(error);

      await useStreamStore.getState().fetchStreams({});

      const state = useStreamStore.getState();
      expect(state.streams).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Network error");
      expect(state.lastUpdated).toBeNull();
    });

    it("should handle non-Error errors", async () => {
      mockInvoke.mockRejectedValue("String error");

      await useStreamStore.getState().fetchStreams({});

      const state = useStreamStore.getState();
      expect(state.error).toBe("Failed to fetch streams");
    });
  });

  describe("getStreamById", () => {
    beforeEach(() => {
      useStreamStore.setState({ streams: mockStreams });
    });

    it("should find stream by id", () => {
      const stream = useStreamStore.getState().getStreamById("stream-1");
      expect(stream).toEqual(mockStreams[0]);
    });

    it("should return undefined for non-existent id", () => {
      const stream = useStreamStore.getState().getStreamById("stream-999");
      expect(stream).toBeUndefined();
    });

    it("should return undefined when streams array is empty", () => {
      useStreamStore.setState({ streams: [] });
      const stream = useStreamStore.getState().getStreamById("stream-1");
      expect(stream).toBeUndefined();
    });
  });

  describe("getStreamManifest", () => {
    it("should fetch stream manifest successfully", async () => {
      mockInvoke.mockResolvedValue(mockManifest);

      const manifest = await useStreamStore
        .getState()
        .getStreamManifest("https://example.com/stream1.m3u8");

      expect(manifest).toEqual(mockManifest);
    });

    it("should call invoke with correct arguments", async () => {
      mockInvoke.mockResolvedValue(mockManifest);

      const streamUrl = "https://example.com/stream1.m3u8";
      await useStreamStore.getState().getStreamManifest(streamUrl);

      expect(mockInvoke).toHaveBeenCalledWith("get_stream_manifest", {
        streamUrl,
      });
    });
  });
});
