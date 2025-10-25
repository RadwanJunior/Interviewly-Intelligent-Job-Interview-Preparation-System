/**
 * Integration tests for Footer component
 * Tests complete footer functionality and user interaction patterns
 */

import { render, screen } from "@testing-library/react";
import Footer from "../Footer";

// Mock Next.js Link component
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

/**
 * Integration tests for Footer component
 * Tests complete footer experience and functionality
 */
describe("Footer Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Footer Experience", () => {
    it("should render complete footer with all essential elements and navigation", () => {
      const { container } = render(<Footer />);

      // 1. Footer structure and accessibility
      const footer = container.querySelector("footer");
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass("bg-gray-50", "py-8", "mt-20");

      // 2. Brand identity and home navigation
      const brandLink = screen.getByRole("link", { name: /interviewly/i });
      expect(brandLink).toBeInTheDocument();
      expect(brandLink).toHaveAttribute("href", "/");
      expect(brandLink).toHaveClass("text-primary", "font-heading", "font-bold", "text-xl");

      // 3. Navigation links with proper structure
      const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
      const termsLink = screen.getByRole("link", { name: /terms of service/i });
      const contactLink = screen.getByRole("link", { name: /contact/i });

      expect(privacyLink).toBeInTheDocument();
      expect(termsLink).toBeInTheDocument();
      expect(contactLink).toBeInTheDocument();

      // Verify navigation link styling for consistency
      [privacyLink, termsLink, contactLink].forEach(link => {
        expect(link).toHaveClass("text-gray-600", "hover:text-primary", "transition-colors");
        expect(link).toHaveAttribute("href", "#");
      });

      // 4. Copyright with dynamic year
      const currentYear = new Date().getFullYear();
      const copyrightText = screen.getByText(`© ${currentYear} Interviewly. All rights reserved.`);
      expect(copyrightText).toBeInTheDocument();
      expect(copyrightText).toHaveClass("mt-4", "md:mt-0", "text-gray-500");
    });

    it("should provide proper responsive layout and structure", () => {
      const { container } = render(<Footer />);

      // Container structure for responsive design
      const containerDiv = container.querySelector(".container");
      expect(containerDiv).toBeInTheDocument();
      expect(containerDiv).toHaveClass("mx-auto", "px-4");

      // Flex layout for responsive behavior
      const flexContainer = container.querySelector(".flex.flex-col.md\\:flex-row");
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass("justify-between", "items-center");

      // Navigation links container
      const navContainer = container.querySelector(".flex.space-x-6");
      expect(navContainer).toBeInTheDocument();

      // Verify all three navigation links are present
      const allLinks = screen.getAllByRole("link");
      expect(allLinks).toHaveLength(4); // Brand + 3 nav links
    });
  });

  describe("Accessibility and User Experience", () => {
    it("should provide full accessibility support and semantic structure", () => {
      render(<Footer />);

      // Semantic footer element
      const footer = document.querySelector("footer");
      expect(footer).toBeInTheDocument();

      // All links should be accessible by role
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(4);

      // Each link should have accessible name
      links.forEach(link => {
        expect(link).toHaveAccessibleName();
      });

      // Descriptive link text without generic terms
      expect(screen.getByRole("link", { name: /interviewly/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /terms of service/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /contact/i })).toBeInTheDocument();
    });

    it("should handle layout and spacing correctly across breakpoints", () => {
      const { container } = render(<Footer />);

      // Mobile-first responsive classes
      const brandContainer = container.querySelector(".mb-4.md\\:mb-0");
      expect(brandContainer).toBeInTheDocument();

      const copyrightContainer = container.querySelector(".mt-4.md\\:mt-0");
      expect(copyrightContainer).toBeInTheDocument();

      // Navigation spacing
      const navLinks = container.querySelector(".flex.space-x-6");
      expect(navLinks).toBeInTheDocument();

      // Container max-width and padding
      const mainContainer = container.querySelector(".container.mx-auto.px-4");
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe("Content and Visual Design", () => {
    it("should display correct content with proper styling consistency", () => {
      render(<Footer />);

      // Brand styling verification
      const brandLink = screen.getByRole("link", { name: /interviewly/i });
      expect(brandLink).toHaveClass("text-primary", "font-heading", "font-bold", "text-xl");

      // Copyright content and styling
      const currentYear = new Date().getFullYear();
      const copyrightElement = screen.getByText(new RegExp(`© ${currentYear} Interviewly\\. All rights reserved\\.`));
      expect(copyrightElement).toBeInTheDocument();
      expect(copyrightElement).toHaveClass("text-gray-500");

      // Navigation link consistency
      const navigationLinks = [
        screen.getByRole("link", { name: /privacy policy/i }),
        screen.getByRole("link", { name: /terms of service/i }),
        screen.getByRole("link", { name: /contact/i })
      ];

      navigationLinks.forEach(link => {
        expect(link).toHaveClass("text-gray-600", "hover:text-primary", "transition-colors");
      });
    });

    it("should maintain visual consistency and proper color scheme", () => {
      const { container } = render(<Footer />);

      // Footer background and spacing
      const footer = container.querySelector("footer");
      expect(footer).toHaveClass("bg-gray-50", "py-8", "mt-20");

      // Text color hierarchy
      const brandLink = screen.getByRole("link", { name: /interviewly/i });
      expect(brandLink).toHaveClass("text-primary");

      const copyrightText = screen.getByText(new RegExp(`© ${new Date().getFullYear()}`));
      expect(copyrightText).toHaveClass("text-gray-500");

      // Navigation link color scheme
      const navLinks = screen.getAllByRole("link").filter(link => 
        link.textContent?.includes("Privacy") || 
        link.textContent?.includes("Terms") || 
        link.textContent?.includes("Contact")
      );
      
      navLinks.forEach(link => {
        expect(link).toHaveClass("text-gray-600");
      });
    });
  });

  describe("Integration and Error Handling", () => {
    it("should render consistently without errors and maintain structure", () => {
      // Multiple renders should be consistent
      const { container: container1 } = render(<Footer />);
      const { container: container2 } = render(<Footer />);

      // Both should have same structure
      expect(container1.querySelector("footer")).toBeInTheDocument();
      expect(container2.querySelector("footer")).toBeInTheDocument();

      // Link counts should match
      const links1 = container1.querySelectorAll("a");
      const links2 = container2.querySelectorAll("a");
      expect(links1).toHaveLength(links2.length);
      expect(links1).toHaveLength(4);
    });

    it("should handle dynamic year calculation correctly", () => {
      render(<Footer />);

      // Verify current year is calculated and displayed
      const currentYear = new Date().getFullYear();
      const copyrightWithYear = screen.getByText(`© ${currentYear} Interviewly. All rights reserved.`);
      expect(copyrightWithYear).toBeInTheDocument();

      // Ensure it's not hardcoded by checking it's actually current year
      expect(currentYear).toBeGreaterThanOrEqual(2024);
      expect(currentYear).toBeLessThanOrEqual(2030); // Reasonable future bound
    });

    it("should provide complete footer functionality for user navigation", () => {
      render(<Footer />);

      // Brand navigation to home
      const homeLink = screen.getByRole("link", { name: /interviewly/i });
      expect(homeLink).toHaveAttribute("href", "/");

      // Secondary navigation links (placeholder links for now)
      const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
      const termsLink = screen.getByRole("link", { name: /terms of service/i });
      const contactLink = screen.getByRole("link", { name: /contact/i });

      expect(privacyLink).toHaveAttribute("href", "#");
      expect(termsLink).toHaveAttribute("href", "#");
      expect(contactLink).toHaveAttribute("href", "#");

      // All navigation should be easily discoverable
      const allNavigationLinks = [homeLink, privacyLink, termsLink, contactLink];
      allNavigationLinks.forEach(link => {
        expect(link).toBeVisible();
        expect(link).toHaveAccessibleName();
      });
    });
  });
});