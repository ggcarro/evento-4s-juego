// Carga las pruebas de 4Space a partir de las respuestas que nos han pasado.
// "¿Qué hacemos en 4Space?" y "¿Qué departamento no hace nada en 4Space?" se
// descartaron a petición del equipo.
// Las opciones incorrectas de los quiz son inventadas por nosotros para el
// juego, no forman parte del contenido que pasó el equipo.
// Uso: node --env-file=.env.local scripts/seed-content/4space.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const PUNTOS = { facil: 100, media: 150, dificil: 200 };
const DURACION = { facil: 15, media: 20, dificil: 25 };

function quiz(dificultad, enunciado, opciones, correcta) {
  return { tipo: "quiz", dificultad, enunciado, config: { opciones }, solucion: { indice_correcto: correcta } };
}
function slider(dificultad, enunciado, min, max, objetivo) {
  return { tipo: "slider", dificultad, enunciado, config: { min, max }, solucion: { objetivo } };
}

const rows = [
  quiz("facil", "¿Cómo se llama el rover de 4Space?", ["TRAS2", "Rodán", "Marte-1", "Ares"], 0),
  quiz("facil", "¿Dónde está situado el taller de 4Space?", ["EPI Gijón", "Campus de Viesques", "Escuela de Minas", "Edificio Polivalente"], 0),
  quiz("facil", "Además del rover terrestre, ¿qué otro vehículo integra Trastu para misiones de exploración?", ["Un dron", "Un submarino", "Un globo aerostático", "Otro rover"], 0),

  quiz("media", "¿De qué proyecto anterior de UNIOVI evolucionó 4Space?", ["Drone4Students", "RoboOviedo", "AstroUniovi", "TeamSat"], 0),
  quiz("media", "¿En qué puesto quedó 4Space en la clasificación del ERC 2025?", ["1º", "2º", "3º", "5º"], 2),
  quiz("media", "¿Cómo se llama el dron que acompaña al rover de 4Space?", ["Nuberu", "Xana", "Trasgu", "Cuélebre"], 0),
  quiz("media", "¿Qué otra universidad española participa también en el ERC26?", ["UPC", "UPM", "UPV", "US"], 0),
  slider("media", "¿Cuántos años consecutivos ha logrado clasificarse 4Space para la final del ERC hasta 2026?", 0, 10, 2),

  slider("dificil", "¿Cuántos subsistemas/departamentos tiene 4Space?", 0, 25, 13),
  quiz("dificil", "¿En qué país se celebra el European Rover Challenge (ERC)?", ["Polonia", "España", "Francia", "Alemania"], 0),
  quiz("dificil", "¿Cuántas baterías lleva Tras2?", ["2", "3", "4", "6"], 2),
  quiz("dificil", "¿Qué dos protocolos usa principalmente 4Space para la comunicación interna?", ["CAN bus y micro-ROS", "WiFi y Bluetooth", "Zigbee y LoRa", "USB y Ethernet"], 0),
  slider("dificil", "¿Cuál es la velocidad máxima que el ERC permite mover al rover, en cm/s?", 0, 500, 100),
  slider("dificil", "¿Cuántos estudiantes han pasado por 4Space en 2026?", 0, 80, 37),
  slider("dificil", "¿Cuántas carreras y/o másteres diferentes tienen los alumnos que participan en 4Space?", 0, 30, 14),
  quiz("dificil", "¿Qué famoso youtuber estuvo presente en la primera presentación del proyecto (como Control de Misión)?", ["Josep Calatayud", "ElRubius", "AuronPlay", "Ibai Llanos"], 0),
  quiz("dificil", "¿Con qué youtuber de drones mantiene amistad 4Space a raíz del sidrone?", ["Eric Ponce de Drones", "DJI Master", "DroneRacingES", "Quadrotor Fest"], 0),
  quiz("dificil", "¿Para qué se usaba el despacho del taller antes de ser el de Drone4Students?", ["Sala de rezo", "Almacén de limpieza", "Aula de informática", "Sala de reuniones"], 0),
  quiz("dificil", "¿Qué estudiante del equipo consume el mayor número de Coca-Colas?", ["Miguel Enrique", "Un becario sin nombre", "El profe de la asignatura", "Nadie, todos beben agua"], 0),
  quiz("dificil", "¿Con qué compañía aérea viajó 4Space por primera vez al ERC, que les perdió las maletas?", ["LOT", "Ryanair", "Vueling", "Iberia"], 0),
].map((r, i) => ({
  ...r,
  orden: i + 1,
  equipo_referido: "4space",
  puntos_base: PUNTOS[r.dificultad],
  duracion_segundos: DURACION[r.dificultad],
}));

await supabase.from("pruebas").delete().eq("equipo_referido", "4space");
const { data, error } = await supabase.from("pruebas").insert(rows).select("id");
console.log({ inserted: data?.length ?? 0, error: error?.message });
