import type { TeamId } from "@/lib/supabase/types";

// Reflejo estático de supabase/seed.sql para poder maquetar sin conexión.
// Cuando el login lea de Supabase, esto pasa a ser solo un fallback/tipo.
export const TEAMS: { id: TeamId; name: string; color: string; icon: string }[] = [
  { id: "4space", name: "4Space", color: "#3b82f6", icon: "🚀" },
  { id: "wolfast", name: "Wolfast", color: "#6d28d9", icon: "🐺" },
  { id: "etech", name: "eTech", color: "#f59e0b", icon: "⚡" },
  { id: "gijonudos", name: "Gijonudos", color: "#0d9488", icon: "⚓" },
];
