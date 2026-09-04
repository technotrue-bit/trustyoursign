import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "vaultCookieNotice=1";

export function LegalFooter() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(sessionStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) {
    return (
      <p className="pointer-events-auto px-3 text-center text-[0.6rem] leading-relaxed tracking-wide text-fg-subtle">
        <Link to="/privacy" className="hover:text-fg">
          Privacy
        </Link>
        {" · "}
        <Link to="/terms" className="hover:text-fg">
          Terms
        </Link>
      </p>
    );
  }
  return (
    <div className="pointer-events-auto mx-auto flex max-w-sm items-center gap-2 rounded-md border border-border bg-bg/80 px-2.5 py-1.5 text-[0.65rem] leading-snug text-fg-muted">
      <p className="min-w-0 flex-1 text-left">
        Session cookies keep you signed in.{" "}
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
