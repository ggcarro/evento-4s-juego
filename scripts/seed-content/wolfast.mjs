// Carga las 20 pruebas de Wolfast (quiz de opción múltiple). Dificultad
// asignada según el pantallazo con código de colores del equipo:
// amarillo = Nivel 1 (fácil), verde = Nivel 2 (media), cian = Nivel 3 (difícil).
// Idempotente: si el enunciado ya existe, lo salta.
// Uso: node --env-file=.env.local scripts/seed-content/wolfast.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const PUNTOS = { facil: 100, media: 150, dificil: 200 };
const DURACION = { facil: 15, media: 20, dificil: 25 };

const DIFICULTAD_POR_N = {
  1: "media", 2: "media", 3: "media", 4: "media", 5: "media",
  6: "dificil", 7: "dificil",
  8: "media",
  9: "dificil",
  10: "media", 11: "media", 12: "media",
  13: "dificil",
  14: "facil",
  15: "media",
  16: "dificil",
  17: "dificil",
  18: "facil",
  19: "dificil",
  20: "facil",
};

const PREGUNTAS = [
  { n: 1, enunciado: "¿En cuántos departamentos está dividido Wolfast?", opciones: ["5", "4", "3", "6"], correcta: 0 },
  { n: 2, enunciado: "¿De qué color fue la moto de Wolfast de la edición pasada?", opciones: ["Verde", "azul", "negra", "amarilla"], correcta: 0 },
  { n: 3, enunciado: "¿En qué edición está Wolfast actualmente?", opciones: ["Primera", "novena", "octava", "séptima"], correcta: 1 },
  { n: 4, enunciado: "¿Cuántas personas son en el equipo Wolfast?", opciones: ["38", "45", "28", "10"], correcta: 0 },
  { n: 5, enunciado: "¿Por qué 3 etapas pasa Wolfast durante cada edición?", opciones: ["Diseño, Fabricación y Competición", "Planificación, Fabricación y Presentación, Test y Competición", "Diseño, Montaje y Homologación"], correcta: 0 },
  { n: 6, enunciado: "¿Cuánto tarda la moto de Wolfast en pasar de 0 a 100?", opciones: ["6.7", "3", "4.2", "5.3"], correcta: 2 },
  { n: 7, enunciado: "¿Cuantos pilotos tiene Wolfast?", opciones: ["1", "3", "2", "4"], correcta: 2 },
  { n: 8, enunciado: "¿De que marca son los neumáticos de Wolfast?", opciones: ["Pirelli", "Dunlop", "Bridgestone", "Michelin"], correcta: 0 },
  { n: 9, enunciado: "¿A qué moto equivale la de Wolfast en una competición de combustión?", opciones: ["MotoGP", "Moto2", "Moto3", "Copa Derbi"], correcta: 2 },
  { n: 10, enunciado: "¿Cuantos patrocinadores tiene Wolfast?", opciones: ["Menos de 5", "entre 5 y 10", "más de 15", "10"], correcta: 2 },
  { n: 11, enunciado: "¿En qué circuito de MotoGP compite el equipo Wolfast en la fase final?", opciones: ["Circuito de Jerez", "Motoland Aragón", "Circuito de Barcelona", "Circuito Ricardo Tormo"], correcta: 1 },
  { n: 12, enunciado: "¿Qué evalúan los jueces en la fase MS1 de la competición Motostudent?", opciones: ["Velocidad máxima en recta", "tiempo de frenada", "plan de negocio y proyecto industrial", "carrera de resistencia"], correcta: 2 },
  { n: 13, enunciado: "¿Cuáles son los idiomas oficiales de la competición Motostudent?", opciones: ["Italiano, francés, alemán e inglés", "español e inglés", "inglés", "todos"], correcta: 1 },
  { n: 14, enunciado: "¿Qué documento exige el Área de Costes para justificar hasta el último tornillo de la moto en Motostudent?", opciones: ["DNI de la moto", "factura de la ITV", "ticket de compra", "BOM – Bill Of Materials"], correcta: 3 },
  { n: 15, enunciado: "¿Dónde se ubica la sede del equipo Wolfast?", opciones: ["EPI", "El Cristo", "La Laboral", "EPM"], correcta: 0 },
  { n: 16, enunciado: "¿En cuántas ediciones de la competición Motostudent ha participado Wolfast?", opciones: ["5", "7", "10", "en todas"], correcta: 3 },
  { n: 17, enunciado: "¿En qué categoría de Motostudent compite actualmente?", opciones: ["MS Petrol", "MS Electric", "Moto3 Electric", "Moto E"], correcta: 1 },
  { n: 18, enunciado: "¿A qué llamamos MS9 dentro de Wolfast?", opciones: ["Al noveno patrocinador", "a la novena edición", "al prototipo de motocicleta desarrollado por Wolfast para la competición", "al noveno departamento del equipo"], correcta: 2 },
  { n: 19, enunciado: "¿En qué localidad se hospedaron los miembros de Wolfast durante la pasada competición de Motostudent?", opciones: ["Alcañiz", "Calanda", "Castelserás", "Valdealgorfa"], correcta: 3 },
  { n: 20, enunciado: "¿En qué idioma deben presentarse los entregables de Motostudent?", opciones: ["Español", "inglés", "en cualquiera de los idiomas oficiales", "en el del país de tu universidad"], correcta: 1 },
];

const rows = PREGUNTAS.map(({ n, enunciado, opciones, correcta }) => {
  const dificultad = DIFICULTAD_POR_N[n];
  return {
    orden: n,
    tipo: "quiz",
    equipo_referido: "wolfast",
    dificultad,
    enunciado,
    config: { opciones },
    solucion: { indice_correcto: correcta },
    puntos_base: PUNTOS[dificultad],
    duracion_segundos: DURACION[dificultad],
  };
});

const { data: existing } = await supabase
  .from("pruebas")
  .select("enunciado")
  .eq("equipo_referido", "wolfast");
const existingSet = new Set((existing ?? []).map((r) => r.enunciado));
const toInsert = rows.filter((r) => !existingSet.has(r.enunciado));

if (toInsert.length === 0) {
  console.log("Todas las pruebas de Wolfast ya estaban cargadas.");
} else {
  const { data, error } = await supabase.from("pruebas").insert(toInsert).select("id");
  console.log({ inserted: data?.length ?? 0, error: error?.message });
}
