-- Ruleta por turnos: cada equipo gira y para su propia rueda uno detrás de
-- otro (ceremonia), y solo cuando los 4 han parado se revela la pregunta
-- real. También añade una duración global (máx. 20s) configurable desde el
-- panel de master, que sustituye a la duración por pregunta.

alter table game_state drop constraint if exists game_state_fase_check;
alter table game_state add constraint game_state_fase_check
  check (fase in ('lobby', 'apostando', 'subastando', 'ruleta', 'activa', 'revelada', 'leaderboard', 'fin'));

-- Equipo al que le toca girar/parar ahora mismo.
alter table game_state add column ruleta_turno text references teams(id);
-- Equipos que ya han parado su rueda esta ronda (en orden de resolución).
alter table game_state add column ruleta_parados jsonb;

alter table game_state add column duracion_global_segundos integer not null default 20;
