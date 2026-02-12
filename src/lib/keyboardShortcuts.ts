import { useEffect } from "react";

import { useAudioStore } from "../store/audioStore";
import { useUIStore } from "../store/uiStore";
import { useViewportStore } from "../store/viewportStore";

export const useKeyboardShortcuts = () => {
  const { setAudioOnForViewport, masterVolume, setMasterVolume, toggleMute } = useAudioStore();
  const { removeStream, viewportCount } = useViewportStore();
  const { toggleSidebar } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Number keys 1-4: Focus audio on viewport
      if (event.key >= "1" && event.key <= "4") {
        const index = parseInt(event.key) - 1;

        if (index < viewportCount) {
          setAudioOnForViewport(index);
        }
      }

      // F: Toggle fullscreen for active viewport
      if (event.key === "f" || event.key === "F") {
        const activeViewport =
          document.querySelectorAll("video")[useAudioStore.getState().viewportWithAudioActive];
        if (activeViewport) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            activeViewport.requestFullscreen();
          }
        }
      }

      // M: Toggle mute
      if (event.key === "m" || event.key === "M") {
        toggleMute();
      }

      // S: Toggle mute
      if (event.key === "s" || event.key === "S") {
        toggleSidebar();
      }

      // Arrow Up/Down: Volume control
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMasterVolume(masterVolume + 0.1);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMasterVolume(masterVolume - 0.1);
      }

      // Delete/Backspace: Remove stream from active viewport
      if (event.key === "Delete" || event.key === "Backspace") {
        const activeIndex = useAudioStore.getState().viewportWithAudioActive;
        removeStream(activeIndex);
      }

      // Escape: Exit fullscreen
      if (event.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setAudioOnForViewport, masterVolume, setMasterVolume, toggleMute, removeStream]);
};
