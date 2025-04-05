"use client"; // Indicates that this is a Client Component in Next.js

import { useState } from "react"; 
import Head from "next/head"; 
import Navigate from "next/link"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { useToast } from "@/hooks/use-toast"; 
import { logout } from "@/lib/api"; 

const Profile = () => {
  // State to manage login status (for demo purposes, default is true)
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // State to manage user profile data
  const [name, setName] = useState("John Doe"); // User's name
  const [email, setEmail] = useState("john.doe@example.com"); // User's email
  const [bio, setBio] = useState(
    "Software Engineer with 5 years of experience in web development." // User's bio
  );

  // State to manage edit mode
  const [isEditing, setIsEditing] = useState(false);

  // Toast hook for displaying notifications
  const { toast } = useToast();

  // Function to handle user logout
  const handleLogout = async () => {
    setIsLoggedIn(false); // Update login status
    try {
      await logout(); // Call API to log out
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      }); // Show success toast
    } catch (error: any) {
      console.error("Error logging out:", error.message); // Log error
      toast({
        title: "Error",
        description: "An error occurred while logging out.",
        variant: "destructive", // Show error toast
      });
    }
  };

  // Function to handle saving profile changes
  const handleSaveProfile = () => {
    setIsEditing(false); // Exit edit mode
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully.",
    }); // Show success toast
  };

  // Redirect to login page if user is not logged in
  if (!isLoggedIn) {
    return <Navigate href="/auth/login" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-secondary/10 to-white">
      {/* Set page title and meta description */}
      <Head>
        <title>My Profile - Interviewly</title>
        <meta
          name="description"
          content="View and manage your Interviewly profile."
        />
      </Head>

      {/* Main content container */}
      <div className="container mx-auto px-4 py-32">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 animate-fade-up">
          {/* Profile header with edit/logout buttons */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              My Profile
            </h1>
            {!isEditing ? (
              // Display Edit and Logout buttons when not in edit mode
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
                <Button variant="destructive" onClick={handleLogout}>
                  Log out
                </Button>
              </div>
            ) : (
              // Display Cancel and Save buttons when in edit mode
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile}>Save Changes</Button>
              </div>
            )}
          </div>

          {/* Profile content */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile picture section */}
            <div className="md:w-1/3">
              <div className="aspect-square rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden">
                <img
                  src="https://www.v0.app/api/image/ion-person-icon.png?id=eyJmbiI6ImdldEljb25IZXJvSW1hZ2UiLCJhcmdzIjp7Imljb25TZXRTbHVnIjoiaW9uIiwiaWNvblNsdWciOiJwZXJzb24ifX0"
                  alt="Profile"
                  className="object-cover w-full h-full"
                />
              </div>
              {/* Display Change Photo button in edit mode */}
              {isEditing && (
                <Button className="w-full mt-4" variant="outline">
                  Change Photo
                </Button>
              )}
            </div>

            {/* Profile details section */}
            <div className="md:w-2/3 space-y-4">
              {/* Name input field */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  readOnly={!isEditing}
                  className={!isEditing ? "bg-secondary/20" : ""}
                />
              </div>

              {/* Email input field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!isEditing}
                  className={!isEditing ? "bg-secondary/20" : ""}
                />
              </div>

              {/* Bio textarea */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  readOnly={!isEditing}
                  className={`flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    !isEditing ? "bg-secondary/20" : ""
                  }`}
                />
              </div>

              {/* Account details section */}
              <div className="pt-4">
                <h3 className="text-lg font-medium mb-2">Account Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Member since:</span>
                  <span>April 2023</span>
                  <span className="text-muted-foreground">
                    Interviews completed:
                  </span>
                  <span>24</span>
                  <span className="text-muted-foreground">Last login:</span>
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 