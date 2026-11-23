import { useState } from "react";
import { Icon } from "../icons";

export default function WorkflowGuide({
  board = [],
  sprint = {},
  role = "member",
  lockPriority = false,
  theme = "dark",
  onOpenAIHelper,
  onOpenNewTask,
  onScrollToColumn,
}) {
  const isLight = theme === "light";
  const [isOpen, setIsOpen] = useState(true);
  const [activeStep, setActiveStep] = useState(1);

  // Hitung jumlah tugas per kolom
  const backlogCount = (board.find((c) => c.id === "backlog")?.tasks || []).length;
  const sprintCount = (board.find((c) => c.id === "sprint")?.tasks || []).length;
  const inProgressCount = (board.find((c) => c.id === "in_progress")?.tasks || []).length;
  const reviewCount = (board.find((c) => c.id === "review")?.tasks || []).length;
  const doneCount = (board.find((c) => c.id === "done")?.tasks || []).length;
  const totalTasks = backlogCount + sprintCount + inProgressCount + reviewCount + doneCount;
  const percentDone = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  // Tentukan fase kerja yang sedang aktif secara otomatis
  let currentActivePhase = 1;
  if (doneCount > 0 && doneCount === totalTasks) {
    currentActivePhase = 4;
  } else if (reviewCount > 0) {
    currentActivePhase = 3;
  } else if (inProgressCount > 0) {
    currentActivePhase = 2;
  } else {
    currentActivePhase = 1;
  }

  const steps = [
    {
      id: 1,
      number: "01",
      title: "Perencanaan & AI",
      columnId: "backlog",
      role: "Kapten",
      roleClass: isLight ? "bg-indigo-100 text-indigo-700" : "bg-indigo-950/80 text-indigo-300 border border-indigo-800/60",
      badgeText: `${backlogCount + sprintCount} Tugas`,
      shortDesc: "Breakdown fitur dengan AI & susun Backlog",
      details: {
        target: "Menyusun target sprint dan memecah modul besar.",
        kapten: "Buka AI Helper Studio untuk memecah fitur menjadi kartu tugas otomatis (Batch Injection), lalu kunci prioritas sprint.",
        member: "Mempelajari spesifikasi tugas di Backlog sebelum sprint dimulai.",
        actionBtn: onOpenAIHelper ? { label: "Buka AI Helper Studio", onClick: onOpenAIHelper } : null,
      },
    },
    {
      id: 2,
      number: "02",
      title: "Eksekusi Sprint",
      columnId: "in_progress",
      role: "Anggota",
      roleClass: isLight ? "bg-amber-100 text-amber-700" : "bg-amber-950/80 text-amber-300 border border-amber-800/60",
      badgeText: `${inProgressCount} Berjalan`,
      shortDesc: lockPriority ? "🔒 Prioritas Terkunci" : "Drag-and-drop & Stopwatch koding",
      details: {
        target: "Fokus mengoding tugas sprint tanpa distraksi.",
        kapten: "Memantau agar kolom tidak melebihi WIP Limit dan menjaga kedisiplinan prioritas sprint.",
        member: "Tarik kartu ke kolom In Progress, buka drawer rincian, nyalakan Stopwatch pencatat waktu, dan centang checklist sub-tugas.",
        actionBtn: null,
      },
    },
    {
      id: 3,
      number: "03",
      title: "Review & Pengujian",
      columnId: "review",
      role: "Kapten & Member",
      roleClass: isLight ? "bg-sky-100 text-sky-700" : "bg-sky-950/80 text-sky-300 border border-sky-800/60",
      badgeText: `${reviewCount} Ditinjau`,
      shortDesc: "Pemeriksaan hasil koding & checklist",
      details: {
        target: "Memastikan kualitas fitur bebas dari galat.",
        kapten: "Memeriksa hasil pekerjaan anggota yang ada di kolom Ditinjau sebelum menyetujui pemindahan ke Selesai.",
        member: "Menghentikan stopwatch, memastikan checklist 100% centang, lalu menyerahkan kartu ke kolom Review.",
        actionBtn: null,
      },
    },
    {
      id: 4,
      number: "04",
      title: "Selesai & Rilis",
      columnId: "done",
      role: "Tim",
      roleClass: isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60",
      badgeText: `${doneCount} Selesai (${percentDone}%)`,
      shortDesc: "Tugas tuntas & terhitung di SprintBar",
      details: {
        target: "Penyelesaian sprint dan pelaporan hasil kerja.",
        kapten: "Memindahkan kartu ke kolom Selesai, mengevaluasi total Story Points dan grafik kemajuan SprintBar.",
        member: "Melihat riwayat waktu koding yang tercatat dan bersiap untuk siklus tugas sprint berikutnya.",
        actionBtn: null,
      },
    },
  ];

  const currentStepData = steps.find((s) => s.id === activeStep) || steps[0];

  return (
    <div
      className={
        "mb-5 rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden " +
        (isLight
          ? "bg-white/95 border-slate-200/90 shadow-slate-200/50"
          : "bg-zinc-950/75 border-zinc-800/90 backdrop-blur-xl shadow-zinc-950/40")
      }
    >
      {/* HEADER BAR DENGAN TOGGLE BUKA/TUTUP */}
      <div
        className={
          "px-4 py-3 flex items-center justify-between border-b transition-colors " +
          (isLight ? "border-slate-100 bg-slate-50/70" : "border-zinc-800/60 bg-zinc-900/40")
        }
      >
        <div className="flex items-center gap-3">
          <div
            className={
              "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs " +
              (isLight ? "bg-indigo-600 text-white" : "bg-gradient-to-tr from-indigo-500 to-sky-400 text-white")
            }
          >
            <Icon.Sparkle width={13} height={13} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={"text-xs font-black tracking-wide uppercase " + (isLight ? "text-slate-900" : "text-zinc-100")}>
                Alur Kerja Proyek & Panduan UI Sprint
              </h3>
              <span className={"px-2 py-0.5 rounded-full text-[10px] font-bold font-mono " + (isLight ? "bg-slate-200 text-slate-700" : "bg-zinc-800 text-zinc-300")}>
                Fase {currentActivePhase} dari 4 Aktif
              </span>
            </div>
            <p className={"text-[11px] " + (isLight ? "text-slate-500" : "text-zinc-400")}>
              Panduan terstruktur navigasi antarmuka pengguna: Perencanaan, Eksekusi, Pengujian, dan Selesai.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenNewTask && (
            <button
              onClick={onOpenNewTask}
              className={
                "hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 " +
                (isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200")
              }
            >
              <Icon.Plus width={11} height={11} /> Tambah Tugas
            </button>
          )}

          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className={
              "px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 " +
              (isLight ? "bg-slate-200/80 hover:bg-slate-300 text-slate-800" : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200")
            }
          >
            <span>{isOpen ? "Ciutkan Alur" : "Buka Alur UI"}</span>
            <span className={"transform transition-transform duration-200 text-[9px] " + (isOpen ? "rotate-180" : "")}>
              ▼
            </span>
          </button>
        </div>
      </div>

      {/* KONTEN ALUR INTERAKTIF (BISA DITAMPILKAN / DISEMBUNYIKAN) */}
      {isOpen && (
        <div className="p-4 space-y-4">
          {/* STEPPER 4 FASE HORIZONTAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {steps.map((st) => {
              const isSelected = activeStep === st.id;
              const isCurrentPhase = currentActivePhase === st.id;

              return (
                <div
                  key={st.id}
                  onClick={() => {
                    setActiveStep(st.id);
                    if (onScrollToColumn && st.columnId) {
                      onScrollToColumn(st.columnId);
                    }
                  }}
                  className={
                    "p-3 rounded-xl border cursor-pointer transition-all duration-200 text-left relative overflow-hidden group " +
                    (isSelected
                      ? isLight
                        ? "bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-200 shadow-sm"
                        : "bg-indigo-950/30 border-indigo-500/80 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-950/40"
                      : isLight
                      ? "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/80"
                      : "bg-zinc-900/50 hover:bg-zinc-800/60 border-zinc-800/70")
                  }
                >
                  {/* Top row: step number + role badge */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          "text-[10px] font-black font-mono px-1.5 py-0.5 rounded " +
                          (isSelected
                            ? isLight
                              ? "bg-indigo-600 text-white"
                              : "bg-indigo-500 text-white"
                            : isLight
                            ? "bg-slate-200 text-slate-700"
                            : "bg-zinc-800 text-zinc-400")
                        }
                      >
                        {st.number}
                      </span>
                      {isCurrentPhase && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Aktif
                        </span>
                      )}
                    </div>
                    <span className={"text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider " + st.roleClass}>
                      {st.role}
                    </span>
                  </div>

                  {/* Title & Badge */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4 className={"text-xs font-bold truncate " + (isLight ? "text-slate-900" : "text-zinc-100")}>
                      {st.title}
                    </h4>
                    <span
                      className={
                        "text-[10px] font-mono px-2 py-0.5 rounded font-bold flex-shrink-0 " +
                        (isLight ? "bg-white text-slate-700 border border-slate-200" : "bg-zinc-800 text-zinc-300 border border-zinc-700")
                      }
                    >
                      {st.badgeText}
                    </span>
                  </div>

                  {/* Short description */}
                  <p className={"text-[11px] leading-snug line-clamp-1 " + (isLight ? "text-slate-500" : "text-zinc-400")}>
                    {st.shortDesc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* DETAIL KOTAK PANDUAN LANGKAH YANG SEDANG DIPILIH */}
          <div
            className={
              "p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs " +
              (isLight ? "bg-indigo-50/50 border-indigo-200/70" : "bg-indigo-950/20 border-indigo-800/40")
            }
          >
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className={"font-bold uppercase tracking-wider text-[10px] " + (isLight ? "text-indigo-700" : "text-indigo-400")}>
                  Panduan Alur UI Tahap {currentStepData.number} ({currentStepData.title}):
                </span>
                <span className={"text-[11px] " + (isLight ? "text-slate-600" : "text-zinc-300")}>
                  {currentStepData.details.target}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className={isLight ? "text-slate-700" : "text-zinc-300"}>
                  <strong className={isLight ? "text-indigo-800" : "text-indigo-300"}>👑 Wewenang Kapten:</strong>{" "}
                  {currentStepData.details.kapten}
                </div>
                <div className={isLight ? "text-slate-700" : "text-zinc-300"}>
                  <strong className={isLight ? "text-amber-700" : "text-amber-300"}>⚡ Aksi Anggota:</strong>{" "}
                  {currentStepData.details.member}
                </div>
              </div>
            </div>

            {currentStepData.details.actionBtn && (
              <button
                onClick={currentStepData.details.actionBtn.onClick}
                className={
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 shadow-sm active:scale-95 " +
                  (isLight
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950")
                }
              >
                <Icon.Sparkle width={12} height={12} />
                <span>{currentStepData.details.actionBtn.label}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
