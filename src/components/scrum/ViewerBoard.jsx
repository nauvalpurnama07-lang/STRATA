import { Icon } from "../icons";
import { SPRINT_DAYS, SPRINT_COLUMNS, COLUMN_THEMES } from "../../data/board";

// Tampilan untuk Viewer: hanya gambaran besar (tahap, jumlah, progres).
// Judul, deskripsi, checklist, dan penanggung jawab kartu sengaja tidak ditampilkan.
export default function ViewerBoard({ board, sprint, theme = "dark" }) {
  const isLight = theme === "light";
  const sprintCols = board.filter((c) => SPRINT_COLUMNS.includes(c.id));
  const totalPoints = sprintCols.reduce((n, c) => n + c.tasks.reduce((m, t) => m + (t.points || 0), 0), 0);
  const donePoints = (board.find((c) => c.id === "done")?.tasks ?? []).reduce((n, t) => n + (t.points || 0), 0);
  const pct = totalPoints ? Math.round((donePoints / totalPoints) * 100) : 0;
  const totalTasks = board.reduce((n, c) => n + c.tasks.length, 0);
  const durationDays = sprint.durationDays || SPRINT_DAYS;
  const isSprintActive = sprint.active !== false;
  const daysLeft = Math.max(durationDays - (sprint.day || 1), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className={"border rounded-3xl p-5 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 " + (isLight ? "bg-white border-slate-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] text-zinc-900" : "bg-zinc-900 border-zinc-800/60 text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")}>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={"inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full " + (isSprintActive ? (isLight ? "bg-emerald-100 text-emerald-800" : "bg-emerald-950/60 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]") : (isLight ? "bg-amber-100 text-amber-800" : "bg-amber-950/60 text-amber-300"))}>
              <span className={"w-1.5 h-1.5 rounded-full " + (isSprintActive ? "bg-emerald-500" : "bg-amber-500")} /> Sprint {sprint.number} {isSprintActive ? "Aktif" : "(Persiapan)"}
            </span>
            <span className={"text-[12px] font-mono tabular-nums " + (isLight ? "text-zinc-600" : "text-zinc-500")}>Hari {sprint.day} dari {durationDays}</span>
            <span className={isLight ? "text-zinc-400" : "text-zinc-600"}>·</span>
            <span className={"text-[12px] " + (isLight ? "text-zinc-600" : "text-zinc-500")}>{isSprintActive ? `${daysLeft} hari tersisa` : "Belum dimulai"}</span>
          </div>
          <p className={"mt-3 text-[15px] font-semibold leading-snug max-w-[46ch] " + (isLight ? "text-zinc-900" : "text-zinc-100")}>{sprint.goal}</p>
          <div className="mt-5 flex items-end gap-3">
            <span className={"text-5xl font-extrabold tracking-tight font-mono tabular-nums " + (isLight ? "text-zinc-900" : "text-zinc-50")}>{pct}<span className={"text-2xl " + (isLight ? "text-zinc-500" : "text-zinc-500")}>%</span></span>
            <span className={"text-[12.5px] pb-2 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>progres sprint berjalan</span>
          </div>
          <div className={"mt-3 h-2 rounded-full overflow-hidden " + (isLight ? "bg-zinc-200" : "bg-zinc-800")}>
            <div className="h-full w-full bg-emerald-500 rounded-full origin-left transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
        </div>

        <div className="flex flex-col gap-2.5 justify-center">
          {board.map((c) => {
            const share = totalTasks ? Math.round((c.tasks.length / totalTasks) * 100) : 0;
            return (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: c.dot }} />
                <span className={"text-[12.5px] w-32 truncate " + (isLight ? "text-zinc-700 font-medium" : "text-zinc-300")}>{c.name}</span>
                <div className={"flex-1 h-1.5 rounded-full overflow-hidden " + (isLight ? "bg-zinc-200" : "bg-zinc-800")}>
                  <div className="h-full w-full rounded-full origin-left transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ background: c.dot, transform: `scaleX(${share / 100})` }} />
                </div>
                <span className={"text-[12px] font-mono tabular-nums w-6 text-right " + (isLight ? "text-zinc-600" : "text-zinc-400")}>{c.tasks.length}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={"flex items-start gap-2.5 text-[12.5px] rounded-2xl px-4 py-3 border border-dashed " + (isLight ? "bg-white border-slate-300/70 text-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" : "bg-zinc-900/60 border-zinc-800/50 text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]")}>
        <Icon.Lock width={15} height={15} className={"mt-0.5 flex-shrink-0 " + (isLight ? "text-zinc-500" : "text-zinc-500")} />
        Kamu masuk sebagai Viewer. Judul, catatan, checklist, dan penanggung jawab tiap kartu hanya terlihat oleh tim inti.
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {board.map((c) => {
          const colTheme = COLUMN_THEMES[c.id]?.[theme] || COLUMN_THEMES.backlog[theme];
          return (
            <div key={c.id} className="flex flex-col w-64 flex-shrink-0">
              <div className="flex items-center gap-2 px-1.5 pb-3">
                <span className="w-2 h-2 rounded-sm" style={{ background: c.dot }} />
                <h4 className={"text-[13.5px] font-bold " + (colTheme.colHeader || (isLight ? "text-zinc-800" : "text-zinc-100"))}>{c.name}</h4>
                <span className={"text-[11.5px] rounded-full px-2 py-0.5 ml-0.5 " + (colTheme.badge || (isLight ? "bg-zinc-200 text-zinc-700" : "bg-zinc-800 text-zinc-500"))}>{c.tasks.length}</span>
              </div>
              <div className={"rounded-2xl p-2.5 flex flex-col gap-2.5 min-h-[120px] border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " + colTheme.colBg}>
                {c.tasks.length === 0 && <div className={"text-center py-6 text-[12px] " + (isLight ? "text-zinc-500" : "text-zinc-600")}>Kosong.</div>}
                {c.tasks.map((t) => (
                  <div key={t.id} aria-hidden="true" className={"rounded-xl p-3.5 flex flex-col gap-2.5 select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " + colTheme.cardBg + " " + colTheme.cardAccent + " shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"}>
                    <div className={"h-2 w-2/3 rounded-full " + (isLight ? "bg-zinc-300" : "bg-zinc-700/70")} />
                    <div className={"h-2 w-full rounded-full " + (isLight ? "bg-zinc-200" : "bg-zinc-700/50")} />
                    <div className={"h-1.5 w-1/3 rounded-full " + (isLight ? "bg-zinc-200" : "bg-zinc-700/40")} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
