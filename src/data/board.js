export const MEMBERS = {};

export const ROLE_LABEL = { admin: "Kapten", member: "Anggota", viewer: "Viewer" };

export const PRIORITY_LABEL = { urgent: "Mendesak", high: "Tinggi", medium: "Sedang", low: "Rendah" };
export const PRIORITY_CLASS = {
  urgent: "bg-rose-950 text-rose-400",
  high: "bg-amber-950 text-amber-400",
  medium: "bg-zinc-800 text-zinc-400",
  low: "bg-zinc-800 text-zinc-500",
};

export const PRIORITY_CLASS_LIGHT = {
  urgent: "bg-rose-100 text-rose-700 border border-rose-200",
  high: "bg-amber-100 text-amber-800 border border-amber-200",
  medium: "bg-slate-100 text-slate-700 border border-slate-200",
  low: "bg-slate-100 text-slate-600 border border-slate-200",
};

export const COLUMN_THEMES = {
  backlog: {
    name: "Backlog Produk",
    dot: "#94A3B8",
    accent: "slate",
    dark: {
      colBg: "bg-gradient-to-b from-slate-900/55 via-slate-950/35 to-zinc-950/60 border-slate-800/80",
      colHeader: "text-slate-200",
      badge: "bg-slate-800/90 text-slate-200 border border-slate-700/60",
      cardBg: "bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-zinc-950/90 border border-slate-700/65 text-zinc-100",
      cardAccent: "border-l-4 border-l-slate-400",
      cardHover: "hover:border-slate-500/80 hover:shadow-lg hover:shadow-slate-950/60",
      cardGhost: "border-slate-700/70 bg-slate-900/40",
      btnGhost: "border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-900/60",
      inputBg: "border-slate-700 bg-slate-950 text-slate-100 focus:ring-slate-700 focus:border-slate-500",
      dropOver: "bg-slate-900/60 border-slate-500",
      addCard: "bg-gradient-to-br from-slate-900/55 via-slate-950/40 to-zinc-950/60 border-slate-700/70 text-slate-300 hover:border-slate-400/70 hover:from-slate-800/60 hover:via-slate-900/50 hover:to-zinc-900/70 hover:shadow-[0_14px_30px_-8px_rgba(148,163,184,0.18)]",
      addIcon: "bg-gradient-to-br from-slate-500/30 via-slate-700/20 to-slate-900 border-slate-500/40 text-slate-200 group-hover:border-slate-400/70 group-hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]",
      addTitle: "text-slate-200 group-hover:text-white",
      addSub: "text-slate-400/80 group-hover:text-slate-300",
      addForm: "bg-gradient-to-br from-slate-900/95 to-zinc-950 border-slate-500/50 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]",
      addLabel: "text-slate-300",
      addSubmit: "bg-gradient-to-b from-slate-200 to-slate-400 text-zinc-950 hover:from-white hover:to-slate-300",
    },
    light: {
      colBg: "bg-gradient-to-b from-slate-100/90 via-slate-50/80 to-white/90 border-slate-200/90",
      colHeader: "text-slate-800",
      badge: "bg-slate-200/90 text-slate-700 border border-slate-300/60",
      cardBg: "bg-gradient-to-br from-white via-slate-50/70 to-slate-100/50 border border-slate-200/90 text-slate-900 shadow-sm",
      cardAccent: "border-l-4 border-l-slate-400",
      cardHover: "hover:border-slate-400 hover:shadow-md hover:shadow-slate-200/60",
      cardGhost: "border-slate-300 bg-slate-100/50",
      btnGhost: "border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 hover:bg-slate-200/50",
      inputBg: "border-slate-300 bg-white text-slate-900 focus:ring-slate-300 focus:border-slate-600",
      dropOver: "bg-slate-200/60 border-slate-400",
      addCard: "bg-gradient-to-br from-white/90 via-slate-50/80 to-slate-100/70 border-slate-300/90 text-slate-600 hover:border-slate-500 hover:from-white hover:to-slate-100 hover:shadow-md",
      addIcon: "bg-gradient-to-br from-slate-200 via-slate-100 to-white border-slate-300 text-slate-700 group-hover:border-slate-400 group-hover:text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
      addTitle: "text-slate-700 group-hover:text-slate-950",
      addSub: "text-slate-500",
      addForm: "bg-white border-slate-400/80 shadow-md",
      addLabel: "text-slate-700",
      addSubmit: "bg-slate-800 text-white hover:bg-slate-700",
    },
  },
  todo: {
    name: "Sprint Backlog",
    dot: "#10B981",
    accent: "emerald",
    dark: {
      colBg: "bg-gradient-to-b from-emerald-950/40 via-emerald-950/15 to-zinc-950/55 border-emerald-800/50",
      colHeader: "text-emerald-300",
      badge: "bg-emerald-950/90 text-emerald-300 border border-emerald-800/60",
      cardBg: "bg-gradient-to-br from-emerald-950/60 via-zinc-900/90 to-teal-950/40 border border-emerald-800/60 text-zinc-100",
      cardAccent: "border-l-4 border-l-emerald-400",
      cardHover: "hover:border-emerald-400/70 hover:shadow-lg hover:shadow-emerald-950/60",
      cardGhost: "border-emerald-800/60 bg-emerald-950/30",
      btnGhost: "border-emerald-900/60 text-emerald-400 hover:border-emerald-600 hover:text-emerald-300 hover:bg-emerald-950/50",
      inputBg: "border-emerald-800 bg-emerald-950/80 text-emerald-100 focus:ring-emerald-900 focus:border-emerald-500",
      dropOver: "bg-emerald-950/40 border-emerald-500",
      addCard: "bg-gradient-to-br from-emerald-950/50 via-teal-950/25 to-zinc-950/60 border-emerald-700/60 text-emerald-300 hover:border-emerald-400/80 hover:from-emerald-900/45 hover:via-teal-950/35 hover:to-zinc-900/70 hover:shadow-[0_14px_30px_-8px_rgba(16,185,129,0.25)]",
      addIcon: "bg-gradient-to-br from-emerald-400/30 via-teal-500/20 to-emerald-950 border-emerald-400/40 text-emerald-300 group-hover:border-emerald-300 group-hover:text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
      addTitle: "text-emerald-200 group-hover:text-emerald-100",
      addSub: "text-emerald-400/70 group-hover:text-emerald-300/90",
      addForm: "bg-gradient-to-br from-emerald-950/80 via-zinc-900/95 to-zinc-950 border-emerald-500/50 shadow-[0_12px_28px_-6px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]",
      addLabel: "text-emerald-300",
      addSubmit: "bg-gradient-to-b from-emerald-400 to-emerald-500 text-zinc-950 hover:from-emerald-300 hover:to-emerald-400",
    },
    light: {
      colBg: "bg-gradient-to-b from-emerald-50/90 via-teal-50/40 to-white/90 border-emerald-200/90",
      colHeader: "text-emerald-900",
      badge: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      cardBg: "bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 border border-emerald-200/90 text-emerald-950 shadow-sm",
      cardAccent: "border-l-4 border-l-emerald-500",
      cardHover: "hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-100",
      cardGhost: "border-emerald-300 bg-emerald-50/50",
      btnGhost: "border-emerald-300 text-emerald-700 hover:border-emerald-400 hover:text-emerald-900 hover:bg-emerald-100/60",
      inputBg: "border-emerald-300 bg-white text-emerald-950 focus:ring-emerald-200 focus:border-emerald-600",
      dropOver: "bg-emerald-100/70 border-emerald-400",
      addCard: "bg-gradient-to-br from-white/90 via-emerald-50/60 to-teal-50/50 border-emerald-300/90 text-emerald-700 hover:border-emerald-500 hover:from-white hover:to-emerald-100/60 hover:shadow-md",
      addIcon: "bg-gradient-to-br from-emerald-100 via-teal-50 to-white border-emerald-300 text-emerald-700 group-hover:border-emerald-400 group-hover:text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
      addTitle: "text-emerald-800 group-hover:text-emerald-950",
      addSub: "text-emerald-600/80",
      addForm: "bg-white border-emerald-400/80 shadow-md shadow-emerald-500/5",
      addLabel: "text-emerald-700",
      addSubmit: "bg-emerald-500 text-white hover:bg-emerald-600",
    },
  },
  progress: {
    name: "Sedang Berjalan",
    dot: "#F59E0B",
    accent: "amber",
    dark: {
      colBg: "bg-gradient-to-b from-amber-950/40 via-orange-950/15 to-zinc-950/55 border-amber-800/50",
      colHeader: "text-amber-300",
      badge: "bg-amber-950/90 text-amber-300 border border-amber-800/60",
      cardBg: "bg-gradient-to-br from-amber-950/60 via-zinc-900/90 to-orange-950/40 border border-amber-800/60 text-zinc-100",
      cardAccent: "border-l-4 border-l-amber-400",
      cardHover: "hover:border-amber-400/70 hover:shadow-lg hover:shadow-amber-950/60",
      cardGhost: "border-amber-800/60 bg-amber-950/30",
      btnGhost: "border-amber-900/60 text-amber-400 hover:border-amber-600 hover:text-amber-300 hover:bg-amber-950/50",
      inputBg: "border-amber-800 bg-amber-950/80 text-amber-100 focus:ring-amber-900 focus:border-amber-500",
      dropOver: "bg-amber-950/40 border-amber-500",
      addCard: "bg-gradient-to-br from-amber-950/50 via-orange-950/25 to-zinc-950/60 border-amber-700/60 text-amber-300 hover:border-amber-400/80 hover:from-amber-900/45 hover:via-orange-950/35 hover:to-zinc-900/70 hover:shadow-[0_14px_30px_-8px_rgba(245,158,11,0.25)]",
      addIcon: "bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-amber-950 border-amber-400/40 text-amber-300 group-hover:border-amber-300 group-hover:text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
      addTitle: "text-amber-200 group-hover:text-amber-100",
      addSub: "text-amber-400/70 group-hover:text-amber-300/90",
      addForm: "bg-gradient-to-br from-amber-950/80 via-zinc-900/95 to-zinc-950 border-amber-500/50 shadow-[0_12px_28px_-6px_rgba(245,158,11,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]",
      addLabel: "text-amber-300",
      addSubmit: "bg-gradient-to-b from-amber-400 to-orange-500 text-zinc-950 hover:from-amber-300 hover:to-orange-400",
    },
    light: {
      colBg: "bg-gradient-to-b from-amber-50/90 via-orange-50/40 to-white/90 border-amber-200/90",
      colHeader: "text-amber-900",
      badge: "bg-amber-100 text-amber-800 border border-amber-200",
      cardBg: "bg-gradient-to-br from-white via-amber-50/40 to-orange-50/30 border border-amber-200/90 text-amber-950 shadow-sm",
      cardAccent: "border-l-4 border-l-amber-500",
      cardHover: "hover:border-amber-400 hover:shadow-md hover:shadow-amber-100",
      cardGhost: "border-amber-300 bg-amber-50/50",
      btnGhost: "border-amber-300 text-amber-700 hover:border-amber-400 hover:text-amber-900 hover:bg-amber-100/60",
      inputBg: "border-amber-300 bg-white text-amber-950 focus:ring-amber-200 focus:border-amber-600",
      dropOver: "bg-amber-100/70 border-amber-400",
      addCard: "bg-gradient-to-br from-white/90 via-amber-50/60 to-orange-50/50 border-amber-300/90 text-amber-700 hover:border-amber-500 hover:from-white hover:to-amber-100/60 hover:shadow-md",
      addIcon: "bg-gradient-to-br from-amber-100 via-orange-50 to-white border-amber-300 text-amber-700 group-hover:border-amber-400 group-hover:text-amber-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
      addTitle: "text-amber-800 group-hover:text-amber-950",
      addSub: "text-amber-600/80",
      addForm: "bg-white border-amber-400/80 shadow-md shadow-amber-500/5",
      addLabel: "text-amber-700",
      addSubmit: "bg-amber-500 text-white hover:bg-amber-600",
    },
  },
  review: {
    name: "Ditinjau",
    dot: "#38BDF8",
    accent: "blue",
    dark: {
      colBg: "bg-gradient-to-b from-blue-950/40 via-sky-950/15 to-zinc-950/55 border-blue-800/50",
      colHeader: "text-blue-300",
      badge: "bg-blue-950/90 text-blue-300 border border-blue-800/60",
      cardBg: "bg-gradient-to-br from-blue-950/60 via-zinc-900/90 to-indigo-950/40 border border-blue-800/60 text-zinc-100",
      cardAccent: "border-l-4 border-l-blue-400",
      cardHover: "hover:border-blue-400/70 hover:shadow-lg hover:shadow-blue-950/60",
      cardGhost: "border-blue-800/60 bg-blue-950/30",
      btnGhost: "border-blue-900/60 text-blue-400 hover:border-blue-600 hover:text-blue-300 hover:bg-blue-950/50",
      inputBg: "border-blue-800 bg-blue-950/80 text-blue-100 focus:ring-blue-900 focus:border-blue-500",
      dropOver: "bg-blue-950/40 border-blue-500",
      addCard: "bg-gradient-to-br from-blue-950/50 via-indigo-950/25 to-zinc-950/60 border-blue-700/60 text-blue-300 hover:border-blue-400/80 hover:from-blue-900/45 hover:via-indigo-950/35 hover:to-zinc-900/70 hover:shadow-[0_14px_30px_-8px_rgba(56,189,248,0.25)]",
      addIcon: "bg-gradient-to-br from-sky-400/30 via-blue-500/20 to-blue-950 border-sky-400/40 text-sky-300 group-hover:border-sky-300 group-hover:text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
      addTitle: "text-sky-200 group-hover:text-sky-100",
      addSub: "text-blue-400/70 group-hover:text-sky-300/90",
      addForm: "bg-gradient-to-br from-blue-950/80 via-zinc-900/95 to-zinc-950 border-blue-500/50 shadow-[0_12px_28px_-6px_rgba(56,189,248,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]",
      addLabel: "text-sky-300",
      addSubmit: "bg-gradient-to-b from-sky-400 to-blue-500 text-zinc-950 hover:from-sky-300 hover:to-blue-400",
    },
    light: {
      colBg: "bg-gradient-to-b from-blue-50/90 via-sky-50/40 to-white/90 border-blue-200/90",
      colHeader: "text-blue-900",
      badge: "bg-blue-100 text-blue-800 border border-blue-200",
      cardBg: "bg-gradient-to-br from-white via-blue-50/40 to-sky-50/30 border border-blue-200/90 text-blue-950 shadow-sm",
      cardAccent: "border-l-4 border-l-blue-500",
      cardHover: "hover:border-blue-400 hover:shadow-md hover:shadow-blue-100",
      cardGhost: "border-blue-300 bg-blue-50/50",
      btnGhost: "border-blue-300 text-blue-700 hover:border-blue-400 hover:text-blue-900 hover:bg-blue-100/60",
      inputBg: "border-blue-300 bg-white text-blue-950 focus:ring-blue-200 focus:border-blue-600",
      dropOver: "bg-blue-100/70 border-blue-400",
      addCard: "bg-gradient-to-br from-white/90 via-blue-50/60 to-sky-50/50 border-blue-300/90 text-blue-700 hover:border-blue-500 hover:from-white hover:to-blue-100/60 hover:shadow-md",
      addIcon: "bg-gradient-to-br from-blue-100 via-sky-50 to-white border-blue-300 text-blue-700 group-hover:border-blue-400 group-hover:text-blue-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
      addTitle: "text-blue-800 group-hover:text-blue-950",
      addSub: "text-blue-600/80",
      addForm: "bg-white border-blue-400/80 shadow-md shadow-blue-500/5",
      addLabel: "text-blue-700",
      addSubmit: "bg-blue-500 text-white hover:bg-blue-600",
    },
  },
  done: {
    name: "Selesai",
    dot: "#14B8A6",
    accent: "teal",
    dark: {
      colBg: "bg-gradient-to-b from-teal-950/40 via-cyan-950/15 to-zinc-950/55 border-teal-800/50",
      colHeader: "text-teal-300",
      badge: "bg-teal-950/90 text-teal-300 border border-teal-800/60",
      cardBg: "bg-gradient-to-br from-teal-950/60 via-zinc-900/90 to-cyan-950/40 border border-teal-800/60 text-zinc-100",
      cardAccent: "border-l-4 border-l-teal-400",
      cardHover: "hover:border-teal-400/70 hover:shadow-lg hover:shadow-teal-950/60",
      cardGhost: "border-teal-800/60 bg-teal-950/30",
      btnGhost: "border-teal-900/60 text-teal-400 hover:border-teal-600 hover:text-teal-300 hover:bg-teal-950/50",
      inputBg: "border-teal-800 bg-teal-950/80 text-teal-100 focus:ring-teal-900 focus:border-teal-500",
      dropOver: "bg-teal-950/40 border-teal-500",
      addCard: "bg-gradient-to-br from-teal-950/50 via-cyan-950/25 to-zinc-950/60 border-teal-700/60 text-teal-300 hover:border-teal-400/80 hover:from-teal-900/45 hover:via-cyan-950/35 hover:to-zinc-900/70 hover:shadow-[0_14px_30px_-8px_rgba(20,184,166,0.25)]",
      addIcon: "bg-gradient-to-br from-teal-400/30 via-cyan-500/20 to-teal-950 border-teal-400/40 text-teal-300 group-hover:border-teal-300 group-hover:text-teal-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
      addTitle: "text-teal-200 group-hover:text-teal-100",
      addSub: "text-teal-400/70 group-hover:text-teal-300/90",
      addForm: "bg-gradient-to-br from-teal-950/80 via-zinc-900/95 to-zinc-950 border-teal-500/50 shadow-[0_12px_28px_-6px_rgba(20,184,166,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]",
      addLabel: "text-teal-300",
      addSubmit: "bg-gradient-to-b from-teal-400 to-cyan-500 text-zinc-950 hover:from-teal-300 hover:to-cyan-400",
    },
    light: {
      colBg: "bg-gradient-to-b from-teal-50/90 via-cyan-50/40 to-white/90 border-teal-200/90",
      colHeader: "text-teal-900",
      badge: "bg-teal-100 text-teal-800 border border-teal-200",
      cardBg: "bg-gradient-to-br from-white via-teal-50/40 to-cyan-50/30 border border-teal-200/90 text-teal-950 shadow-sm",
      cardAccent: "border-l-4 border-l-teal-500",
      cardHover: "hover:border-teal-400 hover:shadow-md hover:shadow-teal-100",
      cardGhost: "border-teal-300 bg-teal-50/50",
      btnGhost: "border-teal-300 text-teal-700 hover:border-teal-400 hover:text-teal-900 hover:bg-teal-100/60",
      inputBg: "border-teal-300 bg-white text-teal-950 focus:ring-teal-200 focus:border-teal-600",
      dropOver: "bg-teal-100/70 border-teal-400",
      addCard: "bg-gradient-to-br from-white/90 via-teal-50/60 to-cyan-50/50 border-teal-300/90 text-teal-700 hover:border-teal-500 hover:from-white hover:to-teal-100/60 hover:shadow-md",
      addIcon: "bg-gradient-to-br from-teal-100 via-cyan-50 to-white border-teal-300 text-teal-700 group-hover:border-teal-400 group-hover:text-teal-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
      addTitle: "text-teal-800 group-hover:text-teal-950",
      addSub: "text-teal-600/80",
      addForm: "bg-white border-teal-400/80 shadow-md shadow-teal-500/5",
      addLabel: "text-teal-700",
      addSubmit: "bg-teal-500 text-white hover:bg-teal-600",
    },
  },
  purple: {
    name: "Kustom Ungu",
    dot: "#A855F7",
    accent: "purple",
    dark: {
      colBg: "bg-gradient-to-b from-purple-950/40 via-violet-950/15 to-zinc-950/55 border-purple-800/50",
      colHeader: "text-purple-300",
      badge: "bg-purple-950/90 text-purple-300 border border-purple-800/60",
      cardBg: "bg-gradient-to-br from-purple-950/60 via-zinc-900/90 to-violet-950/40 border border-purple-800/60 text-zinc-100",
      cardAccent: "border-l-4 border-l-purple-400",
      cardHover: "hover:border-purple-400/70 hover:shadow-lg hover:shadow-purple-950/60",
      cardGhost: "border-purple-800/60 bg-purple-950/30",
      btnGhost: "border-purple-900/60 text-purple-400 hover:border-purple-600 hover:text-purple-300 hover:bg-purple-950/50",
      inputBg: "border-purple-800 bg-purple-950/80 text-purple-100 focus:ring-purple-900 focus:border-purple-500",
      dropOver: "bg-purple-950/40 border-purple-500",
      addCard: "bg-gradient-to-br from-purple-950/50 via-violet-950/25 to-zinc-950/60 border-purple-700/60 text-purple-300 hover:border-purple-400/80 hover:from-purple-900/45 hover:via-violet-950/35 hover:to-zinc-900/70 hover:shadow-[0_14px_30px_-8px_rgba(168,85,247,0.25)]",
      addIcon: "bg-gradient-to-br from-purple-400/30 via-violet-500/20 to-purple-950 border-purple-400/40 text-purple-300 group-hover:border-purple-300 group-hover:text-purple-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
      addTitle: "text-purple-200 group-hover:text-purple-100",
      addSub: "text-purple-400/70 group-hover:text-purple-300/90",
      addForm: "bg-gradient-to-br from-purple-950/80 via-zinc-900/95 to-zinc-950 border-purple-500/50 shadow-[0_12px_28px_-6px_rgba(168,85,247,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]",
      addLabel: "text-purple-300",
      addSubmit: "bg-gradient-to-b from-purple-400 to-violet-500 text-zinc-950 hover:from-purple-300 hover:to-violet-400",
    },
    light: {
      colBg: "bg-gradient-to-b from-purple-50/90 via-violet-50/40 to-white/90 border-purple-200/90",
      colHeader: "text-purple-900",
      badge: "bg-purple-100 text-purple-800 border border-purple-200",
      cardBg: "bg-gradient-to-br from-white via-purple-50/40 to-violet-50/30 border border-purple-200/90 text-purple-950 shadow-sm",
      cardAccent: "border-l-4 border-l-purple-500",
      cardHover: "hover:border-purple-400 hover:shadow-md hover:shadow-purple-100",
      cardGhost: "border-purple-300 bg-purple-50/50",
      btnGhost: "border-purple-300 text-purple-700 hover:border-purple-400 hover:text-purple-900 hover:bg-purple-100/60",
      inputBg: "border-purple-300 bg-white text-purple-950 focus:ring-purple-200 focus:border-purple-600",
      dropOver: "bg-purple-100/70 border-purple-400",
      addCard: "bg-gradient-to-br from-white/90 via-purple-50/60 to-violet-50/50 border-purple-300/90 text-purple-700 hover:border-purple-500 hover:from-white hover:to-purple-100/60 hover:shadow-md",
      addIcon: "bg-gradient-to-br from-purple-100 via-violet-50 to-white border-purple-300 text-purple-700 group-hover:border-purple-400 group-hover:text-purple-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
      addTitle: "text-purple-800 group-hover:text-purple-950",
      addSub: "text-purple-600/80",
      addForm: "bg-white border-purple-400/80 shadow-md shadow-purple-500/5",
      addLabel: "text-purple-700",
      addSubmit: "bg-purple-500 text-white hover:bg-purple-600",
    },
  },
  rose: {
    name: "Kustom Merah Muda",
    dot: "#F43F5E",
    accent: "rose",
    dark: {
      colBg: "bg-gradient-to-b from-rose-950/40 via-pink-950/15 to-zinc-950/55 border-rose-800/50",
      colHeader: "text-rose-300",
      badge: "bg-rose-950/90 text-rose-300 border border-rose-800/60",
      cardBg: "bg-gradient-to-br from-rose-950/60 via-zinc-900/90 to-pink-950/40 border border-rose-800/60 text-zinc-100",
      cardAccent: "border-l-4 border-l-rose-400",
      cardHover: "hover:border-rose-400/70 hover:shadow-lg hover:shadow-rose-950/60",
      cardGhost: "border-rose-800/60 bg-rose-950/30",
      btnGhost: "border-rose-900/60 text-rose-400 hover:border-rose-600 hover:text-rose-300 hover:bg-rose-950/50",
      inputBg: "border-rose-800 bg-rose-950/80 text-rose-100 focus:ring-rose-900 focus:border-rose-500",
      dropOver: "bg-rose-950/40 border-rose-500",
      addCard: "bg-gradient-to-br from-rose-950/50 via-pink-950/25 to-zinc-950/60 border-rose-700/60 text-rose-300 hover:border-rose-400/80 hover:from-rose-900/45 hover:via-pink-950/35 hover:to-zinc-900/70 hover:shadow-[0_14px_30px_-8px_rgba(244,63,94,0.25)]",
      addIcon: "bg-gradient-to-br from-rose-400/30 via-pink-500/20 to-rose-950 border-rose-400/40 text-rose-300 group-hover:border-rose-300 group-hover:text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
      addTitle: "text-rose-200 group-hover:text-rose-100",
      addSub: "text-rose-400/70 group-hover:text-rose-300/90",
      addForm: "bg-gradient-to-br from-rose-950/80 via-zinc-900/95 to-zinc-950 border-rose-500/50 shadow-[0_12px_28px_-6px_rgba(244,63,94,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]",
      addLabel: "text-rose-300",
      addSubmit: "bg-gradient-to-b from-rose-400 to-pink-500 text-zinc-950 hover:from-rose-300 hover:to-pink-400",
    },
    light: {
      colBg: "bg-gradient-to-b from-rose-50/90 via-pink-50/40 to-white/90 border-rose-200/90",
      colHeader: "text-rose-900",
      badge: "bg-rose-100 text-rose-800 border border-rose-200",
      cardBg: "bg-gradient-to-br from-white via-rose-50/40 to-pink-50/30 border border-rose-200/90 text-rose-950 shadow-sm",
      cardAccent: "border-l-4 border-l-rose-500",
      cardHover: "hover:border-rose-400 hover:shadow-md hover:shadow-rose-100",
      cardGhost: "border-rose-300 bg-rose-50/50",
      btnGhost: "border-rose-300 text-rose-700 hover:border-rose-400 hover:text-rose-900 hover:bg-rose-100/60",
      inputBg: "border-rose-300 bg-white text-rose-950 focus:ring-rose-200 focus:border-rose-600",
      dropOver: "bg-rose-100/70 border-rose-400",
      addCard: "bg-gradient-to-br from-white/90 via-rose-50/60 to-pink-50/50 border-rose-300/90 text-rose-700 hover:border-rose-500 hover:from-white hover:to-rose-100/60 hover:shadow-md",
      addIcon: "bg-gradient-to-br from-rose-100 via-pink-50 to-white border-rose-300 text-rose-700 group-hover:border-rose-400 group-hover:text-rose-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
      addTitle: "text-rose-800 group-hover:text-rose-950",
      addSub: "text-rose-600/80",
      addForm: "bg-white border-rose-400/80 shadow-md shadow-rose-500/5",
      addLabel: "text-rose-700",
      addSubmit: "bg-rose-500 text-white hover:bg-rose-600",
    },
  },
};

