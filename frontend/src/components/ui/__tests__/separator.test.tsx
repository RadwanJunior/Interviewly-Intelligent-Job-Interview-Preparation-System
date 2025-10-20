/**
 * Tests for Separator component
 * Validates rendering, orientation, decorative mode, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { Separator } from "../separator";

describe("Separator Component", () => {
  describe("Rendering", () => {
    it("should render a separator element", () => {
      render(<Separator data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      expect(separator).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      render(<Separator data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      expect(separator.className).toContain("shrink-0");
      expect(separator.className).toContain("bg-border");
    });

    it("should be decorative by default", () => {
      render(<Separator data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      expect(separator).toHaveAttribute("data-orientation");
      // Decorative separators have role="none"
      expect(separator).toHaveAttribute("role", "none");
    });
  });

  describe("Orientation", () => {
    it("should be horizontal by default", () => {
      render(<Separator data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      expect(separator).toHaveAttribute("data-orientation", "horizontal");
    });

    it("should have horizontal styling by default", () => {
      render(<Separator data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      expect(separator.className).toContain("h-[1px]");
      expect(separator.className).toContain("w-full");
    });

    it("should support vertical orientation", () => {
      render(<Separator orientation="vertical" data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      expect(separator).toHaveAttribute("data-orientation", "vertical");
    });

    it("should have vertical styling when orientation is vertical", () => {
      render(<Separator orientation="vertical" data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      expect(separator.className).toContain("h-full");
      expect(separator.className).toContain("w-[1px]");
    });

    it("should support explicit horizontal orientation", () => {
      render(<Separator orientation="horizontal" data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      expect(separator).toHaveAttribute("data-orientation", "horizontal");
      expect(separator.className).toContain("h-[1px]");
      expect(separator.className).toContain("w-full");
    });
  });

  describe("Decorative Mode", () => {
    it("should be decorative by default", () => {
      render(<Separator data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      // Decorative separators have role="none"
      expect(separator).toHaveAttribute("role", "none");
    });

    it("should support non-decorative mode", () => {
      render(<Separator decorative={false} />);
      const separator = screen.getByRole("separator");
      expect(separator).toBeInTheDocument();
    });

    it("should be accessible when decorative is false", () => {
      render(<Separator decorative={false} aria-label="Content divider" />);
      const separator = screen.getByRole("separator");
      expect(separator).toHaveAttribute("aria-label", "Content divider");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(
        <Separator className="custom-separator" data-testid="separator" />
      );
      const separator = screen.getByTestId("separator");
      expect(separator.className).toContain("custom-separator");
    });

    it("should merge custom className with base styles", () => {
      render(<Separator className="my-4" data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      expect(separator.className).toContain("my-4");
      expect(separator.className).toContain("bg-border");
    });

    it("should support custom colors via className", () => {
      render(<Separator className="bg-red-500" data-testid="separator" />);
      const separator = screen.getByTestId("separator");
      expect(separator.className).toContain("bg-red-500");
    });
  });

  describe("Accessibility", () => {
    it("should have separator role", () => {
      render(<Separator decorative={false} />);
      expect(screen.getByRole("separator")).toBeInTheDocument();
    });

    it("should support aria-label when not decorative", () => {
      render(<Separator decorative={false} aria-label="Section divider" />);
      expect(screen.getByLabelText("Section divider")).toBeInTheDocument();
    });

    it("should support aria-orientation", () => {
      render(<Separator orientation="vertical" decorative={false} />);
      const separator = screen.getByRole("separator");
      expect(separator).toHaveAttribute("data-orientation", "vertical");
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Separator ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("Usage Scenarios", () => {
    it("should work as content divider", () => {
      render(
        <div>
          <p>Content above</p>
          <Separator className="my-4" data-testid="separator" />
          <p>Content below</p>
        </div>
      );
      const separator = screen.getByTestId("separator");
      expect(separator).toBeInTheDocument();
      expect(screen.getByText("Content above")).toBeInTheDocument();
      expect(screen.getByText("Content below")).toBeInTheDocument();
    });

    it("should work in vertical layout", () => {
      render(
        <div className="flex">
          <div>Left content</div>
          <Separator
            orientation="vertical"
            className="mx-2"
            data-testid="separator"
          />
          <div>Right content</div>
        </div>
      );
      const separator = screen.getByTestId("separator");
      expect(separator).toHaveAttribute("data-orientation", "vertical");
    });
  });
});
