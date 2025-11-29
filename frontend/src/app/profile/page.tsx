"use client";
import { useState } from "react";
import Image from "next/image";
import Head from "next/head";
import Navigate from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/api"; // Import the API.logout function

const Profile = () => {
  // This would be replaced with actual authentication check
  const [isLoggedIn, setIsLoggedIn] = useState(true); // For demo purposes
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@example.com");
  const [bio, setBio] = useState(
    "Software Engineer with 5 years of experience in web development."
  );
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Simulate logout
  const handleLogout = async () => {
    setIsLoggedIn(false);
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error logging out:", error.message);
        toast({
          title: "Error",
          description: "An error occurred while logging out.",
          variant: "destructive",
        });
      } else {
        console.error("An unknown error occurred during logout.");
        toast({
          title: "Error",
          description: "An unknown error occurred while logging out.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveProfile = () => {
    setIsEditing(false);
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully.",
    });
  };

  if (!isLoggedIn) {
    return <Navigate href="/auth/login" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-secondary/10 to-white">
      <Head>
        <title>My Profile - Interviewly</title>
        <meta
          name="description"
          content="View and manage your Interviewly profile."
        />
      </Head>

      <div className="container mx-auto px-4 py-32">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 animate-fade-up">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              My Profile
            </h1>
            {!isEditing ? (
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
                <Button variant="destructive" onClick={handleLogout}>
                  Log out
                </Button>
              </div>
            ) : (
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile}>Save Changes</Button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <div className="aspect-square rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden">
                <Image
                  src="/profile-placeholder.svg"
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  priority
                />
              </div>
              {isEditing && (
                <Button className="w-full mt-4" variant="outline">
                  Change Photo
                </Button>
              )}
            </div>

            <div className="md:w-2/3 space-y-4">
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
