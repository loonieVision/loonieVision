import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useUIStore } from "./uiStore";

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      isSidebarCollapsed: false,
    });
  });

  afterEach(() => {
    useUIStore.setState({
      isSidebarCollapsed: false,
    });
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      expect(useUIStore.getState()).toEqual({
        isSidebarCollapsed: false,
        toggleSidebar: expect.any(Function),
        setSidebarCollapsed: expect.any(Function),
      });
    });
  });

  describe("toggleSidebar", () => {
    it("should toggle isSidebarCollapsed from false to true", () => {
      expect(useUIStore.getState().isSidebarCollapsed).toBe(false);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarCollapsed).toBe(true);
    });

    it("should toggle isSidebarCollapsed from true to false", () => {
      useUIStore.setState({ isSidebarCollapsed: true });
      expect(useUIStore.getState().isSidebarCollapsed).toBe(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarCollapsed).toBe(false);
    });

    it("should toggle multiple times correctly", () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarCollapsed).toBe(true);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarCollapsed).toBe(false);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarCollapsed).toBe(true);
    });
  });

  describe("setSidebarCollapsed", () => {
    it("should set isSidebarCollapsed to true", () => {
      useUIStore.getState().setSidebarCollapsed(true);
      expect(useUIStore.getState().isSidebarCollapsed).toBe(true);
    });

    it("should set isSidebarCollapsed to false", () => {
      useUIStore.setState({ isSidebarCollapsed: true });
      useUIStore.getState().setSidebarCollapsed(false);
      expect(useUIStore.getState().isSidebarCollapsed).toBe(false);
    });

    it("should allow setting the same value", () => {
      useUIStore.getState().setSidebarCollapsed(false);
      expect(useUIStore.getState().isSidebarCollapsed).toBe(false);

      useUIStore.setState({ isSidebarCollapsed: true });
      useUIStore.getState().setSidebarCollapsed(true);
      expect(useUIStore.getState().isSidebarCollapsed).toBe(true);
    });
  });

  describe("interaction between methods", () => {
    it("setSidebarCollapsed should override toggleSidebar state", () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarCollapsed).toBe(true);

      useUIStore.getState().setSidebarCollapsed(false);
      expect(useUIStore.getState().isSidebarCollapsed).toBe(false);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarCollapsed).toBe(true);
    });
  });
});
