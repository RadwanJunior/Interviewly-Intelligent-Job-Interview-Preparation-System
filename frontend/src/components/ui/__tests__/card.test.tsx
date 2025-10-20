/**
 * Tests for Card component and its sub-components
 * Validates Card, CardHeader, CardTitle, CardDescription, CardContent, and CardFooter
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../card";

describe("Card Component", () => {
  describe("Card", () => {
    it("should render as a div element", () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("should have base styling classes", () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;

      expect(card.className).toContain("rounded-lg");
      expect(card.className).toContain("border");
      expect(card.className).toContain("bg-card");
      expect(card.className).toContain("shadow-sm");
    });

    it("should accept custom className", () => {
      const { container } = render(
        <Card className="custom-card">Content</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("custom-card");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("CardHeader", () => {
    it("should render as a div element", () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText("Header Content")).toBeInTheDocument();
    });

    it("should have flex column layout", () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header.className).toContain("flex");
      expect(header.className).toContain("flex-col");
      expect(header.className).toContain("space-y-1.5");
      expect(header.className).toContain("p-6");
    });

    it("should accept custom className", () => {
      const { container } = render(
        <CardHeader className="custom-header">Header</CardHeader>
      );
      const header = container.firstChild as HTMLElement;
      expect(header.className).toContain("custom-header");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardHeader ref={ref}>Header</CardHeader>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("CardTitle", () => {
    it("should render as an h3 element", () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByText("Title");
      expect(title.tagName).toBe("H3");
    });

    it("should render children content", () => {
      render(<CardTitle>Card Title</CardTitle>);
      expect(screen.getByText("Card Title")).toBeInTheDocument();
    });

    it("should have title styling", () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByText("Title");
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("font-semibold");
      expect(title.className).toContain("leading-none");
      expect(title.className).toContain("tracking-tight");
    });

    it("should accept custom className", () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);
      const title = screen.getByText("Title");
      expect(title.className).toContain("custom-title");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<CardTitle ref={ref}>Title</CardTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe("CardDescription", () => {
    it("should render as a p element", () => {
      render(<CardDescription>Description</CardDescription>);
      const desc = screen.getByText("Description");
      expect(desc.tagName).toBe("P");
    });

    it("should render children content", () => {
      render(<CardDescription>Card Description</CardDescription>);
      expect(screen.getByText("Card Description")).toBeInTheDocument();
    });

    it("should have description styling", () => {
      render(<CardDescription>Description</CardDescription>);
      const desc = screen.getByText("Description");
      expect(desc.className).toContain("text-sm");
      expect(desc.className).toContain("text-muted-foreground");
    });

    it("should accept custom className", () => {
      render(
        <CardDescription className="custom-desc">Description</CardDescription>
      );
      const desc = screen.getByText("Description");
      expect(desc.className).toContain("custom-desc");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<CardDescription ref={ref}>Description</CardDescription>);
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe("CardContent", () => {
    it("should render as a div element", () => {
      const { container } = render(<CardContent>Content</CardContent>);
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(<CardContent>Card Content</CardContent>);
      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("should have content padding", () => {
      const { container } = render(<CardContent>Content</CardContent>);
      const content = container.firstChild as HTMLElement;
      expect(content.className).toContain("p-6");
      expect(content.className).toContain("pt-0");
    });

    it("should accept custom className", () => {
      const { container } = render(
        <CardContent className="custom-content">Content</CardContent>
      );
      const content = container.firstChild as HTMLElement;
      expect(content.className).toContain("custom-content");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardContent ref={ref}>Content</CardContent>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("CardFooter", () => {
    it("should render as a div element", () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(<CardFooter>Card Footer</CardFooter>);
      expect(screen.getByText("Card Footer")).toBeInTheDocument();
    });

    it("should have flex layout for items", () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain("flex");
      expect(footer.className).toContain("items-center");
      expect(footer.className).toContain("p-6");
      expect(footer.className).toContain("pt-0");
    });

    it("should accept custom className", () => {
      const { container } = render(
        <CardFooter className="custom-footer">Footer</CardFooter>
      );
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain("custom-footer");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardFooter ref={ref}>Footer</CardFooter>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("Full Card Composition", () => {
    it("should render a complete card with all components", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Main Content</CardContent>
          <CardFooter>Footer Content</CardFooter>
        </Card>
      );

      expect(screen.getByText("Card Title")).toBeInTheDocument();
      expect(screen.getByText("Card Description")).toBeInTheDocument();
      expect(screen.getByText("Main Content")).toBeInTheDocument();
      expect(screen.getByText("Footer Content")).toBeInTheDocument();
    });

    it("should maintain proper structure with nested components", () => {
      const { container } = render(
        <Card data-testid="card">
          <CardHeader data-testid="header">
            <CardTitle data-testid="title">Title</CardTitle>
          </CardHeader>
          <CardContent data-testid="content">Content</CardContent>
        </Card>
      );

      const card = container.querySelector(
        '[data-testid="card"]'
      ) as HTMLElement;
      const header = container.querySelector(
        '[data-testid="header"]'
      ) as HTMLElement;
      const title = container.querySelector(
        '[data-testid="title"]'
      ) as HTMLElement;
      const content = container.querySelector(
        '[data-testid="content"]'
      ) as HTMLElement;

      expect(card).toContainElement(header);
      expect(header).toContainElement(title);
      expect(card).toContainElement(content);
    });
  });

  describe("Accessibility", () => {
    it("should support ARIA attributes", () => {
      render(
        <Card aria-label="User card" role="article">
          Content
        </Card>
      );
      const card = screen.getByLabelText("User card");
      expect(card).toHaveAttribute("role", "article");
    });

    it("should support data attributes", () => {
      render(<Card data-testid="test-card">Content</Card>);
      expect(screen.getByTestId("test-card")).toBeInTheDocument();
    });
  });
});
