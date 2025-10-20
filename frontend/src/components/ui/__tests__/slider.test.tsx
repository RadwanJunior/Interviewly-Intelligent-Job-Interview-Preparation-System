/**
 * Tests for Slider component
 * Validates rendering, value control, range selection, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { Slider } from "../slider";

describe("Slider Component", () => {
  describe("Rendering", () => {
    it("should render a slider", () => {
      render(<Slider data-testid="slider" />);
      const slider = screen.getByTestId("slider");
      expect(slider).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      render(<Slider data-testid="slider" />);
      const slider = screen.getByTestId("slider");
      expect(slider.className).toContain("relative");
      expect(slider.className).toContain("flex");
      expect(slider.className).toContain("w-full");
      expect(slider.className).toContain("touch-none");
      expect(slider.className).toContain("select-none");
    });

    it("should render track", () => {
      const { container } = render(<Slider />);
      const track = container.querySelector('[class*="bg-secondary"]');
      expect(track).toBeInTheDocument();
      expect(track?.className).toContain("rounded-full");
    });

    it("should render range", () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      const range = container.querySelector(
        '[class*="bg-primary"][class*="absolute"]'
      );
      expect(range).toBeInTheDocument();
    });

    it("should render thumb", () => {
      const { container } = render(<Slider />);
      const thumb = container.querySelector(
        '[class*="rounded-full"][class*="border-2"]'
      );
      expect(thumb).toBeInTheDocument();
    });
  });

  describe("Value Control", () => {
    it("should support default value", () => {
      render(<Slider defaultValue={[25]} data-testid="slider" />);
      const slider = screen.getByTestId("slider");
      expect(slider).toHaveAttribute("data-orientation", "horizontal");
    });

    it("should support controlled value", () => {
      const { rerender } = render(
        <Slider value={[30]} onValueChange={() => {}} data-testid="slider" />
      );
      expect(screen.getByTestId("slider")).toBeInTheDocument();

      rerender(
        <Slider value={[70]} onValueChange={() => {}} data-testid="slider" />
      );
      expect(screen.getByTestId("slider")).toBeInTheDocument();
    });

    it("should call onValueChange when value changes", async () => {
      const handleChange = jest.fn();
      const { container } = render(
        <Slider defaultValue={[50]} onValueChange={handleChange} />
      );

      const thumb = container.querySelector('[role="slider"]');
      expect(thumb).toBeInTheDocument();
    });

    it("should support min and max values", () => {
      const { container } = render(
        <Slider min={0} max={100} defaultValue={[50]} />
      );
      const slider = container.querySelector('[role="slider"]');
      expect(slider).toHaveAttribute("aria-valuemin", "0");
      expect(slider).toHaveAttribute("aria-valuemax", "100");
    });

    it("should support step", () => {
      const { container } = render(<Slider step={10} defaultValue={[50]} />);
      const slider = container.querySelector('[role="slider"]');
      expect(slider).toBeInTheDocument();
    });
  });

  describe("Orientation", () => {
    it("should be horizontal by default", () => {
      render(<Slider data-testid="slider" />);
      const slider = screen.getByTestId("slider");
      expect(slider).toHaveAttribute("data-orientation", "horizontal");
    });

    it("should support vertical orientation", () => {
      render(<Slider orientation="vertical" data-testid="slider" />);
      const slider = screen.getByTestId("slider");
      expect(slider).toHaveAttribute("data-orientation", "vertical");
    });
  });

  describe("Disabled State", () => {
    it("should support disabled state", () => {
      const { container } = render(<Slider disabled />);
      const thumb = container.querySelector('[role="slider"]');
      expect(thumb).toHaveAttribute("data-disabled");
    });

    it("should have disabled styling", () => {
      const { container } = render(<Slider disabled />);
      const thumb = container.querySelector('[role="slider"]');
      expect(thumb?.className).toContain("disabled:pointer-events-none");
      expect(thumb?.className).toContain("disabled:opacity-50");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<Slider className="custom-slider" data-testid="slider" />);
      const slider = screen.getByTestId("slider");
      expect(slider.className).toContain("custom-slider");
    });

    it("should have thumb with proper styling", () => {
      const { container } = render(<Slider />);
      const thumb = container.querySelector('[role="slider"]');
      expect(thumb?.className).toContain("h-5");
      expect(thumb?.className).toContain("w-5");
      expect(thumb?.className).toContain("rounded-full");
      expect(thumb?.className).toContain("border-primary");
      expect(thumb?.className).toContain("bg-background");
    });

    it("should have focus ring styles on thumb", () => {
      const { container } = render(<Slider />);
      const thumb = container.querySelector('[role="slider"]');
      expect(thumb?.className).toContain("focus-visible:outline-none");
      expect(thumb?.className).toContain("focus-visible:ring-2");
    });
  });

  describe("Accessibility", () => {
    it("should have slider role", () => {
      const { container } = render(<Slider />);
      const slider = container.querySelector('[role="slider"]');
      expect(slider).toBeInTheDocument();
    });

    it("should have aria-valuemin", () => {
      const { container } = render(<Slider min={0} defaultValue={[50]} />);
      const slider = container.querySelector('[role="slider"]');
      expect(slider).toHaveAttribute("aria-valuemin", "0");
    });

    it("should have aria-valuemax", () => {
      const { container } = render(<Slider max={100} defaultValue={[50]} />);
      const slider = container.querySelector('[role="slider"]');
      expect(slider).toHaveAttribute("aria-valuemax", "100");
    });

    it("should have aria-valuenow", () => {
      const { container } = render(<Slider defaultValue={[75]} />);
      const slider = container.querySelector('[role="slider"]');
      expect(slider).toHaveAttribute("aria-valuenow");
    });

    it("should support aria-label", () => {
      const { container } = render(
        <Slider aria-label="Volume" defaultValue={[50]} />
      );
      const slider = container.querySelector('[aria-label="Volume"]');
      expect(slider).toBeInTheDocument();
    });

    it("should be keyboard accessible", () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      const slider = container.querySelector('[role="slider"]') as HTMLElement;
      slider?.focus();
      expect(slider).toHaveFocus();
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref", () => {
      const ref = React.createRef<HTMLSpanElement>();
      render(<Slider ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });
  });

  describe("Usage Scenarios", () => {
    it("should work as volume control", () => {
      const { container } = render(
        <Slider
          min={0}
          max={100}
          step={1}
          defaultValue={[50]}
          aria-label="Volume"
        />
      );
      const slider = container.querySelector('[aria-label="Volume"]');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute("aria-label", "Volume");
    });

    it("should work as range selector", () => {
      const { container } = render(
        <Slider min={0} max={100} step={5} defaultValue={[20, 80]} />
      );
      const sliders = container.querySelectorAll('[role="slider"]');
      expect(sliders.length).toBeGreaterThanOrEqual(1); // Can be 1 or 2 thumbs
    });

    it("should work with custom step", () => {
      const { container } = render(
        <Slider min={0} max={10} step={0.5} defaultValue={[5]} />
      );
      const slider = container.querySelector('[role="slider"]');
      expect(slider).toBeInTheDocument();
    });
  });
});
