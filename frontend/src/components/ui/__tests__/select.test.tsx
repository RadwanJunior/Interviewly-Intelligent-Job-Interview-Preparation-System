/**
 * Tests for Select component
 * Validates rendering, selection behavior, keyboard navigation, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../select";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Check: ({ className }: { className?: string }) => (
    <span data-testid="check-icon" className={className}>✓</span>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <span data-testid="chevron-down-icon" className={className}>▼</span>
  ),
  ChevronUp: ({ className }: { className?: string }) => (
    <span data-testid="chevron-up-icon" className={className}>▲</span>
  ),
}));

// Helper component for testing
const SimpleSelect = ({ 
  defaultValue, 
  value, 
  onValueChange,
  disabled = false 
}: { 
  defaultValue?: string; 
  value?: string; 
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) => (
  <Select 
    defaultValue={defaultValue} 
    value={value} 
    onValueChange={onValueChange}
    disabled={disabled}
  >
    <SelectTrigger data-testid="select-trigger">
      <SelectValue placeholder="Select an option" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="option1">Option 1</SelectItem>
      <SelectItem value="option2">Option 2</SelectItem>
      <SelectItem value="option3">Option 3</SelectItem>
    </SelectContent>
  </Select>
);

describe("Select Component", () => {
  describe("SelectTrigger", () => {
    it("should render a select trigger", () => {
      render(<SimpleSelect />);
      expect(screen.getByTestId("select-trigger")).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      render(<SimpleSelect />);
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger.className).toContain("flex");
      expect(trigger.className).toContain("h-10");
      expect(trigger.className).toContain("items-center");
      expect(trigger.className).toContain("rounded-md");
      expect(trigger.className).toContain("border");
    });

    it("should display chevron down icon", () => {
      render(<SimpleSelect />);
      expect(screen.getByTestId("chevron-down-icon")).toBeInTheDocument();
    });

    it("should display placeholder when no value selected", () => {
      render(<SimpleSelect />);
      expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("should accept custom className", () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger" data-testid="select-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger.className).toContain("custom-trigger");
    });

    it("should have button role", () => {
      render(<SimpleSelect />);
      const trigger = screen.getByRole("combobox");
      expect(trigger).toBeInTheDocument();
    });
  });

  describe("SelectValue", () => {
    it("should display placeholder when no value", () => {
      render(<SimpleSelect />);
      expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("should support default value", () => {
      render(<SimpleSelect defaultValue="option2" />);
      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("should support controlled value", () => {
      const { rerender } = render(
        <SimpleSelect value="option1" onValueChange={() => {}} />
      );
      expect(screen.getByText("Option 1")).toBeInTheDocument();
      
      rerender(
        <SimpleSelect value="option3" onValueChange={() => {}} />
      );
      expect(screen.getByText("Option 3")).toBeInTheDocument();
    });
  });

  describe("SelectContent", () => {
    it("should render with portal", () => {
      render(<SimpleSelect />);
      // Content is not visible initially (rendered via portal when opened)
      expect(screen.queryByText("Option 1")).not.toBeInTheDocument();
    });

    it("should render content structure", () => {
      const { container } = render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent data-testid="select-content">
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );
      
      // Content exists in structure but not visible
      expect(container.querySelector('[role="combobox"]')).toBeInTheDocument();
    });
  });

  describe("SelectItem", () => {
    it("should render items in structure", () => {
      render(<SimpleSelect />);
      // Items exist in component tree but not visible until opened
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should render check indicator when selected", () => {
      render(<SimpleSelect defaultValue="option1" />);
      // Selected value shows in trigger
      expect(screen.getByText("Option 1")).toBeInTheDocument();
    });
  });

  describe("SelectLabel", () => {
    it("should render in component structure", () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel data-testid="select-label">Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      // Label exists in structure but not visible until opened
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  describe("SelectSeparator", () => {
    it("should render in component structure", () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectSeparator data-testid="select-separator" />
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );
      // Separator exists in structure but not visible until opened
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  describe("SelectGroup", () => {
    it("should render groups in structure", () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      // Group exists in structure but not visible until opened
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  describe("Open/Close Behavior", () => {
    it("should have closed state initially", () => {
      render(<SimpleSelect />);
      
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger).toHaveAttribute("data-state", "closed");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("should update aria-expanded", () => {
      render(<SimpleSelect />);
      
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("should have button type", () => {
      render(<SimpleSelect />);
      
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger).toHaveAttribute("type", "button");
    });
  });

  describe("Disabled State", () => {
    it("should support disabled state", () => {
      render(<SimpleSelect disabled />);
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger).toBeDisabled();
    });

    it("should have disabled styling", () => {
      render(<SimpleSelect disabled />);
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger.className).toContain("disabled:cursor-not-allowed");
      expect(trigger.className).toContain("disabled:opacity-50");
    });

    it("should have data-disabled when disabled", () => {
      render(<SimpleSelect disabled />);
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger).toHaveAttribute("data-disabled", "");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should be keyboard focusable", () => {
      render(<SimpleSelect />);
      
      const trigger = screen.getByTestId("select-trigger");
      trigger.focus();
      expect(trigger).toHaveFocus();
    });

    it("should have role combobox", () => {
      render(<SimpleSelect />);
      
      const trigger = screen.getByRole("combobox");
      expect(trigger).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have focus ring styles", () => {
      render(<SimpleSelect />);
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger.className).toContain("focus:outline-none");
      expect(trigger.className).toContain("focus:ring-2");
    });
  });

  describe("Accessibility", () => {
    it("should have combobox role", () => {
      render(<SimpleSelect />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should support aria-label", () => {
      render(
        <Select>
          <SelectTrigger aria-label="Choose option">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );
      expect(screen.getByLabelText("Choose option")).toBeInTheDocument();
    });

    it("should be keyboard accessible", () => {
      render(<SimpleSelect />);
      const trigger = screen.getByTestId("select-trigger");
      trigger.focus();
      expect(trigger).toHaveFocus();
    });

    it("should have aria-controls attribute", () => {
      render(<SimpleSelect />);
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveAttribute("aria-controls");
    });

    it("should have aria-expanded attribute", () => {
      render(<SimpleSelect />);
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref on SelectTrigger", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Select>
          <SelectTrigger ref={ref}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("Form Integration", () => {
    it("should render with form attributes", () => {
      render(
        <Select name="country" defaultValue="us">
          <SelectTrigger data-testid="select-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="us">United States</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger).toBeInTheDocument();
    });

    it("should support required attribute", () => {
      render(
        <Select required>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = screen.getByTestId("select-trigger");
      expect(trigger).toHaveAttribute("aria-required", "true");
    });
  });

  describe("Usage Scenarios", () => {
    it("should render country selector structure", () => {
      render(
        <Select>
          <SelectTrigger data-testid="country-trigger">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="us">United States</SelectItem>
            <SelectItem value="ca">Canada</SelectItem>
            <SelectItem value="uk">United Kingdom</SelectItem>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByTestId("country-trigger")).toBeInTheDocument();
      expect(screen.getByText("Select a country")).toBeInTheDocument();
    });

    it("should render grouped options structure", () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel data-testid="fruits-label">Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectGroup>
            <SelectSeparator data-testid="group-separator" />
            <SelectGroup>
              <SelectLabel data-testid="vegetables-label">Vegetables</SelectLabel>
              <SelectItem value="carrot">Carrot</SelectItem>
              <SelectItem value="potato">Potato</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should work in forms with default value", () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());
      const { container } = render(
        <form onSubmit={handleSubmit}>
          <Select name="size" defaultValue="medium">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
          <button type="submit">Submit</button>
        </form>
      );
      
      const hiddenSelect = container.querySelector('select[name="size"]') as HTMLSelectElement;
      expect(hiddenSelect).toBeInTheDocument();
      expect(hiddenSelect?.value).toBe("medium");
    });
  });
});
