import React from "react"; 
import Link from "next/link"; 
import Head from "next/head"; 

// Define the NotFound component
export default function NotFound() {
  return (
    // Main container with centered content and background styling
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      {/* Set the page title in the document head */}
      <Head>
        <title>Page Not Found - Interviewly</title>
      </Head>

      {/* Display the 404 error code */}
      <h1 className="text-6xl font-bold text-primary">404</h1>

      {/* Display the "Page Not Found" heading */}
      <h2 className="text-2xl font-semibold mt-4 mb-6 text-center">
        Page Not Found
      </h2>

      {/* Display a descriptive message for the user */}
      <p className="text-gray-600 mb-8 text-center max-w-md">
        Sorry, the page you are looking for doesn't exist or has been moved.
      </p>

      {/* Link to return to the home page */}
      <Link
        href="/"
        className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
        Return Home
      </Link>
    </div>
  );
}