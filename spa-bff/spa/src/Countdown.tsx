import { useEffect, useState } from "react";

// Live "expires in m:ss" / "expired" badge — the visible "state of a token" ticking.
export function Countdown({ at }: { at?: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!at) return null;
  const ms = at - now;
  if (ms <= 0) return <span className="exp expired">expired</span>;
  const s = Math.floor(ms / 1000);
  return (
    <span className="exp">
      expires in {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}
