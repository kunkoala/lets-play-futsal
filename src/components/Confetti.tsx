const COLORS = ["#0d9488", "#22d3ee", "#94a3b8"];

/**
 * Deterministic "looks random" hash — a pure function of `n`, so it doesn't
 * trip the lint rule against impure calls (Math.random/Date.now) during
 * render. Classic sine-based fractional hash; same input always gives the
 * same output, but consecutive inputs look nicely scattered.
 */
function pseudoRandom(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Server-rendered, CSS-only confetti burst — no client JS needed. Runs once
 * (see `.fs-confetti-piece` in globals.css) with a restrained teal/cyan/slate
 * palette, so it reads as a single celebratory moment rather than a loop.
 */
export function Confetti({ count = 20 }: { count?: number }) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: pseudoRandom(i + 1) * 100,
    delay: pseudoRandom(i + 101) * 1.2,
    duration: 2.6 + pseudoRandom(i + 201) * 2.2,
    color: COLORS[i % COLORS.length],
    rotate: Math.round(pseudoRandom(i + 301) * 360),
    width: 5 + pseudoRandom(i + 401) * 5,
  }));

  return (
    <div className="fs-confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="fs-confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: p.width,
            height: p.width * 0.4,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
