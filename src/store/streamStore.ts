import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

import { OlympicStream, StreamManifest } from "../types";

interface StreamStore {
  streams: OlympicStream[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  fetchStreams: (cookies: Record<string, string>) => Promise<void>;
  getStreamById: (id: string) => OlympicStream | undefined;
  getStreamManifest: (streamUrl: string) => Promise<StreamManifest>;
}

export const useStreamStore = create<StreamStore>((set, get) => ({
  streams: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchStreams: async (cookies: Record<string, string>) => {
    set({ isLoading: true, error: null });
    try {
      const streams = await invoke<OlympicStream[]>("fetch_olympic_streams", {
        cookies,
      });
      set({
        streams,
        lastUpdated: new Date(),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch streams",
        isLoading: false,
      });
    }
  },

  getStreamById: (id: string) => {
    return get().streams.find((s) => s.id === id);
  },

  getStreamManifest: async (streamUrl: string) => {
    const manifest = await invoke<StreamManifest>("get_stream_manifest", {
      streamUrl,
    });
    return manifest;
  },
}));
