-- Datos iniciales para desarrollo local (`supabase db reset` lo ejecuta solo).

insert into teams (id, name, color, icon) values
  ('4space', '4Space', '#3b82f6', '🚀'),
  ('wolfast', 'Wolfast', '#eab308', '🐺'),
  ('etech', 'eTech', '#ef4444', '⚡'),
  ('gijonudos', 'Cogitipa-Otros', '#0d9488', '⚓');

insert into game_state (id, fase) values (true, 'lobby');

-- Lista de arranque, amplíadla desde el editor de tablas de Supabase según
-- el contexto del evento (motes internos a evitar, nombres de otros equipos
-- de forma insultante, etc). El filtro en el registro normaliza acentos y
-- mayúsculas antes de comparar contra esta lista.
insert into banned_words (word) values
  ('puta'), ('puto'), ('gilipollas'), ('subnormal'), ('retrasado'),
  ('nazi'), ('hitler'), ('admin'), ('master'), ('moderador'), ('organizacion');
