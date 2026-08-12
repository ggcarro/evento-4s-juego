import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Cliente solo-servidor: usa la secret key, se salta RLS.
// Úsalo únicamente dentro de Route Handlers / Server Actions (nunca en un
// componente cliente) para las acciones del master y el cálculo de puntos.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}
