export type TeamId = "4space" | "wolfast" | "etech" | "gijonudos";

export type PruebaTipo =
  | "quiz"
  | "slider"
  | "true_false"
  | "votacion"
  | "tira_afloja"
  | "apuesta_ciega"
  | "doble_o_nada"
  | "subasta"
  | "duelo"
  | "portavoz_secreto";

export type Dificultad = "facil" | "media" | "dificil";

export type Fase = "lobby" | "activa" | "revelada" | "leaderboard" | "fin";

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: TeamId;
          name: string;
          color: string;
          icon: string;
          created_at: string;
        };
        Insert: {
          id: TeamId;
          name: string;
          color: string;
          icon: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          name: string;
          team_id: TeamId;
          session_token: string;
          is_kicked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          team_id: TeamId;
          session_token?: string;
          is_kicked?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      pruebas: {
        Row: {
          id: string;
          orden: number;
          tipo: PruebaTipo;
          equipo_referido: TeamId | null;
          dificultad: Dificultad;
          enunciado: string;
          config: Record<string, unknown>;
          solucion: Record<string, unknown>;
          puntos_base: number;
          duracion_segundos: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          orden: number;
          tipo: PruebaTipo;
          equipo_referido?: TeamId | null;
          dificultad: Dificultad;
          enunciado: string;
          config?: Record<string, unknown>;
          solucion?: Record<string, unknown>;
          puntos_base?: number;
          duracion_segundos?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pruebas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "pruebas_equipo_referido_fkey";
            columns: ["equipo_referido"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      game_state: {
        Row: {
          id: boolean;
          prueba_actual_id: string | null;
          fase: Fase;
          ends_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          prueba_actual_id?: string | null;
          fase?: Fase;
          ends_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["game_state"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "game_state_prueba_actual_id_fkey";
            columns: ["prueba_actual_id"];
            referencedRelation: "pruebas";
            referencedColumns: ["id"];
          },
        ];
      };
      respuestas: {
        Row: {
          id: string;
          player_id: string;
          prueba_id: string;
          respuesta: Record<string, unknown>;
          tiempo_respuesta_ms: number | null;
          puntos: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          prueba_id: string;
          respuesta: Record<string, unknown>;
          tiempo_respuesta_ms?: number | null;
          puntos?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["respuestas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "respuestas_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "respuestas_prueba_id_fkey";
            columns: ["prueba_id"];
            referencedRelation: "pruebas";
            referencedColumns: ["id"];
          },
        ];
      };
      banned_words: {
        Row: { id: number; word: string; created_at: string };
        Insert: { id?: number; word: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["banned_words"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
