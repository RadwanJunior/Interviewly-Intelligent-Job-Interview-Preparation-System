"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api, logout } from "@/lib/api";
import axios from "axios";

type ProfileType = {
  id: string;
  username?: string;
  first_name: string;
  last_name: string;
  email?: string;
  created_at: string;
  updated_at: string;
};

const Profile = () => {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [editableProfile, setEditableProfile] = useState<ProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Keep editableProfile in sync with profile
  useEffect(() => {
    setEditableProfile(profile);
  }, [profile]);

  // Fetch profile
  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/profile");
      setProfile(res.data);
    } catch (error: unknown) {
      console.error("fetchProfile error:", error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to view your profile.",
          variant: "destructive",
        });
        setProfile(null);

        // Optional: redirect after short delay
        setTimeout(() => {
          router.push("/auth/login");
        }, 100);
      } else {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to fetch profile",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setProfile(null);
      router.push("/auth/login");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (profile) setEditableProfile(profile);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      if (!editableProfile) return;

      const res = await api.put("/auth/profile", {
        first_name: editableProfile.first_name,
        last_name: editableProfile.last_name,
      });

      setProfile(res.data); // editableProfile will auto-sync via useEffect
      setIsEditing(false);

      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-secondary/10 to-white">
      <Head>
        <title>My Profile - Interviewly</title>
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
                <Button
                  variant="destructive"
                  className="border border-red-500 bg-red-50 text-red-700 hover:bg-red-100"
                  onClick={handleLogout}
                >
                  Log out
                </Button>
              </div>
            ) : (
              <div className="space-x-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <div className="aspect-square rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden">
                <img
                  src="https://cdn-icons-png.flaticon.com/512/1077/1077012.png"
                  alt="Profile"
                  className="object-cover w-full h-full"
                />
              </div>
            </div>

            <div className="md:w-2/3 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  type="text"
                  value={editableProfile?.first_name || ""}
                  readOnly={!isEditing}
                  onChange={(e) =>
                    setEditableProfile((prev) =>
                      prev ? { ...prev, first_name: e.target.value } : prev
                    )
                  }
                  tabIndex={isEditing ? 0 : -1}
                  className={`${
                    !isEditing ? "bg-secondary/20 pointer-events-none" : ""
                  }`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  type="text"
                  value={editableProfile?.last_name || ""}
                  readOnly={!isEditing}
                  onChange={(e) =>
                    setEditableProfile((prev) =>
                      prev ? { ...prev, last_name: e.target.value } : prev
                    )
                  }
                  tabIndex={isEditing ? 0 : -1}
                  className={`${
                    !isEditing ? "bg-secondary/20 pointer-events-none" : ""
                  }`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editableProfile?.email || ""}
                  readOnly
                  tabIndex={-1}
                  className="bg-secondary/20 pointer-events-none"
                />
              </div>

              <div className="pt-4">
                <h3 className="text-lg font-medium mb-2">Account Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Member since:</span>
                  <span>
                    {profile
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "..."}
                  </span>
                  <span className="text-muted-foreground">Last update:</span>
                  <span>
                    {profile
                      ? new Date(profile.updated_at).toLocaleDateString()
                      : "..."}
                  </span>
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
