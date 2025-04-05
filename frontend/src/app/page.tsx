"use client";
import {
  ArrowRight,
  Upload,
  Video,
  MessageSquare,
  Award,
  CheckCircle2,
} from "lucide-react";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const Index = () => {
  const router = useRouter();

  const pricingPlans = [
    {
      name: "Basic",
      price: "Free",
      description: "Perfect for getting started with interview preparation",
      features: [
        "3 mock interviews per month",
        "Basic AI feedback",
        "Resume analysis",
        "Job description matching",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "$29",
      description: "Advanced features for serious job seekers",
      features: [
        "Unlimited mock interviews",
        "Detailed performance analytics",
        "Personalized improvement plan",
        "Video mock interviews",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
  ];

  const howItWorksSteps = [
    {
      number: "01",
      title: "Upload Your Documents",
      description:
        "Submit your resume and the job description you're applying for.",
    },
    {
      number: "02",
      title: "Receive Tailored Questions",
      description:
        "Our AI analyzes both documents to generate relevant interview questions.",
    },
    {
      number: "03",
      title: "Practice Your Responses",
      description: "Record your answers in a simulated interview environment.",
    },
    {
      number: "04",
      title: "Get Detailed Feedback",
      description:
        "Receive AI-powered analysis and suggestions to improve your performance.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-secondary/10 to-white">
      {/* Set the page title and meta description */}
      <Head>
        <title>Interviewly - Master Your Interviews with AI</title>
        <meta
          name="description"
          content="Practice with personalized interview questions based on your resume and dream job. Get instant feedback to improve your performance."
        />
      </Head>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 pointer-events-none"></div>
        <div className="container mx-auto text-center">
          {/* Tagline with animation */}
          <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6 animate-fade-up">
            AI-Powered Interview Preparation
          </span>
          {/* Main heading with animation */}
          <h1
            className="text-4xl md:text-6xl font-heading font-bold text-foreground mb-6 animate-fade-up"
            style={{ animationDelay: "0.1s" }}>
            Master Your Interviews with AI
          </h1>
          {/* Subheading with animation */}
          <p
            className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto mb-8 animate-fade-up"
            style={{ animationDelay: "0.2s" }}>
            Practice with personalized interview questions based on your resume
            and dream job. Get instant feedback to improve your performance.
          </p>
          {/* Call-to-action button with animation */}
          <button
            onClick={() => router.push("/Workflow")}
            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-full hover:bg-primary/90 transition-all transform hover:scale-105 animate-fade-up shadow-lg shadow-primary/25"
            style={{ animationDelay: "0.3s" }}>
            Start Practicing
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section
        className="py-20 bg-gradient-to-b from-primary/20 via-primary/10 to-secondary/10"
        id="features">
        <div className="container mx-auto px-4">
          {/* Section heading */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
              Why Choose Interviewly
            </h2>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              Get the tools and feedback you need to ace your next interview
            </p>
          </div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Upload className="h-8 w-8 text-primary" />,
                title: "Resume Analysis",
                description:
                  "Upload your resume and job description for tailored interview questions",
              },
              {
                icon: <Video className="h-8 w-8 text-primary" />,
                title: "Practice Interviews",
                description:
                  "Record your responses and get instant feedback on your performance",
              },
              {
                icon: <MessageSquare className="h-8 w-8 text-primary" />,
                title: "AI Feedback",
                description:
                  "Receive detailed analysis and suggestions to improve your answers",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white to-primary/5 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow animate-fade-up backdrop-blur-sm border border-primary/10"
                style={{ animationDelay: `${0.1 * index}s` }}>
                {/* Feature icon with gradient background */}
                <div className="bg-gradient-to-br from-primary/30 to-primary/20 w-16 h-16 rounded-xl flex items-center justify-center mb-6 transform hover:scale-105 transition-transform">
                  {feature.icon}
                </div>
                {/* Feature title */}
                <h3 className="text-xl font-heading font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                {/* Feature description */}
                <p className="text-foreground/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container px-6 md:px-12 mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 opacity-0 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Follow these four simple steps to improve your interview
              performance.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorksSteps.map((step, index) => (
              <div
                key={index}
                className="relative bg-gradient-to-br from-white to-primary/5 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow animate-fade-up backdrop-blur-sm border border-primary/10">
                {/* Step Number */}
                <div className="flex justify-center items-center w-14 h-14 rounded-full bg-[#68B984] text-white text-2xl font-bold mx-auto mb-4 transition duration-300 group-hover:bg-[#57A877]">
                  {step.number}
                </div>

                {/* Step Title */}
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>

                {/* Step Description */}
                <p className="text-sm">{step.description}</p>

                {/* Arrow (Only if not last step) */}
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 right-[-25px] transform -translate-y-1/2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#68B984] text-white shadow-md">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Call-to-Action Button */}
          <div className="mt-16 text-center opacity-0 animate-fade-in delay-400">
            <Button className="px-6 py-3 bg-[#68B984] text-white font-semibold rounded-lg hover:bg-primary/90 transition">
              Try It Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        className="py-20 bg-gradient-to-t from-primary/20 via-primary/10 to-secondary/10"
        id="pricing">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 opacity-0 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              Choose the plan that&apos;s right for your interview preparation
              needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white border ${
                  plan.popular ? "border-primary" : "border-border"
                } rounded-xl p-8 shadow-lg hover:shadow-xl opacity-0 animate-fade-in delay-${
                  index * 100
                }`}>
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "Free" && (
                    <span className="text-muted-foreground ml-2">/month</span>
                  )}
                </div>
                <p className="text-muted-foreground mt-2 mb-6">
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle2
                        className={`h-5 w-5 ${
                          plan.popular
                            ? "text-primary"
                            : "text-muted-foreground"
                        } mr-2 mt-0.5`}
                      />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full">
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* CTA card with gradient background */}
          <div className="bg-gradient-to-br from-primary via-primary/95 to-primary/90 rounded-3xl p-12 text-center shadow-xl relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iMTAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNTYiIGhlaWdodD0iMTAwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMjggNjZMMCA1MEwyOCAzNGwyOCAxNnptMC0zMkwyOCAwbDI4IDE2TDI4IDMyeiIgZmlsbC1ydWxlPSJldmVub2RkIiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-10"></div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent"></div>
            {/* CTA content */}
            <div className="max-w-2xl mx-auto relative z-10">
              {/* Award icon with animation */}
              <Award className="h-12 w-12 text-white/90 mx-auto mb-6 animate-bounce" />
              {/* CTA heading */}
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
                Ready to Excel in Your Interviews?
              </h2>
              {/* CTA description */}
              <p className="text-white/90 text-lg mb-8">
                Join thousands of successful candidates who have mastered their
                interview skills with Interviewly.
              </p>
              {/* CTA button */}
              <button className="inline-flex items-center px-8 py-3 bg-white text-primary rounded-full hover:bg-white/90 transition-all transform hover:scale-105 shadow-lg">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index; 