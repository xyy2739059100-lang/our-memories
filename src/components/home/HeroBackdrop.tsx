export default function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* 左上暖光：整页只有这一处光源方向 */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_18%_6%,rgba(255,250,238,0.92)_0%,rgba(251,247,239,0)_55%)]" />

      {/* 右侧极淡的冷雾，只负责托住星球，不做云层 */}
      <div className="absolute inset-y-0 right-0 w-[62%] bg-[radial-gradient(70%_58%_at_64%_48%,rgba(198,216,238,0.2)_0%,rgba(198,216,238,0)_70%)]" />

      {/* 纸面颗粒：极轻，把整页压在同一张纸上 */}
      <div className="paper-grain absolute inset-0 opacity-50" />
    </div>
  );
}
