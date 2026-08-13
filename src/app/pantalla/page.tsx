import { getPublicGameState } from "@/lib/game-state";
import { PantallaView } from "@/components/pantalla-view";

export default async function PantallaPage() {
  const initialState = await getPublicGameState();

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-white">
      <PantallaView initialState={initialState} />
    </div>
  );
}
