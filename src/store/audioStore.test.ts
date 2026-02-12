import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAudioStore } from "./audioStore";

describe("useAudioStore", () => {
  beforeEach(() => {
    useAudioStore.setState({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
    });
  });

  afterEach(() => {
    useAudioStore.setState({
      viewportWithAudioActive: 0,
      masterVolume: 1,
      isMuted: false,
    });
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      expect(useAudioStore.getState()).toEqual({
        viewportWithAudioActive: 0,
        masterVolume: 1,
        isMuted: false,
        setAudioOnForViewport: expect.any(Function),
        setMasterVolume: expect.any(Function),
        toggleMute: expect.any(Function),
      });
    });
  });

  describe("setAudioOnForViewport", () => {
    it("should set the active viewport index", () => {
      useAudioStore.getState().setAudioOnForViewport(2);
      expect(useAudioStore.getState().viewportWithAudioActive).toBe(2);
    });

    it("should allow 0 as viewport index", () => {
      useAudioStore.getState().setAudioOnForViewport(0);
      expect(useAudioStore.getState().viewportWithAudioActive).toBe(0);
    });
  });

  describe("setMasterVolume", () => {
    it("should set volume within valid range", () => {
      useAudioStore.getState().setMasterVolume(0.5);
      expect(useAudioStore.getState().masterVolume).toBe(0.5);

      useAudioStore.getState().setMasterVolume(1);
      expect(useAudioStore.getState().masterVolume).toBe(1);
    });

    it("should clamp volume to maximum of 1", () => {
      useAudioStore.getState().setMasterVolume(2);
      expect(useAudioStore.getState().masterVolume).toBe(1);
    });

    it("should clamp volume to minimum of 0", () => {
      useAudioStore.getState().setMasterVolume(-1);
      expect(useAudioStore.getState().masterVolume).toBe(0);
    });

    it("should allow exact boundary values", () => {
      useAudioStore.getState().setMasterVolume(0);
      expect(useAudioStore.getState().masterVolume).toBe(0);

      useAudioStore.getState().setMasterVolume(1);
      expect(useAudioStore.getState().masterVolume).toBe(1);
    });
  });

  describe("toggleMute", () => {
    it("should toggle isMuted from false to true", () => {
      expect(useAudioStore.getState().isMuted).toBe(false);
      useAudioStore.getState().toggleMute();
      expect(useAudioStore.getState().isMuted).toBe(true);
    });

    it("should toggle isMuted from true to false", () => {
      useAudioStore.setState({ isMuted: true });
      expect(useAudioStore.getState().isMuted).toBe(true);
      useAudioStore.getState().toggleMute();
      expect(useAudioStore.getState().isMuted).toBe(false);
    });
  });
});
