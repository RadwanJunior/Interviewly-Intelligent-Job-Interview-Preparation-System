
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Head from "next/head";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-primary/5 to-secondary/5">
      <Head>
        <title>404 - Page Not Found | Interviewly</title>
      </Head>
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/" passHref>
          <Button>Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
