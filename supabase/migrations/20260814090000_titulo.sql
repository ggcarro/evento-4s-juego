-- "Falsas preguntas" usadas como separador de sección (p.ej. "Esto es
-- familiar", "Arte"): el master las lanza como cualquier prueba, se ven a
-- pantalla completa en jugador y pantalla, pero no piden respuesta ni
-- puntúan.

alter table pruebas drop constraint if exists pruebas_tipo_check;
alter table pruebas add constraint pruebas_tipo_check
  check (tipo in (
    'quiz', 'slider', 'true_false', 'votacion', 'tira_afloja',
    'apuesta_ciega', 'doble_o_nada', 'subasta', 'duelo', 'portavoz_secreto',
    'titulo'
  ));
