// Sustituye TODAS las preguntas actuales por el nuevo temario organizado en
// categorías (con separadores de tipo 'titulo'), tal y como pidió el usuario.
// Uso: node --env-file=.env.local scripts/replace-all-pruebas.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const rows = [];
let orden = 1;
function add(row) {
  rows.push({ orden: orden++, dificultad: "media", puntos_base: 150, equipo_referido: null, ...row });
}

// ---- Apertura ----
add({
  tipo: "tira_afloja",
  enunciado: "¿Después de esta actividad voy a colegiarme en el COGITIPA?",
  config: {},
  solucion: {},
  puntos_base: 100,
});

// ---- Geografía e Historia ----
add({ tipo: "titulo", enunciado: "⭐ Geografía e Historia", config: {}, solucion: {} });

add({
  tipo: "quiz",
  dificultad: "facil",
  puntos_base: 100,
  enunciado: "¿En qué campus tienen su sede Wolfast, eTech y 4Space?",
  config: { opciones: ["Campus de Gijón", "Campus de Mieres", "Campus de Viesques", "Eh... en la Luna"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "facil",
  puntos_base: 100,
  enunciado: "¿En qué país se celebra el European Rover Challenge?",
  config: { opciones: ["Polonia", "Alemania", "España", "Eh... directamente en el desierto de Marte"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  equipo_referido: "etech",
  enunciado: "¿Dónde se celebra Formula Student Spain?",
  config: {
    opciones: [
      "Circuit de Barcelona-Catalunya (Montmeló)",
      "Eh... vale, en el aparcamiento de la EPI",
      "Circuito de Jerez",
      "MotorLand Aragón",
    ],
  },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  equipo_referido: "wolfast",
  enunciado: "¿En qué circuito de MotoGP compite Wolfast en la fase final?",
  config: {
    opciones: ["MotorLand Aragón", "Circuito de Jerez", "Circuit de Barcelona-Catalunya", "Eh... en el patio del insti"],
  },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "wolfast",
  enunciado: "¿En qué localidad se hospedó Wolfast durante la pasada competición de MotoStudent?",
  config: { opciones: ["Valdealgorfa", "Alcañiz", "Calanda", "Eh... durmieron encima de la moto"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  equipo_referido: "4space",
  enunciado: "¿Qué otra universidad española participa también en el ERC 2026?",
  config: { opciones: ["UPC", "UPM", "UPV", "Eh... la Universidad de Hogwarts"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "4space",
  enunciado: "¿En qué lugar hizo escala el año pasado 4Space de camino al ERC?",
  config: { opciones: ["Varsovia", "Fráncfort", "Ámsterdam", "Eh... hicieron autostop"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "slider",
  dificultad: "facil",
  puntos_base: 100,
  equipo_referido: "4space",
  enunciado: "¿En qué año se fundó 4Space?",
  config: { min: 2015, max: 2026 },
  solucion: { objetivo: 2025 },
});
add({
  tipo: "quiz",
  equipo_referido: "wolfast",
  enunciado: "¿En qué año compitió por primera vez Wolfast?",
  config: { opciones: ["2010", "2008", "2013", "Eh... antes de existir Wolfast ya competían en sueños"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "etech",
  enunciado: "¿En qué año compitió eTech con el Fénix?",
  config: { opciones: ["2022", "2019", "2024", "Eh... con el Fénix compitieron los faraones egipcios"] },
  solucion: { indice_correcto: 0 },
});

// ---- Famosos ----
add({ tipo: "titulo", enunciado: "⭐ Famosos", config: {}, solucion: {} });

add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "4space",
  enunciado: "¿Qué famoso youtuber estuvo presente en la primera presentación de 4Space como Control de Misión?",
  config: { opciones: ["Josep Calatayud", "ElRubius", "AuronPlay", "Eh... vino directamente Elon Musk"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "etech",
  enunciado: "¿Quién es el profesor responsable de Uniovi eTech Racing?",
  config: {
    opciones: ["Francisco Fernández Linera", "Eh... vale, el conserje de la EPI", "Juan Carlos Campo", "Alberto García"],
  },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  equipo_referido: "wolfast",
  enunciado: "¿Cuántos pilotos tiene Wolfast?",
  config: { opciones: ["2", "1", "3", "Eh... conducen 15 personas a la vez por turnos"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "4space",
  enunciado: "¿Con qué creador de contenido especializado en drones mantiene relación 4Space a raíz de SIDRONE?",
  config: {
    opciones: ["Eric Ponce", "DJI Master", "DroneRacingES", "Eh... con un pájaro real que se hizo amigo del dron"],
  },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "facil",
  puntos_base: 100,
  equipo_referido: "4space",
  enunciado: "¿Cómo se llama el rover de 4Space?",
  config: { opciones: ["TRAS2", "Rodán", "Ares", "Eh... no tiene nombre, le llaman \"el trasto\""] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "facil",
  puntos_base: 100,
  equipo_referido: "etech",
  enunciado: "¿Cómo se llama el monoplaza de eTech de la temporada 2026?",
  config: { opciones: ["Habrok Evo", "Eh... vale, el Fórmula Uno de toda la vida", "Thor X", "Fenrir GT"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "facil",
  puntos_base: 100,
  equipo_referido: "wolfast",
  enunciado: "¿Cómo se denomina dentro de Wolfast al prototipo actual de motocicleta?",
  config: { opciones: ["MS9", "MS1", "la Bestia", "Eh... \"la moto esa\""] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  equipo_referido: "4space",
  enunciado: "¿Cómo se llama el dron que acompaña al rover?",
  config: { opciones: ["Nuberu", "Xana", "Cuélebre", "Eh... no lleva dron, lleva una paloma mensajera"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  equipo_referido: "4space",
  enunciado: "¿Qué equipo perdió sus maletas cuando viajó por primera vez al ERC con LOT?",
  config: { opciones: ["4Space", "Wolfast", "eTech", "Eh... las maletas nunca existieron, viajaron con lo puesto"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  enunciado: "¿Cómo se llama el decano del COGITIPA?",
  config: {
    opciones: ["Diego Pérez Muñiz", "Manuel Rico", "Alberto García", "Eh... el decano es en realidad un algoritmo"],
  },
  solucion: { indice_correcto: 0 },
});

// ---- Ingeniería ----
add({ tipo: "titulo", enunciado: "🔧 Ingeniería", config: {}, solucion: {} });

add({
  tipo: "quiz",
  dificultad: "facil",
  puntos_base: 100,
  equipo_referido: "4space",
  enunciado: "Además del rover terrestre, ¿qué otro vehículo integra 4Space para las misiones de exploración?",
  config: { opciones: ["Un dron", "Un submarino", "Un globo aerostático", "Eh... un monopatín eléctrico"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "slider",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "4space",
  enunciado: "¿Cuál es la velocidad máxima que el ERC permite mover al rover, en cm/s?",
  config: { min: 0, max: 300 },
  solucion: { objetivo: 100 },
});
add({
  tipo: "true_false",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "4space",
  enunciado: "4Space usa Bluetooth y WiFi como protocolos principales de comunicación interna.",
  config: {},
  solucion: { correcto: false },
});
add({
  tipo: "slider",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "etech",
  enunciado: "¿En qué porcentaje aumentó la potencia del sistema de alta tensión de Habrok Evo respecto a la versión anterior?",
  config: { min: 0, max: 100 },
  solucion: { objetivo: 20 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "4space",
  enunciado: "¿Cuántas baterías lleva TRAS2?",
  config: { opciones: ["4", "2", "6", "Eh... funciona con pilas AA"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "slider",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "etech",
  enunciado: "¿Cuántos milímetros mide de largo Habrok Evo?",
  config: { min: 2000, max: 4000 },
  solucion: { objetivo: 2894 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "wolfast",
  enunciado: "¿Cuánto tarda aproximadamente la moto de Wolfast en pasar de 0 a 100 km/h?",
  config: { opciones: ["4,2 segundos", "6,7 segundos", "3 segundos", "Eh... hay que empujarla primero"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "wolfast",
  enunciado: "¿A qué categoría de moto de combustión equivale aproximadamente la motocicleta de Wolfast?",
  config: { opciones: ["Moto3", "MotoGP", "Moto2", "Eh... a un patinete eléctrico"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "true_false",
  equipo_referido: "etech",
  enunciado: "eTech Racing desarrolla un monoplaza de competición 100% eléctrico.",
  config: {},
  solucion: { correcto: true },
});
add({
  tipo: "quiz",
  equipo_referido: "wolfast",
  enunciado: "¿Qué documento exige MotoStudent para justificar económicamente hasta el último tornillo de la moto?",
  config: { opciones: ["BOM – Bill Of Materials", "factura de la ITV", "ticket de compra", "Eh... un tique de la máquina de café"] },
  solucion: { indice_correcto: 0 },
});

// ---- Esto es familiar ----
add({ tipo: "titulo", enunciado: "👨‍👩‍👧‍👦 Esto es familiar", config: {}, solucion: {} });

add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "4space",
  enunciado: "¿Para qué se utilizaba originalmente el despacho del actual taller de 4Space?",
  config: { opciones: ["Sala de rezo", "Almacén de limpieza", "Aula de informática", "Eh... era un búnker antiaéreo"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "4space",
  enunciado: "¿Qué estudiante de 4Space consume el mayor número de Coca-Colas?",
  config: {
    opciones: ["Miguel Enrique", "Un becario sin nombre", "El profe de la asignatura", "Eh... nadie, todos beben agua destilada de laboratorio"],
  },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  equipo_referido: "4space",
  enunciado: "¿Con qué compañía aérea viajó 4Space por primera vez al ERC y acabó sin sus maletas?",
  config: { opciones: ["LOT", "Ryanair", "Vueling", "Eh... fueron andando hasta Polonia"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "true_false",
  equipo_referido: "wolfast",
  enunciado: "La moto de Wolfast de la pasada edición era de color negro.",
  config: {},
  solucion: { correcto: false },
});
add({
  tipo: "true_false",
  equipo_referido: "etech",
  enunciado: "Justo antes de Formula Student Spain 2025, un fallo de motor detectado a última hora impidió a eTech competir.",
  config: {},
  solucion: { correcto: true },
});
add({
  tipo: "slider",
  equipo_referido: "etech",
  enunciado: "¿Cuántos estudiantes forman aproximadamente Uniovi eTech Racing?",
  config: { min: 0, max: 100 },
  solucion: { objetivo: 55 },
});
add({
  tipo: "quiz",
  equipo_referido: "wolfast",
  enunciado: "¿Cuántas personas forman aproximadamente Wolfast?",
  config: { opciones: ["38", "28", "45", "Eh... son 200 pero solo caben 5 en el taller a la vez"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  equipo_referido: "4space",
  enunciado: "¿Cuántos estudiantes han pasado por 4Space durante 2026?",
  config: { opciones: ["37", "25", "50", "Eh... ha pasado el pueblo entero de Gijón"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  equipo_referido: "etech",
  enunciado: "¿De qué equipo es aficionado Linera?",
  config: { opciones: ["Sporting", "Real Oviedo", "Real Madrid", "Eh... no le gusta el fútbol, solo la Fórmula 1"] },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "quiz",
  dificultad: "dificil",
  puntos_base: 200,
  enunciado: "¿Qué dos actos celebra el COITIPA todos los años?",
  config: {
    opciones: [
      "Fiesta social y Entrega de Medallas",
      "Torneo de fútbol y barbacoa",
      "Concurso de talento y cena de gala",
      "Eh... una procesión con los robots del ERC",
    ],
  },
  solucion: { indice_correcto: 0 },
});
add({
  tipo: "tira_afloja",
  puntos_base: 100,
  enunciado: "¿Pulsa si crees que tu equipo pasa más horas en el taller?",
  config: {},
  solucion: {},
});

async function main() {
  console.log(`Preparando ${rows.length} filas nuevas...`);

  // 1. Soltar la referencia de game_state a la prueba actual (si la había)
  //    para poder borrar todas las pruebas sin violar la FK.
  const { error: e0 } = await supabase
    .from("game_state")
    .update({
      prueba_actual_id: null,
      fase: "lobby",
      ends_at: null,
      elegidos: null,
      ruleta: null,
      ruleta_turno: null,
      ruleta_parados: null,
    })
    .eq("id", true);
  if (e0) throw new Error("game_state: " + e0.message);

  // 2. Borrar todo lo que depende de pruebas, y luego las pruebas mismas.
  for (const tabla of ["respuestas", "apuestas", "pujas", "tira_afloja_taps"]) {
    const { error } = await supabase.from(tabla).delete().not("prueba_id", "is", null);
    if (error) console.log(`aviso borrando ${tabla}:`, error.message);
  }
  const { error: eDel } = await supabase.from("pruebas").delete().not("id", "is", null);
  if (eDel) throw new Error("borrando pruebas: " + eDel.message);
  console.log("Pruebas antiguas borradas.");

  // 3. Insertar el nuevo temario.
  const { error: eIns } = await supabase.from("pruebas").insert(rows);
  if (eIns) throw new Error("insertando pruebas: " + eIns.message);

  console.log(`Insertadas ${rows.length} filas nuevas (preguntas + separadores de sección).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
