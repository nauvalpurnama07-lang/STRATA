import { useState, useRef, useEffect } from "react";
import { Icon } from "../icons";
import { PRIORITY_LABEL, PRIORITY_CLASS, PRIORITY_CLASS_LIGHT } from "../../data/board";
import { generateAIHelperResponse } from "../../firebase";

export function sanitizeNoEmoji(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,!?:])/g, "$1")
    .trim();
}

export function PersonaIcon({ persona, className = "w-4 h-4" }) {
  const key = persona?.iconKey || persona?.id;
  switch (key) {
    case "layers":
    case "bobi":
      return <Icon.Layers className={className} />;
    case "task":
    case "cika":
      return <Icon.Task className={className} />;
    case "star":
    case "piko":
      return <Icon.StarFilled className={className} />;
    case "board":
    case "koko":
    default:
      return <Icon.Board className={className} />;
  }
}

export const AI_PERSONAS = [
  {
    id: "koko",
    name: "Koko",
    fullName: "Koko — Perencana Sprint & Kanban",
    tagline: "Arsitek Alur Kerja & Manajemen Sprint",
    badge: "Sprint Architect",
    iconKey: "board",
    accentDark: "from-emerald-500/20 via-teal-500/10 to-zinc-900 border-emerald-500/40 text-emerald-300",
    accentLight: "from-emerald-50 via-teal-50 to-white border-emerald-300 text-emerald-800",
    pillDark: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    pillLight: "bg-emerald-50 text-emerald-700 border-emerald-200",
    greeting:
      "Halo! Saya **Koko**, perencana sprint dan arsitek Kanban STRATA. Saya siap membantu menyusun kartu tugas terstruktur, merapikan backlog, atau merancang sasaran sprint baru.",
  },
  {
    id: "bobi",
    name: "Bobi",
    fullName: "Bobi — Optimalisasi Beban Kerja",
    tagline: "Analis Kapasitas & Keseimbangan Tim",
    badge: "Workload Analyst",
    iconKey: "layers",
    accentDark: "from-cyan-500/20 via-sky-500/10 to-zinc-900 border-cyan-500/40 text-cyan-300",
    accentLight: "from-cyan-50 via-sky-50 to-white border-cyan-300 text-cyan-800",
    pillDark: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    pillLight: "bg-cyan-50 text-cyan-700 border-cyan-200",
    greeting:
      "Halo! Saya **Bobi**, analis kapasitas dan alur kerja. Beritahu saya apa yang ingin dikerjakan, dan saya akan membantu memformulasikan kartu tugas yang terukur agar ritme kerja tim tetap seimbang.",
  },
  {
    id: "cika",
    name: "Cika",
    fullName: "Cika — Spesialis Dekomposisi Tugas",
    tagline: "Pemecah Fitur Kompleks & Epics",
    badge: "Task Breakdown",
    iconKey: "task",
    accentDark: "from-amber-500/20 via-orange-500/10 to-zinc-900 border-amber-500/40 text-amber-300",
    accentLight: "from-amber-50 via-orange-50 to-white border-amber-300 text-amber-800",
    pillDark: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    pillLight: "bg-amber-50 text-amber-700 border-amber-200",
    greeting:
      "Halo! Saya **Cika**, spesialis dekomposisi tugas. Sampaikan ide proyek atau fitur yang ingin dibangun, dan saya akan memecahnya menjadi daftar kartu kerja yang siap dieksekusi.",
  },
  {
    id: "piko",
    name: "Piko",
    fullName: "Piko — Strategi Prioritas",
    tagline: "Penasihat Urgensi & Dampak Sasaran",
    badge: "Priority Strategist",
    iconKey: "star",
    accentDark: "from-violet-500/20 via-purple-500/10 to-zinc-900 border-violet-500/40 text-violet-300",
    accentLight: "from-violet-50 via-purple-50 to-white border-violet-300 text-violet-800",
    pillDark: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    pillLight: "bg-violet-50 text-violet-700 border-violet-200",
    greeting:
      "Halo! Saya **Piko**, penasihat strategi prioritas. Saya siap membantu menyeleksi urgensi tugas, mengidentifikasi item bernilai tinggi, dan menjaga fokus tim pada sasaran utama.",
  },
];

