import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

// Client-side Supabase instance (uses anon key - safe for frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  age: number | null;
  contact_number: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};
