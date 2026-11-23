import { useState } from "react";

// Crisp inline SVGs matching STRATA 1.6 stroke icon language
const SvgIcon = {
  Plan: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="2" width="11" height="12" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 5.5H10.5M5.5 8.5H10.5M5.5 11.5H8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Code: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M5 5L2 8L5 11M11 5L14 8L11 11M9.5 3.5L6.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Review: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.8L2.5 4.2V8.2C2.5 11.4 4.8 13.8 8 14.8C11.2 13.8 13.5 11.4 13.5 8.2V4.2L8 1.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5.5 8.2L7.2 9.8L10.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Done: ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.2 8L7.2 10L11 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Shield: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5L2 3.5V6.8C2 9.7 4.1 11.8 7 12.8C9.9 11.8 12 9.7 12 6.8V3.5L7 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  Terminal: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2" width="11" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 5.5L6 7L4 8.5M7.5 9H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ChevronDown: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} viewBox="0 0 14 14" fill="none">
      <path d="M3.5 5.5L7 9L10.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowUpRight: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} viewBox="0 0 14 14" fill="none">
      <path d="M4 10L10 4M10 4H5.5M10 4V8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Sparkle: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} viewBox="0 0 14 14" fill="none">
      <path d="M7 1L8.2 4.8L12 6L8.2 7.2L7 11L5.8 7.2L2 6L5.8 4.8L7 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
};