function PersonaAvatar({ persona, size = "md", isLight = false }) {
  const p = persona || AI_PERSONAS[0];
  const dims =
    size === "lg"
      ? "w-10 h-10 rounded-2xl"
      : size === "sm"
      ? "w-7 h-7 rounded-xl"
      : "w-8 h-8 rounded-xl";
  const iconDims =
    size === "lg"
      ? "w-5 h-5"
      : size === "sm"
      ? "w-3.5 h-3.5"
      : "w-4 h-4";

  return (
    <div
      className={
        `relative flex items-center justify-center flex-shrink-0 border bg-gradient-to-br select-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ` +
        dims +
        " " +
        (isLight
          ? `${p.accentLight} shadow-[0_4px_12px_-2px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]`
          : `${p.accentDark} shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)]`)
      }
    >
      <PersonaIcon persona={p} className={iconDims} />
    </div>
  );
}


function renderRichMessage(text, isLight) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong
          key={idx}
          className={
            "font-extrabold " +
            (isLight ? "text-emerald-700" : "text-emerald-300")
          }
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className={
            "px-1.5 py-0.5 rounded-md font-mono text-[11.5px] border " +
            (isLight
              ? "bg-slate-200/70 border-slate-300/80 text-emerald-800"
              : "bg-zinc-950/70 border-zinc-700/70 text-emerald-300")
          }
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

const TEMPLATES = [
  {
    match: ["onboarding", "pengguna baru"],
    name: "Onboarding pengguna",
    tasks: [
      { title: "Petakan alur pendaftaran pengguna baru", priority: "high", column: "todo" },
      { title: "Rancang email selamat datang", priority: "medium", column: "todo" },
      { title: "Buat halaman panduan awal", priority: "medium", column: "todo" },
      { title: "Uji alur onboarding dengan 5 pengguna", priority: "low", column: "todo" },
    ],
  },
  {
    match: ["marketing", "kampanye", "sosial media", "promosi"],
    name: "Kampanye pemasaran",
    tasks: [
      { title: "Susun kalender konten 2 minggu", priority: "high", column: "todo" },
      { title: "Desain aset visual kampanye", priority: "medium", column: "todo" },
      { title: "Jadwalkan publikasi ke media sosial", priority: "medium", column: "todo" },
      { title: "Rangkum laporan performa kampanye", priority: "low", column: "todo" },
    ],
  },
  {
    match: ["rilis", "launch", "peluncuran"],
    name: "Peluncuran produk",
    tasks: [
      { title: "Finalisasi daftar fitur yang dirilis", priority: "urgent", column: "todo" },
      { title: "Siapkan halaman changelog publik", priority: "medium", column: "todo" },
      { title: "Koordinasi pengumuman ke pengguna", priority: "medium", column: "todo" },
      { title: "Pantau isu pasca-rilis selama 48 jam", priority: "high", column: "review" },
    ],
  },
];

const DEFAULT_TEMPLATE = {
  name: "Kickoff proyek baru",
  tasks: [
    { title: "Tentukan tujuan dan ruang lingkup proyek", priority: "urgent", column: "todo" },
    { title: "Susun linimasa dan milestone utama", priority: "high", column: "todo" },
    { title: "Bagikan rencana ke seluruh anggota tim", priority: "medium", column: "todo" },
  ],
};

const PRIORITY_KEYWORDS = [
  { words: ["mendesak", "urgent", "sangat penting", "segera"], priority: "urgent" },
  { words: ["penting", "prioritas tinggi"], priority: "high" },
  { words: ["nanti", "santai", "tidak buru-buru", "rendah"], priority: "low" },
];

function detectPriority(text) {
  const lower = text.toLowerCase();
  for (const p of PRIORITY_KEYWORDS) {
    if (p.words.some((w) => lower.includes(w))) return p.priority;
  }
  return "medium";
}