export const COLUMN_COLOR_PRESETS = [
  { themeKey: "backlog", label: "Slate", dot: "#94A3B8" },
  { themeKey: "todo", label: "Emerald", dot: "#10B981" },
  { themeKey: "progress", label: "Amber", dot: "#F59E0B" },
  { themeKey: "review", label: "Blue", dot: "#38BDF8" },
  { themeKey: "done", label: "Teal", dot: "#14B8A6" },
  { themeKey: "purple", label: "Purple", dot: "#A855F7" },
  { themeKey: "rose", label: "Rose", dot: "#F43F5E" },
];

export const TASK_LABEL_PRESETS = [
  {
    id: "fitur",
    name: "Fitur",
    dot: "#10B981",
    dark: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
    light: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    id: "bug",
    name: "Bug",
    dot: "#F43F5E",
    dark: "bg-rose-950/80 text-rose-300 border-rose-700/60",
    light: "bg-rose-50 text-rose-800 border-rose-200",
  },
  {
    id: "desain",
    name: "Desain",
    dot: "#A855F7",
    dark: "bg-purple-950/80 text-purple-300 border-purple-700/60",
    light: "bg-purple-50 text-purple-800 border-purple-200",
  },
  {
    id: "backend",
    name: "Backend",
    dot: "#38BDF8",
    dark: "bg-sky-950/80 text-sky-300 border-sky-700/60",
    light: "bg-sky-50 text-sky-800 border-sky-200",
  },
  {
    id: "riset",
    name: "Riset",
    dot: "#F59E0B",
    dark: "bg-amber-950/80 text-amber-300 border-amber-700/60",
    light: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    id: "dokumen",
    name: "Dokumen",
    dot: "#14B8A6",
    dark: "bg-teal-950/80 text-teal-300 border-teal-700/60",
    light: "bg-teal-50 text-teal-800 border-teal-200",
  },
];

