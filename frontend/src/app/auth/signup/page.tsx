// "use client";
// import { useState } from "react";
// import Head from "next/head";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { useToast } from "@/hooks/use-toast";
// import Navbar from "@/components/Navbar";
// import Footer from "@/components/Footer";
// const Signup = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const { toast } = useToast();
//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();

//     if (password !== confirmPassword) {
//       toast({
//         title: "Passwords do not match",
//         description: "Please ensure both passwords match.",
//         variant: "destructive",
//       });
//       return;
//     }

//     setIsLoading(true);

//     // This would be replaced with actual authentication logic
//     setTimeout(() => {
//       toast({
//         title: "Account created successfully",
//         description:
//           "Welcome to Interviewly! You can now log in with your credentials.",
//       });
//       setIsLoading(false);
//     }, 1500);
//   };
//   return (
//     <div className="min-h-screen bg-gradient-to-b from-white via-secondary/10 to-white">
//       <Head>
//         <title>Sign up - Interviewly</title>
//         <meta
//           name="description"
//           content="Create an account on Interviewly to start your interview preparation journey."
//         />
//       </Head>

//       <Navbar />

//       <div className="container mx-auto px-4 py-32">
//         <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 animate-fade-up">
//           <div className="text-center mb-6">
//             <h1 className="text-2xl font-heading font-bold text-foreground">
//               Create an Account
//             </h1>
//             <p className="text-foreground/70 mt-2">
//               Sign up to start your interview preparation
//             </p>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="you@example.com"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="password">Password</Label>
//               <Input
//                 id="password"
//                 type="password"
//                 placeholder="••••••••"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 required
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="confirmPassword">Confirm Password</Label>
//               <Input
//                 id="confirmPassword"
//                 type="password"
//                 placeholder="••••••••"
//                 value={confirmPassword}
//                 onChange={(e) => setConfirmPassword(e.target.value)}
//                 required
//               />
//             </div>

//             <Button
//               type="submit"
//               className="w-full bg-primary hover:bg-primary/90"
//               disabled={isLoading}>
//               {isLoading ? "Creating account..." : "Sign up"}
//             </Button>
//           </form>

//           <div className="mt-6 text-center text-sm">
//             <p className="text-foreground/70">
//               Already have an account?{" "}
//               <Link href="/auth/login" className="text-primary hover:underline">
//                 Log in
//               </Link>
//             </p>
//           </div>
//         </div>
//       </div>

//       <Footer />
//     </div>
//   );
// };
// export default Signup;

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SignUp() {
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isFormValid = Object.values(formData).every(
    (value) => value.trim() !== ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid)
      return toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error("User signup failed");

      const { error: dbError } = await supabase.from("profiles").insert([
        {
          id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
        },
      ]);
      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Account created! Check your email to confirm.",
      });
      router.push("/");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Signup failed, please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />

      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-center mb-4">Sign Up</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing Up..." : "Sign Up"}
            </Button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
