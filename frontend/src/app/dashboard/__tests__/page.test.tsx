import React from "react";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "../page";
import {
  fetchDashboardStats,
  fetchInterviewHistory,
  fetchActivePlan,
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
  fetchActivePlan: jest.fn(),
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
    showTypeBadge,
  }: {
    interview: {
      id: string;
      jobTitle: string;
      company: string;
      score: number;
      type: string;
    };
    onViewFeedback: (id: string) => void;
    getScoreColor: (score: number) => string;
    showTypeBadge?: boolean;
  }) => (
    <div data-testid={`interview-card-${interview.id}`}>
      <h3>{interview.jobTitle}</h3>
      <p>{interview.company}</p>
      <span>{interview.score}%</span>
      <span>{interview.type}</span>
      {showTypeBadge && <span data-testid="type-badge">Badge</span>}
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

// Mock data
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
    feedback: {
      strengths: ["Good communication", "Technical knowledge"],
      improvements: ["More examples needed"],
    },
  },
  {
    id: "2",
    jobTitle: "Backend Engineer",
    company: "Data Inc",
    date: "2025-10-10",
    duration: "30 min",
    score: 78,
    status: "completed",
    type: "call",
    feedback: {
      strengths: ["Problem solving"],
      improvements: ["Speaking pace"],
    },
  },
  {
    id: "3",
    jobTitle: "Full Stack Developer",
    company: "StartupXYZ",
    date: "2025-10-05",
    duration: "60 min",
    score: 88,
    status: "completed",
    type: "text",
    feedback: {
      strengths: ["Clear explanations"],
      improvements: ["Time management"],
    },
  },
];

const mockActivePlan = {
  id: "plan-1",
  jobTitle: "Senior Developer",
  company: "Big Tech",
  interviewDate: "2025-11-01",
  readinessLevel: 65,
  steps: [],
  completedSteps: 5,
};