// Aturan Scrum x Kanban
export const WIP_LIMIT = 4; // batas WIP kolom "Sedang Berjalan" (prinsip Kanban)
export const SPRINT_DAYS = 14; // panjang sprint (prinsip Scrum)
export const POINT_OPTIONS = [1, 2, 3, 5, 8, 13]; // skala story point
export const SPRINT_COLUMNS = ["todo", "progress", "review", "done"]; // kolom yang termasuk komitmen sprint

let uidCounter = 100;
export function makeTask(t) {
  uidCounter += 1;
  const rawComments = t?.comments;
  const comments = Array.isArray(rawComments)
    ? rawComments
    : typeof rawComments === "number" && rawComments > 0
    ? Array.from({ length: rawComments }, (_, i) => ({
        id: `c_${uidCounter}_${i}`,
        author: "Anggota Tim",
        authorKey: "fr",
        text: "Komentar tugas.",
        createdAt: "Baru saja",
      }))
    : [];
  const labels = Array.isArray(t?.labels) ? t.labels : [];
  return {
    id: "t" + uidCounter,
    desc: "",
    checklist: [],
    comments,
    labels,
    points: 3,
    prioritized: false,
    assignee: null,
    ...t,
  };
}

// Anggota baru yang mendaftar ikut masuk ke daftar anggota (hanya di memori).
export function registerMember(account) {
  const key = "u" + Date.now().toString(36);
  const palette = ["#22D3EE", "#A3E635", "#FB923C", "#F472B6"];
  MEMBERS[key] = {
    name: account.name,
    initials: account.initials,
    color: palette[Object.keys(MEMBERS).length % palette.length],
    role: "member",
    email: account.email,
    joined: "Hari ini",
  };
  return key;
}

