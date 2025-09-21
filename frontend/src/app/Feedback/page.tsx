"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Head from "next/head";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  MessageSquare,
  MicOff,
  Volume2,
  Copy,
  Check,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getFeedback, getFeedbackStatus } from "@/lib/api";

// Update the ApiFeedback interface to handle both structures
interface ApiFeedback {
  question_analysis: {
    question: string;
    transcript: string;
    feedback:
      | string[]
      | {
          // Can be either array or object
          strengths: string[];
          areas_for_improvement: string[];
          tips_for_improvement: string[];
        };
    tone_analysis?: string;
    tone_and_style?: string;
  }[];
  // Handle both naming conventions
  overall_feedback_summary?: string[];
  overall_feedback?: string[];
  communication_assessment: string[];
  overall_sentiment?: string;
  sentiment?: string;
  confidence_score: number;
  overall_improvement_steps?: string[];
  improvement_steps?: string[];
}

// Interface for transformed feedback data that matches UI expectations
interface FormattedFeedback {
  overallScore: number;
  strengths: string[];
  areasToImprove: string[];
  questionFeedback: {
    question: string;
    strengths: string;
    improvements: string;
    score: number;
  }[];
  keywordsMissed: string[];
  overallFeedback: string;
}

// Initial empty state
const INITIAL_FEEDBACK: FormattedFeedback = {
  overallScore: 0,
  strengths: [],
  areasToImprove: [],
  questionFeedback: [],
  keywordsMissed: [],
  overallFeedback: "",
};

