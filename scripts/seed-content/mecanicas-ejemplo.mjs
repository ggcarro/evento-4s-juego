// Pruebas de ejemplo para poder probar las nuevas mecánicas: portavoz
// secreto, doble aleatorio, apuesta ciega y tira y afloja. Requiere haber
// corrido antes supabase/migrations/20260813150000_mecanicas_especiales.sql.
// Uso: node --env-file=.env.local scripts/seed-content/mecanicas-ejemplo.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const rows = [
  {
    orden: 900,
    tipo: "quiz",
    dificultad: "media",
    enunciado: "[EJEMPLO] Portavoz secreto: ¿capital de Francia?",
    config: { opciones: ["Madrid", "París", "Roma", "Berlín"] },
    solucion: { indice_correcto: 1 },
    mecanica: "portavoz_secreto",
    puntos_base: 100,
    duracion_segundos: 20,
  },
  {
    orden: 901,
    tipo: "true_false",
    dificultad: "media",
    enunciado: "[EJEMPLO] Doble aleatorio: el sol sale por el este.",
    config: {},
    solucion: { correcto: true },
    mecanica: "doble_aleatorio",
    puntos_base: 100,
    duracion_segundos: 15,
  },
  {
    orden: 902,
    tipo: "quiz",
    dificultad: "dificil",
    enunciado: "[EJEMPLO] Apuesta ciega: ¿cuántos continentes hay?",
    config: { opciones: ["5", "6", "7", "8"] },
    solucion: { indice_correcto: 2 },
    mecanica: "apuesta_ciega",
    puntos_base: 100,
    duracion_segundos: 20,
  },
  {
    orden: 903,
    tipo: "tira_afloja",
    dificultad: "facil",
    enunciado: "[EJEMPLO] ¡Tira y afloja! Pulsa lo más rápido posible",
    config: {},
    solucion: {},
    mecanica: null,
    puntos_base: 150,
    duracion_segundos: 15,
  },
];

await supabase.from("pruebas").delete().like("enunciado", "[EJEMPLO]%");
const { data, error } = await supabase.from("pruebas").insert(rows).select("id");
console.log({ inserted: data?.length ?? 0, error: error?.message });
