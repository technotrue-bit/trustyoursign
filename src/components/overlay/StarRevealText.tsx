import { useMemo } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Word-by-word soft reveal — fairy/star shimmer; instant when reduced motion. */
export function StarRevealText({ text, active }: { text: string; active: boolean }) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean), [text]);

  if (!active || reduced) {
    return <span className="star-reveal-plain">{text}</span>;
  }

  return (
    <span className="star-reveal" aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="star-reveal-word"
          style={{ animationDelay: `${i * 48}ms` }}
        >
          {word}
          {i < words.length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </span>
  );
}
