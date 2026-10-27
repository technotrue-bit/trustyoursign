import { useState } from "react";
import { Share } from "lucide-react";
import { ShareCardDialog } from "@/components/ShareCardDialog";
import { signName } from "@/lib/chart/sign-canon";
import { bigThreeCard, shareCardFileName, type BigThree } from "@/lib/share-card";
import { cn } from "@/lib/utils";

/** "Share my Big Three": a Stories / TikTok / feed picture of sun, moon and rising. */
export function ShareBigThreeButton({
  three,
  label = "Share my Big Three",
  className,
}: {
  three: BigThree;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-xs tracking-[0.18em] uppercase hover:border-fg",
          className,
        )}
      >
        <Share className="size-4" aria-hidden />
        {label}
      </button>
      <ShareCardDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`${signName(three.sun)} sun, ${signName(three.moon)} moon, ${signName(three.rising)} rising`}
        kind="big-three"
        signId={three.sun}
        layoutFor={(format) => bigThreeCard(three, format)}
        fileName={(format) => shareCardFileName("big-three", three.sun, format)}
        url={`https://trustyoursign.com/?sign=${three.sun}`}
      />
    </>
  );
}
