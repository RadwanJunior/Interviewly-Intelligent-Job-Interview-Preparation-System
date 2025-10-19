/**
 * Tests for Skeleton component
 * Validates rendering, loading placeholder, animation, and styling
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "../skeleton";

describe("Skeleton Component", () => {
  describe("Rendering", () => {
    it("should render a div element", () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.tagName).toBe("DIV");
    });

    it("should have base styling classes", () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton.className).toContain("animate-pulse");
      expect(skeleton.className).toContain("rounded-md");
      expect(skeleton.className).toContain("bg-muted");
    });

    it("should render without children", () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toBeEmptyDOMElement();
    });
  });

  describe("Animation", () => {
    it("should have pulse animation", () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton.className).toContain("animate-pulse");
    });

    it("should support disabling animation via className", () => {
      render(
        <Skeleton data-testid="skeleton" className="animate-none" />
      );
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton.className).toContain("animate-none");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(
        <Skeleton data-testid="skeleton" className="custom-skeleton" />
      );
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton.className).toContain("custom-skeleton");
    });

    it("should merge custom className with base styles", () => {
      render(
        <Skeleton data-testid="skeleton" className="h-12 w-12" />
      );
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton.className).toContain("h-12");
      expect(skeleton.className).toContain("w-12");
      expect(skeleton.className).toContain("animate-pulse");
      expect(skeleton.className).toContain("bg-muted");
    });

    it("should support custom dimensions", () => {
      render(
        <Skeleton data-testid="skeleton" className="h-4 w-full" />
      );
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton.className).toContain("h-4");
      expect(skeleton.className).toContain("w-full");
    });

    it("should support custom rounded styles", () => {
      render(
        <Skeleton data-testid="skeleton" className="rounded-full" />
      );
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton.className).toContain("rounded-full");
    });

    it("should support custom background colors", () => {
      render(
        <Skeleton data-testid="skeleton" className="bg-gray-200" />
      );
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton.className).toContain("bg-gray-200");
    });
  });

  describe("HTML Attributes", () => {
    it("should support aria-label", () => {
      render(
        <Skeleton data-testid="skeleton" aria-label="Loading content" />
      );
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveAttribute("aria-label", "Loading content");
    });

    it("should support aria-busy", () => {
      render(
        <Skeleton data-testid="skeleton" aria-busy="true" />
      );
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
    });

    it("should support data attributes", () => {
      render(
        <Skeleton data-testid="skeleton" data-loading="true" />
      );
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveAttribute("data-loading", "true");
    });
  });

  describe("Usage Scenarios", () => {
    it("should work as text line placeholder", () => {
      render(
        <div>
          <Skeleton data-testid="text-skeleton" className="h-4 w-full" />
        </div>
      );
      const skeleton = screen.getByTestId("text-skeleton");
      expect(skeleton.className).toContain("h-4");
      expect(skeleton.className).toContain("w-full");
    });

    it("should work as avatar placeholder", () => {
      render(
        <div>
          <Skeleton data-testid="avatar-skeleton" className="h-12 w-12 rounded-full" />
        </div>
      );
      const skeleton = screen.getByTestId("avatar-skeleton");
      expect(skeleton.className).toContain("h-12");
      expect(skeleton.className).toContain("w-12");
      expect(skeleton.className).toContain("rounded-full");
    });

    it("should work as card placeholder", () => {
      render(
        <div>
          <Skeleton data-testid="card-skeleton" className="h-24 w-full" />
        </div>
      );
      const skeleton = screen.getByTestId("card-skeleton");
      expect(skeleton.className).toContain("h-24");
      expect(skeleton.className).toContain("w-full");
    });

    it("should work in multiple skeleton layout", () => {
      render(
        <div className="space-y-2">
          <Skeleton data-testid="skeleton-1" className="h-4 w-full" />
          <Skeleton data-testid="skeleton-2" className="h-4 w-3/4" />
          <Skeleton data-testid="skeleton-3" className="h-4 w-1/2" />
        </div>
      );
      expect(screen.getByTestId("skeleton-1")).toBeInTheDocument();
      expect(screen.getByTestId("skeleton-2")).toBeInTheDocument();
      expect(screen.getByTestId("skeleton-3")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should be accessible with aria-label", () => {
      render(
        <Skeleton data-testid="skeleton" aria-label="Loading user profile" />
      );
      const skeleton = screen.getByLabelText("Loading user profile");
      expect(skeleton).toBeInTheDocument();
    });

    it("should indicate loading state with aria-busy", () => {
      render(
        <Skeleton data-testid="skeleton" aria-busy="true" aria-label="Loading" />
      );
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
    });
  });
});
