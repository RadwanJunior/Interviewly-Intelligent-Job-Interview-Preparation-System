/**
 * Tests for Label component
 * Validates rendering, form association, styling, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Label } from "../label";
import { Input } from "../input";

describe("Label Component", () => {
  describe("Rendering", () => {
    it("should render a label element", () => {
      render(<Label>Test Label</Label>);
      const label = screen.getByText("Test Label");
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe("LABEL");
    });

    it("should render children content", () => {
      render(<Label>Email Address</Label>);
      expect(screen.getByText("Email Address")).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      render(<Label>Label</Label>);
      const label = screen.getByText("Label");
      expect(label.className).toContain("text-sm");
      expect(label.className).toContain("font-medium");
      expect(label.className).toContain("leading-none");
    });
  });

  describe("Form Association", () => {
    it("should associate with input using htmlFor", () => {
      render(
        <div>
          <Label htmlFor="email-input">Email</Label>
          <Input id="email-input" type="email" />
        </div>
      );
      
      const label = screen.getByText("Email");
      expect(label).toHaveAttribute("for", "email-input");
    });

    it("should be clickable to focus associated input", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" />
        </div>
      );
      
      const label = screen.getByText("Username");
      const input = screen.getByRole("textbox");
      
      await user.click(label);
      expect(input).toHaveFocus();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<Label className="custom-label">Label</Label>);
      const label = screen.getByText("Label");
      expect(label.className).toContain("custom-label");
    });

    it("should have peer-disabled cursor style", () => {
      render(<Label>Label</Label>);
      const label = screen.getByText("Label");
      expect(label.className).toContain("peer-disabled:cursor-not-allowed");
      expect(label.className).toContain("peer-disabled:opacity-70");
    });
  });

  describe("Accessibility", () => {
    it("should support aria attributes", () => {
      render(<Label aria-label="Form label">Label Text</Label>);
      expect(screen.getByLabelText("Form label")).toBeInTheDocument();
    });

    it("should work with required indicator", () => {
      render(
        <Label>
          Email <span className="text-destructive">*</span>
        </Label>
      );
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("*")).toBeInTheDocument();
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref to label element", () => {
      const ref = React.createRef<HTMLLabelElement>();
      render(<Label ref={ref}>Label</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });
  });

  describe("Props", () => {
    it("should pass through HTML label attributes", () => {
      render(<Label data-testid="test-label" title="Label title">Label</Label>);
      const label = screen.getByTestId("test-label");
      expect(label).toHaveAttribute("title", "Label title");
    });
  });
});
