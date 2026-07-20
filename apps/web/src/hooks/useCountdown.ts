import { useEffect, useRef, useState } from 'react';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Counts down from a fixed target (now + durationMs), ticking each second. */
export function useCountdown(durationMs: number) {
  const target = useRef(Date.now() + durationMs);
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const rem = Math.max(0, target.current - Date.now());
  const s = Math.floor(rem / 1000);
  return {
    h: pad(Math.floor(s / 3600)),
    m: pad(Math.floor((s % 3600) / 60)),
    s: pad(s % 60),
    done: rem <= 0,
  };
}
