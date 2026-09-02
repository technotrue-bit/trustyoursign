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
    <div className="pointer-events-auto mx-auto max-w-sm rounded-md border border-border bg-bg/80 px-3 py-2 text-center text-[0.65rem] leading-relaxed text-fg-muted">
      Session cookies keep you signed in. Birth dates stay on your account.{" "}
      <Link to="/privacy" className="text-fg underline">
        Privacy
      </Link>
      .{" "}
      <button
        type="button"
        className="text-fg underline"
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