function detectTemplate(text) {
  const lower = text.toLowerCase();
  for (const t of TEMPLATES) {
    if (t.match.some((w) => lower.includes(w))) return t;
  }
  return DEFAULT_TEMPLATE;
}

function cleanTitle(text) {
  let t = text.trim();
  t = t.replace(/^(tolong|coba|bisa|bisakah|koko|bobi|cika|piko)\s+/i, "");
  t = t.replace(/^(tambahkan|buatkan|buat|tambah)\s+(tugas|kartu)?\s*/i, "");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (t.length > 80) t = t.slice(0, 77) + "...";
  return t || "Tugas baru";
}

function wantsTemplate(text) {
  return /template|rencana|kickoff|susunkan|rancangkan|daftar tugas|pecahkan/i.test(text);
}

function buildLocalAssistantReply(userText, persona) {
  if (wantsTemplate(userText)) {
    const template = detectTemplate(userText);
    return {
      role: "assistant",
      kind: "template",
      text: `Berikut rekomendasi struktur kartu untuk **"${template.name}"** yang telah disusun oleh **${persona.name}**. Silakan tinjau dan klik tombol terapkan untuk menambahkannya ke papan Kanban.`,
      template,
    };
  }
  const priority = detectPriority(userText);
  const title = cleanTitle(userText);
  return {
    role: "assistant",
    kind: "task",
    text: `Kartu tugas baru telah disiapkan oleh **${persona.name}**. Anda dapat langsung memasukkannya ke kolom yang sesuai di papan Kanban.`,
    task: { title, priority, column: "todo" },
  };
}

