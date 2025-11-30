/**
 * @file page.integration.test.tsx
 * @description Integration tests for Dashboard page
 * Tests complete user workflows and interactions instead of individual UI elements
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "../page";
import {
  fetchDashboardStats,
  fetchInterviewHistory,
} from "@/lib/api";

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
  usePathname: () => "/dashboard",
}));

// Mock API functions
jest.mock("@/lib/api", () => ({
  fetchDashboardStats: jest.fn(),
  fetchInterviewHistory: jest.fn(),
}));

// Mock Navbar component
jest.mock("@/components/Navbar", () => {
  return function MockNavbar() {
    return <nav data-testid="navbar">Navbar</nav>;
  };
});

// Mock InterviewCard component
jest.mock("@/components/dashboard/InterviewCard", () => ({
  InterviewCard: ({
    interview,
    onViewFeedback,
  }: {
    interview: {
      id: string;
      jobTitle: string;
      company: string;
      score: number;
      type: string;
    };
    onViewFeedback: (id: string) => void;
  }) => (
    <div data-testid={`interview-card-${interview.id}`}>
      <h3>{interview.jobTitle}</h3>
      <p>{interview.company}</p>
      <span>{interview.score}%</span>
      <button onClick={() => onViewFeedback(interview.id)}>View Details</button>
    </div>
  ),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Dashboard Page Integration Tests", () => {
  const mockStats = {
    totalInterviews: 15,
    averageScore: 85,
    completedThisMonth: 5,
  };

  const mockInterviewHistory = [
    {
      id: "1",
      jobTitle: "Frontend Developer",
      company: "Tech Corp",
      date: "2025-10-15",
      duration: "45 min",
      score: 92,
      status: "completed",
      type: "text",
    },
    {
      id: "2",
      jobTitle: "Backend Developer",
      company: "StartupXYZ",
      date: "2025-10-10",
      duration: "30 min",
      score: 78,
      status: "completed",
      type: "audio",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    localStorageMock.clear();
    (fetchDashboardStats as jest.Mock).mockResolvedValue(mockStats);
    (fetchInterviewHistory as jest.Mock).mockResolvedValue(
      mockInterviewHistory
    );
  });

  describe("Complete Dashboard Loading Flow", () => {
    it("should load and display all dashboard data", async () => {
      render(<Dashboard />);

      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Verify all sections are rendered
      expect(screen.getByText("Interview Dashboard")).toBeInTheDocument();
      expect(screen.getByText(/track your progress/i)).toBeInTheDocument();

      // Verify stats are displayed
      expect(screen.getByText("15")).toBeInTheDocument(); // Total interviews
      expect(screen.getByText("85%")).toBeInTheDocument(); // Average score
      expect(screen.getByText("5")).toBeInTheDocument(); // This month

      // Verify interview history is displayed
      expect(screen.getByText("Frontend Developer")).toBeInTheDocument();
      expect(screen.getByText("Backend Developer")).toBeInTheDocument();
      expect(screen.getByText("Tech Corp")).toBeInTheDocument();
      expect(screen.getByText("StartupXYZ")).toBeInTheDocument();

      // Verify API calls were made
      expect(fetchDashboardStats).toHaveBeenCalledTimes(1);
      expect(fetchInterviewHistory).toHaveBeenCalledTimes(1);
    });

    it("should display active plan when available", async () => {

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Verify active plan is displayed
      expect(screen.getByText("Senior Developer")).toBeInTheDocument();
      expect(screen.getByText("BigTech Inc")).toBeInTheDocument();
      expect(screen.getByText(/75%/i)).toBeInTheDocument(); // Readiness level
    });

    it("should show Create Prep Plan when no active plan", async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show button to create new plan
      const createButton = screen.getByText(/create prep plan/i);
      expect(createButton).toBeInTheDocument();
    });
  });

  describe("User Interactions and Navigation", () => {
    it("should navigate to interview details when clicking View Details", async () => {
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Click on View Details button for first interview
      const viewButton = screen.getAllByText("View Details")[0];
      await user.click(viewButton);

      // Should navigate to feedback page (using sessionId)
      expect(mockPush).toHaveBeenCalledWith("/Feedback?sessionId=1");
    });

    it("should navigate to prepare page when clicking Create Prep Plan", async () => {
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const createButton = screen.getByText(/create prep plan/i);
      await user.click(createButton);

      expect(mockPush).toHaveBeenCalledWith("/create-plan");
    });

    it("should navigate to interview page when clicking Quick Mock Interview", async () => {
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const mockInterviewButton = screen.getByText(/quick mock interview/i);
      await user.click(mockInterviewButton);

      expect(mockPush).toHaveBeenCalledWith("/Workflow");
    });

    it("should navigate to plan dashboard when clicking continue on active plan", async () => {
      const user = userEvent.setup();

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const continueButton = screen.getByText(/continue preparation/i);
      await user.click(continueButton);

      expect(mockPush).toHaveBeenCalledWith("/plan-dashboard");
    });
  });

  describe("Data Refresh Functionality", () => {
    it("should refresh dashboard data when clicking refresh button", async () => {
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Initial calls
      expect(fetchDashboardStats).toHaveBeenCalledTimes(1);
      expect(fetchInterviewHistory).toHaveBeenCalledTimes(1);

      // Find and click refresh button
      const refreshButton = screen.getByRole("button", { name: /refresh/i });
      await user.click(refreshButton);

      // Should make API calls again
      await waitFor(() => {
        expect(fetchDashboardStats).toHaveBeenCalledTimes(2);
        expect(fetchInterviewHistory).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error message when stats fetching fails", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (fetchDashboardStats as jest.Mock).mockRejectedValue(
        new Error("Failed to fetch stats")
      );

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show error message
      expect(
        screen.getByText(/failed to load dashboard data/i)
      ).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it("should display error when interview history fails", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (fetchInterviewHistory as jest.Mock).mockRejectedValue(
        new Error("Failed to fetch history")
      );

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show error or empty state
      expect(
        screen.getByText(/no interviews yet|failed to load/i)
      ).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it("should handle API errors gracefully and allow retry", async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, "error").mockImplementation();

      // First call fails
      (fetchDashboardStats as jest.Mock).mockRejectedValueOnce(
        new Error("Network error")
      );
      // Second call succeeds
      (fetchDashboardStats as jest.Mock).mockResolvedValueOnce(mockStats);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show error
      expect(
        screen.getByText(/failed to load dashboard data/i)
      ).toBeInTheDocument();

      // Click Try Again button to retry
      const retryButton = screen.getByRole("button", { name: /try again/i });
      await user.click(retryButton);

      // Should load successfully
      await waitFor(() => {
        expect(screen.getByText("15")).toBeInTheDocument(); // Stats loaded
      });

      consoleError.mockRestore();
    });
  });

  describe("Active Plan with localStorage Fallback", () => {
    it("should fall back to localStorage when API returns no plan", async () => {
      const localPlan = {
        id: "local-plan",
        jobTitle: "DevOps Engineer",
        company: "CloudCo",
        targetDate: "2025-10-25",
        readinessLevel: 60,
      };

      localStorageMock.setItem("interviewPlan", JSON.stringify(localPlan));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should display plan from localStorage
      expect(screen.getByText("DevOps Engineer")).toBeInTheDocument();
      expect(screen.getByText("CloudCo")).toBeInTheDocument();
    });

    it("should prefer API data over localStorage", async () => {
      const localPlan = {
        id: "local-plan",
        jobTitle: "Old Job",
        company: "Old Company",
      };

      localStorageMock.setItem("interviewPlan", JSON.stringify(localPlan));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should display API data, not localStorage
      expect(screen.getByText("Senior Developer")).toBeInTheDocument();
      expect(screen.getByText("BigTech Inc")).toBeInTheDocument();
      expect(screen.queryByText("Old Job")).not.toBeInTheDocument();
    });
  });

  describe("Interview History Display", () => {
    it("should display all interviews from history", async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show all interviews
      mockInterviewHistory.forEach((interview) => {
        expect(screen.getByText(interview.jobTitle)).toBeInTheDocument();
        expect(screen.getByText(interview.company)).toBeInTheDocument();
      });
    });

    it("should show empty state when no interview history", async () => {
      (fetchInterviewHistory as jest.Mock).mockResolvedValue([]);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show empty state message
      expect(
        screen.getByText(/no interviews yet|start your first/i)
      ).toBeInTheDocument();
    });

    it("should handle interview cards with missing data gracefully", async () => {
      const incompleteHistory = [
        {
          id: "3",
          jobTitle: "Designer",
          // Missing company
          score: 88,
        },
      ];

      (fetchInterviewHistory as jest.Mock).mockResolvedValue(incompleteHistory);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should still display the interview
      expect(screen.getByText("Designer")).toBeInTheDocument();
    });
  });
});
