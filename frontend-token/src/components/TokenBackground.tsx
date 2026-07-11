const COINS = [
  { top: '-12%', left: '-12%', size: 380, opacity: 0.95, blur: 1, rotate: -12 },
  { top: '-4%', left: '78%', size: 240, opacity: 0.9, blur: 2, rotate: 15 },
  { top: '10%', left: '4%', size: 75, opacity: 0.8, blur: 0.5, rotate: 5 },
  { top: '6%', left: '46%', size: 55, opacity: 0.6, blur: 0.5, rotate: 25 },
  { top: '20%', left: '93%', size: 100, opacity: 0.75, blur: 1, rotate: -8 },
  { top: '30%', left: '20%', size: 60, opacity: 0.55, blur: 0.5, rotate: 30 },
  { top: '38%', left: '-8%', size: 200, opacity: 0.8, blur: 1.5, rotate: 18 },
  { top: '40%', left: '96%', size: 90, opacity: 0.7, blur: 1, rotate: -22 },
  // Flanking the central card directly, mid-height, large - matches reference
  { top: '48%', left: '-16%', size: 340, opacity: 0.95, blur: 1.5, rotate: 10 },
  { top: '44%', left: '82%', size: 310, opacity: 0.95, blur: 1.5, rotate: -15 },
  { top: '62%', left: '10%', size: 65, opacity: 0.6, blur: 0.5, rotate: 20 },
  { top: '64%', left: '48%', size: 45, opacity: 0.5, blur: 0.5, rotate: -30 },
  { top: '72%', left: '96%', size: 220, opacity: 0.85, blur: 1.5, rotate: 8 },
  { top: '80%', left: '4%', size: 140, opacity: 0.7, blur: 1, rotate: -6 },
  { top: '86%', left: '30%', size: 120, opacity: 0.65, blur: 1, rotate: -5 },
  { top: '90%', left: '65%', size: 95, opacity: 0.6, blur: 1, rotate: -20 },
  { top: '94%', left: '90%', size: 160, opacity: 0.7, blur: 1.5, rotate: 12 },
  { top: '2%', left: '62%', size: 40, opacity: 0.5, blur: 0.5, rotate: 40 },
  { top: '56%', left: '32%', size: 35, opacity: 0.45, blur: 0.5, rotate: -15 },
  { top: '18%', left: '35%', size: 30, opacity: 0.4, blur: 0.5, rotate: 10 },
];
 
const SPARKLES = [
  { top: '32%', left: '90%', size: 18, delay: 0 },
  { top: '78%', left: '92%', size: 22, delay: 0.8 },
  { top: '12%', left: '18%', size: 14, delay: 1.6 },
  { top: '68%', left: '6%', size: 16, delay: 0.4 },
];
 
export default function TokenBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {COINS.map((c, i) => (
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