function TypingBubble({ persona, theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <div
      className={
        "flex items-center gap-2.5 border rounded-2xl rounded-bl-md px-3.5 py-2.5 w-max strata-msg-in " +
        (isLight
          ? "bg-slate-100 border-slate-200/70 text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "bg-zinc-800/80 border-zinc-700/60 text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
      }
    >
      <span className="text-[11px] font-medium">
        {persona?.name || "Asisten"} sedang menyusun rekomendasi...
      </span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 strata-typing-dot"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ template, onApply, applied, theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <div
      className={
        "mt-2.5 rounded-2xl p-3.5 w-full max-w-[320px] border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-emerald-500/40 hover:shadow-lg hover:-translate-y-0.5 " +
        (isLight ? "bg-white border-zinc-200/70 shadow-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" : "bg-zinc-900 border-zinc-700/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
      }
    >
      <div className={"text-[12.5px] font-bold mb-2 " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
        {template.name}
      </div>
      <div className="flex flex-col gap-1.5">
        {template.tasks.map((t, i) => (
          <div key={i} className={"flex items-center gap-2 text-[12px] " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
            <span
              className={
                "inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 " +
                (isLight ? PRIORITY_CLASS_LIGHT[t.priority] : PRIORITY_CLASS[t.priority])
              }
            >
              {PRIORITY_LABEL[t.priority]}
            </span>
            <span className="truncate">{t.title}</span>
          </div>
        ))}
      </div>
      <button
        disabled={applied}
        onClick={onApply}
        className={
          "mt-3 w-full py-2 rounded-xl text-[12.5px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer " +
          (applied
            ? isLight
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70 cursor-default"
              : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 cursor-default shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 active:bg-emerald-700")
        }
      >
        {applied ? (
          <>
            <Icon.Check width={12} height={12} />
            <span>Sudah diterapkan ke papan</span>
          </>
        ) : (
          `Terapkan ${template.tasks.length} kartu ke papan`
        )}
      </button>
    </div>
  );
}

function TaskProposalCard({ task, onApply, applied, theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <div
      className={
        "mt-2.5 rounded-2xl p-3.5 w-full max-w-[320px] border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-emerald-500/40 hover:shadow-lg hover:-translate-y-0.5 " +
        (isLight ? "bg-white border-zinc-200/70 shadow-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" : "bg-zinc-900 border-zinc-700/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
      }
    >
      <span
        className={
          "inline-flex text-[9.5px] font-bold px-1.5 py-0.5 rounded " +
          (isLight ? PRIORITY_CLASS_LIGHT[task.priority] : PRIORITY_CLASS[task.priority])
        }
      >
        {PRIORITY_LABEL[task.priority]}
      </span>
      <div className={"mt-1.5 text-[13px] font-semibold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
        {task.title}
      </div>
      <button
        disabled={applied}
        onClick={onApply}
        className={
          "mt-3 w-full py-2 rounded-xl text-[12.5px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer " +
          (applied
            ? isLight
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70 cursor-default"
              : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 cursor-default shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 active:bg-emerald-700")
        }
      >
        {applied ? (
          <>
            <Icon.Check width={12} height={12} />
            <span>Sudah masuk ke papan</span>
          </>
        ) : (
          "Masukkan ke papan Kanban"
        )}
      </button>
    </div>
  );
}

const SUGGESTIONS = [
  "Buatkan template rencana peluncuran produk baru",
  "Tambahkan tugas mendesak: optimalkan alur checkout pembayaran",
  "Susunkan rencana strategi konten dan pemasaran 2 minggu",
];

export default function AIHelper({
  role,
  onAddTask,
  onApplyTemplate,
  board,
  sprint,
  projectName,
  theme = "dark",
}) {
  const isLight = theme === "light";
  const [open, setOpen] = useState(false);
  const [personaId, setPersonaId] = useState(
    () => localStorage.getItem("strata-ai-persona") || "koko"
  );
  const activePersona =
    AI_PERSONAS.find((p) => p.id === personaId) || AI_PERSONAS[0];

  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      personaId: activePersona.id,
      kind: "text",
      text: activePersona.greeting,
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef(null);
  const isViewer = role === "viewer";
  const hasUserMessages = messages.some((m) => m.role === "user");

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, thinking]);

  function handleSelectPersona(nextId) {
    const found = AI_PERSONAS.find((p) => p.id === nextId) || AI_PERSONAS[0];
    setPersonaId(found.id);
    try {
      localStorage.setItem("strata-ai-persona", found.id);
    } catch {}
    setMessages((prev) => {
      const anyUserMsg = prev.some((m) => m.role === "user");
      if (!anyUserMsg) {
        return [
          {
            role: "assistant",
            personaId: found.id,
            kind: "text",
            text: found.greeting,
          },
        ];
      }
      const lastMsg = prev[prev.length - 1];
      if (
        lastMsg &&
        lastMsg.role === "assistant" &&
        lastMsg.personaId === found.id &&
        lastMsg.text === found.greeting
      ) {
        return prev;
      }
      return [
        ...prev,
        {
          role: "assistant",
          personaId: found.id,
          kind: "text",
          text: found.greeting,
        },
      ];
    });
  }

  function handleResetChat() {
    setMessages([
      {
        role: "assistant",
        personaId: activePersona.id,
        kind: "text",
        text: activePersona.greeting,
      },
    ]);
  }

  async function send(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || thinking) return;
    const currentPersona = activePersona;
    setMessages((prev) => [...prev, { role: "user", kind: "text", text: trimmed }]);
    setInput("");
    setThinking(true);

    try {
      const llmReply = await generateAIHelperResponse({
        userText: trimmed,
        persona: currentPersona,
        projectName,
        board,
        sprint,
      });
      const sanitizedReply = {
        ...llmReply,
        text: sanitizeNoEmoji(llmReply.text),
        task: llmReply.task
          ? {
              ...llmReply.task,
              title: sanitizeNoEmoji(llmReply.task.title),
            }
          : undefined,
        template: llmReply.template
          ? {
              ...llmReply.template,
              name: sanitizeNoEmoji(llmReply.template.name),
              tasks: Array.isArray(llmReply.template.tasks)
                ? llmReply.template.tasks.map((t) => ({
                    ...t,
                    title: sanitizeNoEmoji(t.title),
                  }))
                : [],
            }
          : undefined,
      };
      setThinking(false);
      setMessages((prev) => [
        ...prev,
        { ...sanitizedReply, personaId: currentPersona.id },
      ]);
    } catch (err) {
      console.warn("Firebase AI call failed, falling back to local assistant:", err);
      const fallback = buildLocalAssistantReply(trimmed, currentPersona);
      setThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          ...fallback,
          personaId: currentPersona.id,
        },
      ]);
    }
  }

  function applyTemplateAt(index, template) {
    onApplyTemplate(template.tasks);
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, applied: true } : m)));
  }

  function applyTaskAt(index, task) {
    onAddTask(task.column, task.title, task.priority);
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, applied: true } : m)));
  }

  return (
    <>
      {/* Floating Trigger Button with Doppelrand Bezel & Ambient Aura */}
      <div className="fixed bottom-6 right-6 z-[72] flex items-center group">
        {/* Tooltip on Hover (When Closed) */}
        {!open && (
          <div
            className={
              "pointer-events-none absolute right-full mr-3.5 top-1/2 -translate-y-1/2 p-1 rounded-2xl opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-2xl border whitespace-nowrap " +
              (isLight
                ? "bg-white/90 border-slate-200/80 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]"
                : "bg-zinc-950/90 border-zinc-800/80 shadow-[0_20px_48px_-8px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)]")
            }
          >
            <div
              className={
                "flex items-center gap-2.5 px-3 py-2 rounded-xl border " +
                (isLight
                  ? "bg-slate-50/90 border-slate-200/60"
                  : "bg-zinc-900/90 border-zinc-800/60")
              }
            >
              <PersonaAvatar persona={activePersona} size="sm" isLight={isLight} />
              <div>
                <div className="text-[12px] font-extrabold text-emerald-400 leading-tight flex items-center gap-1.5">
                  <span>Asisten {activePersona.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    {activePersona.badge}
                  </span>
                </div>
                <div className={"text-[10.5px] font-medium mt-0.5 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                  {activePersona.tagline}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ambient Glowing Beacon Ring */}
        <div
          className={
            "absolute inset-0 rounded-full transition-all duration-500 strata-ai-beacon " +
            (open ? "opacity-0 scale-75 pointer-events-none" : "bg-emerald-500/30 blur-xl")
          }
        />

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? `Tutup ${activePersona.fullName}` : `Buka ${activePersona.fullName}`}
          className={
            "relative w-14 h-14 rounded-2xl text-white flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 hover:scale-105 hover:-translate-y-0.5 cursor-pointer border " +
            (open
              ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-700/70 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.1)]"
              : "bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 border-emerald-300/40 shadow-[0_14px_34px_-6px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]")
          }
        >
          {/* Floating Island Indicator Pill on Top of Button */}
          {!open && (
            <span className="absolute -top-2.5 -left-2.5 px-2.5 py-0.5 rounded-full bg-zinc-950/95 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold tracking-tight shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activePersona.name}</span>
            </span>
          )}

          {/* Dual Morphing Icon: Sparkle <-> X */}
          <div className="relative w-6 h-6 flex items-center justify-center pointer-events-none">
            <span
              className={
                "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
                (open ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100")
              }
            >
              <Icon.Sparkle width={22} height={22} />
            </span>
            <span
              className={
                "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
                (open ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50")
              }
            >
              <Icon.X width={20} height={20} />
            </span>
          </div>
        </button>
      </div>

      {/* Doppelrand (Double-Bezel) Floating Chat Window Popover */}
      <div
        className={
          "fixed bottom-24 right-6 z-[71] w-[min(420px,calc(100vw-2rem))] p-1.5 rounded-[28px] flex flex-col origin-bottom-right transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border backdrop-blur-2xl " +
          (isLight
            ? "bg-white/80 border-slate-200/80 text-zinc-900 shadow-[0_28px_72px_-16px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.95)]"
            : "bg-zinc-950/85 border-zinc-800/80 text-zinc-50 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.85),0_0_40px_-12px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]") +
          (open
            ? " opacity-100 translate-y-0 scale-100 visible pointer-events-auto"
            : " opacity-0 translate-y-6 scale-95 invisible pointer-events-none")
        }
        style={{ height: "min(620px, 78dvh)" }}
      >
        {/* Inner Chamber Bezel */}
        <div
          className={
            "relative flex-1 rounded-[22px] border flex flex-col overflow-hidden " +
            (isLight
              ? "bg-slate-50/90 border-slate-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,1)]"
              : "bg-zinc-900/90 border-zinc-800/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]")
          }
        >
          {/* Ambient Top Radial Mesh Aura */}
          <div
            className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden="true"
          />

          {/* Header */}
          <div
            className={
              "relative z-10 flex flex-col gap-3 px-4 pt-3.5 pb-3 border-b flex-shrink-0 " +
              (isLight
                ? "border-slate-200/70 bg-white/85 backdrop-blur-xl"
                : "border-zinc-800/70 bg-zinc-900/85 backdrop-blur-xl")
            }
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <PersonaAvatar persona={activePersona} size="lg" isLight={isLight} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        "text-[14px] font-extrabold tracking-tight truncate " +
                        (isLight ? "text-zinc-900" : "text-zinc-50")
                      }
                    >
                      {activePersona.fullName}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={
                        "text-[11px] font-medium truncate " +
                        (isLight ? "text-zinc-500" : "text-zinc-400")
                      }
                    >
                      {activePersona.tagline}
                    </span>
                    <span className={isLight ? "text-zinc-300" : "text-zinc-700"}>•</span>
                    <span
                      className={
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[9.5px] font-bold border flex-shrink-0 " +
                        (isLight
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25")
                      }
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Gemini AI Aktif</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Bersihkan obrolan"
                    className={
                      "w-7 h-7 rounded-xl border flex items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 cursor-pointer " +
                      (isLight
                        ? "bg-slate-100/80 border-slate-200/80 text-zinc-500 hover:text-zinc-800 hover:bg-slate-200/70"
                        : "bg-zinc-800/70 border-zinc-700/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")
                    }
                  >
                    <Icon.Refresh width={12} height={12} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Tutup AI Helper"
                  className={
                    "w-7 h-7 rounded-xl border flex items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 cursor-pointer " +
                    (isLight
                      ? "bg-slate-100/80 border-slate-200/80 text-zinc-500 hover:bg-slate-200/70 hover:text-zinc-800"
                      : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100")
                  }
                >
                  <Icon.X width={13} height={13} />
                </button>
              </div>
            </div>

            {/* Floating Island Segmented Persona Switcher */}
            <div
              className={
                "grid grid-cols-4 gap-1 p-1 rounded-2xl border " +
                (isLight
                  ? "bg-slate-100/90 border-slate-200/80 shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]"
                  : "bg-zinc-950/80 border-zinc-800/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]")
              }
            >
              {AI_PERSONAS.map((p) => {
                const isSelected = p.id === activePersona.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPersona(p.id)}
                    title={`${p.fullName} — ${p.tagline}`}
                    className={
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11.5px] font-bold transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-95 " +
                      (isSelected
                        ? "bg-gradient-to-b from-emerald-400 to-emerald-500 text-zinc-950 shadow-[0_2px_10px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]"
                        : isLight
                        ? "text-zinc-600 hover:text-zinc-900 hover:bg-white/70"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60")
                    }
                  >
                    <PersonaIcon persona={p} className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Message Thread */}
          <div ref={listRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3.5">
            {messages.map((m, i) => {
              const msgPersona =
                AI_PERSONAS.find((p) => p.id === m.personaId) || activePersona;
              return (
                <div
                  key={i}
                  className={
                    "flex strata-msg-in " +
                    (m.role === "user" ? "justify-end" : "justify-start")
                  }
                >
                  <div
                    className={
                      "flex flex-col " +
                      (m.role === "user" ? "items-end" : "items-start")
                    }
                  >
                    {m.role === "assistant" ? (
                      <div className="flex items-start gap-2.5">
                        <PersonaAvatar
                          persona={msgPersona}
                          size="md"
                          isLight={isLight}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 px-0.5">
                            <span
                              className={
                                "text-[11px] font-extrabold tracking-tight " +
                                (isLight ? "text-zinc-800" : "text-zinc-200")
                              }
                            >
                              {msgPersona.name}
                            </span>
                            <span
                              className={
                                "text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border leading-none " +
                                (isLight ? msgPersona.pillLight : msgPersona.pillDark)
                              }
                            >
                              {msgPersona.badge}
                            </span>
                          </div>
                          <div
                            className={
                              "rounded-2xl rounded-tl-md px-4 py-3 text-[13px] leading-[1.6] max-w-[295px] border whitespace-pre-line " +
                              (isLight
                                ? "bg-white border-slate-200/80 text-zinc-700 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)]"
                                : "bg-zinc-800/75 border-zinc-700/60 text-zinc-200 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)]")
                            }
                          >
                            {renderRichMessage(m.text, isLight)}
                          </div>
                          {m.kind === "template" && (
                            <TemplateCard
                              template={m.template}
                              applied={!!m.applied}
                              onApply={() => applyTemplateAt(i, m.template)}
                              theme={theme}
                            />
                          )}
                          {m.kind === "task" && (
                            <TaskProposalCard
                              task={m.task}
                              applied={!!m.applied}
                              onApply={() => applyTaskAt(i, m.task)}
                              theme={theme}
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 font-semibold rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] leading-relaxed max-w-[270px] border border-emerald-300/40 shadow-[0_8px_24px_-6px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]">
                        {m.text}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {thinking && (
              <div className="flex items-start gap-2.5 strata-msg-in">
                <PersonaAvatar persona={activePersona} size="md" isLight={isLight} />
                <TypingBubble persona={activePersona} theme={theme} />
              </div>
            )}
          </div>

          {/* Suggestion Chips (when beginning conversation before user messages) */}
          {!hasUserMessages && (
            <div className="relative z-10 px-3.5 pb-2 flex flex-col gap-1.5 flex-shrink-0">
              <div
                className={
                  "text-[10px] font-bold uppercase tracking-wider px-1 " +
                  (isLight ? "text-zinc-400" : "text-zinc-500")
                }
              >
                Ide Perintah Cepat
              </div>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className={
                    "text-left text-[12px] font-medium rounded-xl px-3.5 py-2 border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between group active:scale-[0.98] cursor-pointer " +
                    (isLight
                      ? "border-slate-200/80 bg-white/90 text-zinc-700 hover:bg-emerald-50/80 hover:border-emerald-300 hover:text-emerald-800 hover:translate-x-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                      : "border-zinc-800/70 bg-zinc-950/50 text-zinc-300 hover:bg-emerald-950/30 hover:border-emerald-700/50 hover:text-emerald-300 hover:translate-x-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]")
                  }
                >
                  <span className="truncate pr-2">{s}</span>
                  <span className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 text-emerald-400 flex-shrink-0">
                    <Icon.ArrowRight width={11} height={11} />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Floating Island Composer Dock */}
          <div className="relative z-10 px-3 pb-3 pt-1.5 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className={
                "flex items-center gap-2 p-1.5 pl-4 rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
                (isLight
                  ? "bg-white border-slate-200/90 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)]"
                  : "bg-zinc-950/90 border-zinc-800/80 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/15 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]")
              }
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isViewer}
                placeholder={
                  isViewer
                    ? "Viewer tidak dapat menambah tugas"
                    : `Tulis instruksi atau minta ${activePersona.name} membuat kartu...`
                }
                className={
                  "flex-1 bg-transparent text-[13px] outline-none disabled:opacity-50 " +
                  (isLight
                    ? "text-zinc-900 placeholder-zinc-400"
                    : "text-zinc-100 placeholder-zinc-500")
                }
              />
              <button
                type="submit"
                disabled={isViewer || !input.trim() || thinking}
                aria-label="Kirim"
                className="group w-9 h-9 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-zinc-950 border border-emerald-300/40 flex items-center justify-center hover:from-emerald-300 hover:to-emerald-500 active:scale-90 hover:-translate-y-0.5 shadow-[0_4px_14px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-35 disabled:pointer-events-none flex-shrink-0 cursor-pointer"
              >
                <span className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <Icon.Send />
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
