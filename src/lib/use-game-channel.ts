"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { GAME_CHANNEL, GAME_EVENT, type GameStatePublico } from "@/lib/game-types";

// Se suscribe al canal "game" y llama a onState con cada actualización que
// manda el master. No hace fetch inicial: eso lo hace el Server Component
// que renderiza la página, pasándolo como prop.
export function useGameChannel(onState: (state: GameStatePublico) => void) {
  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(GAME_CHANNEL)
      .on("broadcast", { event: GAME_EVENT }, ({ payload }) => {
        onStateRef.current(payload as GameStatePublico);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