const Feedback = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { toast } = useToast();

  const [feedback, setFeedback] = useState<FormattedFeedback>(INITIAL_FEEDBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);

  // Transform API data to UI format
  const transformApiDataToUiFormat = (
    apiData: ApiFeedback
  ): FormattedFeedback => {
    // Handle both naming conventions with null checks and defaults
    const overallFeedback =
      apiData.overall_feedback || apiData.overall_feedback_summary || [];
    const improvementSteps =
      apiData.improvement_steps || apiData.overall_improvement_steps || [];
    const sentiment =
      apiData.sentiment || apiData.overall_sentiment || "neutral";

    // Create strengths from communication assessment with fallback
    const strengths = apiData.communication_assessment
      ? [...apiData.communication_assessment.filter((item, i) => i < 3)]
      : ["Communication skills adequate"];

    // Use improvement steps as areas to improve with fallback
    const areasToImprove = improvementSteps;

    // Transform question analysis into the format our UI expects
    const questionFeedback = apiData.question_analysis.map((qa, index) => {
      // Skip questions with no responses or handle them specially
      if (
        !qa.transcript ||
        qa.transcript === "Audio response unavailable." ||
        !qa.feedback
      ) {
        return {
          question: qa.question,
          strengths: "No audio response provided",
          improvements:
            "Please provide an audio response for detailed feedback",
          score: 0,
        };
      }

      // Calculate a score based on sentiment and confidence score
      let score = (apiData.confidence_score || 5) * 10; // Base score 0-100

      // Adjust based on sentiment with null safety
      if (sentiment && sentiment.toLowerCase() === "positive") score += 10;
      if (sentiment && sentiment.toLowerCase() === "negative") score -= 10;

      // Keep score within 0-100 range
      score = Math.max(0, Math.min(100, score));

      // Randomize slightly to create variation between questions
      const variation = index * 5;
      score = Math.max(50, Math.min(95, score + variation - 10));

      // Get the strengths and improvements from the feedback structure with safety checks
      let feedbackArray: string[] = [];

      if (Array.isArray(qa.feedback)) {
        feedbackArray = qa.feedback;
      } else if (qa.feedback) {
        // Convert object structure to array
        const {
          strengths = [],
          areas_for_improvement = [],
          tips_for_improvement = [],
        } = qa.feedback;
        feedbackArray = [
          ...strengths,
          ...areas_for_improvement,
          ...tips_for_improvement,
        ];
      }

      // Separate strengths and improvements
      const strengthItems = feedbackArray.filter((item) =>
        item.toLowerCase().includes("strength")
      );

      const improvementItems = feedbackArray.filter(
        (item) => !item.toLowerCase().includes("strength")
      );

      const strengths =
        strengthItems.length > 0
          ? strengthItems.join(". ")
          : qa.tone_analysis ||
            qa.tone_and_style ||
            "Good effort on this response";

      const improvements =
        improvementItems.length > 0
          ? improvementItems.join(". ")
          : "Continue practicing this area.";

      return {
        question: qa.question,
        strengths,
        improvements,
        score: Math.round(score),
      };
    });

    // Extract potential keywords from overall feedback
    const keywordExtractor = (text: string): string[] => {
      if (!text) return [];

      // Common technical skills and interview-relevant terms to prioritize
      const priorityTerms = [
        "python",
        "javascript",
        "typescript",
        "react",
        "node",
        "angular",
        "vue",
        "aws",
        "azure",
        "sql",
        "nosql",
        "mongodb",
        "database",
        "api",
        "rest",
        "graphql",
        "docker",
        "kubernetes",
        "ci/cd",
        "agile",
        "scrum",
        "leadership",
        "teamwork",
        "problem-solving",
        "algorithms",
        "data structures",
        "machine learning",
        "ai",
        "communication",
        "analytics",
        "testing",
        "security",
        "cloud",
        "devops",
      ];

      // Common stop words to filter out
      const stopWords = new Set([
        "the",
        "a",
        "an",
        "and",
        "but",
        "if",
        "or",
        "because",
        "as",
        "what",
        "which",
        "this",
        "that",
        "these",
        "those",
        "then",
        "just",
        "so",
        "than",
        "such",
        "when",
        "very",
        "can",
        "will",
        "should",
        "now",
        "more",
        "also",
        "other",
        "some",
        "such",
        "only",
        "its",
        "for",
        "you",
        "your",
        "with",
        "has",
        "have",
        "had",
        "his",
        "her",
        "they",
        "their",
        "them",
      ]);

      // Extract multi-word phrases first (2-3 word combinations)
      const phraseRegex = /\b[A-Za-z][A-Za-z\s]{2,25}?\b/g;
      const phrases = text.match(phraseRegex) || [];

      // Filter and prioritize phrases
      const relevantPhrases = phrases
        .filter(
          (phrase) =>
            phrase.length > 4 && // Avoid very short phrases
            !stopWords.has(phrase.toLowerCase()) &&
            priorityTerms.some((term) => phrase.toLowerCase().includes(term))
        )
        .slice(0, 5);

      // Extract individual words (include both capitalized and technical terms)
      const wordRegex = /\b([A-Z][a-z]{2,}|[a-z]{2,}[A-Z][a-z]*|[a-z]{3,})\b/g;
      const words = text.match(wordRegex) || [];

      // Filter words: remove stop words and prioritize technical terms
      const relevantWords = words
        .filter((word) => word.length > 2 && !stopWords.has(word.toLowerCase()))
        .sort((a, b) => {
          // Prioritize words from our priority list
          const aIsPriority = priorityTerms.some(
            (term) => a.toLowerCase() === term || a.toLowerCase().includes(term)
          );
          const bIsPriority = priorityTerms.some(
            (term) => b.toLowerCase() === term || b.toLowerCase().includes(term)
          );

          if (aIsPriority && !bIsPriority) return -1;
          if (!aIsPriority && bIsPriority) return 1;
          return 0;
        });

      // Combine phrases and words, prioritize phrases, and remove duplicates
      const combined = [...new Set([...relevantPhrases, ...relevantWords])];

      // Return most relevant keywords (up to 5)
      return combined.slice(0, 5);
    };

    // Join overall feedback points into a paragraph with null safety
    const overallFeedbackText = overallFeedback.join(" ");

    // Calculate overall score based on confidence and sentiment
    let overallScore = (apiData.confidence_score || 5) * 10;
    if (sentiment && sentiment.toLowerCase() === "positive") overallScore += 10;
    if (sentiment && sentiment.toLowerCase() === "negative") overallScore -= 10;
    overallScore = Math.max(0, Math.min(100, overallScore));

    return {
      overallScore: Math.round(overallScore),
      strengths,
      areasToImprove,
      questionFeedback,
      keywordsMissed: keywordExtractor(overallFeedbackText),
      overallFeedback: overallFeedbackText,
    };
  };

  // Fetch feedback data when component loads
  useEffect(() => {
    const fetchFeedback = async () => {
      if (!sessionId) {
        setError("No interview session ID provided");
        setLoading(false);
        return;
      }

      try {
        // Check feedback status first
        const statusResponse = await getFeedbackStatus(sessionId);

        if (statusResponse.status === "processing") {
          // If still processing and under 30 attempts, continue polling
          if (pollingCount < 30) {
            console.log("Feedback still processing, will check again soon...");
            setTimeout(() => {
              setPollingCount((prev) => prev + 1);
            }, 3000); // Poll every 3 seconds
            return;
          } else {
            throw new Error(
              "Feedback generation is taking longer than expected"
            );
          }
        } else if (statusResponse.status === "error") {
          throw new Error(
            statusResponse.message || "Error generating feedback"
          );
        } else if (statusResponse.status === "not_started") {
          throw new Error("Feedback generation has not started yet");
        }

        // If status is completed or success, fetch the feedback data
        const response = await getFeedback(sessionId);

        if (response.status === "success" && response.feedback) {
          const transformedData = transformApiDataToUiFormat(response.feedback);
          setFeedback(transformedData);
          setLoading(false);
        } else {
          throw new Error("Invalid feedback data received");
        }
      } catch (err) {
        console.error("Failed to fetch feedback:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load feedback data"
        );
      } finally {
        setLoading(false);
      }
    };

    if (loading || pollingCount > 0) {
      fetchFeedback();
    }
  }, [sessionId, loading, pollingCount]);

  // Calculate the color for the score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  // Calculate badge variant based on score
  const getBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  // Copy feedback to clipboard
  const copyFeedback = () => {
    const feedbackText = `
Interview Feedback Summary
Overall Score: ${feedback.overallScore}/100

Strengths:
${feedback.strengths.map((s) => `- ${s}`).join("\n")}

Areas to Improve:
${feedback.areasToImprove.map((a) => `- ${a}`).join("\n")}

Question-by-Question Feedback:
${feedback.questionFeedback
  .map(
    (q) =>
      `Question: ${q.question}\nStrengths: ${q.strengths}\nImprovements: ${q.improvements}\nScore: ${q.score}/100`
  )
  .join("\n\n")}

Keywords Missed: ${feedback.keywordsMissed.join(", ")}

Overall Feedback:
${feedback.overallFeedback}
    `;

    navigator.clipboard.writeText(feedbackText);
    setCopied(true);
    toast({
      title: "Feedback Copied",
      description: "Interview feedback has been copied to your clipboard.",
    });

    setTimeout(() => setCopied(false), 2000);
  };

  // Retry the interview
  const handleRetry = () => {
    router.push("/Workflow");
  };

  // Loading state - show different message when actively polling
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">
            {pollingCount > 0
              ? `Generating your feedback... (${pollingCount}/30)`
              : "Loading your feedback..."}
          </p>
          {pollingCount > 0 && (
            <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-2" />
              This may take a minute or two
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-2xl font-bold">Error Loading Feedback</h2>
          <p className="mt-2">{error}</p>
          <Button
            onClick={() => router.push("/interview?sessionId=" + sessionId)}
            className="mt-6">
            Return to Interview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Head>
        <title>Interview Feedback - Interviewly</title>
        <meta
          name="description"
          content="Review your interview performance and get AI-powered feedback."
        />
      </Head>

      <main className="flex-grow container mx-auto px-4 py-8 mt-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Your Interview Feedback
            </h1>
            <p className="text-gray-500 mt-2">
              AI-powered analysis of your interview performance
            </p>
          </div>

          {/* Rest of your component remains the same */}
          {/* Just use the feedback state variable which is now populated from the API */}

          {/* Overall Score Card */}
          <Card className="mb-8 border-t-4 border-t-primary shadow-md">
            {/* Card content remains the same */}
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl">Overall Performance</CardTitle>
                <CardDescription>
                  Based on your responses to all questions
                </CardDescription>
              </div>
              <div
                className={`text-4xl font-bold ${getScoreColor(
                  feedback.overallScore
                )}`}>
                {feedback.overallScore}%
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={feedback.overallScore} className="h-3 mb-4" />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-medium flex items-center gap-2 mb-2">
                    <CheckCircle2 className="text-green-500 h-5 w-5" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {feedback.strengths.map((strength, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-green-500 font-bold">+</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-amber-500 h-5 w-5" />
                    Areas to Improve
                  </h3>
                  <ul className="space-y-2">
                    {feedback.areasToImprove.map((area, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-amber-500 font-bold">!</span>
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question-by-Question Analysis */}
          <h2 className="text-2xl font-bold mb-4">
            Question-by-Question Analysis
          </h2>
          <div className="space-y-4 mb-8">
            {feedback.questionFeedback.map((item, index) => (
              <Card key={index} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-medium pr-4">
                      {item.question}
                    </CardTitle>
                    <Badge variant={getBadgeVariant(item.score)}>
                      {item.score}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <div className="grid gap-3 md:grid-cols-2 mt-2">
                    <div className="bg-green-50 p-3 rounded-md">
                      <h4 className="font-medium text-green-700 text-sm mb-1">
                        Strengths
                      </h4>
                      <p className="text-sm text-gray-600">{item.strengths}</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-md">
                      <h4 className="font-medium text-amber-700 text-sm mb-1">
                        Improvements
                      </h4>
                      <p className="text-sm text-gray-600">
                        {item.improvements}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Keywords Missed */}
          <Alert className="mb-8 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle>Missed Opportunities</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                You didn't mention these keywords that might have strengthened
                your answers:
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {feedback.keywordsMissed.map((keyword, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="border-amber-300 text-amber-700">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>

          {/* Overall Feedback Summary */}
          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Overall Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{feedback.overallFeedback}</p>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-between gap-3">
              <Button
                variant="outline"
                onClick={copyFeedback}
                className="gap-2">
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy Feedback"}
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRetry}>
                  Practice Again
                </Button>
                <Button className="gap-2">
                  Get Coaching
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Practice Resources */}
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Listen to Your Answers
                </CardTitle>
                <CardDescription>
                  Review your recorded responses to hear how you sound
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-24">
                  <Button variant="outline" className="gap-2">
                    <Volume2 className="h-5 w-5" />
                    Play Recordings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Improve Your Communication
                </CardTitle>
                <CardDescription>
                  Get personalized coaching for interview success
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-24">
                  <Button variant="outline" className="gap-2">
                    <MicOff className="h-5 w-5" />
                    Book Coach Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push(`interview?sessionId=${sessionId}`)}>
              Back to Interview
            </Button>
            <Button onClick={handleRetry}>Try Another Interview</Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Feedback;
