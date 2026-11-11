export default function ToggleSwitch({ checked, onChange, disabled, label, theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      className={
        "relative inline-flex items-center w-11 h-6 rounded-full p-0.5 cursor-pointer flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 focus:ring-offset-transparent transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
        (checked
          ? "bg-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_12px_rgba(52,211,153,0.25)]"
          : isLight
          ? "bg-slate-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
          : "bg-zinc-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]")
      }
    >
      <span
        className={
          "inline-block w-5 h-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
          (checked ? "translate-x-5" : "translate-x-0")
        }
      />
    </button>
  );
}
