"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  TrendingUp,
  Plus,
  FileText,
  Phone,
  Target,
  BookOpen,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  fetchDashboardStats,
  fetchInterviewHistory,
  fetchActivePlan,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import { InterviewCard } from "@/components/dashboard/InterviewCard";
import { useWorkflow } from "@/context/WorkflowContext";

interface InterviewHistoryItem {
  id: string;
  jobTitle: string;
  company: string;
  date: string;
  duration: string;
  score: number;
  status: string;
  type: string;
  feedback: {
    strengths: string[];
    improvements: string[];
  };
}

interface DashboardStats {
  totalInterviews: number;
  averageScore: number;
  completedThisMonth: number;
}

interface PreparationPlan {
  id: string;
  jobTitle: string;
  company: string;
  interviewDate: string;
  readinessLevel: number;
  steps: any[];
  completedSteps: number;
}

const Dashboard = () => {
  const router = useRouter();
  const { resetWorkflow } = useWorkflow();
  const [activePlan, setActivePlan] = useState<PreparationPlan | null>(null);
  const [interviewHistory, setInterviewHistory] = useState<
    InterviewHistoryItem[]
  >([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    averageScore: 0,
    completedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use Promise.all to fetch all data in parallel
      const [statsResponse, historyResponse, planResponse] = await Promise.all([
        fetchDashboardStats(),
        fetchInterviewHistory(),
        fetchActivePlan(),
      ]);

      // Set stats from API response
      setStats(statsResponse);

      // Set interview history from API response
      setInterviewHistory(historyResponse || []);

      // Set active plan from API or localStorage for backward compatibility
      if (planResponse) {
        setActivePlan(planResponse);
      } else {
        const savedPlan = localStorage.getItem("interviewPlan");
        if (savedPlan) {
          setActivePlan(JSON.parse(savedPlan));
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50";
    if (score >= 75) return "text-blue-600 bg-blue-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const handleStartInterview = (type: "text" | "call") => {
    // Reset workflow state before starting a new interview
    resetWorkflow();
    if (type === "text") {
      router.push("/Workflow");
    } else {
      router.push("/Workflow");
    }
  };

  const handleViewFeedback = (interviewId: string) => {
    router.push(`/Feedback?sessionId=${interviewId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-sm">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} className="flex items-center">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8 mt-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Interview Dashboard
            </h1>
            <p className="text-gray-600">
              Track your progress and start new interview preparations
            </p>
          </div>

          {/* Active Plan Card (if exists) */}
          {activePlan && (
            <Card className="mb-8 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-primary" />
                  Active Preparation Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {activePlan.jobTitle}
                    </h3>
                    <p className="text-gray-600">
                      {activePlan.company || "Target Company"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Interview:{" "}
                      {new Date(activePlan.interviewDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {activePlan.readinessLevel || 0}%
                    </div>
                    <p className="text-sm text-gray-600">Ready</p>
                  </div>
                </div>
                <Progress
                  value={activePlan.readinessLevel || 0}
                  className="mb-4"
                />
                <Button
                  onClick={() => router.push("/plan-dashboard")}
                  className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Continue Preparation Plan
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Interviews
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalInterviews}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.completedThisMonth} this month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Score
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageScore}%</div>
                <p className="text-xs text-muted-foreground">
                  Across all interviews
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  This Month
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.completedThisMonth}
                </div>
                <p className="text-xs text-muted-foreground">
                  Interviews completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {!activePlan && (
                  <Button
                    onClick={() => router.push("/create-plan")}
                    className="h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
                    <Target className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Create Prep Plan</div>
                      <div className="text-sm opacity-90">
                        Structured preparation
                      </div>
                    </div>
                  </Button>
                )}
                <Button
                  onClick={() => handleStartInterview("text")}
                  className="h-24 flex flex-col items-center justify-center space-y-2 bg-primary hover:bg-primary/90">
                  <FileText className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Quick Mock Interview</div>
                    <div className="text-sm opacity-90">Text-based Q&A</div>
                  </div>
                </Button>
                <Button
                  onClick={() => handleStartInterview("call")}
                  className="h-24 flex flex-col items-center justify-center space-y-2 bg-secondary hover:bg-secondary/90"
                  disabled>
                  <Phone className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Call Interview</div>
                    <div className="text-sm opacity-90">
                      Real-time AI conversation
                    </div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      Coming Soon
                    </Badge>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Interview History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Interview History</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                className="flex items-center">
                <RefreshCcw className="mr-2 h-3 w-3" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All Interviews</TabsTrigger>
                  <TabsTrigger value="text">Text Interviews</TabsTrigger>
                  <TabsTrigger value="call">Call Interviews</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4 mt-6">
                  {interviewHistory.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                      <AlertCircle className="h-10 w-10 mb-2 text-gray-400" />
                      <p>
                        No interviews found. Start a new interview to see your
                        history here.
                      </p>
                      <Button
                        onClick={() => handleStartInterview("text")}
                        className="mt-4">
                        Start Your First Interview
                      </Button>
                    </div>
                  ) : (
                    interviewHistory.map((interview) => (
                      <InterviewCard
                        key={interview.id}
                        interview={interview}
                        onViewFeedback={handleViewFeedback}
                        getScoreColor={getScoreColor}
                        showTypeBadge={true} // Show type badge in "All" tab
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="text" className="space-y-4 mt-6">
                  {interviewHistory.filter((i) => i.type === "text").length ===
                  0 ? (
                    <div className="text-center py-10 text-gray-500">
                      No text interviews found.
                    </div>
                  ) : (
                    interviewHistory
                      .filter((i) => i.type === "text")
                      .map((interview) => (
                        <InterviewCard
                          key={interview.id}
                          interview={interview}
                          onViewFeedback={handleViewFeedback}
                          getScoreColor={getScoreColor}
                        />
                      ))
                  )}
                </TabsContent>

                <TabsContent value="call" className="space-y-4 mt-6">
                  {interviewHistory.filter((i) => i.type === "call").length ===
                  0 ? (
                    <div className="text-center py-10 text-gray-500">
                      No call interviews found.
                    </div>
                  ) : (
                    interviewHistory
                      .filter((i) => i.type === "call")
                      .map((interview) => (
                        <InterviewCard
                          key={interview.id}
                          interview={interview}
                          onViewFeedback={handleViewFeedback}
                          getScoreColor={getScoreColor}
                        />
                      ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
