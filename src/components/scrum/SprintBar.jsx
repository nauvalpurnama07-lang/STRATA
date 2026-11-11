import ToggleSwitch from "../ToggleSwitch";
import { Icon } from "../icons";
import { SPRINT_DAYS, SPRINT_COLUMNS, WIP_LIMIT } from "../../data/board";

function sumPoints(board, ids) {
  return board
    .filter((c) => ids.includes(c.id))
    .reduce((n, c) => n + c.tasks.reduce((m, t) => m + (t.points || 0), 0), 0);
}

function Burndown({ series, total, durationDays = SPRINT_DAYS, theme = "dark" }) {
  const isLight = theme === "light";
  const W = 260, H = 96, PAD = 8;
  const totalDays = Math.max(durationDays, 2);
  const start = Math.max(series[0] ?? total, 1);
  const x = (i) => PAD + (i * (W - PAD * 2)) / (totalDays - 1);
  const y = (v) => PAD + (1 - v / start) * (H - PAD * 2);
  const actual = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = Math.max(series.length - 1, 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Grafik burndown sprint">
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={isLight ? "#e2e8f0" : "#3f3f46"} strokeWidth="1" />
      <line x1={x(0)} y1={y(start)} x2={x(totalDays - 1)} y2={y(0)} stroke={isLight ? "#94a3b8" : "#52525b"} strokeWidth="1.5" strokeDasharray="4 4" />
      <polyline points={actual} fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(series[last] ?? start)} r="4" fill="#10B981" />
      <circle cx={x(last)} cy={y(series[last] ?? start)} r="8" fill="#10B981" opacity="0.18" />
    </svg>
  );
}