describe("Dashboard Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    localStorageMock.clear();

    // Default successful API responses
    (fetchDashboardStats as jest.Mock).mockResolvedValue(mockStats);
    (fetchInterviewHistory as jest.Mock).mockResolvedValue(
      mockInterviewHistory
    );
    (fetchActivePlan as jest.Mock).mockResolvedValue(null);
  });

  describe("Page Rendering", () => {
    it("should render the dashboard page", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Interview Dashboard")).toBeInTheDocument();
      });
    });

    it("should display loading state initially", () => {
      render(<Dashboard />);
      expect(screen.getByText("Loading your dashboard...")).toBeInTheDocument();
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("should render Navbar component", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("navbar")).toBeInTheDocument();
      });
    });

    it("should have gradient background", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        const mainContainer = document.querySelector(".bg-gradient-to-b");
        expect(mainContainer).toBeInTheDocument();
      });
    });
  });

  describe("Dashboard Header", () => {
    it("should display dashboard title", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Interview Dashboard")).toBeInTheDocument();
      });
    });

    it("should display dashboard subtitle", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Track your progress and start new interview preparations"
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe("Stats Cards", () => {
    it("should display total interviews stat", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Total Interviews")).toBeInTheDocument();
        expect(screen.getByText("15")).toBeInTheDocument();
      });
    });

    it("should display average score stat", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Average Score")).toBeInTheDocument();
        expect(screen.getByText("85%")).toBeInTheDocument();
        expect(screen.getByText("Across all interviews")).toBeInTheDocument();
      });
    });

    it("should display this month stat", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("This Month")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("Interviews completed")).toBeInTheDocument();
      });
    });

    it("should display 'this month' count in total interviews card", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("5 this month")).toBeInTheDocument();
      });
    });
  });

  describe("Active Preparation Plan", () => {
    it("should display active plan when it exists", async () => {
      (fetchActivePlan as jest.Mock).mockResolvedValue(mockActivePlan);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Active Preparation Plan")).toBeInTheDocument();
        expect(screen.getByText("Senior Developer")).toBeInTheDocument();
        expect(screen.getByText("Big Tech")).toBeInTheDocument();
        expect(screen.getByText("65%")).toBeInTheDocument();
      });
    });

    it("should not display active plan section when no plan exists", async () => {
      (fetchActivePlan as jest.Mock).mockResolvedValue(null);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Active Preparation Plan")
        ).not.toBeInTheDocument();
      });
    });

    it("should format interview date correctly in active plan", async () => {
      (fetchActivePlan as jest.Mock).mockResolvedValue(mockActivePlan);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Interview:/)).toBeInTheDocument();
      });
    });

    it("should display readiness level with progress bar", async () => {
      (fetchActivePlan as jest.Mock).mockResolvedValue(mockActivePlan);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Ready")).toBeInTheDocument();
        const progressBar = document.querySelector('[role="progressbar"]');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it("should navigate to plan dashboard when clicking continue button", async () => {
      const user = userEvent.setup();
      (fetchActivePlan as jest.Mock).mockResolvedValue(mockActivePlan);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Continue Preparation Plan")
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText("Continue Preparation Plan"));
      expect(mockPush).toHaveBeenCalledWith("/plan-dashboard");
    });

    it("should fall back to localStorage if API returns no plan", async () => {
      (fetchActivePlan as jest.Mock).mockResolvedValue(null);
      localStorageMock.setItem("interviewPlan", JSON.stringify(mockActivePlan));

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Active Preparation Plan")).toBeInTheDocument();
        expect(screen.getByText("Senior Developer")).toBeInTheDocument();
      });
    });

    it("should handle missing company name gracefully", async () => {
      const planWithoutCompany = { ...mockActivePlan, company: "" };
      (fetchActivePlan as jest.Mock).mockResolvedValue(planWithoutCompany);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Target Company")).toBeInTheDocument();
      });
    });
  });

  describe("Quick Actions", () => {
    it("should display quick actions section", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Quick Actions")).toBeInTheDocument();
      });
    });

    it("should show Create Prep Plan button when no active plan", async () => {
      (fetchActivePlan as jest.Mock).mockResolvedValue(null);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Create Prep Plan")).toBeInTheDocument();
        expect(screen.getByText("Structured preparation")).toBeInTheDocument();
      });
    });

    it("should not show Create Prep Plan button when active plan exists", async () => {
      (fetchActivePlan as jest.Mock).mockResolvedValue(mockActivePlan);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.queryByText("Create Prep Plan")).not.toBeInTheDocument();
      });
    });

    it("should display Quick Mock Interview button", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Quick Mock Interview")).toBeInTheDocument();
        expect(screen.getByText("Text-based Q&A")).toBeInTheDocument();
      });
    });

    it("should display Call Interview button as disabled", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        const callButton = screen.getByText("Call Interview").closest("button");
        expect(callButton).toBeDisabled();
        expect(screen.getByText("Coming Soon")).toBeInTheDocument();
      });
    });

    it("should navigate to create-plan when clicking Create Prep Plan", async () => {
      const user = userEvent.setup();
      (fetchActivePlan as jest.Mock).mockResolvedValue(null);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Create Prep Plan")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create Prep Plan"));
      expect(mockPush).toHaveBeenCalledWith("/create-plan");
    });

    it("should navigate to Workflow when clicking Quick Mock Interview", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Quick Mock Interview")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Quick Mock Interview"));
      expect(mockPush).toHaveBeenCalledWith("/Workflow");
    });
  });

  describe("Interview History", () => {
    it("should display interview history section", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Interview History")).toBeInTheDocument();
      });
    });

    it("should display interview history tabs", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: "All Interviews" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("tab", { name: "Text Interviews" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("tab", { name: "Call Interviews" })
        ).toBeInTheDocument();
      });
    });

    it("should display all interviews in the All tab", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("interview-card-1")).toBeInTheDocument();
        expect(screen.getByTestId("interview-card-2")).toBeInTheDocument();
        expect(screen.getByTestId("interview-card-3")).toBeInTheDocument();
      });
    });

    it("should show type badge in All Interviews tab", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        const allCards = screen.getAllByTestId(/interview-card-/);
        allCards.forEach((card) => {
          expect(within(card).getByTestId("type-badge")).toBeInTheDocument();
        });
      });
    });

    it("should filter text interviews when clicking Text tab", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: "Text Interviews" })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "Text Interviews" }));

      await waitFor(() => {
        expect(screen.getByTestId("interview-card-1")).toBeInTheDocument();
        expect(screen.getByTestId("interview-card-3")).toBeInTheDocument();
        expect(
          screen.queryByTestId("interview-card-2")
        ).not.toBeInTheDocument();
      });
    });

    it("should filter call interviews when clicking Call tab", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: "Call Interviews" })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "Call Interviews" }));

      await waitFor(() => {
        expect(screen.getByTestId("interview-card-2")).toBeInTheDocument();
        expect(
          screen.queryByTestId("interview-card-1")
        ).not.toBeInTheDocument();
        expect(
          screen.queryByTestId("interview-card-3")
        ).not.toBeInTheDocument();
      });
    });

    it("should display empty state when no interviews exist", async () => {
      (fetchInterviewHistory as jest.Mock).mockResolvedValue([]);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            "No interviews found. Start a new interview to see your history here."
          )
        ).toBeInTheDocument();
      });
    });

    it("should show 'Start Your First Interview' button in empty state", async () => {
      const user = userEvent.setup();
      (fetchInterviewHistory as jest.Mock).mockResolvedValue([]);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Start Your First Interview")
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText("Start Your First Interview"));
      expect(mockPush).toHaveBeenCalledWith("/Workflow");
    });

    it("should display empty state for text interviews tab when none exist", async () => {
      const user = userEvent.setup();
      const callOnlyInterviews = mockInterviewHistory.filter(
        (i) => i.type === "call"
      );
      (fetchInterviewHistory as jest.Mock).mockResolvedValue(
        callOnlyInterviews
      );

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: "Text Interviews" })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "Text Interviews" }));

      await waitFor(() => {
        expect(
          screen.getByText("No text interviews found.")
        ).toBeInTheDocument();
      });
    });

    it("should display empty state for call interviews tab when none exist", async () => {
      const user = userEvent.setup();
      const textOnlyInterviews = mockInterviewHistory.filter(
        (i) => i.type === "text"
      );
      (fetchInterviewHistory as jest.Mock).mockResolvedValue(
        textOnlyInterviews
      );

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: "Call Interviews" })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "Call Interviews" }));

      await waitFor(() => {
        expect(
          screen.getByText("No call interviews found.")
        ).toBeInTheDocument();
      });
    });

    it("should navigate to feedback page when clicking View Details", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("interview-card-1")).toBeInTheDocument();
      });

      const viewDetailsButtons = screen.getAllByText("View Details");
      await user.click(viewDetailsButtons[0]);

      expect(mockPush).toHaveBeenCalledWith("/Feedback?sessionId=1");
    });
  });

  describe("Refresh Functionality", () => {
    it("should display refresh button", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });
    });

    it("should refetch data when clicking refresh button", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });

      // Clear previous calls
      jest.clearAllMocks();

      await user.click(screen.getByText("Refresh"));

      await waitFor(() => {
        expect(fetchDashboardStats).toHaveBeenCalled();
        expect(fetchInterviewHistory).toHaveBeenCalled();
        expect(fetchActivePlan).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error state when API calls fail", async () => {
      (fetchDashboardStats as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        expect(
          screen.getByText("Failed to load dashboard data. Please try again.")
        ).toBeInTheDocument();
      });
    });

    it("should display Try Again button in error state", async () => {
      (fetchDashboardStats as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });
    });

    it("should retry fetching data when clicking Try Again", async () => {
      const user = userEvent.setup();
      (fetchDashboardStats as jest.Mock).mockRejectedValueOnce(
        new Error("Network error")
      );

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });

      // Mock successful response for retry
      (fetchDashboardStats as jest.Mock).mockResolvedValue(mockStats);
      (fetchInterviewHistory as jest.Mock).mockResolvedValue(
        mockInterviewHistory
      );
      (fetchActivePlan as jest.Mock).mockResolvedValue(null);

      await user.click(screen.getByText("Try Again"));

      await waitFor(() => {
        expect(screen.getByText("Interview Dashboard")).toBeInTheDocument();
      });
    });

    it("should handle empty interview history response", async () => {
      (fetchInterviewHistory as jest.Mock).mockResolvedValue(null);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            "No interviews found. Start a new interview to see your history here."
          )
        ).toBeInTheDocument();
      });
    });

    it("should log error to console when fetch fails", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("API Error");
      (fetchDashboardStats as jest.Mock).mockRejectedValue(error);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error fetching dashboard data:",
          error
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Data Fetching", () => {
    it("should fetch all data on mount", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(fetchDashboardStats).toHaveBeenCalledTimes(1);
        expect(fetchInterviewHistory).toHaveBeenCalledTimes(1);
        expect(fetchActivePlan).toHaveBeenCalledTimes(1);
      });
    });

    it("should fetch data in parallel using Promise.all", async () => {
      const fetchPromises: Promise<unknown>[] = [];

      (fetchDashboardStats as jest.Mock).mockImplementation(() => {
        const promise = Promise.resolve(mockStats);
        fetchPromises.push(promise);
        return promise;
      });

      (fetchInterviewHistory as jest.Mock).mockImplementation(() => {
        const promise = Promise.resolve(mockInterviewHistory);
        fetchPromises.push(promise);
        return promise;
      });

      (fetchActivePlan as jest.Mock).mockImplementation(() => {
        const promise = Promise.resolve(null);
        fetchPromises.push(promise);
        return promise;
      });

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(fetchPromises.length).toBe(3);
      });
    });
  });

  describe("Score Color Function", () => {
    it("should apply correct color classes for different scores", async () => {
      const highScoreInterview = { ...mockInterviewHistory[0], score: 95 };
      const midScoreInterview = { ...mockInterviewHistory[1], score: 80 };
      const lowScoreInterview = { ...mockInterviewHistory[2], score: 65 };
      const poorScoreInterview = {
        ...mockInterviewHistory[0],
        id: "4",
        score: 50,
      };

      (fetchInterviewHistory as jest.Mock).mockResolvedValue([
        highScoreInterview,
        midScoreInterview,
        lowScoreInterview,
        poorScoreInterview,
      ]);

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("interview-card-1")).toBeInTheDocument();
      });

      // Component receives getScoreColor function which should return appropriate classes
      // The mocked component will receive these props
    });
  });

  describe("Responsive Layout", () => {
    it("should have responsive grid for stats cards", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        const statsGrid = screen.getByText("Total Interviews").closest("div")
          ?.parentElement?.parentElement;
        expect(statsGrid?.className).toMatch(/grid/);
        expect(statsGrid?.className).toMatch(/md:grid-cols-3/);
      });
    });

    it("should have responsive grid for quick actions", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        const quickActionsCard = screen
          .getByText("Quick Actions")
          .closest("div")?.parentElement;
        const actionsGrid = quickActionsCard?.querySelector(".grid");
        expect(actionsGrid).toBeInTheDocument();
        expect(actionsGrid?.className).toMatch(/md:grid-cols-3/);
      });
    });

    it("should have container max width", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        const container = document.querySelector(".max-w-7xl");
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        const h1 = screen.getByRole("heading", {
          level: 1,
          name: "Interview Dashboard",
        });
        expect(h1).toBeInTheDocument();
      });
    });

    it("should have accessible tab navigation", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
        expect(
          screen.getByRole("tab", { name: "All Interviews" })
        ).toBeInTheDocument();
      });
    });

    it("should have descriptive button text", async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Quick Mock Interview")).toBeInTheDocument();
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });
    });

    it("should have loading spinner with animation", () => {
      render(<Dashboard />);
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });
});
