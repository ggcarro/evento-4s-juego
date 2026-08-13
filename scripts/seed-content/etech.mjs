// Carga las 20 pruebas de eTech, mezclando quiz / verdadero-falso / slider
// (a petición expresa: no todas del mismo tipo). Las opciones incorrectas de
// los quiz son inventadas por nosotros para el juego, no forman parte del
// contenido que pasó el equipo. Sustituye cualquier carga anterior de eTech.
// Uso: node --env-file=.env.local scripts/seed-content/etech.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const PUNTOS = { facil: 100, media: 150, dificil: 200 };
const DURACION = { facil: 15, media: 20, dificil: 25 };

function quiz(dificultad, enunciado, opciones, correcta) {
  return {
    tipo: "quiz",
    dificultad,
    enunciado,
    config: { opciones },
    solucion: { indice_correcto: correcta },
  };
}
function truefalse(dificultad, enunciado, correcto) {
  return {
    tipo: "true_false",
    dificultad,
    enunciado,
    config: {},
    solucion: { correcto },
  };
}
function slider(dificultad, enunciado, min, max, objetivo) {
  return {
    tipo: "slider",
    dificultad,
    enunciado,
    config: { min, max },
    solucion: { objetivo },
  };
}

const rows = [
  quiz("facil", "¿A qué universidad pertenece Uniovi eTech Racing?", ["Universidad de Oviedo", "Universidad de León", "Universidad de Cantabria", "Universidad del País Vasco"], 0),
  truefalse("facil", "El equipo tiene su sede en Gijón, concretamente en el Campus de Gijón.", true),
  quiz("facil", "¿En qué competición participa Uniovi eTech Racing?", ["Formula Student", "MotoStudent", "Shell Eco-marathon", "Solar Challenge"], 0),
  truefalse("facil", "El equipo desarrolla un monoplaza de competición 100 % eléctrico.", true),
  quiz("facil", "¿Cómo se llama el monoplaza de la temporada 2026?", ["Habrok Evo", "Thor X", "Fenrir GT", "Odín Racer"], 0),
  quiz("facil", "¿Dónde se celebra Formula Student Spain?", ["Circuit de Barcelona-Catalunya (Montmeló)", "Circuito de Jerez", "Circuito Ricardo Tormo", "MotorLand Aragón"], 0),
  truefalse("facil", "Uniovi eTech Racing no está formado exclusivamente por estudiantes de ingeniería, sino también por alumnado de otras titulaciones.", true),

  slider("media", "¿Cuántos estudiantes forman actualmente Uniovi eTech Racing?", 0, 100, 55),
  quiz("media", "¿De cuántas titulaciones diferentes proceden aproximadamente sus integrantes?", ["Menos de 5", "Entre 5 y 10", "Más de 10", "Solo de Ingeniería Mecánica"], 2),
  quiz("media", "¿En cuántas grandes áreas se divide el equipo?", ["Tres", "Cuatro", "Cinco", "Dos"], 1),
  truefalse("media", "Justo antes de Formula Student Spain 2025, un fallo de motor detectado a última hora impidió al equipo competir.", true),
  truefalse("media", "Para la temporada 2026, el equipo mantuvo la base del coche, pero revisó sus sistemas, renovó el bastidor e introdujo mejoras aerodinámicas y de fiabilidad.", true),
  quiz("media", "¿Cuántas empresas y entidades respaldaron aproximadamente el proyecto durante la temporada 2026?", ["Menos de 10", "Entre 10 y 20", "Más de 40", "Ninguna"], 2),
  truefalse("media", "Uno de los principales objetivos del equipo en Formula Student Spain 2026 era superar todas las verificaciones técnicas para poder disputar las pruebas dinámicas.", true),

  slider("dificil", "¿En qué porcentaje aumentó la potencia del sistema de alta tensión de Habrok Evo respecto a la versión anterior?", 0, 100, 20),
  truefalse("dificil", "Algunas piezas de plástico impreso de las baterías de Habrok Evo fueron sustituidas por piezas de resina para mejorar su resistencia y adaptación a la normativa.", true),
  quiz("dificil", "¿Quién es el profesor responsable del proyecto?", ["Francisco Fernández Linera", "Juan Carlos Campo", "Alberto García", "Manuel Rico"], 0),
  quiz("dificil", "¿Dónde se encuentran las instalaciones del equipo?", ["Edificio Polivalente del Campus de Gijón, planta 0, módulo 8", "Escuela de Minas", "Edificio Departamental Este", "Campus de Viesques, Edificio I+D+i"], 0),
  slider("dificil", "¿Cuántos milímetros mide de largo Habrok Evo?", 2000, 4000, 2894),
  truefalse("dificil", "Formula Student Spain 2026 fue una edición histórica para Uniovi eTech Racing, ya que el equipo consiguió superar todas las verificaciones técnicas y avanzar hasta las pruebas previas a las dinámicas.", true),
].map((r, i) => ({
  ...r,
  orden: i + 1,
  equipo_referido: "etech",
  puntos_base: PUNTOS[r.dificultad],
  duracion_segundos: DURACION[r.dificultad],
}));

await supabase.from("pruebas").delete().eq("equipo_referido", "etech");
const { data, error } = await supabase.from("pruebas").insert(rows).select("id");
console.log({ inserted: data?.length ?? 0, error: error?.message });
