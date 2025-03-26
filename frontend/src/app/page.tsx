import { ArrowRight, Upload, Video, MessageSquare, Award } from "lucide-react"; 
import Head from "next/head"; 

const Index = () => {
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