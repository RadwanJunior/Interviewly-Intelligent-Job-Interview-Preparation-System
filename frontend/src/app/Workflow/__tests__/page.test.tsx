import React from "react";
import { render, screen } from "@testing-library/react";
import ResumeUpload from "../page";
import WorkflowLayout from "@/components/workflow/WorkflowLayout";
import WorkflowStageRenderer from "@/components/workflow/WorkflowStageRenderer";

// Mock the components
jest.mock("@/components/workflow/WorkflowLayout", () => {
  return jest.fn(({ title, children }) => (
    <div data-testid="workflow-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ));
});

jest.mock("@/components/workflow/WorkflowStageRenderer", () => {
  return jest.fn(() => (
    <div data-testid="workflow-stage-renderer">Stage Renderer</div>
  ));
});

describe("Workflow (ResumeUpload) Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the workflow page", () => {
      render(<ResumeUpload />);

      expect(screen.getByTestId("workflow-layout")).toBeInTheDocument();
    });

    it("should render WorkflowLayout with correct title", () => {
      render(<ResumeUpload />);

      expect(screen.getByText("Resume Upload")).toBeInTheDocument();
      // Check that WorkflowLayout was called with title prop
      const calls = (WorkflowLayout as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toHaveProperty("title", "Resume Upload");
    });

    it("should render WorkflowStageRenderer inside WorkflowLayout", () => {
      render(<ResumeUpload />);

      expect(screen.getByTestId("workflow-stage-renderer")).toBeInTheDocument();
      expect(WorkflowStageRenderer).toHaveBeenCalled();
    });

    it("should pass children to WorkflowLayout", () => {
      render(<ResumeUpload />);

      const layout = screen.getByTestId("workflow-layout");
      const stageRenderer = screen.getByTestId("workflow-stage-renderer");

      expect(layout).toContainElement(stageRenderer);
    });
  });

  describe("Component Integration", () => {
    it("should render without errors", () => {
      const { container } = render(<ResumeUpload />);
      expect(container).toBeInTheDocument();
    });

    it("should call WorkflowLayout once", () => {
      render(<ResumeUpload />);

      expect(WorkflowLayout).toHaveBeenCalledTimes(1);
    });

    it("should call WorkflowStageRenderer once", () => {
      render(<ResumeUpload />);

      expect(WorkflowStageRenderer).toHaveBeenCalledTimes(1);
    });

    it("should have correct component hierarchy", () => {
      render(<ResumeUpload />);

      const layout = screen.getByTestId("workflow-layout");
      const heading = screen.getByRole("heading", { name: /resume upload/i });
      const stageRenderer = screen.getByTestId("workflow-stage-renderer");

      expect(layout).toContainElement(heading);
      expect(layout).toContainElement(stageRenderer);
    });
  });

  describe("Props Verification", () => {
    it("should pass correct title prop to WorkflowLayout", () => {
      render(<ResumeUpload />);

      // Check that WorkflowLayout was called with title prop
      const calls = (WorkflowLayout as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toHaveProperty("title", "Resume Upload");
    });

    it("should pass WorkflowStageRenderer as children to WorkflowLayout", () => {
      render(<ResumeUpload />);

      const calls = (WorkflowLayout as jest.Mock).mock.calls[0];
      expect(calls[0]).toHaveProperty("children");
    });

    it("should not pass any additional props to WorkflowStageRenderer", () => {
      render(<ResumeUpload />);

      // WorkflowStageRenderer should be called with only default React props
      expect(WorkflowStageRenderer).toHaveBeenCalled();
      const calls = (WorkflowStageRenderer as jest.Mock).mock.calls[0];
      expect(calls[0]).toEqual({});
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading", () => {
      render(<ResumeUpload />);

      const heading = screen.getByRole("heading", { name: /resume upload/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H1");
    });

    it("should have accessible structure", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { container } = render(<ResumeUpload />);

      // Check that layout has proper structure
      const layout = screen.getByTestId("workflow-layout");
      expect(layout).toBeInTheDocument();

      // Check for heading
      const heading = screen.getByRole("heading", { name: /resume upload/i });
      expect(heading).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle re-renders gracefully", () => {
      const { rerender } = render(<ResumeUpload />);

      expect(screen.getByTestId("workflow-layout")).toBeInTheDocument();

      rerender(<ResumeUpload />);

      expect(screen.getByTestId("workflow-layout")).toBeInTheDocument();
      expect(WorkflowLayout).toHaveBeenCalledTimes(2);
    });

    it("should unmount without errors", () => {
      const { unmount } = render(<ResumeUpload />);

      expect(() => unmount()).not.toThrow();
    });

    it("should maintain component structure after multiple renders", () => {
      const { rerender } = render(<ResumeUpload />);

      for (let i = 0; i < 3; i++) {
        rerender(<ResumeUpload />);
        expect(screen.getByText("Resume Upload")).toBeInTheDocument();
        expect(
          screen.getByTestId("workflow-stage-renderer")
        ).toBeInTheDocument();
      }
    });
  });

  describe("Component Composition", () => {
    it("should render as expected with mocked child components", () => {
      render(<ResumeUpload />);

      // Verify the layout component is rendered
      expect(screen.getByTestId("workflow-layout")).toBeInTheDocument();

      // Verify the stage renderer is rendered
      expect(screen.getByTestId("workflow-stage-renderer")).toBeInTheDocument();

      // Verify they're both present simultaneously
      expect(screen.getByText("Resume Upload")).toBeInTheDocument();
      expect(screen.getByText("Stage Renderer")).toBeInTheDocument();
    });

    it("should maintain parent-child relationship", () => {
      render(<ResumeUpload />);

      const layout = screen.getByTestId("workflow-layout");
      const stageRenderer = screen.getByTestId("workflow-stage-renderer");

      // Stage renderer should be a child of layout
      expect(layout.contains(stageRenderer)).toBe(true);
    });

    it("should render with correct component order", () => {
      const { container } = render(<ResumeUpload />);

      const allElements = Array.from(container.querySelectorAll("*"));
      const layoutIndex = allElements.findIndex(
        (el) => el.getAttribute("data-testid") === "workflow-layout"
      );
      const stageIndex = allElements.findIndex(
        (el) => el.getAttribute("data-testid") === "workflow-stage-renderer"
      );

      // Layout should come before stage renderer
      expect(layoutIndex).toBeLessThan(stageIndex);
    });
  });
});
