import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ictpgdsjsotjxuastvib.supabase.co";
const supabasePublishableKey = "sb_publishable_tUyBkaT0H87U_5qIsTvIjQ_uAGYZMOL";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
