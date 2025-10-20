/**
 * Tests for Badge component
 * Validates rendering, variants, custom styling, and accessibility
 */

import { render, screen } from "@testing-library/react";
import { Badge } from "../badge";

describe("Badge Component", () => {
  describe("Rendering", () => {
    it("should render with children content", () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText("Test Badge")).toBeInTheDocument();
    });

    it("should render as a div element", () => {
      const { container } = render(<Badge>Badge</Badge>);
      expect(container.querySelector("div")).toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    it("should render default variant by default", () => {
      const { container } = render(<Badge>Default</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("bg-primary");
      expect(badge.className).toContain("text-primary-foreground");
    });

    it("should render secondary variant", () => {
      const { container } = render(
        <Badge variant="secondary">Secondary</Badge>
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("bg-secondary");
      expect(badge.className).toContain("text-secondary-foreground");
    });

    it("should render destructive variant", () => {
      const { container } = render(
        <Badge variant="destructive">Destructive</Badge>
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("bg-destructive");
      expect(badge.className).toContain("text-destructive-foreground");
    });

    it("should render outline variant", () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("text-foreground");
    });
  });

  describe("Styling", () => {
    it("should have base styling classes", () => {
      const { container } = render(<Badge>Badge</Badge>);
      const badge = container.firstChild as HTMLElement;

      expect(badge.className).toContain("inline-flex");
      expect(badge.className).toContain("items-center");
      expect(badge.className).toContain("rounded-full");
      expect(badge.className).toContain("border");
      expect(badge.className).toContain("text-xs");
      expect(badge.className).toContain("font-semibold");
    });

    it("should accept custom className", () => {
      const { container } = render(
        <Badge className="custom-class">Badge</Badge>
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("custom-class");
    });

    it("should have focus ring styles", () => {
      const { container } = render(<Badge>Badge</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("focus:outline-none");
      expect(badge.className).toContain("focus:ring-2");
    });
  });

  describe("Props", () => {
    it("should pass through HTML div attributes", () => {
      render(
        <Badge data-testid="test-badge" role="status">
          Badge
        </Badge>
      );
      const badge = screen.getByTestId("test-badge");
      expect(badge).toHaveAttribute("role", "status");
    });

    it("should support onClick handler", () => {
      const handleClick = jest.fn();
      render(<Badge onClick={handleClick}>Clickable</Badge>);
      const badge = screen.getByText("Clickable");
      badge.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Content", () => {
    it("should render text content", () => {
      render(<Badge>Simple Text</Badge>);
      expect(screen.getByText("Simple Text")).toBeInTheDocument();
    });

    it("should render with numbers", () => {
      render(<Badge>99+</Badge>);
      expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("should render with nested elements", () => {
      render(
        <Badge>
          <span data-testid="icon">★</span>
          <span>Starred</span>
        </Badge>
      );
      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("Starred")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard accessible when interactive", () => {
      const { container } = render(<Badge tabIndex={0}>Badge</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveAttribute("tabIndex", "0");
    });

    it("should support aria-label", () => {
      render(<Badge aria-label="Status badge">New</Badge>);
      expect(screen.getByLabelText("Status badge")).toBeInTheDocument();
    });
  });
});
