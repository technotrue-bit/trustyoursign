import { useEffect, useRef, useState } from "react";
import type { SavedChart } from "@/lib/charts";
import { SIGN_CANON } from "@/lib/chart/sign-canon";
import {
  drawSkyCodeCaptions,
  ownChartForSkyCode,
  paintSkyCode,
  skyCodeFileName,
  skyCodeUrl,
  SKY_CODE_SIZE,
} from "@/lib/sky-code";

/**
 * Downloadable sky code for a signed-in chart.
 *
 * TODO(image-gen): frame is the sign's star glyph from the sky, not a bespoke
 * illustration. A later art pass can replace the frame; leave the QR clear.
 * Wallet passes, an Apple Pay–style sheet, and paid checkout are not this card.
 */

export function SkyCodeSection({
  charts,
  failed,
  onRetry,
}: {
  charts: SavedChart[] | null;
  failed: boolean;
  onRetry: () => void;
}) {
  const own = charts?.filter((chart) => chart.relation === "self") ?? [];
  const chart = charts ? ownChartForSkyCode(charts) : null;
  const name = chart ? SIGN_CANON[chart.signId].name : null;

  return (
    <section id="sky-code" className="mt-8 scroll-mt-24">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl text-fg italic">Your sky code</h2>
        <p className="text-[0.65rem] tracking-[0.22em] text-fg-subtle uppercase">Premium</p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        A picture of your sign’s sky that someone can scan. It opens that sky on Trust Your Sign.
        Premium is marked for later — nothing is charged, and checkout is not open.
      </p>
      {charts === null ? (
        <div className="mt-4 h-64 animate-pulse rounded-lg bg-bg-subtle" />
      ) : failed && !chart ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-wine">
            Your chart didn’t load, so the code can’t be drawn yet.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 text-xs tracking-[0.16em] text-fg uppercase hover:text-accent"
          >
            Try again
          </button>
        </div>
      ) : !chart || !name ? (
        <p className="mt-4 text-sm text-fg-muted">
          Place your birth on this page first. The code is drawn from your sign.
        </p>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-fg-muted">
            {own.length > 1
              ? `Drawn from your newest chart — ${name}.`
              : `Drawn from your ${name} chart.`}
          </p>
          <SkyCodeCard signId={chart.signId} />
        </div>
      )}
    </section>
  );
}

function SkyCodeCard({ signId }: { signId: SavedChart["signId"] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const url = skyCodeUrl(signId);
  const name = SIGN_CANON[signId].name;

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    setReady(false);
    setError(null);
    void (async () => {
      try {
        await document.fonts?.load("italic 500 84px Fraunces");
        await document.fonts?.load("500 26px Outfit");
      } catch {
        /* Georgia / system sans still read. */
      }
      if (cancelled) return;
      try {
        const paint = paintSkyCode(signId);
        canvas.width = paint.width;
        canvas.height = paint.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not draw the code");
        const pixels = new Uint8ClampedArray(paint.width * paint.height * 4);
        pixels.set(paint.rgba);
        ctx.putImageData(new ImageData(pixels, paint.width, paint.height), 0, 0);
        drawSkyCodeCaptions(ctx, paint);
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not draw the code");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signId]);

  const pngBlob = () =>
    new Promise<Blob>((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas || !ready) {
        reject(new Error("The code isn’t ready yet"));
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error("Could not save the code"));
        else resolve(blob);
      }, "image/png");
    });

  const save = () => {
    void pngBlob()
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = skyCodeFileName(signId);
        a.click();
        URL.revokeObjectURL(objectUrl);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not save the code");
      });
  };

  const copy = () => {
    void navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => setError("Could not copy the link"),
    );
  };

  const share = () => {
    void (async () => {
      try {
        const blob = await pngBlob();
        const file = new File([blob], skyCodeFileName(signId), { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${name} sky` });
          return;
        }
        await navigator.share({ title: `${name} sky`, url });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not share");
      }
    })();
  };

  return (
    <div className="mt-4">
      <div
        className="relative mx-auto w-full max-w-[22rem] overflow-hidden rounded-lg border border-border bg-bg"
        style={{ aspectRatio: `${SKY_CODE_SIZE.width} / ${SKY_CODE_SIZE.height}` }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${name} sky code. Scanning opens ${url}`}
          className={
            ready ? "absolute inset-0 h-full w-full" : "absolute inset-0 h-full w-full opacity-0"
          }
        />
        {ready ? null : <div className="absolute inset-0 animate-pulse bg-bg-subtle" aria-hidden />}
      </div>
      <p className="mt-3 break-all text-xs leading-relaxed text-fg-subtle">{url}</p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-wine">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!ready}
          onClick={save}
          className="min-h-12 rounded-md bg-accent px-4 text-xs tracking-[0.18em] text-accent-fg uppercase hover:bg-fg disabled:opacity-50"
        >
          Save image
        </button>
        <button
          type="button"
          onClick={copy}
          className="min-h-12 text-xs tracking-[0.18em] text-fg uppercase hover:text-accent"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        {canShare ? (
          <button
            type="button"
            disabled={!ready}
            onClick={share}
            className="min-h-12 text-xs tracking-[0.18em] text-fg uppercase hover:text-accent disabled:opacity-50"
          >
            Share
          </button>
        ) : null}
      </div>
    </div>
  );
}
