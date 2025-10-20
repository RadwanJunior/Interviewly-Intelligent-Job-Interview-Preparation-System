/**
 * Tests for RadioGroup component
 * Validates rendering, selection behavior, keyboard navigation, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup, RadioGroupItem } from "../radio-group";
import { Label } from "../label";

// Mock lucide-react Circle icon
jest.mock("lucide-react", () => ({
  Circle: ({ className }: { className?: string }) => (
    <span data-testid="circle-icon" className={className}>●</span>
  ),
}));

describe("RadioGroup Component", () => {
  describe("RadioGroup Root", () => {
    it("should render a radio group", () => {
      render(
        <RadioGroup data-testid="radio-group">
          <RadioGroupItem value="option1" />
        </RadioGroup>
      );
      const radioGroup = screen.getByTestId("radio-group");
      expect(radioGroup).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      render(
        <RadioGroup data-testid="radio-group">
          <RadioGroupItem value="option1" />
        </RadioGroup>
      );
      const radioGroup = screen.getByTestId("radio-group");
      expect(radioGroup.className).toContain("grid");
      expect(radioGroup.className).toContain("gap-2");
    });

    it("should have radiogroup role", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
        </RadioGroup>
      );
      const radioGroup = screen.getByRole("radiogroup");
      expect(radioGroup).toBeInTheDocument();
    });

    it("should accept custom className", () => {
      render(
        <RadioGroup className="custom-radio-group" data-testid="radio-group">
          <RadioGroupItem value="option1" />
        </RadioGroup>
      );
      const radioGroup = screen.getByTestId("radio-group");
      expect(radioGroup.className).toContain("custom-radio-group");
    });
  });

  describe("RadioGroupItem", () => {
    it("should render radio items", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" data-testid="radio-1" />
          <RadioGroupItem value="option2" data-testid="radio-2" />
        </RadioGroup>
      );
      expect(screen.getByTestId("radio-1")).toBeInTheDocument();
      expect(screen.getByTestId("radio-2")).toBeInTheDocument();
    });

    it("should have radio role", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(2);
    });

    it("should have base styling classes", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" data-testid="radio-1" />
        </RadioGroup>
      );
      const radio = screen.getByTestId("radio-1");
      expect(radio.className).toContain("aspect-square");
      expect(radio.className).toContain("h-4");
      expect(radio.className).toContain("w-4");
      expect(radio.className).toContain("rounded-full");
      expect(radio.className).toContain("border");
    });

    it("should accept custom className", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" className="custom-radio" data-testid="radio-1" />
        </RadioGroup>
      );
      const radio = screen.getByTestId("radio-1");
      expect(radio.className).toContain("custom-radio");
    });

    it("should have value attribute", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" data-testid="radio-1" />
        </RadioGroup>
      );
      const radio = screen.getByTestId("radio-1");
      expect(radio).toHaveAttribute("value", "option1");
    });
  });

  describe("Selection Behavior", () => {
    it("should be unchecked by default", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      radios.forEach(radio => {
        expect(radio).not.toBeChecked();
      });
    });

    it("should support default value", () => {
      render(
        <RadioGroup defaultValue="option2">
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      expect(radios[0]).not.toBeChecked();
      expect(radios[1]).toBeChecked();
    });

    it("should select item on click", async () => {
      const user = userEvent.setup();
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      
      await user.click(radios[0]);
      expect(radios[0]).toBeChecked();
      expect(radios[1]).not.toBeChecked();
    });

    it("should change selection when clicking different item", async () => {
      const user = userEvent.setup();
      render(
        <RadioGroup defaultValue="option1">
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      
      expect(radios[0]).toBeChecked();
      
      await user.click(radios[1]);
      expect(radios[0]).not.toBeChecked();
      expect(radios[1]).toBeChecked();
    });

    it("should call onValueChange when selection changes", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <RadioGroup onValueChange={handleChange}>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      
      await user.click(radios[0]);
      expect(handleChange).toHaveBeenCalledWith("option1");
    });

    it("should support controlled value", () => {
      const { rerender } = render(
        <RadioGroup value="option1" onValueChange={() => {}}>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      expect(radios[0]).toBeChecked();
      
      rerender(
        <RadioGroup value="option2" onValueChange={() => {}}>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      expect(radios[1]).toBeChecked();
    });
  });

  describe("Disabled State", () => {
    it("should support disabled on entire group", () => {
      render(
        <RadioGroup disabled>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      radios.forEach(radio => {
        expect(radio).toBeDisabled();
      });
    });

    it("should support disabled on individual items", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" disabled />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      expect(radios[0]).toBeDisabled();
      expect(radios[1]).not.toBeDisabled();
    });

    it("should have disabled styling", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" disabled data-testid="radio-1" />
        </RadioGroup>
      );
      const radio = screen.getByTestId("radio-1");
      expect(radio.className).toContain("disabled:cursor-not-allowed");
      expect(radio.className).toContain("disabled:opacity-50");
    });

    it("should not respond to click when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <RadioGroup onValueChange={handleChange}>
          <RadioGroupItem value="option1" disabled />
        </RadioGroup>
      );
      const radio = screen.getByRole("radio");
      
      await user.click(radio);
      expect(handleChange).not.toHaveBeenCalled();
      expect(radio).not.toBeChecked();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should navigate with arrow keys", async () => {
      const user = userEvent.setup();
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
          <RadioGroupItem value="option3" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      
      radios[0].focus();
      await user.keyboard("{ArrowDown}");
      expect(radios[1]).toHaveFocus();
    });

    it("should select item with Space key", async () => {
      const user = userEvent.setup();
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      
      radios[0].focus();
      await user.keyboard(" ");
      expect(radios[0]).toBeChecked();
    });
  });

  describe("Styling", () => {
    it("should have focus ring styles", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" data-testid="radio-1" />
        </RadioGroup>
      );
      const radio = screen.getByTestId("radio-1");
      expect(radio.className).toContain("focus:outline-none");
      expect(radio.className).toContain("focus-visible:ring-2");
    });

    it("should show indicator when checked", () => {
      render(
        <RadioGroup defaultValue="option1">
          <RadioGroupItem value="option1" />
        </RadioGroup>
      );
      const indicator = screen.getByTestId("circle-icon");
      expect(indicator).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have radiogroup role", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
        </RadioGroup>
      );
      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    });

    it("should have radio role on items", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(2);
    });

    it("should support aria-label on group", () => {
      render(
        <RadioGroup aria-label="Choose option">
          <RadioGroupItem value="option1" />
        </RadioGroup>
      );
      expect(screen.getByLabelText("Choose option")).toBeInTheDocument();
    });

    it("should work with Label component", () => {
      render(
        <RadioGroup>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option1" id="r1" />
            <Label htmlFor="r1">Option 1</Label>
          </div>
        </RadioGroup>
      );
      const label = screen.getByText("Option 1");
      expect(label).toHaveAttribute("for", "r1");
    });

    it("should be keyboard navigable", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole("radio");
      radios[0].focus();
      expect(radios[0]).toHaveFocus();
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref on RadioGroup", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <RadioGroup ref={ref}>
          <RadioGroupItem value="option1" />
        </RadioGroup>
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("should forward ref on RadioGroupItem", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <RadioGroup>
          <RadioGroupItem ref={ref} value="option1" />
        </RadioGroup>
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("Form Integration", () => {
    it("should render with name attribute", () => {
      render(
        <RadioGroup name="options">
          <RadioGroupItem value="option1" />
        </RadioGroup>
      );
      const radioGroup = screen.getByRole("radiogroup");
      expect(radioGroup).toBeInTheDocument();
    });

    it("should support required attribute", () => {
      render(
        <RadioGroup required>
          <RadioGroupItem value="option1" />
        </RadioGroup>
      );
      const radioGroup = screen.getByRole("radiogroup");
      expect(radioGroup).toBeRequired();
    });
  });

  describe("Usage Scenarios", () => {
    it("should work with labels", () => {
      render(
        <RadioGroup>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="default" id="r1" />
            <Label htmlFor="r1">Default</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="comfortable" id="r2" />
            <Label htmlFor="r2">Comfortable</Label>
          </div>
        </RadioGroup>
      );
      expect(screen.getByText("Default")).toBeInTheDocument();
      expect(screen.getByText("Comfortable")).toBeInTheDocument();
    });

    it("should work in forms", () => {
      render(
        <form>
          <RadioGroup name="size" defaultValue="medium">
            <RadioGroupItem value="small" />
            <RadioGroupItem value="medium" />
            <RadioGroupItem value="large" />
          </RadioGroup>
        </form>
      );
      const radios = screen.getAllByRole("radio");
      expect(radios[1]).toBeChecked();
    });

    it("should support multiple groups", () => {
      render(
        <div>
          <RadioGroup name="color">
            <RadioGroupItem value="red" />
            <RadioGroupItem value="blue" />
          </RadioGroup>
          <RadioGroup name="size">
            <RadioGroupItem value="small" />
            <RadioGroupItem value="large" />
          </RadioGroup>
        </div>
      );
      const radioGroups = screen.getAllByRole("radiogroup");
      expect(radioGroups).toHaveLength(2);
    });
  });
});
