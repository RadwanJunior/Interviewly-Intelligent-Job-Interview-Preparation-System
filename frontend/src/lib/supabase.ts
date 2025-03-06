// lib/supabase.js
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with your project URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);
