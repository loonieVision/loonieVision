import { create } from "zustand";
import { persist } from "zustand/middleware";

import { OlympicStream, ViewportState } from "../types";

type ViewportCount = 1 | 2 | 4;

interface ViewportStore {
  viewports: ViewportState[];
  selectedViewport: number;
  viewportCount: ViewportCount;
  assignStream: (stream: OlympicStream, viewportIndex: number) => void;
  removeStream: (viewportIndex: number) => void;
  setError: (viewportIndex: number, error: string | null) => void;
  setSelectedViewport: (index: number) => void;
  setViewportCount: (count: ViewportCount) => void;
}

const createEmptyViewport = (index: number): ViewportState => ({
  index,
  stream: null,
  error: null,
  volume: 1,
});

const createViewports = (count: ViewportCount): ViewportState[] => {
  return Array.from({ length: count }, (_, i) => createEmptyViewport(i));
};

const useViewportStore = create<ViewportStore>()(
  persist(
    (set, get) => ({
      viewports: createViewports(4),
      selectedViewport: 0,
      viewportCount: 4 as ViewportCount,

      assignStream: (stream: OlympicStream, viewportIndex: number) => {
        const viewports = [...get().viewports];
        viewports[viewportIndex] = {
          ...viewports[viewportIndex],
          stream,
          error: null,
        };
        set({ viewports });
      },

      removeStream: (viewportIndex: number) => {
        const viewports = [...get().viewports];
        viewports[viewportIndex] = createEmptyViewport(viewportIndex);
        set({ viewports });
      },

      setError: (viewportIndex: number, error: string | null) => {
        const viewports = [...get().viewports];
        viewports[viewportIndex].error = error;
        set({ viewports });
      },

      setSelectedViewport: (index: number) => {
        set({ selectedViewport: index });
      },

      setViewportCount: (count: ViewportCount) => {
        const currentViewports = get().viewports;
        const newViewports = createViewports(count);

        // Preserve existing streams for indices that still exist
        for (let i = 0; i < Math.min(currentViewports.length, count); i++) {
          newViewports[i] = {
            ...currentViewports[i],
            index: i,
          };
        }

        set({
          viewports: newViewports,
          viewportCount: count,
          selectedViewport: Math.min(get().selectedViewport, count - 1),
        });
      },
    }),
    {
      name: "viewport-storage",
      partialize: (state) => ({
        viewportCount: state.viewportCount,
      }),
    },
  ),
);

export { useViewportStore };
export type { ViewportCount };