export default function SprintBar({
  board,
  sprint,
  onGoalChange,
  lockPriority,
  onToggleLock,
  role,
  isPersonalBoard = false,
  onStartSprint,
  onEndSprint,
  onOpenSettings,
  theme = "dark",
}) {
  const isCaptain = role === "admin";
  const isLight = theme === "light";
  const isSprintActive = sprint.active !== false;
  const durationDays = sprint.durationDays || SPRINT_DAYS;
  const autoPull = sprint.autoPullPrioritized !== false;

  const total = sumPoints(board, SPRINT_COLUMNS);
  const done = sumPoints(board, ["done"]);
  const remaining = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const backlogTasks = board.find((c) => c.id === "backlog")?.tasks ?? [];
  const backlogPoints = backlogTasks.reduce((n, t) => n + (t.points || 0), 0);
  const prioritizedCount = backlogTasks.filter((t) => t.prioritized).length;
  const wipCount = board.find((c) => c.id === "progress")?.tasks.length ?? 0;
  const historyList = Array.isArray(sprint.history) ? sprint.history : [];
  const avgVelocity = historyList.length
    ? Math.round(historyList.reduce((n, h) => n + h.points, 0) / historyList.length)
    : 0;
  const burndownList = Array.isArray(sprint.burndown) ? sprint.burndown : [];
  const series = [...burndownList, remaining];
  const daysLeft = Math.max(durationDays - (sprint.day || 1), 0);
  const maxHist = Math.max(...historyList.map((h) => h.points), done, 1);

  return (
    <div
      className={
        "rounded-3xl p-5 sm:p-6 mb-6 grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-6 border backdrop-blur-xl transition-all duration-300 " +
        (isLight
          ? "bg-white/95 border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-zinc-900"
          : "bg-zinc-900/80 border-white/10 shadow-2xl shadow-black/40 text-zinc-50")
      }
      style={{
        boxShadow: isLight
          ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 30px -10px rgba(0,0,0,0.05)"
          : "inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 40px -15px rgba(0,0,0,0.5)",
      }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {isSprintActive ? (
            <>
              <span
                className={
                  "inline-flex items-center gap-1.5 text-[10.5px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border " +
                  (isLight
                    ? "bg-emerald-50 border-emerald-200/80 text-emerald-800"
                    : "bg-emerald-950/70 border-emerald-800/60 text-emerald-300 shadow-xs")
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sprint {sprint.number} Aktif
              </span>
              <span className={"text-[12px] font-mono tabular-nums font-semibold " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                Hari {sprint.day} dari {durationDays}
              </span>
              <span className={isLight ? "text-zinc-300" : "text-zinc-700"}>•</span>
              <span className={"text-[12px] font-medium " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                {daysLeft} hari tersisa
              </span>
            </>
          ) : (
            <>
              <span
                className={
                  "inline-flex items-center gap-1.5 text-[10.5px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border " +
                  (isLight
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-amber-950/70 border-amber-800/60 text-amber-300 shadow-xs")
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Persiapan Sprint {sprint.number}
              </span>
              <span className={"text-[12px] font-medium " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                Sprint belum dimulai · Durasi {durationDays} hari
              </span>
            </>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={
                "ml-auto text-[11.5px] font-semibold px-2.5 py-1 rounded-full border transition active:scale-95 " +
                (isLight
                  ? "border-slate-200 bg-slate-50 text-zinc-600 hover:text-zinc-900 hover:bg-slate-100"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")
              }
            >
              Atur di Pengaturan →
            </button>
          )}
        </div>

        <div className="mt-3.5">
          <label className={"text-[10px] font-bold uppercase tracking-[0.15em] " + (isLight ? "text-zinc-400" : "text-zinc-500")} htmlFor="sprint-goal">
            Tujuan Sprint #{sprint.number}
          </label>
          {isCaptain || isPersonalBoard ? (
            <input
              id="sprint-goal"
              value={sprint.goal}
              placeholder="Ketik target utama yang ingin dicapai pada sprint ini..."
              onChange={(e) => onGoalChange(e.target.value)}
              className={
                "mt-1 w-full bg-transparent border-b outline-none text-[14.5px] font-bold pb-1.5 transition-all duration-200 " +
                (isLight
                  ? "border-slate-200 text-zinc-900 focus:border-emerald-500"
                  : "border-zinc-800 text-zinc-100 focus:border-emerald-500/80")
              }
            />
          ) : (
            <p className={"mt-1 text-[14.5px] font-bold leading-snug " + (isLight ? "text-zinc-900" : "text-zinc-100")}>{sprint.goal}</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className={"flex-1 h-2 rounded-full overflow-hidden " + (isLight ? "bg-slate-100 border border-slate-200/60" : "bg-zinc-800/80 border border-zinc-700/60")}>
            <div
              className="h-full w-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full origin-left transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: `scaleX(${pct / 100})` }}
            />
          </div>
          <span className="text-[13px] font-bold font-mono tabular-nums text-emerald-500 w-12 text-right">{pct}%</span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: "Komitmen", value: total, unit: "poin" },
            { label: "Selesai", value: done, unit: "poin" },
            { label: "Sisa", value: remaining, unit: "poin" },
            { label: "WIP", value: `${wipCount}/${WIP_LIMIT}`, unit: wipCount >= WIP_LIMIT ? "penuh" : "aman", warn: wipCount >= WIP_LIMIT },
          ].map((s) => (
            <div
              key={s.label}
              className={
                "rounded-2xl p-3 border transition-all duration-200 hover:-translate-y-0.5 " +
                (isLight
                  ? "bg-slate-50/80 border-slate-200/80 shadow-2xs hover:shadow-xs"
                  : "bg-zinc-950/60 border-zinc-800/80 shadow-2xs hover:border-zinc-700/80")
              }
            >
              <div className={"text-[10px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-500" : "text-zinc-400")}>{s.label}</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={"text-[19px] font-black font-mono tabular-nums " + (s.warn ? (isLight ? "text-amber-600" : "text-amber-400") : (isLight ? "text-zinc-900" : "text-zinc-50"))}>{s.value}</span>
                <span className={"text-[10px] font-medium " + (isLight ? "text-zinc-400" : "text-zinc-500")}>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          {isCaptain || isPersonalBoard ? (
            <>
              {isPersonalBoard ? (
                <div className={"flex items-center gap-2 text-[12px] font-medium " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Papan Pribadi · Semua kartu bebas dikelola tanpa batas peran</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 select-none">
                  <ToggleSwitch
                    checked={lockPriority}
                    onChange={onToggleLock}
                    label="Batasi anggota ke kartu prioritas"
                    theme={theme}
                  />
                  <span
                    onClick={onToggleLock}
                    className={"text-[12.5px] font-semibold cursor-pointer " + (isLight ? "text-zinc-800" : "text-zinc-300")}
                  >
                    Batasi anggota ke kartu prioritas
                  </span>
                </div>
              )}

              {!isSprintActive ? (
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {!isPersonalBoard && prioritizedCount > 0 && (
                    <span className={"text-[11.5px] hidden sm:inline " + (isLight ? "text-emerald-700 font-medium" : "text-emerald-400 font-medium")}>
                      {prioritizedCount} kartu prioritas siap ditarik dari Backlog
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onStartSprint &&
                      onStartSprint({
                        goal: sprint.goal,
                        durationDays,
                        autoPullPrioritized: autoPull,
                      })
                    }
                    className="px-4.5 py-2 rounded-full bg-emerald-400 text-zinc-950 font-extrabold text-[12.5px] hover:bg-emerald-300 active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-zinc-950 animate-pulse" />
                    Mulai Sprint #{sprint.number}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onEndSprint && onEndSprint()}
                  className={
                    "ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[12px] font-bold transition-all duration-200 active:scale-95 cursor-pointer " +
                    (isLight
                      ? "border-slate-300 bg-white text-zinc-800 hover:bg-slate-100 hover:border-slate-400 shadow-2xs"
                      : "border-white/15 bg-zinc-800/90 text-zinc-200 hover:bg-zinc-800 hover:border-emerald-500/40 shadow-2xs")
                  }
                >
                  <Icon.Check width={13} height={13} className="text-emerald-400" />
                  <span>Akhiri & Ringkas Sprint</span>
                </button>
              )}
            </>
          ) : (
            <div className={"flex items-start gap-2.5 text-[12.5px] leading-relaxed " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
              <Icon.Lock width={15} height={15} className={"mt-0.5 flex-shrink-0 " + (isLight ? "text-zinc-500" : "text-zinc-500")} />
              {!isSprintActive
                ? `Sprint #${sprint.number} sedang dalam tahap persiapan oleh Kapten dan belum dimulai.`
                : lockPriority
                ? "Kapten membatasi sprint ini: hanya kartu berbintang yang bisa kamu ambil dan pindahkan."
                : "Kapten membuka sprint ini: semua kartu bisa kamu ambil dan pindahkan."}
            </div>
          )}
        </div>
      </div>

      <div className={"min-w-0 xl:border-l xl:pl-6 " + (isLight ? "xl:border-slate-200/80" : "xl:border-zinc-800/80")}>
        <div className="flex items-center justify-between mb-2">
          <span className={"text-[10px] font-bold uppercase tracking-[0.15em] " + (isLight ? "text-zinc-400" : "text-zinc-500")}>Burndown</span>
          <span className={"flex items-center gap-3 text-[10.5px] " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 rounded" />Aktual</span>
            <span className="flex items-center gap-1.5"><span className={"w-3 border-t border-dashed " + (isLight ? "border-zinc-400" : "border-zinc-500")} />Ideal</span>
          </span>
        </div>
        <Burndown series={series} total={total} durationDays={durationDays} theme={theme} />

        <div className={"mt-4 pt-4 border-t " + (isLight ? "border-slate-200/80" : "border-zinc-800/80")}>
          <div className="flex items-center justify-between">
            <span className={"text-[10px] font-bold uppercase tracking-[0.15em] " + (isLight ? "text-zinc-400" : "text-zinc-500")}>Velocity</span>
            <span className={"text-[11.5px] " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
              rata-rata <span className={"font-mono tabular-nums font-bold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>{avgVelocity}</span> poin/sprint
            </span>
          </div>
          <div className="mt-2.5 flex items-end gap-2 h-12">
            {historyList.map((h) => (
              <div key={h.n} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <div className={"w-full rounded-md transition-all group-hover:opacity-80 " + (isLight ? "bg-slate-200" : "bg-zinc-800")} style={{ height: `${(h.points / maxHist) * 100}%`, minHeight: 4 }} />
                <span className={"text-[9.5px] font-mono " + (isLight ? "text-zinc-400" : "text-zinc-500")}>S{h.n}</span>
              </div>
            ))}
            <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
              <div className="w-full rounded-md bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-2xs group-hover:opacity-90" style={{ height: `${(done / maxHist) * 100}%`, minHeight: 4 }} />
              <span className="text-[9.5px] text-emerald-500 font-mono font-bold">S{sprint.number}</span>
            </div>
          </div>
        </div>

        <div className={"mt-4 text-[11.5px] leading-relaxed " + (isLight ? "text-zinc-600" : "text-zinc-500")}>
          Backlog: <span className={"font-mono tabular-nums font-semibold " + (isLight ? "text-zinc-800" : "text-zinc-300")}>{backlogPoints}</span> poin total{!isPersonalBoard ? (
            <>, <span className={"font-mono tabular-nums font-semibold " + (isLight ? "text-zinc-800" : "text-zinc-300")}>{prioritizedCount}</span> kartu diprioritaskan kapten.</>
          ) : "."}
        </div>
      </div>
    </div>
  );
}
