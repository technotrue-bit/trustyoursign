import type { ComponentProps } from "react";
import { Text } from "@react-three/drei";
import { isAppleTouch } from "@/lib/gpu";

/** Troika text atlases ReadPixels; that stalls iOS and can drop the GL context. */
export function Label(props: ComponentProps<typeof Text>) {
  if (isAppleTouch()) return null;
  return <Text {...props} />;
}
