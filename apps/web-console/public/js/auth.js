// Thin Supabase Auth wrapper for the console. This is the ONLY file that
// talks to Supabase directly -- everything else (api.js, main.js, login.js)
// goes through the functions exported here.
//
// The URL and anon/publishable key below are meant to be public: Supabase's
// anon key carries no privileges beyond what the project's Row Level
// Security policies grant, and this app has no Supabase-side tables of its
// own (Supabase is used for identity only -- all business data still lives
// in vFirm's own API/store). The service_role key is NEVER used here; it
// lives server-side only (apps/api/src/server.mjs), for sending invite
// emails via the admin API.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://gvjjljgzguimpybpgjsf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ampsamd6Z3VpbXB5YnBnanNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjczMTksImV4cCI6MjEwNTE0MzMxOX0.JL00oUsaSWErRV869Mvd1T_QCDuhyefDIhO1UrKqYmY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

// Used by api.js on every request. Returns null (never throws) so a
// request made with no session still goes out -- the server treats a
// missing Authorization header as "no real-auth actor", same as today.
export async function getAccessToken() {
  try {
    const session = await getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Fires immediately with the current session, then again on every sign-in/
// sign-out/token-refresh. Returns the unsubscribe function.
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
