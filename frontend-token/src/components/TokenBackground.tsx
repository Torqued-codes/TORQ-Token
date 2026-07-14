import { useEffect, useState } from 'react';

/**
 * Dense field of scattered token coins + sparkle glints, matching the
 * reference mockup: many overlapping copies at varying size/opacity/blur,
 * cropped at edges, gently bobbing, plus small twinkling highlights.
 *
 * Two separate coin layouts: DESKTOP_COINS (wide viewports) and
 * MOBILE_COINS (narrow viewports). The desktop layout's percentage
 * positions + fixed pixel sizes badly overlap on mobile - the same %
 * spacing compresses far more horizontally than vertically on a
 * narrow/tall screen - so mobile gets its own sparser, vw-scaled set
 * instead of just shrinking the same array.
 */
const DESKTOP_COINS = [
  { top: '9%', left: '-12%', size: 380, opacity: 0.95, blur: 1, rotate: -12 },
  { top: '-4%', left: '78%', size: 240, opacity: 0.9, blur: 2, rotate: 15 },
  { top: '6%', left: '46%', size: 55, opacity: 0.6, blur: 0.5, rotate: 25 },
  { top: '20%', left: '71%', size: 100, opacity: 0.75, blur: 1, rotate: -8 },
  { top: '30%', left: '20%', size: 60, opacity: 0.55, blur: 0.5, rotate: 30 },
  { top: '80%', left: '80%', size: 90, opacity: 0.7, blur: 1, rotate: -22 },
  // Flanking the central card directly, mid-height, large - matches reference
  { top: '44%', left: '82%', size: 310, opacity: 0.95, blur: 1.5, rotate: -15 },
  { top: '62%', left: '3%', size: 65, opacity: 0.6, blur: 0.5, rotate: 20 },
  { top: '64%', left: '48%', size: 45, opacity: 0.5, blur: 0.5, rotate: -30 },
  { top: '72%', left: '96%', size: 220, opacity: 0.85, blur: 1.5, rotate: 8 },
  { top: '80%', left: '4%', size: 140, opacity: 0.7, blur: 1, rotate: -6 },
  { top: '86%', left: '30%', size: 120, opacity: 0.65, blur: 1, rotate: -5 },
  { top: '90%', left: '65%', size: 95, opacity: 0.6, blur: 1, rotate: -20 },
  { top: '94%', left: '90%', size: 160, opacity: 0.7, blur: 1.5, rotate: 12 },
  { top: '2%', left: '62%', size: 40, opacity: 0.5, blur: 0.5, rotate: 40 },
  { top: '56%', left: '32%', size: 35, opacity: 0.45, blur: 0.5, rotate: -15 },
  { top: '18%', left: '35%', size: 30, opacity: 0.4, blur: 0.5, rotate: 10 },
  { top: '10%', left: '11%', size: 130, opacity: 0.85, blur: 0.5, rotate: -18 },
  { top: '45%', left: '9%', size: 110, opacity: 0.8, blur: 0.5, rotate: 12 },
  { top: '64%', left: '16%', size: 115, opacity: 0.8, blur: 0.5, rotate: -10 },
  { top: '17%', left: '32%', size: 95, opacity: 0.8, blur: 0.5, rotate: 15 },
  { top: '30%', left: '89%', size: 100, opacity: 0.8, blur: 0.5, rotate: -20 },
];

// Far fewer coins, sized as vw% so they scale with actual device width
// instead of fixed px - spread down a single tall column instead of a
// wide grid, matching mobile's narrow-but-tall aspect.
const MOBILE_COINS = [
  { top: '2%', left: '-10%', vw: 42, opacity: 0.85, blur: 1, rotate: -12 },
  { top: '8%', left: '68%', vw: 26, opacity: 0.7, blur: 0.5, rotate: 18 },
  { top: '22%', left: '-8%', vw: 20, opacity: 0.6, blur: 0.5, rotate: 8 },
  { top: '34%', left: '78%', vw: 24, opacity: 0.65, blur: 0.5, rotate: -15 },
  { top: '48%', left: '5%', vw: 18, opacity: 0.55, blur: 0.5, rotate: 22 },
  { top: '58%', left: '70%', vw: 30, opacity: 0.75, blur: 1, rotate: -10 },
  { top: '72%', left: '-10%', vw: 34, opacity: 0.8, blur: 1, rotate: 14 },
  { top: '86%', left: '60%', vw: 22, opacity: 0.65, blur: 0.5, rotate: -20 },
  { top: '96%', left: '10%', vw: 26, opacity: 0.7, blur: 0.5, rotate: 6 },
];

const SPARKLES = [
  { top: '32%', left: '90%', size: 18, delay: 0 },
  { top: '78%', left: '92%', size: 22, delay: 0.8 },
  { top: '12%', left: '18%', size: 14, delay: 1.6 },
  { top: '68%', left: '6%', size: 16, delay: 0.4 },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

export default function TokenBackground() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {MOBILE_COINS.map((c, i) => (
          <div
            key={i}
            style={{ position: 'absolute', top: c.top, left: c.left, transform: `rotate(${c.rotate}deg)` }}
          >
            <div
              className="token-coin animate-float-coin"
              style={{
                width: `${c.vw}vw`,
                height: `${c.vw}vw`,
                maxWidth: 180,
                maxHeight: 180,
                opacity: c.opacity,
                filter: `blur(${c.blur}px)`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          </div>
        ))}
        {SPARKLES.slice(0, 2).map((s, i) => (
          <span
            key={`sparkle-${i}`}
            className="sparkle animate-twinkle"
            style={{
              position: 'absolute',
              top: s.top,
              left: s.left,
              fontSize: s.size * 0.7,
              animationDelay: `${s.delay}s`,
            }}
          >
            ✦
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {DESKTOP_COINS.map((c, i) => (
        <div
          key={i}
          style={{ position: 'absolute', top: c.top, left: c.left, transform: `rotate(${c.rotate}deg)` }}
        >
          <div
            className="token-coin animate-float-coin"
            style={{
              width: c.size,
              height: c.size,
              opacity: c.opacity,
              filter: `blur(${c.blur}px)`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        </div>
      ))}
      {SPARKLES.map((s, i) => (
        <span
          key={`sparkle-${i}`}
          className="sparkle animate-twinkle"
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            fontSize: s.size,
            animationDelay: `${s.delay}s`,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}