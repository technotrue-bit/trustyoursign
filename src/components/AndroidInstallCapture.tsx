import { useEffect } from "react";
import { armAndroidInstallPromptCapture } from "@/lib/pwa/install-prompt";

/** Silent capture of Chrome beforeinstallprompt while the app shell is mounted. */
export function AndroidInstallCapture() {
  useEffect(() => armAndroidInstallPromptCapture(), []);
  return null;
}
