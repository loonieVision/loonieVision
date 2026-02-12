import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

// Extend vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock @tauri-apps/api/event
const mockUnlisten = vi.fn();
const mockListeners = new Map<string, Array<(event: unknown) => void>>();

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((eventName: string, handler: (event: unknown) => void) => {
    if (!mockListeners.has(eventName)) {
      mockListeners.set(eventName, []);
    }
    mockListeners.get(eventName)!.push(handler);
    return Promise.resolve(mockUnlisten);
  }),
  emit: vi.fn((eventName: string, payload?: unknown) => {
    const handlers = mockListeners.get(eventName) || [];
    handlers.forEach((handler) => handler({ payload }));
  }),
  // Helper to clear all listeners (useful in tests)
  __clearListeners: () => {
    mockListeners.clear();
  },
  // Helper to get mock unlisten function for assertions
  __getMockUnlisten: () => mockUnlisten,
}));

// Mock matchMedia (used by some UI libraries)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});
