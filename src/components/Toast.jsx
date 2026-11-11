const SPRING = { transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" };

export default function Toast({ message, position = "bottom-6 right-6" }) {
  return (
    <div
      className={
        "fixed z-[80] " + position + " backdrop-blur-xl bg-zinc-900/90 border border-zinc-800/60 text-zinc-100 text-sm font-medium px-5 py-3 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_48px_-12px_rgba(0,0,0,0.5)] flex items-center gap-2.5 transition-all duration-350 " +
        (message ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none")
      }
      style={SPRING}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
      {message}
    </div>
  );
}

export { SPRING };
