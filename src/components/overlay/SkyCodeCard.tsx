import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Share } from "lucide-react";
import type { SavedChart } from "@/lib/charts";
import { listCharts } from "@/lib/charts";
import { getResearchChart } from "@/lib/chart/research";
import { SIGN_CANON } from "@/lib/chart/sign-canon";
import type { SignId } from "@/lib/chart/types";
import { visitorBirth, visitorSign } from "@/lib/chart/session";
import { clearStickySession } from "@/lib/auth/session-sticky";
import { isUnauthorizedError } from "@/lib/auth/unauthorized";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { classifyOwnerFetchError, resolveOwnerVerdict, useOwnerVerdict } from "@/lib/owner-state";
import {
  drawSkyCodeCaptions,
  ownChartForSkyCode,
  paintSkyCode,
  planSkyShare,
  skyCodeFileName,
  skyCodeFrame,
  skyCodeGate,
  skyCodeUrl,
  SKY_CODE_SIZE,
} from "@/lib/sky-code";

/**
 * Shareable sky code for the signed-in person's own chart.
 *
 * A saved chart marked as their own is used first. When there is none, the
 * owner's own sky (the book the account menu calls "The sky") supplies the
 * sign. Place a birth stays for a vault that truly has neither.
 *
 * Sagittarius composites the locked surround and draws the code into its cream
 * pad. Every other sign still uses the star-glyph frame. Nothing is charged.
 */

