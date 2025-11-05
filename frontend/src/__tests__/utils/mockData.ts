/**
 * Mock Data Factory
 * Provides reusable mock data generators for tests
 *
 * This is a utility file - not a test suite
 */

// Prevent Jest from treating this as a test suite
if (process.env.NODE_ENV === "test") {
  // This file only exports utilities
}

export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
};

export const createMockUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
});

export const mockInterviewHistory = [
  {
    id: "interview-1",
    jobTitle: "Senior Frontend Developer",
    company: "TechCorp",
    date: "2024-10-10",
    duration: "45 min",
    score: 85,
    status: "completed",
    type: "technical",
    feedback: {
      strengths: ["Clear communication", "Good technical knowledge"],
      improvements: ["Could elaborate more on past projects"],
    },
  },
];

export const createMockInterview = (overrides = {}) => ({
  id: "interview-test",
  jobTitle: "Software Engineer",
  company: "Test Company",
  date: new Date().toISOString().split("T")[0],
  duration: "30 min",
  score: 80,
  status: "completed",
  type: "technical",
  feedback: {
    strengths: ["Good problem solving"],
    improvements: ["Practice more algorithms"],
  },
  ...overrides,
});

export const mockDashboardStats = {
  totalInterviews: 12,
  averageScore: 82,
  completedThisMonth: 5,
};

export const mockQuestions = [
  {
    id: "q1",
    question: "Tell me about yourself",
    category: "behavioral",
  },
  {
    id: "q2",
    question: "What is your experience with React?",
    category: "technical",
  },
];

export const createMockQuestion = (overrides = {}) => ({
  id: "q-test",
  question: "Test question?",
  category: "technical",
  ...overrides,
});
