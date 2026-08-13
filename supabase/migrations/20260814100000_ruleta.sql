-- Ruleta: selección pública de un representante por equipo (iluminado en su
-- color) + giro de una ruleta de premios/penalización por equipo antes de la
-- pregunta. Las casillas ("puntos" o "convocatoria") se configuran por
-- pregunta en config.ruleta_segmentos.

alter table pruebas drop constraint if exists pruebas_mecanica_check;
alter table pruebas add constraint pruebas_mecanica_check
  check (mecanica in ('portavoz_secreto', 'doble_aleatorio', 'apuesta_ciega', 'ruleta'));

-- { [team_id]: { representante: {id,name}, resultado: {tipo:'puntos',valor}|{tipo:'convocatoria'} } }
-- A diferencia de `elegidos` (secreto hasta revelar), esto se manda por
-- Broadcast en cuanto se lanza la prueba: es una selección pública.
alter table game_state add column ruleta jsonb;
