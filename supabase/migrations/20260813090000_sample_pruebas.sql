-- Pruebas de ejemplo para poder construir y probar el panel del master, la
-- pantalla y la vista de jugador antes de tener las 60 preguntas reales.
-- Cuando lleguen los contenidos definitivos, se borran estas filas y se
-- insertan las reales con la misma forma (config/solucion).

insert into pruebas (orden, tipo, dificultad, enunciado, config, solucion, puntos_base, duracion_segundos) values
(
  1, 'quiz', 'facil', '[EJEMPLO] ¿Cuál de estos NO es uno de los cuatro equipos?',
  '{"opciones": ["4Space", "Wolfast", "eTech", "Marsútil"]}',
  '{"indice_correcto": 3}',
  100, 20
),
(
  2, 'true_false', 'facil', '[EJEMPLO] Gijonudos es el equipo para quien no pertenece a los otros tres.',
  '{}',
  '{"correcto": true}',
  100, 15
),
(
  3, 'slider', 'media', '[EJEMPLO] ¿Cuántos minutos dura aproximadamente el juego?',
  '{"min": 0, "max": 120}',
  '{"objetivo": 35}',
  150, 20
),
(
  4, 'quiz', 'dificil', '[EJEMPLO] Pregunta de ejemplo con dificultad alta.',
  '{"opciones": ["Opción A", "Opción B", "Opción C", "Opción D"]}',
  '{"indice_correcto": 1}',
  200, 20
);
