/**
 * Tests for Textarea component
 * Validates rendering, user interaction, states, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "../textarea";

describe("Textarea Component", () => {
  describe("Rendering", () => {
    it("should render a textarea element", () => {
      render(<Textarea />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe("TEXTAREA");
    });

    it("should render with placeholder", () => {
      render(<Textarea placeholder="Enter your message..." />);
      expect(
        screen.getByPlaceholderText("Enter your message...")
      ).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      const { container } = render(<Textarea />);
      const textarea = container.querySelector("textarea") as HTMLElement;

      expect(textarea.className).toContain("rounded-md");
      expect(textarea.className).toContain("border");
      expect(textarea.className).toContain("bg-background");
      expect(textarea.className).toContain("w-full");
      expect(textarea.className).toContain("min-h-[80px]");
    });
  });

  describe("User Interaction", () => {
    it("should accept user input", async () => {
      const user = userEvent.setup();
      render(<Textarea />);
      const textarea = screen.getByRole("textbox");

      await user.type(textarea, "Hello World");
      expect(textarea).toHaveValue("Hello World");
    });

    it("should accept multiline input", async () => {
      const user = userEvent.setup();
      render(<Textarea />);
      const textarea = screen.getByRole("textbox");

      await user.type(textarea, "Line 1{Enter}Line 2{Enter}Line 3");
      expect(textarea).toHaveValue("Line 1\nLine 2\nLine 3");
    });

    it("should call onChange handler", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Textarea onChange={handleChange} />);
      const textarea = screen.getByRole("textbox");

      await user.type(textarea, "test");
      expect(handleChange).toHaveBeenCalled();
    });

    it("should clear value", async () => {
      const user = userEvent.setup();
      render(<Textarea defaultValue="initial text" />);
      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      await user.clear(textarea);
      expect(textarea).toHaveValue("");
    });

    it("should support controlled component", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const [value, setValue] = React.useState("");
        return (
          <Textarea value={value} onChange={(e) => setValue(e.target.value)} />
        );
      };

      render(<TestComponent />);
      const textarea = screen.getByRole("textbox");

      await user.type(textarea, "controlled");
      expect(textarea).toHaveValue("controlled");
    });
  });

  describe("States", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Textarea disabled />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeDisabled();
    });

    it("should have disabled styling when disabled", () => {
      const { container } = render(<Textarea disabled />);
      const textarea = container.querySelector("textarea") as HTMLElement;
      expect(textarea.className).toContain("disabled:cursor-not-allowed");
      expect(textarea.className).toContain("disabled:opacity-50");
    });

    it("should be readonly when readOnly prop is true", () => {
      render(<Textarea readOnly />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("readOnly");
    });

    it("should support required attribute", () => {
      render(<Textarea required />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeRequired();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      const { container } = render(<Textarea className="custom-textarea" />);
      const textarea = container.querySelector("textarea") as HTMLElement;
      expect(textarea.className).toContain("custom-textarea");
    });

    it("should have focus-visible ring styles", () => {
      const { container } = render(<Textarea />);
      const textarea = container.querySelector("textarea") as HTMLElement;
      expect(textarea.className).toContain("focus-visible:outline-none");
      expect(textarea.className).toContain("focus-visible:ring-2");
    });

    it("should have placeholder styling", () => {
      const { container } = render(<Textarea placeholder="test" />);
      const textarea = container.querySelector("textarea") as HTMLElement;
      expect(textarea.className).toContain("placeholder:text-muted-foreground");
    });
  });

  describe("Form Integration", () => {
    it("should work with form name attribute", () => {
      render(<Textarea name="message" />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("name", "message");
    });

    it("should support defaultValue", () => {
      render(<Textarea defaultValue="default text" />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("default text");
    });

    it("should support value prop", () => {
      render(<Textarea value="controlled value" onChange={() => {}} />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("controlled value");
    });

    it("should support maxLength", () => {
      render(<Textarea maxLength={100} />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("maxLength", "100");
    });

    it("should support rows attribute", () => {
      render(<Textarea rows={5} />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("rows", "5");
    });

    it("should support cols attribute", () => {
      render(<Textarea cols={50} />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("cols", "50");
    });
  });

  describe("Accessibility", () => {
    it("should support aria-label", () => {
      render(<Textarea aria-label="Message field" />);
      expect(screen.getByLabelText("Message field")).toBeInTheDocument();
    });

    it("should support aria-describedby", () => {
      render(<Textarea aria-describedby="helper-text" />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("aria-describedby", "helper-text");
    });

    it("should support aria-invalid for error states", () => {
      render(<Textarea aria-invalid="true" />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("aria-invalid", "true");
    });

    it("should be focusable", () => {
      render(<Textarea />);
      const textarea = screen.getByRole("textbox");
      textarea.focus();
      expect(textarea).toHaveFocus();
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref to textarea element", () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });

    it("should allow ref manipulation", () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} />);
      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });
});
