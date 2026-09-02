import { GalaxyIntro } from "./GalaxyIntro";
import { useVault } from "@/lib/store";

export function ChartCanvas() {
  const entered = useVault((s) => s.entered);
  if (entered) return null;
  return <GalaxyIntro />;
}
