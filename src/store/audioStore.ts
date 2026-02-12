import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AudioStore {
  viewportWithAudioActive: number;
  masterVolume: number;
  isMuted: boolean;
  setAudioOnForViewport: (index: number) => void;
  setMasterVolume: (volume: number) => void;
  toggleMute: () => void;
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => ({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,

      setAudioOnForViewport: (index: number) => {
        set({ viewportWithAudioActive: index });
      },

      setMasterVolume: (volume: number) => {
        set({ masterVolume: Math.max(0, Math.min(1, volume)) });
      },

      toggleMute: () => {
        set({ isMuted: !get().isMuted });
      },
    }),
    {
      name: "audio-storage",
    },
  ),
);
