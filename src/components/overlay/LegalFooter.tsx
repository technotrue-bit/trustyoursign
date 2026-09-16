import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "vaultCookieNotice";

export function LegalFooter() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      // sessionStorage: dismissed for this tab session only; next visit sees it again.
      setShow(sessionStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) {
    return (
      <p className="pointer-events-auto px-2 text-center text-[0.58rem] leading-snug tracking-wide text-fg-subtle md:px-3 md:text-[0.6rem] md:leading-relaxed">
        <Link to="/privacy" className="text-fg/90 hover:text-fg">
          Privacy
        </Link>
        {" · "}
        <Link to="/terms" className="text-fg/90 hover:text-fg">
          Terms
        </Link>
      </p>
    );
  }
  return (
    <div className="pointer-events-auto mx-auto flex max-w-sm items-center gap-2 rounded-md border border-border bg-bg/80 px-2 py-1 text-[0.62rem] leading-snug text-fg-muted md:px-2.5 md:py-1.5 md:text-[0.65rem]">
      <p className="min-w-0 flex-1 text-left">
        <span className="cookie-notice-glow">
          One cookie, only to keep you signed in. No tracking, no ads.
        </span>{" "}
        <Link to="/privacy" className="text-fg underline">
          Privacy
        </Link>
      </p>
      <button
        type="button"
        className="min-h-9 shrink-0 px-2 text-fg underline"
        onClick={() => {
          try {
            sessionStorage.setItem(KEY, "1");
          } catch {
            /* private mode */
          }
          setShow(false);
        }}
      >
        OK
      </button>
    </div>
  );
}
