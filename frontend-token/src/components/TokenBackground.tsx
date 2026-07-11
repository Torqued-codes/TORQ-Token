/**
 * Scattered floating token coins across the viewport, matching the
 * reference mockup: many copies at varying size/opacity/blur/rotation,
 * some cropped at the edges, gently bobbing.
 */
const COINS = [
  { top: '-10%', left: '-10%', size: 360, opacity: 0.9, blur: 2, rotate: -12 },
  { top: '0%', left: '80%', size: 230, opacity: 0.85, blur: 3, rotate: 15 },
  { top: '16%', left: '4%', size: 70, opacity: 0.7, blur: 1, rotate: 5 },
  { top: '26%', left: '93%', size: 95, opacity: 0.65, blur: 2, rotate: -8 },
  { top: '55%', left: '-12%', size: 300, opacity: 0.85, blur: 3, rotate: 10 },
  { top: '46%', left: '87%', size: 270, opacity: 0.8, blur: 3, rotate: -15 },
  { top: '68%', left: '14%', size: 60, opacity: 0.55, blur: 1, rotate: 20 },
  { top: '76%', left: '96%', size: 210, opacity: 0.75, blur: 2, rotate: 8 },
  { top: '86%', left: '32%', size: 115, opacity: 0.6, blur: 2, rotate: -5 },
  { top: '4%', left: '46%', size: 55, opacity: 0.5, blur: 1, rotate: 25 },
  { top: '92%', left: '65%', size: 90, opacity: 0.55, blur: 1, rotate: -20 },
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
              animationDelay: `${i * 0.6}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}