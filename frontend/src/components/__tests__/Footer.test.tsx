/**
 * @file Footer.test.tsx
 * @description Unit tests for the Footer component
 * Tests footer rendering, links, branding, and responsive layout
 */

import { render, screen } from "@testing-library/react";
import Footer from "../Footer";

// Mock Next.js Link component - preserve className and other props
jest.mock("next/link", () => {
  return {
    __esModule: true,
    default: ({
      children,
      href,
      className,
      ...props
    }: {
      children: React.ReactNode;
      href: string;
      className?: string;
    }) => {
      return (
        <a href={href} className={className} {...props}>
          {children}
        </a>
      );
    },
  };
});

describe("Footer Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the footer element", () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector("footer");
      expect(footer).toBeInTheDocument();
    });

    it("should have proper styling classes", () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector("footer");
      expect(footer).toHaveClass("bg-gray-50", "py-8", "mt-20");
    });
  });

  describe("Branding", () => {
    it("should display the Interviewly logo/brand name", () => {
      render(<Footer />);

      const brandLink = screen.getByRole("link", { name: /interviewly/i });
      expect(brandLink).toBeInTheDocument();
    });

    it("should link the brand name to home page", () => {
      render(<Footer />);

      const brandLink = screen.getByRole("link", { name: /interviewly/i });
      expect(brandLink).toHaveAttribute("href", "/");
    });

    it("should style the brand name correctly", () => {
      render(<Footer />);

      const brandLink = screen.getByRole("link", { name: /interviewly/i });
      expect(brandLink).toHaveClass("text-primary");
      expect(brandLink).toHaveClass("font-heading");
      expect(brandLink).toHaveClass("font-bold");
      expect(brandLink).toHaveClass("text-xl");
    });
  });

  describe("Navigation Links", () => {
    it("should render Privacy Policy link", () => {
      render(<Footer />);

      const privacyLink = screen.getByRole("link", {
        name: /privacy policy/i,
      });
      expect(privacyLink).toBeInTheDocument();
    });

    it("should render Terms of Service link", () => {
      render(<Footer />);

      const termsLink = screen.getByRole("link", {
        name: /terms of service/i,
      });
      expect(termsLink).toBeInTheDocument();
    });

    it("should render Contact link", () => {
      render(<Footer />);

      const contactLink = screen.getByRole("link", { name: /contact/i });
      expect(contactLink).toBeInTheDocument();
    });

    it("should have correct href attributes for links", () => {
      render(<Footer />);

      const privacyLink = screen.getByRole("link", {
        name: /privacy policy/i,
      });
      const termsLink = screen.getByRole("link", {
        name: /terms of service/i,
      });
      const contactLink = screen.getByRole("link", { name: /contact/i });

      expect(privacyLink).toHaveAttribute("href", "#");
      expect(termsLink).toHaveAttribute("href", "#");
      expect(contactLink).toHaveAttribute("href", "#");
    });

    it("should style navigation links with hover effects", () => {
      render(<Footer />);

      const privacyLink = screen.getByRole("link", {
        name: /privacy policy/i,
      });

      expect(privacyLink).toHaveClass("text-gray-600");
      expect(privacyLink).toHaveClass("hover:text-primary");
      expect(privacyLink).toHaveClass("transition-colors");
    });

    it("should render all three navigation links", () => {
      render(<Footer />);

      const allLinks = screen.getAllByRole("link");
      // 4 links total: 1 brand + 3 navigation
      expect(allLinks).toHaveLength(4);
    });
  });

  describe("Copyright Information", () => {
    it("should display copyright text", () => {
      render(<Footer />);

      expect(
        screen.getByText(/© .* Interviewly\. All rights reserved\./i)
      ).toBeInTheDocument();
    });

    it("should display current year in copyright", () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      expect(
        screen.getByText(new RegExp(`© ${currentYear}`))
      ).toBeInTheDocument();
    });

    it("should style copyright text correctly", () => {
      const { container } = render(<Footer />);

      const copyrightDiv = container.querySelector(".text-gray-500");
      expect(copyrightDiv).toBeInTheDocument();
      expect(copyrightDiv).toHaveTextContent(
        /© .* Interviewly\. All rights reserved\./i
      );
    });
  });

  describe("Responsive Layout", () => {
    it("should have responsive flex layout", () => {
      const { container } = render(<Footer />);

      const innerDiv = container.querySelector(".flex.flex-col.md\\:flex-row");
      expect(innerDiv).toBeInTheDocument();
    });

    it("should have proper spacing between elements", () => {
      const { container } = render(<Footer />);

      const linksContainer = container.querySelector(".flex.space-x-6");
      expect(linksContainer).toBeInTheDocument();
    });

    it("should center items on mobile", () => {
      const { container } = render(<Footer />);

      const innerDiv = container.querySelector(".items-center");
      expect(innerDiv).toBeInTheDocument();
    });

    it("should justify content between elements on desktop", () => {
      const { container } = render(<Footer />);

      const innerDiv = container.querySelector(".justify-between");
      expect(innerDiv).toBeInTheDocument();
    });
  });

  describe("Container Structure", () => {
    it("should have container with proper max width", () => {
      const { container } = render(<Footer />);

      const containerDiv = container.querySelector(".container.mx-auto");
      expect(containerDiv).toBeInTheDocument();
    });

    it("should have horizontal padding", () => {
      const { container } = render(<Footer />);

      const containerDiv = container.querySelector(".px-4");
      expect(containerDiv).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic footer element", () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector("footer");
      expect(footer).toBeInTheDocument();
    });

    it("should have all links accessible by role", () => {
      render(<Footer />);

      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);

      links.forEach((link) => {
        expect(link).toHaveAccessibleName();
      });
    });

    it("should have descriptive link text", () => {
      render(<Footer />);

      const privacyLink = screen.getByRole("link", {
        name: /privacy policy/i,
      });
      const termsLink = screen.getByRole("link", {
        name: /terms of service/i,
      });
      const contactLink = screen.getByRole("link", { name: /contact/i });

      expect(privacyLink).toHaveTextContent("Privacy Policy");
      expect(termsLink).toHaveTextContent("Terms of Service");
      expect(contactLink).toHaveTextContent("Contact");
    });
  });

  describe("Visual Styling", () => {
    it("should have light background color", () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector("footer");
      expect(footer).toHaveClass("bg-gray-50");
    });

    it("should have proper vertical padding", () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector("footer");
      expect(footer).toHaveClass("py-8");
    });

    it("should have top margin", () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector("footer");
      expect(footer).toHaveClass("mt-20");
    });
  });

  describe("Integration", () => {
    it("should render without errors", () => {
      expect(() => render(<Footer />)).not.toThrow();
    });

    it("should maintain consistent structure", () => {
      const { container } = render(<Footer />);

      // Check main structure
      expect(container.querySelector("footer")).toBeInTheDocument();
      expect(container.querySelector(".container.mx-auto")).toBeInTheDocument();
      expect(container.querySelector(".flex")).toBeInTheDocument();
    });

    it("should render all expected elements", () => {
      render(<Footer />);

      // Brand
      expect(screen.getByText("Interviewly")).toBeInTheDocument();

      // Links
      expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
      expect(screen.getByText("Terms of Service")).toBeInTheDocument();
      expect(screen.getByText("Contact")).toBeInTheDocument();

      // Copyright
      expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument();
    });
  });
});
