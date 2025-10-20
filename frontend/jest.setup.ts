/**
 * Jest Setup File
 * Runs before each test suite to configure the testing environment
 * Includes: Testing Library matchers, global polyfills, and console suppression
 */

import "@testing-library/jest-dom";

// Polyfill for Next.js dynamic imports in tests
if (typeof window !== "undefined") {
  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as unknown as typeof IntersectionObserver;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;

  // Mock hasPointerCapture and scrollIntoView for Radix UI Select
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = jest.fn(() => false);
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = jest.fn();
  }
}

// Suppress console errors during tests to reduce noise
const originalError = console.error;
const originalLog = console.log;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Not implemented: HTMLFormElement.prototype.submit") ||
        args[0].includes("Error refreshing token") ||
        args[0].includes("Network Error") ||
        args[0].includes("An update to") ||
        args[0].includes("wrapped in act") ||
        args[0].includes("Error logging out") ||
        args[0].includes("An unknown error occurred during logout") ||
        args[0].includes("Failed to fetch feedback") ||
        args[0].includes("Error fetching dashboard data"))
    ) {
      return;
    }
    // Suppress AxiosError objects and AggregateError
    const firstArg = args[0] as Record<string, unknown>;
    if (
      firstArg?.name === "AxiosError" ||
      firstArg?.message === "Network Error" ||
      (firstArg && String(firstArg).includes("AggregateError"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.log = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Feedback still processing")
    ) {
      return;
    }
    originalLog.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
});