export function initialBoard() {
  return createStarterBoard("Ruang Kerja");
}

export function initialSprint() {
  return createDefaultSprint("Menyelesaikan prioritas utama sprint tepat waktu.");
}

export function createDefaultSprint(goalText) {
  return {
    active: true,
    number: 1,
    goal: goalText || "Menyelesaikan prioritas utama sprint pertama tepat waktu.",
    day: 1,
    durationDays: SPRINT_DAYS,
    autoPullPrioritized: true,
    startedAt: "Hari ini",
    history: [],
    burndown: [11],
  };
}

export function createEmptyBoard() {
  return [
    { id: "backlog", name: "Backlog Produk", dot: "#94A3B8", tasks: [] },
    { id: "todo", name: "Sprint Backlog", dot: "#34D399", tasks: [] },
    { id: "progress", name: "Sedang Berjalan", dot: "#D97706", wip: WIP_LIMIT, tasks: [] },
    { id: "review", name: "Ditinjau", dot: "#5B9DFF", tasks: [] },
    { id: "done", name: "Selesai", dot: "#14B8A6", tasks: [] },
  ];
}

export function createStarterBoard(projectName = "Proyek Baru") {
  return [
    {
      id: "backlog",
      name: "Backlog Produk",
      dot: "#94A3B8",
      tasks: [
        makeTask({
          title: `Riset kebutuhan & ruang lingkup ${projectName}`,
          priority: "medium",
          due: "Minggu depan",
          points: 3,
          desc: `Kumpulkan referensi dan daftar fitur utama untuk ${projectName}.`,
        }),
      ],
    },
    {
      id: "todo",
      name: "Sprint Backlog",
      dot: "#34D399",
      tasks: [
        makeTask({
          title: `Susun arsitektur & rencana kerja ${projectName}`,
          priority: "high",
          due: "Besok",
          assignee: null,
          points: 5,
          prioritized: true,
          desc: "Tetapkan pembagian tugas awal bersama tim.",
          checklist: [
            { text: "Tentukan target utama sprint", done: true },
            { text: "Bagikan tugas ke anggota", done: false },
          ],
        }),
      ],
    },
    {
      id: "progress",
      name: "Sedang Berjalan",
      dot: "#D97706",
      wip: WIP_LIMIT,
      tasks: [
        makeTask({
          title: `Implementasi modul inti ${projectName}`,
          priority: "urgent",
          due: "Hari ini",
          assignee: null,
          points: 5,
          prioritized: true,
          desc: "Fokus pada fitur prioritas pertama agar bisa segera diuji.",
        }),
      ],
    },
    {
      id: "review",
      name: "Ditinjau",
      dot: "#5B9DFF",
      tasks: [],
    },
    {
      id: "done",
      name: "Selesai",
      dot: "#14B8A6",
      tasks: [
        makeTask({
          title: `Inisialisasi ruang kerja ${projectName}`,
          priority: "low",
          due: "Selesai",
          assignee: null,
          points: 2,
          desc: "Papan Kanban telah siap digunakan.",
        }),
      ],
    },
  ];
}

export function getProjectOwnerEmail(project) {
  if (!project) return "";
  const raw = (project.ownerEmail || project.createdBy || "").trim().toLowerCase();
  if (raw && raw !== "system-seed" && raw !== "user") return raw;
  return "";
}

export function canAccountAccessProject(project, userOrEmail) {
  if (!project || !userOrEmail) return false;
  const email = (typeof userOrEmail === "string" ? userOrEmail : userOrEmail.email || "")
    .trim()
    .toLowerCase();
  if (!email) return false;

  const owner = getProjectOwnerEmail(project);
  if (owner === email) return true;

  if (Array.isArray(project.allowedEmails)) {
    if (project.allowedEmails.some((e) => String(e).trim().toLowerCase() === email)) {
      return true;
    }
  }
  if (Array.isArray(project.members)) {
    if (project.members.some((m) => String(m).includes("@") && String(m).trim().toLowerCase() === email)) {
      return true;
    }
  }
  return false;
}

export function initialProjects() {
  return [];
}

export function checklistPct(task) {
  if (!task.checklist || !task.checklist.length) return 0;
  const done = task.checklist.filter((c) => c.done).length;
  return Math.round((done / task.checklist.length) * 100);
}

export const SEED_ACCOUNTS = [];
