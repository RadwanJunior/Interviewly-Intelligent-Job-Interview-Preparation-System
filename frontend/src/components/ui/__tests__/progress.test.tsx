/**
 * Tests for Progress component
 * Validates rendering, value display, progress indicator, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { Progress } from "../progress";

describe("Progress Component", () => {
  describe("Rendering", () => {
    it("should render a progress element", () => {
      render(<Progress value={50} />);
      // Progress uses a div with progressbar role
      const progress = screen.getByRole("progressbar");
      expect(progress).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole("progressbar");
      
      expect(progress.className).toContain("relative");
      expect(progress.className).toContain("h-4");
      expect(progress.className).toContain("w-full");
      expect(progress.className).toContain("overflow-hidden");
      expect(progress.className).toContain("rounded-full");
      expect(progress.className).toContain("bg-secondary");
    });

    it("should render indicator element", () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('div[class*="bg-primary"]');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe("Value Display", () => {
    it("should accept value prop", () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('div[class*="bg-primary"]') as HTMLElement;
      // Value is used for indicator transform
      expect(indicator.style.transform).toBe("translateX(-50%)");
    });

    it("should handle 0% progress", () => {
      const { container } = render(<Progress value={0} />);
      const indicator = container.querySelector('div[class*="bg-primary"]') as HTMLElement;
      expect(indicator.style.transform).toBe("translateX(-100%)");
    });

    it("should handle 100% progress", () => {
      const { container } = render(<Progress value={100} />);
      const indicator = container.querySelector('div[class*="bg-primary"]') as HTMLElement;
      expect(indicator.style.transform).toBe("translateX(-0%)");
    });

    it("should handle undefined value", () => {
      const { container } = render(<Progress />);
      const indicator = container.querySelector('div[class*="bg-primary"]') as HTMLElement;
      // undefined value defaults to 0
      expect(indicator.style.transform).toBe("translateX(-100%)");
    });
  });

  describe("Progress Indicator", () => {
    it("should set indicator width based on value", () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('div[class*="bg-primary"]') as HTMLElement;
      expect(indicator).toBeInTheDocument();
      // Radix sets transform: translateX(-${100 - value}%)
      expect(indicator.style.transform).toBe("translateX(-50%)");
    });

    it("should have indicator at 0% when value is 0", () => {
      const { container } = render(<Progress value={0} />);
      const indicator = container.querySelector('div[class*="bg-primary"]') as HTMLElement;
      expect(indicator.style.transform).toBe("translateX(-100%)");
    });

    it("should have indicator at 100% when value is 100", () => {
      const { container } = render(<Progress value={100} />);
      const indicator = container.querySelector('div[class*="bg-primary"]') as HTMLElement;
      expect(indicator.style.transform).toBe("translateX(-0%)");
    });

    it("should have indicator styling", () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('div[class*="bg-primary"]');
      expect(indicator?.className).toContain("h-full");
      expect(indicator?.className).toContain("w-full");
      expect(indicator?.className).toContain("bg-primary");
      expect(indicator?.className).toContain("transition-all");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<Progress value={50} className="custom-progress" />);
      const progress = screen.getByRole("progressbar");
      expect(progress.className).toContain("custom-progress");
    });

    it("should have transition classes", () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('div[class*="bg-primary"]');
      expect(indicator?.className).toContain("transition-all");
    });

    it("should support custom height via className", () => {
      render(<Progress value={50} className="h-2" />);
      const progress = screen.getByRole("progressbar");
      expect(progress.className).toContain("h-2");
    });
  });

  describe("Accessibility", () => {
    it("should have progressbar role", () => {
      render(<Progress value={50} />);
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("should support aria-label", () => {
      render(<Progress value={50} aria-label="Upload progress" />);
      expect(screen.getByLabelText("Upload progress")).toBeInTheDocument();
    });

    it("should support aria-describedby", () => {
      render(<Progress value={50} aria-describedby="progress-description" />);
      const progress = screen.getByRole("progressbar");
      expect(progress).toHaveAttribute("aria-describedby", "progress-description");
    });

    it("should be accessible for screen readers", () => {
      render(<Progress value={60} aria-label="Loading content" />);
      const progress = screen.getByLabelText("Loading content");
      expect(progress).toHaveAttribute("role", "progressbar");
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Progress ref={ref} value={50} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small values", () => {
      const { container } = render(<Progress value={1} />);
      const indicator = container.querySelector('div[class*="bg-primary"]') as HTMLElement;
      expect(indicator.style.transform).toBe("translateX(-99%)");
    });

    it("should handle decimal values", () => {
      const { container } = render(<Progress value={33.33} />);
      const indicator = container.querySelector('div[class*="bg-primary"]') as HTMLElement;
      expect(indicator.style.transform).toBe("translateX(-66.67%)");
    });

    it("should handle values over 100", () => {
      const { container } = render(<Progress value={150} />);
      const indicator = container.querySelector('div[class*="bg-primary"]') as HTMLElement;
      // Component doesn't clamp, so it allows over 100%
      expect(indicator.style.transform).toContain("translateX");
    });
  });
});
