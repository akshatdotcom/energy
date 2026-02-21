import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function createServerSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
