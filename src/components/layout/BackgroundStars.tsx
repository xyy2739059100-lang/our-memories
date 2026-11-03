/** 背景散落的金色小星星，手账页和地图页共用 */
const stars = [
  { x: "6%", y: "12%", s: 14, r: 12, o: 0.75 },
  { x: "24%", y: "5%", s: 10, r: -8, o: 0.6 },
  { x: "72%", y: "7%", s: 12, r: 18, o: 0.65 },
  { x: "93%", y: "16%", s: 9, r: -12, o: 0.5 },
  { x: "48%", y: "3%", s: 9, r: 6, o: 0.45 },
  { x: "14%", y: "82%", s: 11, r: 20, o: 0.55 },
  { x: "88%", y: "88%", s: 10, r: -16, o: 0.5 },
];

export default function BackgroundStars() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 40 40"
          className="absolute"
          style={{
            left: s.x,
            top: s.y,
            width: s.s,
            height: s.s,
            transform: `rotate(${s.r}deg)`,
            opacity: s.o,
          }}
        >
          <path
            d="M20 1 L24.2 15.8 L39 20 L24.2 24.2 L20 39 L15.8 24.2 L1 20 L15.8 15.8 Z"
            fill="#e0bd6c"
          />
        </svg>
      ))}
    </div>
  );
}