export default function WorkflowGuide({
  board = [],
  sprint = {},
  role = "member",
  lockPriority = false,
  theme = "dark",
  onOpenAIHelper,
  onScrollToColumn,
}) {
  const isLight = theme === "light";
  const [isOpen, setIsOpen] = useState(true);
  const [activeStep, setActiveStep] = useState(1);

  // Perhitungan dinamis jumlah kartu tugas di setiap kolom
  const backlogCount = (board.find((c) => c.id === "backlog")?.tasks || []).length;
  const todoCount = (board.find((c) => c.id === "todo" || c.id === "sprint")?.tasks || []).length;
  const progressCount = (board.find((c) => c.id === "progress" || c.id === "in_progress")?.tasks || []).length;
  const reviewCount = (board.find((c) => c.id === "review")?.tasks || []).length;
  const doneCount = (board.find((c) => c.id === "done")?.tasks || []).length;

  const totalTasks = backlogCount + todoCount + progressCount + reviewCount + doneCount;
  const percentDone = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  // Deteksi otomatis fase mana yang sedang aktif
  let currentActivePhase = 1;
  if (doneCount > 0 && doneCount === totalTasks) {
    currentActivePhase = 4;
  } else if (reviewCount > 0) {
    currentActivePhase = 3;
  } else if (progressCount > 0) {
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
      columnLabel: "Backlog",
      icon: SvgIcon.Plan,
      role: "KAPTEN",
      roleVariant: "indigo",
      badgeText: `${backlogCount + todoCount} Tugas`,
      shortDesc: "Penyusunan sasaran sprint & pemecahan modul",
      details: {
        target: "Menyusun sasaran sprint yang terukur dan memecah modul besar ke tugas koding spesifik.",
        kapten: "Gunakan AI Helper Studio untuk generate daftar tugas otomatis, tetapkan Story Points, dan kunci prioritas sprint.",
        member: "Mempelajari spesifikasi teknis tugas yang terdaftar pada Backlog sebelum sprint resmi dimulai.",
        hasAIButton: true,
      },
    },
    {
      id: 2,
      number: "02",
      title: "Eksekusi Sprint",
      columnId: "progress",
      columnLabel: "Sedang Berjalan",
      icon: SvgIcon.Code,
      role: "ANGGOTA",
      roleVariant: "amber",
      badgeText: `${progressCount} Berjalan`,
      shortDesc: lockPriority ? "Fokus kartu prioritas & stopwatch koding" : "Eksekusi koding & pencatatan waktu",
      details: {
        target: "Fokus menyelesaikan tugas koding sprint tanpa distraksi, mematuhi WIP Limit kolom.",
        kapten: "Memantau distribusi beban kerja tim dan memastikan tidak ada penumpukan tugas di satu anggota.",
        member: "Tarik kartu ke kolom Sedang Berjalan, nyalakan stopwatch pencatat jam koding, dan selesaikan sub-tugas checklist.",
        hasAIButton: false,
      },
    },
    {
      id: 3,
      number: "03",
      title: "Review & Pengujian",
      columnId: "review",
      columnLabel: "Ditinjau",
      icon: SvgIcon.Review,
      role: "KOLABORASI",
      roleVariant: "sky",
      badgeText: `${reviewCount} Ditinjau`,
      shortDesc: "Verifikasi checklist & uji kelayakan kode",
      details: {
        target: "Menjamin fitur yang dibangun bebas dari galat teknis sebelum digabung ke cabang produksi.",
        kapten: "Memeriksa hasil pekerjaan pada kartu di kolom Ditinjau sebelum menyetujui pemindahan kartu ke Selesai.",
        member: "Pastikan seluruh checklist sub-tugas tercentang 100%, cantumkan bukti pengujian, lalu serahkan ke Review.",
        hasAIButton: false,
      },
    },
    {
      id: 4,
      number: "04",
      title: "Selesai & Rilis",
      columnId: "done",
      columnLabel: "Selesai",
      icon: SvgIcon.Done,
      role: "TIM",
      roleVariant: "emerald",
      badgeText: `${doneCount} Selesai (${percentDone}%)`,
      shortDesc: "Tugas tuntas & evaluasi velocity sprint",
      details: {
        target: "Penutupan sprint, pengukuran velocity tim, dan persiapan rilis fitur ke pengguna.",
        kapten: "Mengevaluasi grafik Burndown dan rata-rata Story Points tim, lalu menutup siklus melalui tombol Akhiri Sprint.",
        member: "Melihat akumulasi jam koding yang berhasil diselesaikan dan mempersiapkan backlog untuk sprint berikutnya.",
        hasAIButton: false,
      },
    },
  ];

  const currentStepData = steps.find((s) => s.id === activeStep) || steps[0];

  function handleSelectStep(st) {
    setActiveStep(st.id);
    if (onScrollToColumn) {
      onScrollToColumn(st.columnId);
    }
  }

  return (
    <div
      className={
        "mb-6 rounded-2xl border transition-all duration-300 overflow-hidden " +
        (isLight
          ? "bg-white/95 border-zinc-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
          : "bg-zinc-950/70 border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.35)] backdrop-blur-xl")
      }
    >
      {/* HEADER BAR MINIMALIS */}
      <div
        className={
          "px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b transition-colors " +
          (isLight ? "bg-zinc-50/70 border-zinc-200/80" : "bg-zinc-900/40 border-white/[0.06]")
        }
      >
        <div className="flex items-center gap-3">
          <div
            className={
              "w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-semibold " +
              (isLight
                ? "bg-zinc-900 text-zinc-50 shadow-xs"
                : "bg-zinc-800 text-zinc-100 border border-white/10 shadow-xs")
            }
          >
            <SvgIcon.Plan className="w-3.5 h-3.5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={"font-mono text-[10px] uppercase tracking-[0.16em] font-semibold " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                Alur Kerja Sprint
              </span>
              <span
                className={
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium " +
                  (isLight
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20")
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Fase 0{currentActivePhase} Aktif
              </span>
            </div>
            <p className={"text-[12px] font-medium leading-none mt-1 " + (isLight ? "text-zinc-800" : "text-zinc-300")}>
              Siklus 4 Tahap Pengembangan Perangkat Lunak Terstruktur
            </p>
          </div>
        </div>

        {/* STATS RINGKAS & TOGGLE BUKA/TUTUP */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="hidden sm:flex items-center gap-2">
            <div className={"w-24 h-1.5 rounded-full overflow-hidden " + (isLight ? "bg-zinc-200" : "bg-zinc-800")}>
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${percentDone}%` }}
              />
            </div>
            <span className={"font-mono text-[11px] tabular-nums " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
              {percentDone}% Selesai
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={
              "px-3 py-1.5 rounded-lg text-[11.5px] font-medium border flex items-center gap-1.5 transition-all duration-150 cursor-pointer " +
              (isLight
                ? "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100")
            }
          >
            <span>{isOpen ? "Sembunyikan Panduan" : "Tampilkan Panduan"}</span>
            <SvgIcon.ChevronDown
              className={"w-3.5 h-3.5 transition-transform duration-200 " + (isOpen ? "rotate-180" : "rotate-0")}
            />
          </button>
        </div>
      </div>

      {/* KONTEN UTAMA */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* GRID 4 FASE KERJA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {steps.map((st) => {
              const isSelected = activeStep === st.id;
              const isCurrentPhase = currentActivePhase === st.id;
              const StepIcon = st.icon;

              let roleBadgeClass = "";
              if (st.roleVariant === "indigo") {
                roleBadgeClass = isLight
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
              } else if (st.roleVariant === "amber") {
                roleBadgeClass = isLight
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20";
              } else if (st.roleVariant === "sky") {
                roleBadgeClass = isLight
                  ? "bg-sky-50 text-sky-700 border-sky-200"
                  : "bg-sky-500/10 text-sky-400 border-sky-500/20";
              } else {
                roleBadgeClass = isLight
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
              }

              return (
                <div
                  key={st.id}
                  onClick={() => handleSelectStep(st)}
                  className={
                    "p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 relative " +
                    (isSelected
                      ? isLight
                        ? "bg-zinc-50 border-zinc-900/30 ring-1 ring-zinc-900/10 shadow-xs"
                        : "bg-zinc-900/90 border-zinc-700 ring-1 ring-white/10 shadow-lg"
                      : isLight
                      ? "bg-white border-zinc-200/90 hover:border-zinc-300 hover:bg-zinc-50/50"
                      : "bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40")
                  }
                >
                  {/* BARIS ATAS: NOMOR FASE + ROLE CHIP */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          "font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded " +
                          (isSelected
                            ? isLight
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-200 text-zinc-900"
                            : isLight
                            ? "bg-zinc-100 text-zinc-600"
                            : "bg-zinc-800 text-zinc-400")
                        }
                      >
                        {st.number}
                      </span>
                      {isCurrentPhase && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-medium text-emerald-500 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Aktif
                        </span>
                      )}
                    </div>
                    <span className={"font-mono text-[9px] font-semibold px-2 py-0.5 rounded border " + roleBadgeClass}>
                      {st.role}
                    </span>
                  </div>

                  {/* JUDUL FASE & HITUNGAN TUGAS */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <StepIcon className={"w-3.5 h-3.5 flex-shrink-0 " + (isSelected ? (isLight ? "text-zinc-900" : "text-zinc-100") : "text-zinc-500")} />
                      <h4 className={"text-[13px] font-semibold truncate " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                        {st.title}
                      </h4>
                    </div>
                    <span
                      className={
                        "font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded font-medium flex-shrink-0 border " +
                        (isLight
                          ? "bg-zinc-100 border-zinc-200 text-zinc-700"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400")
                      }
                    >
                      {st.badgeText}
                    </span>
                  </div>

                  {/* KETERANGAN RINGKAS */}
                  <p className={"text-[11.5px] leading-snug line-clamp-1 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                    {st.shortDesc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* DETAIL OPERASIONAL FASE YANG DIPILIH */}
          <div
            className={
              "p-4 rounded-xl border transition-all " +
              (isLight
                ? "bg-zinc-50/80 border-zinc-200"
                : "bg-zinc-900/50 border-white/[0.06]")
            }
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                {/* SASARAN FASE */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={"font-mono text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded " + (isLight ? "bg-zinc-200 text-zinc-800" : "bg-zinc-800 text-zinc-300")}>
                    Fase {currentStepData.number} · {currentStepData.title}
                  </span>
                  <span className={"text-[12px] font-medium " + (isLight ? "text-zinc-600" : "text-zinc-300")}>
                    {currentStepData.details.target}
                  </span>
                </div>

                {/* DUA KOLOM: TANGGUNG JAWAB KAPTEN & ANGGOTA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11.5px] leading-relaxed">
                  <div
                    className={
                      "p-3 rounded-lg border " +
                      (isLight ? "bg-white border-zinc-200 text-zinc-700" : "bg-zinc-950/60 border-zinc-800/80 text-zinc-300")
                    }
                  >
                    <div className="flex items-center gap-1.5 font-semibold mb-1 text-[11px] uppercase tracking-wider text-indigo-400">
                      <SvgIcon.Shield className="w-3.5 h-3.5" />
                      <span>Wewenang Kapten</span>
                    </div>
                    <p>{currentStepData.details.kapten}</p>
                  </div>

                  <div
                    className={
                      "p-3 rounded-lg border " +
                      (isLight ? "bg-white border-zinc-200 text-zinc-700" : "bg-zinc-950/60 border-zinc-800/80 text-zinc-300")
                    }
                  >
                    <div className="flex items-center gap-1.5 font-semibold mb-1 text-[11px] uppercase tracking-wider text-amber-400">
                      <SvgIcon.Terminal className="w-3.5 h-3.5" />
                      <span>Aktivitas Anggota</span>
                    </div>
                    <p>{currentStepData.details.member}</p>
                  </div>
                </div>
              </div>

              {/* TOMBOL AKSI CEPAT */}
              <div className="flex flex-wrap sm:flex-col gap-2 flex-shrink-0 lg:w-48">
                {currentStepData.details.hasAIButton && onOpenAIHelper && (
                  <button
                    type="button"
                    onClick={onOpenAIHelper}
                    className={
                      "w-full px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 " +
                      (isLight
                        ? "bg-zinc-900 hover:bg-zinc-800 text-white"
                        : "bg-white hover:bg-zinc-100 text-zinc-950")
                    }
                  >
                    <SvgIcon.Sparkle className="w-3.5 h-3.5" />
                    <span>Buka AI Studio</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onScrollToColumn && onScrollToColumn(currentStepData.columnId)}
                  className={
                    "w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 " +
                    (isLight
                      ? "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                      : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300")
                  }
                >
                  <span>Lihat Kolom {currentStepData.columnLabel}</span>
                  <SvgIcon.ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