export function SkyCodeSection() {
  const { user } = useCurrentUserState();
  const owner = useOwnerVerdict(user?.id);
  const [charts, setCharts] = useState<SavedChart[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [ownSkySignId, setOwnSkySignId] = useState<SignId | null | undefined>(undefined);
  const [ownSkyFailed, setOwnSkyFailed] = useState(false);
  const [ownerFailed, setOwnerFailed] = useState(false);
  const [deskNonce, setDeskNonce] = useState(0);
  const loadGen = useRef(0);
  const deskGen = useRef(0);

  const load = useCallback(() => {
    const gen = ++loadGen.current;
    setFailed(false);
    listCharts()
      .then((rows) => {
        if (gen !== loadGen.current) return;
        setCharts(rows);
        setFailed(false);
      })
      .catch((err: unknown) => {
        if (gen !== loadGen.current) return;
        if (isUnauthorizedError(err)) {
          clearStickySession();
          window.location.assign("/login?from=sky-code");
          return;
        }
        setCharts((prev) => prev ?? []);
        setFailed(true);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saved = charts ? ownChartForSkyCode(charts) : null;
  const needDesk = Boolean(charts && !saved && owner === true);

  useEffect(() => {
    if (!user?.id || owner !== null || !charts || saved) {
      setOwnerFailed(false);
      return;
    }
    let cancelled = false;
    void resolveOwnerVerdict(user.id).then((verdict) => {
      if (!cancelled) setOwnerFailed(verdict === null);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, owner, charts, saved, deskNonce]);

  useEffect(() => {
    if (!needDesk) return;
    const gen = ++deskGen.current;
    setOwnSkySignId(undefined);
    setOwnSkyFailed(false);
    getResearchChart({ data: "joey" })
      .then((book) => {
        if (gen !== deskGen.current) return;
        try {
          setOwnSkySignId(visitorSign(book, visitorBirth(book)));
          setOwnSkyFailed(false);
        } catch {
          setOwnSkyFailed(true);
        }
      })
      .catch((err: unknown) => {
        if (gen !== deskGen.current) return;
        const kind = classifyOwnerFetchError(err);
        if (kind === "signed_out") {
          clearStickySession();
          window.location.assign("/login?from=sky-code");
          return;
        }
        if (kind === "unseeded" || kind === "not_owner") {
          setOwnSkySignId(null);
          setOwnSkyFailed(false);
          return;
        }
        setOwnSkyFailed(true);
      });
    return () => {
      deskGen.current += 1;
    };
  }, [needDesk, deskNonce]);

  const retry = () => {
    load();
    setOwnerFailed(false);
    if (user?.id) void resolveOwnerVerdict(user.id);
    setDeskNonce((n) => n + 1);
  };

  const gate = skyCodeGate({
    charts,
    chartsFailed: failed,
    owner,
    ownerFailed,
    ownSkySignId,
    ownSkyFailed,
  });
  const name = gate.kind === "draw" ? SIGN_CANON[gate.signId].name : null;

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h1 className="font-display text-4xl tracking-tight text-fg italic">Your sky code</h1>
        <p className="text-[0.65rem] tracking-[0.22em] text-fg-subtle uppercase">Premium</p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        A picture of your sign’s sky that someone can scan. It opens that sky on Trust Your Sign.
        Premium is marked for later — nothing is charged, and checkout is not open.
      </p>
      {gate.kind === "loading" ? (
        <div className="mt-4 h-64 animate-pulse rounded-lg bg-bg-subtle" />
      ) : gate.kind === "retry" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-wine">
            Your chart didn’t load, so the code can’t be drawn yet.
          </p>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 text-xs tracking-[0.16em] text-fg uppercase hover:text-accent"
          >
            Try again
          </button>
        </div>
      ) : gate.kind !== "draw" || !name ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-fg-muted">
            Place your birth first. The code is drawn from your sign.
          </p>
          <Link
            to="/account"
            className="inline-flex min-h-12 items-center rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase hover:bg-fg"
          >
            Place a birth
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-fg-muted">
            {gate.ownCount > 1
              ? `Drawn from your newest chart — ${name}.`
              : `Drawn from your ${name} chart.`}
          </p>
          <SkyCodeCard signId={gate.signId} />
        </div>
      )}
    </section>
  );
}

function SkyCodeCard({ signId }: { signId: SavedChart["signId"] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pngRef = useRef<Blob | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const locked = skyCodeFrame(signId);
  const [box, setBox] = useState({
    width: locked?.width ?? SKY_CODE_SIZE.width,
    height: locked?.height ?? SKY_CODE_SIZE.height,
  });
  const url = skyCodeUrl(signId);
  const name = SIGN_CANON[signId].name;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const frame = skyCodeFrame(signId);
    setBox({
      width: frame?.width ?? SKY_CODE_SIZE.width,
      height: frame?.height ?? SKY_CODE_SIZE.height,
    });
    pngRef.current = null;
    setReady(false);
    setError(null);
    void (async () => {
      let framePixels: Uint8ClampedArray | null = null;
      if (frame) {
        try {
          framePixels = await loadFramePixels(frame.src, frame.width, frame.height);
        } catch {
          framePixels = null;
        }
      }
      if (!frame || !framePixels) {
        try {
          await document.fonts?.load("italic 500 84px Fraunces");
          await document.fonts?.load("500 26px Outfit");
        } catch {
          /* Georgia / system sans still read. */
        }
      }
      if (cancelled) return;
      try {
        const paint = paintSkyCode(signId, framePixels);
        canvas.width = paint.width;
        canvas.height = paint.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not draw the code");
        const pixels = new Uint8ClampedArray(paint.width * paint.height * 4);
        pixels.set(paint.rgba);
        ctx.putImageData(new ImageData(pixels, paint.width, paint.height), 0, 0);
        drawSkyCodeCaptions(ctx, paint);
        if (cancelled) return;
        // The picture has to exist before the tap. Waiting on it inside the
        // click drops the phone’s share gesture, and the sheet never opens.
        canvas.toBlob((blob) => {
          if (cancelled) return;
          if (!blob) {
            setError("Could not prepare the code");
            return;
          }
          pngRef.current = blob;
          setBox({ width: paint.width, height: paint.height });
          setReady(true);
        }, "image/png");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not draw the code");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signId]);

  const save = () => {
    const blob = pngRef.current;
    if (!blob) {
      setError("The code isn’t ready yet");
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = skyCodeFileName(signId);
    a.click();
    URL.revokeObjectURL(objectUrl);
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
    setError(null);
    setShareNote(null);
    const blob = pngRef.current;
    const file = blob ? new File([blob], skyCodeFileName(signId), { type: "image/png" }) : null;
    const canShare = typeof navigator.share === "function";
    let canShareFiles = false;
    if (file && canShare) {
      try {
        canShareFiles = Boolean(navigator.canShare?.({ files: [file] }));
      } catch {
        canShareFiles = false;
      }
    }
    const plan = planSkyShare({
      signName: name,
      url,
      canShare,
      canShareFiles,
    });
    // Start the sheet in this tap. Anything awaited before share() loses it.
    void (async () => {
      try {
        if (plan.kind === "file" && file) {
          await navigator.share({ files: [file], title: plan.title });
          return;
        }
        if (plan.kind === "url") {
          await navigator.share({ title: plan.title, url: plan.url });
          return;
        }
        if (plan.kind === "copy") {
          await navigator.clipboard.writeText(plan.url);
          setShareNote("Link copied. Paste it into Messages, Mail, or anywhere else.");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (plan.kind === "file" && canShare) {
          try {
            const urlPlan = planSkyShare({
              signName: name,
              url,
              canShare: true,
              canShareFiles: false,
            });
            if (urlPlan.kind === "url") {
              await navigator.share({ title: urlPlan.title, url: urlPlan.url });
              return;
            }
          } catch (again) {
            if (again instanceof DOMException && again.name === "AbortError") return;
            setError(again instanceof Error ? again.message : "Could not share");
            return;
          }
        }
        setError(err instanceof Error ? err.message : "Could not share");
      }
    })();
  };

  return (
    <div className="mt-4">
      <div
        className="relative mx-auto w-full max-w-[22rem] overflow-hidden rounded-lg border border-border bg-bg"
        style={{ aspectRatio: `${box.width} / ${box.height}` }}
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
      {shareNote ? (
        <p role="status" className="mt-2 text-sm text-fg-muted">
          {shareNote}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={share}
          aria-label="Share your sky code"
          className="inline-flex min-h-12 items-center gap-2 rounded-md bg-accent px-4 text-xs tracking-[0.18em] text-accent-fg uppercase hover:bg-fg"
        >
          <Share className="size-4" aria-hidden />
          Share
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={save}
          className="min-h-12 text-xs tracking-[0.18em] text-fg uppercase hover:text-accent disabled:opacity-50"
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
      </div>
    </div>
  );
}

/** 1:1 decode of a locked surround. A size mismatch falls back to the glyph frame. */
async function loadFramePixels(src: string, width: number, height: number) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  if (img.naturalWidth !== width || img.naturalHeight !== height) {
    throw new Error("Sky code frame is the wrong size");
  }
  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = height;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not draw the code");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, width, height).data;
}
