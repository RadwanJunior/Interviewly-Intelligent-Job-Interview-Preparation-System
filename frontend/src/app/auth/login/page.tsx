// "use client";
// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import Head from "next/head";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { useToast } from "@/hooks/use-toast";
// import { supabase } from "@/lib/supabase";

// const LogIn = () => {
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//   });
//   const [isLoading, setIsLoading] = useState(false);
//   const { toast } = useToast();
//   const router = useRouter();

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };
//   const isFormValid = Object.values(formData).every(
//     (value) => value.trim() !== ""
//   );
//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!isFormValid)
//       return toast({
//         title: "Error",
//         description: "All fields are required",
//         variant: "destructive",
//       });

//     setIsLoading(true);
//     try {
//       const { error } = await supabase.auth.signInWithPassword({
//         email: formData.email,
//         password: formData.password,
//       });
//       if (error) throw error;

//       toast({ title: "Success", description: "Login successful!" });
//       router.push("/dashboard");
//     } catch (error) {
//       toast({
//         title: "Error",
//         description:
//           (error as Error).message || "Login failed, please try again.",
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };
//   return (
//     <div className="min-h-screen bg-gradient-to-b from-white via-secondary/10 to-white">
//       <Head>
//         <title>Log in - Interviewly</title>
//         <meta
//           name="description"
//           content="Login to your Interviewly account to continue your interview preparation."
//         />
//       </Head>

//       <div className="container mx-auto px-4 py-32">
//         <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 animate-fade-up">
//           <div className="text-center mb-6">
//             <h1 className="text-2xl font-heading font-bold text-foreground">
//               Welcome Back
//             </h1>
//             <p className="text-foreground/70 mt-2">
//               Log in to continue your interview preparation
//             </p>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 name="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 required
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="password">Password</Label>
//               <Input
//                 id="password"
//                 type="password"
//                 name="password" // Add this line
//                 placeholder="••••••••"
//                 value={formData.password}
//                 onChange={handleChange}
//                 required
//               />
//             </div>

//             <Button
//               type="submit"
//               className="w-full bg-primary hover:bg-primary/90"
//               disabled={isLoading}>
//               {isLoading ? "Logging in..." : "Log in"}
//             </Button>
//           </form>

//           <div className="mt-6 text-center text-sm">
//             <p className="text-foreground/70">
//               Don't have an account?{" "}
//               <Link
//                 href="/auth/signup"
//                 className="text-primary hover:underline">
//                 Sign up
//               </Link>
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// export default LogIn;

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext"; // Using Auth Context

const LogIn = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { loginUser } = useAuth(); // Use auth context
  const { toast } = useToast();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isFormValid = Object.values(formData).every(
    (value) => value.trim() !== ""
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) {
      return toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
    }

    setIsLoading(true);
    try {
      await loginUser(formData.email, formData.password);
      toast({ title: "Success", description: "Login successful!" });
      router.push("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "Login failed, please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-secondary/10 to-white">
      <Head>
        <title>Log in - Interviewly</title>
        <meta
          name="description"
          content="Login to your Interviewly account to continue your interview preparation."
        />
      </Head>

      <div className="container mx-auto px-4 py-32">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 animate-fade-up">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Welcome Back
            </h1>
            <p className="text-foreground/70 mt-2">
              Log in to continue your interview preparation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-foreground/70">
              Don't have an account?{" "}
              <Link
                href="/auth/signup"
                className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogIn;
