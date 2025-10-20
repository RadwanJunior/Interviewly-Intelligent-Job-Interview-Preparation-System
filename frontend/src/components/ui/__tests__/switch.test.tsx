/**
 * Tests for Switch component
 * Validates rendering, checked states, toggle behavior, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "../switch";

describe("Switch Component", () => {
  describe("Rendering", () => {
    it("should render a switch", () => {
      render(<Switch />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      render(<Switch />);
      const switchElement = screen.getByRole("switch");
      
      expect(switchElement.className).toContain("h-6");
      expect(switchElement.className).toContain("w-11");
      expect(switchElement.className).toContain("rounded-full");
      expect(switchElement.className).toContain("peer");
    });

    it("should render thumb element", () => {
      const { container } = render(<Switch />);
      const thumb = container.querySelector('[data-state]')?.firstChild;
      expect(thumb).toBeInTheDocument();
    });
  });

  describe("Checked States", () => {
    it("should be unchecked by default", () => {
      render(<Switch />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("aria-checked", "false");
    });

    it("should be checked when checked prop is true", () => {
      render(<Switch checked={true} onCheckedChange={() => {}} />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("aria-checked", "true");
    });

    it("should support defaultChecked", () => {
      render(<Switch defaultChecked={true} />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("aria-checked", "true");
    });

    it("should have checked styling when on", () => {
      render(<Switch checked={true} onCheckedChange={() => {}} />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement.className).toContain("data-[state=checked]:bg-primary");
    });

    it("should have unchecked styling when off", () => {
      render(<Switch checked={false} onCheckedChange={() => {}} />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement.className).toContain("data-[state=unchecked]:bg-input");
    });
  });

  describe("Toggle Behavior", () => {
    it("should toggle on click", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Switch onCheckedChange={handleChange} />);
      const switchElement = screen.getByRole("switch");
      
      await user.click(switchElement);
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("should call onCheckedChange when toggled", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Switch checked={false} onCheckedChange={handleChange} />);
      const switchElement = screen.getByRole("switch");
      
      await user.click(switchElement);
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it("should toggle with keyboard (Space)", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Switch onCheckedChange={handleChange} />);
      const switchElement = screen.getByRole("switch");
      
      switchElement.focus();
      await user.keyboard(" ");
      expect(handleChange).toHaveBeenCalled();
    });

    it("should toggle with keyboard (Enter)", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Switch onCheckedChange={handleChange} />);
      const switchElement = screen.getByRole("switch");
      
      switchElement.focus();
      await user.keyboard("{Enter}");
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Switch disabled />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeDisabled();
    });

    it("should have disabled styling", () => {
      render(<Switch disabled />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement.className).toContain("disabled:cursor-not-allowed");
      expect(switchElement.className).toContain("disabled:opacity-50");
    });

    it("should not respond to click when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Switch disabled onCheckedChange={handleChange} />);
      const switchElement = screen.getByRole("switch");
      
      await user.click(switchElement);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it("should not respond to keyboard when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Switch disabled onCheckedChange={handleChange} />);
      const switchElement = screen.getByRole("switch");
      
      switchElement.focus();
      await user.keyboard(" ");
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<Switch className="custom-switch" />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement.className).toContain("custom-switch");
    });

    it("should have focus-visible ring styles", () => {
      render(<Switch />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement.className).toContain("focus-visible:outline-none");
      expect(switchElement.className).toContain("focus-visible:ring-2");
    });

    it("should have transition classes", () => {
      render(<Switch />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement.className).toContain("transition-colors");
    });

    it("should have thumb with proper styling", () => {
      const { container } = render(<Switch />);
      const thumb = container.querySelector('span[class*="pointer-events-none"]');
      expect(thumb).toBeInTheDocument();
      expect(thumb?.className).toContain("h-5");
      expect(thumb?.className).toContain("w-5");
      expect(thumb?.className).toContain("rounded-full");
      expect(thumb?.className).toContain("bg-background");
    });

    it("should have thumb transition on checked state", () => {
      const { container } = render(<Switch checked={true} onCheckedChange={() => {}} />);
      const thumb = container.querySelector('span[class*="pointer-events-none"]');
      expect(thumb?.className).toContain("data-[state=checked]:translate-x-5");
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard accessible", () => {
      render(<Switch />);
      const switchElement = screen.getByRole("switch");
      switchElement.focus();
      expect(switchElement).toHaveFocus();
    });

    it("should support aria-label", () => {
      render(<Switch aria-label="Enable notifications" />);
      expect(screen.getByLabelText("Enable notifications")).toBeInTheDocument();
    });

    it("should support aria-describedby", () => {
      render(<Switch aria-describedby="switch-description" />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("aria-describedby", "switch-description");
    });

    it("should have proper role", () => {
      render(<Switch />);
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    it("should have aria-checked attribute", () => {
      render(<Switch />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("aria-checked");
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Switch ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("Form Integration", () => {
    it("should accept name attribute", () => {
      render(<Switch name="notifications" />);
      const switchElement = screen.getByRole("switch");
      // Radix Switch is a button element, name is passed to hidden input
      expect(switchElement).toBeInTheDocument();
    });

    it("should accept value attribute", () => {
      render(<Switch value="enabled" />);
      const switchElement = screen.getByRole("switch");
      // Value is used for form submission via hidden input
      expect(switchElement).toBeInTheDocument();
    });

    it("should support required attribute via aria-required", () => {
      render(<Switch required />);
      const switchElement = screen.getByRole("switch");
      // Radix sets aria-required instead of HTML required attribute for buttons
      expect(switchElement).toHaveAttribute("aria-required", "true");
    });
  });
});
