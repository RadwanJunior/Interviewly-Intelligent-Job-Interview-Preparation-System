/**
 * Tests for Avatar component
 * Validates rendering, image loading, fallback behavior, and accessibility
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Avatar, AvatarImage, AvatarFallback } from "../avatar";

describe("Avatar Component", () => {
  describe("Avatar Root", () => {
    it("should render an avatar container", () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      const avatar = screen.getByTestId("avatar");
      expect(avatar).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      const avatar = screen.getByTestId("avatar");
      expect(avatar.className).toContain("relative");
      expect(avatar.className).toContain("flex");
      expect(avatar.className).toContain("h-10");
      expect(avatar.className).toContain("w-10");
      expect(avatar.className).toContain("shrink-0");
      expect(avatar.className).toContain("overflow-hidden");
      expect(avatar.className).toContain("rounded-full");
    });

    it("should accept custom className", () => {
      render(
        <Avatar data-testid="avatar" className="custom-avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      const avatar = screen.getByTestId("avatar");
      expect(avatar.className).toContain("custom-avatar");
    });

    it("should support custom sizes", () => {
      render(
        <Avatar data-testid="avatar" className="h-20 w-20">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      const avatar = screen.getByTestId("avatar");
      expect(avatar.className).toContain("h-20");
      expect(avatar.className).toContain("w-20");
    });
  });

  describe("AvatarImage", () => {
    it("should accept AvatarImage component", () => {
      const { container } = render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      // Radix Avatar only shows images when successfully loaded (doesn't work in JSDOM)
      // So we test that the component renders without errors
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should fallback when image component is present", () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      // In test environment, images don't load, so fallback is visible
      expect(screen.getByText("JD")).toBeInTheDocument();
    });
  });

  describe("AvatarFallback", () => {
    it("should render fallback content", () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should have fallback styling classes", () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="fallback">JD</AvatarFallback>
        </Avatar>
      );
      const fallback = screen.getByTestId("fallback");
      expect(fallback.className).toContain("flex");
      expect(fallback.className).toContain("h-full");
      expect(fallback.className).toContain("w-full");
      expect(fallback.className).toContain("items-center");
      expect(fallback.className).toContain("justify-center");
      expect(fallback.className).toContain("rounded-full");
      expect(fallback.className).toContain("bg-muted");
    });

    it("should accept custom className", () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="fallback" className="custom-fallback">
            JD
          </AvatarFallback>
        </Avatar>
      );
      const fallback = screen.getByTestId("fallback");
      expect(fallback.className).toContain("custom-fallback");
    });

    it("should support initials", () => {
      render(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText("AB")).toBeInTheDocument();
    });

    it("should support single letter", () => {
      render(
        <Avatar>
          <AvatarFallback>J</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("should support icon fallback", () => {
      render(
        <Avatar>
          <AvatarFallback>
            <span data-testid="icon">👤</span>
          </AvatarFallback>
        </Avatar>
      );
      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });
  });

  describe("Image Loading Behavior", () => {
    it("should show fallback in test environment", async () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/invalid.jpg" alt="User avatar" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      
      // In test environment, fallback is always visible
      await waitFor(() => {
        expect(screen.getByText("JD")).toBeInTheDocument();
      });
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref on Avatar", () => {
      const ref = React.createRef<HTMLSpanElement>();
      render(
        <Avatar ref={ref}>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });

    it("should forward ref on AvatarFallback", () => {
      const ref = React.createRef<HTMLSpanElement>();
      render(
        <Avatar>
          <AvatarFallback ref={ref}>JD</AvatarFallback>
        </Avatar>
      );
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });
  });

  describe("Accessibility", () => {
    it("should provide fallback text for screen readers", () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      // Fallback text should be accessible
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should support fallback with proper content", () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" alt="John Doe profile picture" />
          <AvatarFallback aria-label="User initials">JD</AvatarFallback>
        </Avatar>
      );
      const fallback = screen.getByLabelText("User initials");
      expect(fallback).toBeInTheDocument();
    });
  });

  describe("Usage Scenarios", () => {
    it("should work with user profile", () => {
      render(
        <Avatar data-testid="profile-avatar">
          <AvatarImage src="https://example.com/john.jpg" alt="John Doe" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should work without image (fallback only)", () => {
      const { container } = render(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText("AB")).toBeInTheDocument();
      const image = container.querySelector('img');
      expect(image).not.toBeInTheDocument();
    });

    it("should work in different sizes", () => {
      const { rerender } = render(
        <Avatar data-testid="avatar" className="h-8 w-8">
          <AvatarFallback>SM</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByTestId("avatar").className).toContain("h-8");

      rerender(
        <Avatar data-testid="avatar" className="h-16 w-16">
          <AvatarFallback>LG</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByTestId("avatar").className).toContain("h-16");
    });
  });
});
