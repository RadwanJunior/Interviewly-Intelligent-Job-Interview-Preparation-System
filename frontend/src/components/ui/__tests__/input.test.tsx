/**
 * Tests for Input component
 * Validates rendering, input types, user interaction, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../input";

describe("Input Component", () => {
  describe("Rendering", () => {
    it("should render an input element", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe("INPUT");
    });

    it("should render with placeholder", () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      const { container } = render(<Input />);
      const input = container.querySelector("input") as HTMLElement;

      expect(input.className).toContain("rounded-md");
      expect(input.className).toContain("border");
      expect(input.className).toContain("bg-background");
      expect(input.className).toContain("w-full");
    });
  });

  describe("Input Types", () => {
    it("should render as text input by default", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      // Input component doesn't set explicit type, browser defaults to text
      expect(input).toBeInTheDocument();
    });

    it("should render as email input", () => {
      render(<Input type="email" />);
      const input = document.querySelector('input[type="email"]');
      expect(input).toBeInTheDocument();
    });

    it("should render as password input", () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it("should render as number input", () => {
      render(<Input type="number" />);
      const input = document.querySelector('input[type="number"]');
      expect(input).toBeInTheDocument();
    });

    it("should render as search input", () => {
      render(<Input type="search" />);
      const input = screen.getByRole("searchbox");
      expect(input).toBeInTheDocument();
    });
  });

  describe("User Interaction", () => {
    it("should accept user input", async () => {
      const user = userEvent.setup();
      render(<Input />);
      const input = screen.getByRole("textbox");

      await user.type(input, "Hello World");
      expect(input).toHaveValue("Hello World");
    });

    it("should call onChange handler", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole("textbox");

      await user.type(input, "test");
      expect(handleChange).toHaveBeenCalled();
    });

    it("should clear value", async () => {
      const user = userEvent.setup();
      render(<Input defaultValue="initial" />);
      const input = screen.getByRole("textbox") as HTMLInputElement;

      await user.clear(input);
      expect(input).toHaveValue("");
    });

    it("should support controlled component", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const [value, setValue] = React.useState("");
        return (
          <Input value={value} onChange={(e) => setValue(e.target.value)} />
        );
      };

      render(<TestComponent />);
      const input = screen.getByRole("textbox");

      await user.type(input, "controlled");
      expect(input).toHaveValue("controlled");
    });
  });

  describe("States", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("should have disabled styling when disabled", () => {
      const { container } = render(<Input disabled />);
      const input = container.querySelector("input") as HTMLElement;
      expect(input.className).toContain("disabled:cursor-not-allowed");
      expect(input.className).toContain("disabled:opacity-50");
    });

    it("should be readonly when readOnly prop is true", () => {
      render(<Input readOnly />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("readOnly");
    });

    it("should support required attribute", () => {
      render(<Input required />);
      const input = screen.getByRole("textbox");
      expect(input).toBeRequired();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      const { container } = render(<Input className="custom-input" />);
      const input = container.querySelector("input") as HTMLElement;
      expect(input.className).toContain("custom-input");
    });

    it("should have focus-visible ring styles", () => {
      const { container } = render(<Input />);
      const input = container.querySelector("input") as HTMLElement;
      expect(input.className).toContain("focus-visible:outline-none");
      expect(input.className).toContain("focus-visible:ring-2");
    });

    it("should have placeholder styling", () => {
      const { container } = render(<Input placeholder="test" />);
      const input = container.querySelector("input") as HTMLElement;
      expect(input.className).toContain("placeholder:text-muted-foreground");
    });
  });

  describe("Form Integration", () => {
    it("should work with form name attribute", () => {
      render(<Input name="username" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("name", "username");
    });

    it("should support defaultValue", () => {
      render(<Input defaultValue="default text" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("default text");
    });

    it("should support value prop", () => {
      render(<Input value="controlled value" onChange={() => {}} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("controlled value");
    });

    it("should support maxLength", () => {
      render(<Input maxLength={10} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("maxLength", "10");
    });

    it("should support pattern attribute", () => {
      render(<Input pattern="[0-9]*" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("pattern", "[0-9]*");
    });
  });

  describe("Accessibility", () => {
    it("should support aria-label", () => {
      render(<Input aria-label="Search field" />);
      expect(screen.getByLabelText("Search field")).toBeInTheDocument();
    });

    it("should support aria-describedby", () => {
      render(<Input aria-describedby="helper-text" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "helper-text");
    });

    it("should support aria-invalid for error states", () => {
      render(<Input aria-invalid="true" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("should be focusable", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      input.focus();
      expect(input).toHaveFocus();
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref to input element", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("should allow ref manipulation", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });
});
