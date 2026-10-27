import { useEffect, useRef, useState } from "react";
import { Share, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { SignId } from "@/lib/chart/types";
import {
  SHARE_CARD_FONTS,
  SHARE_FORMATS,
  paintShareCard,
  type CardLayout,
  type ShareFormat,
} from "@/lib/share-card";
import { planSkyShare, skySharePayload } from "@/lib/sky-code";
import { cn } from "@/lib/utils";

const FORMAT_LABEL: Record<ShareFormat, { name: string; hint: string }> = {
  story: { name: "Story", hint: "TikTok, Reels, Stories" },
  post: { name: "Post", hint: "Feed, 4:5" },
};

/**
 * Preview and share a picture card. The PNG is drawn before the tap, so the
 * phone's share sheet opens inside the gesture. The picture is shared alone;
 * the link only goes out when the phone can't attach a photo.
 */
export function ShareCardDialog({
  open,
  onClose,
  title,
  kind,
  signId,
  layoutFor,
  fileName,
  url,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  kind: "big-three" | "today";
  signId: SignId;
  layoutFor: (format: ShareFormat) => CardLayout;
  fileName: (format: ShareFormat) => string;
  /** Fallback when the phone can't share a picture. */
  url: string;
}) {
  const [format, setFormat] = useState<ShareFormat>("story");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pngRef = useRef<Blob | null>(null);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Keep the latest layout builder without re-drawing on every parent render.
  const layoutRef = useRef(layoutFor);
  layoutRef.current = layoutFor;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);
    setError(null);
    setNote(null);
    pngRef.current = null;
    void (async () => {
      try {
        await Promise.all(SHARE_CARD_FONTS.map((f) => document.fonts?.load(f)));
      } catch {
        /* Georgia and the system sans still read well. */
      }
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const card = layoutRef.current(format);
      canvas.width = card.width;
      canvas.height = card.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("This browser can't draw the picture.");
        return;
      }
      paintShareCard(ctx, card);
      canvas.toBlob((blob) => {
        if (cancelled) return;
        if (!blob) {
          setError("Could not prepare the picture.");
          return;
        }
        pngRef.current = blob;
        setReady(true);
      }, "image/png");
    })();
    return () => {
      cancelled = true;
    };
  }, [open, format, signId]);

  if (!open) return null;

  const track = (channel: "native" | "copy" | "save") =>
    trackEvent("share_card", { kind, format, channel, sign: signId });

  const save = () => {
    const blob = pngRef.current;
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName(format);
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    track("save");
  };

  const share = () => {
    setError(null);
    setNote(null);
    const blob = pngRef.current;
    if (!blob) return;
    const file = new File([blob], fileName(format), { type: "image/png" });
    const canShare = typeof navigator.share === "function";
    let canShareFiles = false;
    if (canShare) {
      try {
        canShareFiles = Boolean(navigator.canShare?.({ files: [file] }));
      } catch {
        canShareFiles = false;
      }
    }
    const plan = planSkyShare({ signName: title, url, canShare, canShareFiles });
    const payload = skySharePayload(plan, file);
    // Start the sheet in this tap. Anything awaited before share() loses it.
    void (async () => {
      try {
        if (payload) {
          await navigator.share(payload);
          track("native");
          return;
        }
        if (plan.kind === "copy") {
          await navigator.clipboard.writeText(plan.url);
          track("copy");
          setNote("This browser can't share pictures, so the link was copied. Save image to post the picture.");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("The picture didn't send. Save image and post it from your photos.");
      }
    })();
  };

  const { width, height } = SHARE_FORMATS[format];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[100dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl border border-border bg-bg px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-fg md:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-xl italic">{title}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-11 items-center justify-center rounded-full text-fg-muted hover:text-fg"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div role="radiogroup" aria-label="Picture size" className="mt-2 grid grid-cols-2 gap-2">
          {(Object.keys(FORMAT_LABEL) as ShareFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              onClick={() => setFormat(f)}
              className={cn(
                "min-h-12 rounded-md border px-3 text-left transition-colors",
                format === f ? "border-fg text-fg" : "border-border text-fg-muted hover:text-fg",
              )}
            >
              <span className="block text-xs tracking-[0.18em] uppercase">{FORMAT_LABEL[f].name}</span>
              <span className="block text-[0.7rem] text-fg-subtle">{FORMAT_LABEL[f].hint}</span>
            </button>
          ))}
        </div>

        <div
          className="relative mt-4 self-center overflow-hidden rounded-lg border border-border bg-bg"
          style={{
            aspectRatio: `${width} / ${height}`,
            // As tall as fits: half the screen at most, never wider than the sheet.
            height: `min(56dvh, calc((min(100vw, 28rem) - 2.5rem) * ${height / width}))`,
          }}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`${title}, ${FORMAT_LABEL[format].name.toLowerCase()} size`}
            className={cn("absolute inset-0 h-full w-full", ready ? "" : "opacity-0")}
          />
          {ready ? null : <div className="absolute inset-0 animate-pulse bg-bg-subtle" aria-hidden />}
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-wine">
            {error}
          </p>
        ) : null}
        {note ? (
          <p role="status" className="mt-3 text-sm text-fg-muted">
            {note}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!ready}
            onClick={share}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-accent px-4 text-xs tracking-[0.18em] text-accent-fg uppercase hover:bg-fg disabled:opacity-50"
          >
            <Share className="size-4" aria-hidden />
            Share
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={save}
            className="min-h-12 rounded-md border border-border px-4 text-xs tracking-[0.18em] uppercase hover:border-fg disabled:opacity-50"
          >
            Save image
          </button>
        </div>
      </div>
    </div>
  );
}
