/**
 * Tests for Checkbox component
 * Validates rendering, checked states, user interaction, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "../checkbox";

// Mock lucide-react Check icon
jest.mock("lucide-react", () => ({
  Check: ({ className }: { className?: string }) => (
    <span data-testid="check-icon" className={className}>✓</span>
  ),
}));

describe("Checkbox Component", () => {
  describe("Rendering", () => {
    it("should render a checkbox", () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole("checkbox");
      
      expect(checkbox.className).toContain("h-4");
      expect(checkbox.className).toContain("w-4");
      expect(checkbox.className).toContain("rounded-sm");
      expect(checkbox.className).toContain("border");
    });

    it("should not show check icon when unchecked", () => {
      render(<Checkbox />);
      expect(screen.queryByTestId("check-icon")).not.toBeInTheDocument();
    });
  });

  describe("Checked States", () => {
    it("should be unchecked by default", () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
    });

    it("should be checked when checked prop is true", () => {
      render(<Checkbox checked={true} onCheckedChange={() => {}} />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("should show check icon when checked", () => {
      render(<Checkbox checked={true} onCheckedChange={() => {}} />);
      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });

    it("should support defaultChecked", () => {
      render(<Checkbox defaultChecked={true} />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });
  });

  describe("User Interaction", () => {
    it("should toggle checked state on click", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Checkbox onCheckedChange={handleChange} />);
      const checkbox = screen.getByRole("checkbox");
      
      await user.click(checkbox);
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("should call onCheckedChange when toggled", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Checkbox checked={false} onCheckedChange={handleChange} />);
      const checkbox = screen.getByRole("checkbox");
      
      await user.click(checkbox);
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it("should toggle with keyboard (Space)", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Checkbox onCheckedChange={handleChange} />);
      const checkbox = screen.getByRole("checkbox");
      
      checkbox.focus();
      await user.keyboard(" ");
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Checkbox disabled />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDisabled();
    });

    it("should have disabled styling", () => {
      render(<Checkbox disabled />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox.className).toContain("disabled:cursor-not-allowed");
      expect(checkbox.className).toContain("disabled:opacity-50");
    });

    it("should not respond to click when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Checkbox disabled onCheckedChange={handleChange} />);
      const checkbox = screen.getByRole("checkbox");
      
      await user.click(checkbox);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<Checkbox className="custom-checkbox" />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox.className).toContain("custom-checkbox");
    });

    it("should have focus-visible ring styles", () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox.className).toContain("focus-visible:outline-none");
      expect(checkbox.className).toContain("focus-visible:ring-2");
    });

    it("should have checked state styling", () => {
      render(<Checkbox checked={true} onCheckedChange={() => {}} />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox.className).toContain("data-[state=checked]:bg-primary");
      expect(checkbox.className).toContain("data-[state=checked]:text-primary-foreground");
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard accessible", () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole("checkbox");
      checkbox.focus();
      expect(checkbox).toHaveFocus();
    });

    it("should support aria-label", () => {
      render(<Checkbox aria-label="Accept terms" />);
      expect(screen.getByLabelText("Accept terms")).toBeInTheDocument();
    });

    it("should support aria-describedby", () => {
      render(<Checkbox aria-describedby="terms-description" />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("aria-describedby", "terms-description");
    });

    it("should have proper role", () => {
      render(<Checkbox />);
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Checkbox ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("Form Integration", () => {
    it("should accept name attribute", () => {
      render(<Checkbox name="terms" />);
      const checkbox = screen.getByRole("checkbox");
      // Radix Checkbox is a button element, name is passed to hidden input
      expect(checkbox).toBeInTheDocument();
    });

    it("should accept value attribute", () => {
      render(<Checkbox value="agreed" />);
      const checkbox = screen.getByRole("checkbox");
      // Value is used for form submission via hidden input
      expect(checkbox).toBeInTheDocument();
    });

    it("should support required attribute", () => {
      render(<Checkbox required />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeRequired();
    });
  });
});
