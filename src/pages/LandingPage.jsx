import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon, Logo } from "../components/icons";
import Reveal from "../components/Reveal";

/* ============================================================
   MAGNETIC TOUCH BUTTON (Mengikuti Kursor + Elastic Spring)
   ============================================================ */
function MagneticLink({
  to = "/login",
  onClick,
  children,
  className = "",
  strength = 0.42,
  innerStrength = 0.2,
  showArrow = true,
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0, mx: 50, my: 50, active: false });

  function handlePointerMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({
      x: dx * strength,
      y: dy * strength,
      mx,
      my,
      active: true,
    });
  }

  function handlePointerLeave() {
    setPos((prev) => ({ ...prev, x: 0, y: 0, active: false }));
  }

  return (
    <Link
      ref={ref}
      to={to}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform: `translate3d(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px, 0) scale(${pos.active ? 1.04 : 1})`,
        transition: pos.active
          ? "transform 95ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 250ms ease, background-color 250ms ease"
          : "transform 620ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease, background-color 300ms ease",
        willChange: "transform",
      }}
      className={"relative overflow-hidden select-none " + className}
    >
      {/* Radial magnetic touch spotlight following cursor */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: pos.active ? 1 : 0,
          background: `radial-gradient(95px circle at ${pos.mx.toFixed(1)}% ${pos.my.toFixed(1)}%, rgba(255, 255, 255, 0.55), transparent 72%)`,
        }}
      />
      {/* Inner layer with secondary magnetic parallax */}
      <span
        className="relative z-10 inline-flex items-center gap-2.5"
        style={{
          transform: `translate3d(${(pos.x * innerStrength).toFixed(2)}px, ${(pos.y * innerStrength).toFixed(2)}px, 0)`,
          transition: pos.active
            ? "transform 95ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "transform 620ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <span>{children}</span>
        {showArrow && (
          <span
            className="w-7 h-7 rounded-full bg-zinc-950/15 flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-zinc-950/20"
            style={{
              transform: pos.active
                ? `translate3d(${(pos.x * 0.14).toFixed(2)}px, ${(pos.y * 0.14).toFixed(2)}px, 0)`
                : undefined,
            }}
          >
            <Icon.ArrowRight />
          </span>
        )}
      </span>
    </Link>
  );
}

/* ============================================================
   ANIMATED NUMBER COUNTER (Count-Up saat terlihat di layar)
   ============================================================ */
function AnimatedCounter({ target = 100, duration = 1200, suffix = "", prefix = "" }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const startTime = performance.now();
          function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) {
              requestAnimationFrame(step);
            }
          }
          requestAnimationFrame(step);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

/* ============================================================
   SPOTLIGHT BENTO CARD (Cursor-Following Emerald Border & Glow)
   ============================================================ */
function SpotlightBentoCard({ children, className = "", innerClassName = "", delay = 0 }) {
  const cardRef = useRef(null);
  const [spot, setSpot] = useState({ x: 0, y: 0, active: false });

  function handlePointerMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSpot({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  }

  function handlePointerLeave() {
    setSpot((prev) => ({ ...prev, active: false }));
  }

  return (
    <Reveal delay={delay} className={className}>
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative rounded-3xl p-1.5 bg-zinc-900/45 border border-zinc-800/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden group h-full"
      >
        {/* Radial border highlight following cursor */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-3xl transition-opacity duration-300"
          style={{
            opacity: spot.active ? 1 : 0,
            background: `radial-gradient(360px circle at ${spot.x}px ${spot.y}px, rgba(52, 211, 153, 0.38), transparent 65%)`,
          }}
        />
        <div
          className={
            "relative z-10 bg-zinc-900/95 border border-zinc-700/50 rounded-2xl p-6 h-full flex flex-col justify-between min-h-[240px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden " +
            innerClassName
          }
        >
          {/* Ambient interior glow following cursor */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: spot.active ? 1 : 0,
              background: `radial-gradient(280px circle at ${spot.x}px ${spot.y}px, rgba(16, 185, 129, 0.09), transparent 70%)`,
            }}
          />
          <div className="relative z-10 flex flex-col justify-between h-full gap-5">
            {children}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

const PALETTE_PHRASES = [
  "Buat tugas baru...",
  "Pindah ke ruang kerja Marketing...",
  'Cari "Build API"...',
  "Minta AI pecah sub-tugas sprint...",
  "Buka pengaturan akun...",
];

function useTypewriter(phrases, typeSpeed = 46, deleteSpeed = 28, holdMs = 1400) {
  const [text, setText] = useState("");

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeoutId;

    function tick() {
      const current = phrases[phraseIndex];
      if (!deleting) {
        charIndex += 1;
        setText(current.slice(0, charIndex));
        if (charIndex === current.length) {
          deleting = true;
          timeoutId = setTimeout(tick, holdMs);
          return;
        }
      } else {
        charIndex -= 1;
        setText(current.slice(0, charIndex));
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      }
      timeoutId = setTimeout(tick, deleting ? deleteSpeed : typeSpeed);
    }

    timeoutId = setTimeout(tick, typeSpeed);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return text;
}

function PaletteTypewriterPreview() {
  const typed = useTypewriter(PALETTE_PHRASES);
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3.5 border-b border-zinc-800/60">
      <Icon.Search className="text-zinc-500" />
      <span className="text-[14.5px] text-zinc-50 whitespace-nowrap overflow-hidden">{typed}</span>
      <span className="strata-cursor inline-block w-[2px] h-[15px] bg-emerald-400" />
    </div>
  );
}

const NAV_ITEMS = [
  { id: "produk", label: "Produk" },
  { id: "solusi", label: "Kanban" },
  { id: "ai-suite", label: "AI & Studio" },
  { id: "fitur", label: "Fitur" },
  { id: "harga", label: "Akses" },
];

/* ============================================================
   NOMOR 1: HERO INTERACTIVE 3D TILT BOARD
   ============================================================ */
const INITIAL_HERO_CARDS = [
  {
    id: "hc-1",
    col: 0,
    tag: "Tinggi",
    tagClass: "bg-amber-950/80 text-amber-400 border border-amber-900/40",
    title: "Rancang alur onboarding",
    date: "14 Sep",
    av: "RN",
    color: "#8fb8ff",
    prioritized: true,
  },
  {
    id: "hc-2",
    col: 0,
    tag: "Rendah",
    tagClass: "bg-zinc-800 text-zinc-400 border border-zinc-700/50",
    title: "Riset kompetitor lokal",
    date: "18 Sep",
    av: "AF",
    color: "#f6c179",
    prioritized: false,
  },
  {
    id: "hc-3",
    col: 1,
    tag: "Mendesak",
    tagClass: "bg-rose-950/80 text-rose-400 border border-rose-900/40",
    title: "Bangun API pembayaran",
    date: "12 Sep",
    av: "DP",
    color: "#ff9498",
    prioritized: true,
  },
  {
    id: "hc-4",
    col: 1,
    tag: "Sedang",
    tagClass: "bg-zinc-800 text-zinc-300 border border-zinc-700/50",
    title: "Migrasi skema database",
    date: "16 Sep",
    av: "RN",
    color: "#8fb8ff",
    prioritized: false,
  },
  {
    id: "hc-5",
    col: 2,
    tag: "Sedang",
    tagClass: "bg-zinc-800 text-zinc-300 border border-zinc-700/50",
    title: "Uji alur checkout",
    date: "20 Sep",
    av: "AF",
    color: "#f6c179",
    prioritized: true,
  },
  {
    id: "hc-6",
    col: 3,
    tag: "Selesai",
    tagClass: "bg-emerald-950/80 text-emerald-300 border border-emerald-800/40",
    title: "Halaman login & Google Auth",
    date: "10 Sep",
    av: "DP",
    color: "#ff9498",
    prioritized: false,
  },
];

const HERO_COLUMNS = [
  { id: 0, title: "Perlu dikerjakan", dot: "#94A3B8" },
  { id: 1, title: "Sedang berjalan", dot: "#60A5FA" },
  { id: 2, title: "Ditinjau", dot: "#F59E0B" },
  { id: 3, title: "Selesai", dot: "#34D399" },
];

function HeroInteractiveBoard() {
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 30, active: false });
  const [cards, setCards] = useState(INITIAL_HERO_CARDS);
  const [hintState, setHintState] = useState({
    type: "sparkles",
    text: "Klik kartu untuk memindahkan kolom, atau klik ikon bintang untuk prioritas",
  });

  function handlePointerMove(e) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * 9;
    const rx = (0.5 - py) * 7;
    setTilt({
      rx,
      ry,
      gx: px * 100,
      gy: py * 100,
      active: true,
    });
  }

  function handlePointerLeave() {
    setTilt((prev) => ({ ...prev, rx: 0, ry: 0, active: false }));
  }

  function cycleCardColumn(cardId) {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const nextCol = (c.col + 1) % HERO_COLUMNS.length;
        setHintState({
          type: "sparkles",
          text: `"${c.title}" dipindahkan ke ${HERO_COLUMNS[nextCol].title}`,
        });
        return { ...c, col: nextCol };
      })
    );
  }

  function toggleCardPriority(e, cardId) {
    e.stopPropagation();
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const nextPrio = !c.prioritized;
        setHintState({
          type: "star",
          text: nextPrio
            ? `"${c.title}" ditandai sebagai Prioritas Kapten`
            : `Prioritas Kapten dilepas dari "${c.title}"`,
        });
        return { ...c, prioritized: nextPrio };
      })
    );
  }

  function resetBoard() {
    setCards(INITIAL_HERO_CARDS);
    setHintState({
      type: "reset",
      text: "Papan pratinjau dikembalikan ke susunan awal",
    });
  }

  const doneCount = cards.filter((c) => c.col === 3).length;
  const pct = Math.round((doneCount / cards.length) * 100);

  return (
    <div
      style={{ perspective: "1200px" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      ref={containerRef}
      className="relative"
    >
      <div
        style={{
          transform: tilt.active
            ? `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) scale3d(1.01, 1.01, 1)`
            : "rotateX(0deg) rotateY(0deg) rotateZ(0.4deg) scale3d(1, 1, 1)",
          transition: tilt.active
            ? "transform 120ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "transform 650ms cubic-bezier(0.16, 1, 0.3, 1)",
          transformStyle: "preserve-3d",
        }}
        className="relative bg-zinc-900/45 border border-zinc-800/70 rounded-[40px] p-2.5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl overflow-hidden"
      >
        {/* Specular cursor glare overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-20"
          style={{
            opacity: tilt.active ? 1 : 0,
            background: `radial-gradient(420px circle at ${tilt.gx.toFixed(1)}% ${tilt.gy.toFixed(1)}%, rgba(52, 211, 153, 0.14), transparent 65%)`,
          }}
        />

        <div className="relative z-10 bg-gradient-to-br from-[#17181d] to-[#101115] border border-zinc-700/60 rounded-[30px] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-zinc-800/70 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70 border border-rose-400/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 border border-amber-400/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 border border-emerald-400/40" />
              </div>
              <span className="text-[13px] font-bold text-zinc-200 tracking-tight">
                Peluncuran Produk — Q4
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Interaktif
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800 rounded-full px-2.5 py-1">
                <span>Selesai:</span>
                <span className="text-emerald-400 font-bold">{pct}%</span>
              </div>
              <button
                type="button"
                onClick={resetBoard}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-100 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 rounded-full px-2.5 py-1 transition cursor-pointer"
                title="Kembalikan urutan kartu demo"
              >
                <Icon.Refresh width={11} height={11} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Mini Sprint Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-zinc-800/90 overflow-hidden mb-3.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: `${Math.max(8, pct)}%` }}
            />
          </div>

          {/* 4 Interactive Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {HERO_COLUMNS.map((col) => {
              const colCards = cards.filter((c) => c.col === col.id);
              return (
                <div
                  key={col.id}
                  className="flex flex-col gap-2 bg-zinc-950/45 border border-zinc-800/60 rounded-2xl p-2 min-h-[195px]"
                >
                  <div className="flex items-center justify-between text-[11.5px] font-bold text-zinc-300 px-1 pt-0.5">
                    <span className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: col.dot }}
                      />
                      <span className="truncate">{col.title}</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/90 border border-zinc-700/50 rounded-full w-4.5 h-4.5 flex items-center justify-center flex-shrink-0">
                      {colCards.length}
                    </span>
                  </div>

                  {colCards.length === 0 ? (
                    <div className="flex-1 rounded-xl border border-dashed border-zinc-800/80 flex items-center justify-center text-[10.5px] text-zinc-600 p-2 text-center">
                      Kosong
                    </div>
                  ) : (
                    colCards.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => cycleCardColumn(card.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            cycleCardColumn(card.id);
                          }
                        }}
                        title="Klik untuk memindahkan kartu ini ke kolom berikutnya"
                        className={
                          "group/card bg-zinc-800/85 border rounded-xl p-2.5 flex flex-col gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-95 cursor-pointer select-none " +
                          (card.prioritized
                            ? "border-amber-500/40 shadow-lg shadow-amber-500/5"
                            : "border-zinc-700/60 hover:border-emerald-500/40")
                        }
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={
                              "inline-flex w-max text-[9.5px] font-bold px-1.5 py-0.5 rounded-md " +
                              card.tagClass
                            }
                          >
                            {card.tag}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => toggleCardPriority(e, card.id)}
                            title={
                              card.prioritized
                                ? "Prioritas Kapten aktif (klik untuk lepas)"
                                : "Tandai sebagai Prioritas Kapten"
                            }
                            className={
                              "w-5 h-5 rounded-md flex items-center justify-center transition cursor-pointer " +
                              (card.prioritized
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                : "text-zinc-500 hover:text-amber-300 hover:bg-zinc-700/60")
                            }
                          >
                            {card.prioritized ? (
                              <Icon.StarFilled width={10} height={10} />
                            ) : (
                              <Icon.Star width={10} height={10} />
                            )}
                          </button>
                        </div>
                        <span
                          className={
                            "text-[11.5px] font-semibold leading-snug " +
                            (col.id === 3 ? "line-through text-zinc-400" : "text-zinc-100")
                          }
                        >
                          {card.title}
                        </span>
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 group-hover/card:text-emerald-400 transition-colors">
                            {col.id === 3 ? (
                              <>
                                <Icon.Check width={10} height={10} />
                                <span>Tuntas</span>
                              </>
                            ) : (
                              <>
                                <span>Geser</span>
                                <Icon.ArrowRight width={10} height={10} />
                              </>
                            )}
                          </span>
                          <span
                            className="w-4.5 h-4.5 rounded-md text-[8.5px] font-bold flex items-center justify-center text-zinc-950 shadow-2xs"
                            style={{ background: card.color }}
                          >
                            {card.av}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {/* Interactive Micro-Status Footer */}
          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between gap-2 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center flex-shrink-0">
                {hintState.type === "star" ? (
                  <Icon.StarFilled width={10} height={10} />
                ) : hintState.type === "reset" ? (
                  <Icon.Refresh width={10} height={10} />
                ) : (
                  <Icon.Sparkles width={10} height={10} />
                )}
              </span>
              <span className="truncate">{hintState.text}</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">
              3D Tilt Aktif
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   NOMOR 3: STRATA AI, WHITEBOARD & ANALYTICS SUITE SHOWCASE
   ============================================================ */
const AI_DEMO_PROMPTS = [
  {
    id: "oauth",
    code: "01",
    Ic: Icon.Sparkles,
    label: "Pecah tugas: Sistem Login & Google Auth",
    sub: "Auto-Breakdown · 4 Kartu Tugas",
    goal: "Integrasi autentikasi pengguna & sinkronisasi foto profil Google",
    reply:
      "Berikut 4 langkah terstruktur yang siap dimasukkan ke papan Kanban tim kamu:",
    tasks: [
      { title: "Konfigurasi Firebase Auth & Google Provider", col: "Selesai", prio: "Tinggi", pt: 3 },
      { title: "Sinkronisasi otomatis photoURL ke koleksi /accounts", col: "Sedang berjalan", prio: "Mendesak", pt: 5 },
      { title: "Tampilkan avatar Google di Topbar & Kartu Tugas", col: "Ditinjau", prio: "Tinggi", pt: 3 },
      { title: "Uji proteksi rute & sesi pengguna", col: "Perlu dikerjakan", prio: "Sedang", pt: 2 },
    ],
  },
  {
    id: "bottleneck",
    code: "02",
    Ic: Icon.Search,
    label: "Analisis Bottleneck & Kapasitas WIP",
    sub: "Audit Beban Kerja · 3 Rekomendasi",
    goal: "Evaluasi keseimbangan beban kerja kolom saat ini",
    reply:
      "Analisis AI mendeteksi penumpukan di kolom Sedang Berjalan (4/3 batas WIP). Rekomendasi tindakan:",
    tasks: [
      { title: "Pindahkan 1 kartu yang sudah selesai coding ke kolom Ditinjau", col: "Ditinjau", prio: "Mendesak", pt: 2 },
      { title: "Kunci prioritas Kapten agar anggota fokus menyelesaikan kartu utama", col: "Sedang berjalan", prio: "Tinggi", pt: 3 },
      { title: "Bagi beban review API ke anggota kedua", col: "Perlu dikerjakan", prio: "Sedang", pt: 2 },
    ],
  },
  {
    id: "sprint",
    code: "03",
    Ic: Icon.Layers,
    label: "Susun Rencana Sprint & Peluncuran Produk",
    sub: "Perencanaan Sprint · Estimasi Poin",
    goal: "Checklist persiapan peluncuran produk & pengamanan database",
    reply:
      "Rencana sprint disusun otomatis lengkap dengan prioritas dan estimasi Story Points:",
    tasks: [
      { title: "Audit aturan keamanan Cloud Firestore (firestore.rules)", col: "Selesai", prio: "Mendesak", pt: 5 },
      { title: "Optimasi interaksi Magnetic Touch & 3D Hero", col: "Sedang berjalan", prio: "Tinggi", pt: 3 },
      { title: "Siapkan kanvas Whiteboard & dokumentasi arsitektur", col: "Perlu dikerjakan", prio: "Sedang", pt: 2 },
    ],
  },
];

function AISuiteShowcase({ targetRoute }) {
  const [activeTab, setActiveTab] = useState("ai");
  const [selectedPromptIdx, setSelectedPromptIdx] = useState(0);
  const [stickyColor, setStickyColor] = useState("#34D399");
  const [selectedNode, setSelectedNode] = useState("firestore");

  const currentPrompt = AI_DEMO_PROMPTS[selectedPromptIdx] || AI_DEMO_PROMPTS[0];

  return (
    <section id="ai-suite" className="border-t border-zinc-900/80 py-[132px] px-6 sm:px-8 relative">
      <div className="max-w-[1360px] mx-auto">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-[58ch]">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-emerald-400">
              <Icon.Sparkles width={13} height={13} />
              Lebih dari Sekadar Papan Kanban
            </span>
            <h2 className="font-display mt-3 text-[1.8rem] sm:text-[2.25rem] font-extrabold tracking-tight text-balance leading-[1.12]">
              Dilengkapi AI Helper Gemini, Papan Tulis Visual, & Analitik Tim.
            </h2>
            <p className="mt-3.5 text-[15.5px] leading-relaxed text-zinc-400">
              Semua fitur yang sudah dibangun di dalam ruang kerja STRATA — mulai dari asisten AI di sisi server, kanvas corat-coret ide, hingga radar beban kerja — terintegrasi dalam satu tempat.
            </p>
          </div>

          {/* Interactive Tab Switcher (Floating Island Architecture, Zero Emoji) */}
          <div className="inline-flex p-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] self-start">
            {[
              { id: "ai", label: "AI Helper (Gemini)", Ic: Icon.Sparkles },
              { id: "whiteboard", label: "Whiteboard Canvas", Ic: Icon.Frame },
              { id: "analytics", label: "Analitik & WIP", Ic: Icon.Layers },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-bold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer " +
                    (active
                      ? "bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20"
                      : "text-zinc-400 hover:text-zinc-100")
                  }
                >
                  <tab.Ic width={14} height={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <SpotlightBentoCard innerClassName="p-6 sm:p-8">
          {activeTab === "ai" && (
            <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Terhubung ke Gemini 2.5 Flash via Cloud Functions</span>
                </div>
                <h3 className="font-display text-2xl font-extrabold tracking-tight text-zinc-50">
                  Pecah target besar menjadi kartu tugas siap kerja dalam sekali klik.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Tidak perlu memasukkan API Key sendiri. Cukup pilih atau ketik tujuan proyekmu, dan asisten AI STRATA akan menyusun daftar tugas, menentukan prioritas, serta menghitung estimasi Story Points.
                </p>

                <div className="space-y-2.5 pt-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                    Coba Klik Skenario Prompt AI:
                  </div>
                  {AI_DEMO_PROMPTS.map((p, idx) => {
                    const active = idx === selectedPromptIdx;
                    const PromptIcon = p.Ic;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPromptIdx(idx)}
                        className={
                          "group/prompt w-full text-left p-3 rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between gap-3 cursor-pointer " +
                          (active
                            ? "bg-gradient-to-r from-emerald-950/75 via-emerald-950/35 to-zinc-900/90 border-emerald-500/50 text-emerald-100 shadow-[0_12px_28px_-10px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]"
                            : "bg-zinc-950/70 border-zinc-800/85 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 hover:bg-zinc-900/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]")
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={
                              "w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
                              (active
                                ? "bg-emerald-400 text-zinc-950 border-emerald-300 shadow-sm shadow-emerald-500/30"
                                : "bg-zinc-900/90 border-zinc-800 text-zinc-400 group-hover/prompt:text-emerald-400 group-hover/prompt:border-zinc-700")
                            }
                          >
                            <PromptIcon width={15} height={15} />
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold tracking-tight truncate">
                              {p.label}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] font-mono text-zinc-500">
                              <span className={active ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                                #{p.code}
                              </span>
                              <span>·</span>
                              <span className="truncate">{p.sub}</span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={
                            "w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
                            (active
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 translate-x-0.5"
                              : "bg-zinc-900/80 border-zinc-800/80 text-zinc-500 group-hover/prompt:text-zinc-200 group-hover/prompt:translate-x-0.5")
                          }
                        >
                          <Icon.ArrowRight width={12} height={12} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simulated AI Output Card */}
              <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800/90 p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <Icon.Sparkles width={15} height={15} />
                    </span>
                    <div>
                      <div className="text-[13px] font-bold text-zinc-100">STRATA AI Assistant</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{currentPrompt.goal}</div>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-mono px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400">
                    Siap Diterapkan
                  </span>
                </div>

                <p className="text-[13px] text-zinc-300 leading-relaxed">{currentPrompt.reply}</p>

                <div className="space-y-2">
                  {currentPrompt.tasks.map((t, i) => (
                    <div
                      key={t.title}
                      style={{ animationDelay: `${i * 60}ms` }}
                      className="strata-msg-in rounded-xl p-3 bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-zinc-100 truncate">
                          {t.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10.5px] text-zinc-400">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                            {t.col}
                          </span>
                          <span>·</span>
                          <span className="text-emerald-400 font-semibold">{t.prio}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 flex-shrink-0">
                        {t.pt} pt
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    Di dalam aplikasi, klik &ldquo;Terapkan ke Papan&rdquo; untuk langsung membuat kartu.
                  </span>
                  <Link
                    to={targetRoute}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 whitespace-nowrap"
                  >
                    <span>Coba di Aplikasi</span>
                    <Icon.ArrowRight width={12} height={12} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === "whiteboard" && (
            <div className="grid grid-cols-1 lg:grid-cols-[0.88fr_1.12fr] gap-8 items-center">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-bold">
                  <Icon.Frame width={13} height={13} />
                  <span>Kanvas Bebas & Diagram Alur</span>
                </span>
                <h3 className="font-display text-2xl font-extrabold tracking-tight text-zinc-50">
                  Rancang alur sistem di Papan Tulis sebelum menjadikannya tugas.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Gunakan mode Papan Tulis (Whiteboard) untuk menggambar sketsa bebas, menempelkan catatan tempel berwarna, dan memetakan arsitektur fitur bersama tim.
                </p>
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                    Ubah Warna Catatan Tempel di Kanvas:
                  </span>
                  <div className="flex items-center gap-2.5">
                    {[
                      { hex: "#34D399", label: "Emerald" },
                      { hex: "#60A5FA", label: "Blue" },
                      { hex: "#FBBF24", label: "Amber" },
                      { hex: "#F472B6", label: "Pink" },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setStickyColor(c.hex)}
                        className={
                          "w-8 h-8 rounded-xl transition cursor-pointer flex items-center justify-center " +
                          (stickyColor === c.hex ? "ring-2 ring-white scale-110" : "opacity-75 hover:opacity-100")
                        }
                        style={{ background: c.hex }}
                        title={c.label}
                      >
                        {stickyColor === c.hex && <Icon.Check className="text-zinc-950" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Mini Whiteboard Canvas */}
              <div
                className="rounded-2xl bg-zinc-950 border border-zinc-800 p-6 min-h-[270px] relative overflow-hidden flex flex-col justify-between"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              >
                <div className="flex items-center justify-between z-10">
                  <span className="inline-flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-lg">
                    <Icon.Frame width={12} height={12} className="text-emerald-400" />
                    <span>Whiteboard · Klik kotak untuk memilih node</span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">Zoom 100%</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6 z-10 items-center">
                  {[
                    { id: "ui", title: "01. Antarmuka React", sub: "Landing & Papan Kanban" },
                    { id: "firestore", title: "02. Cloud Firestore", sub: "Sinkronisasi Multi-Proyek" },
                    { id: "gemini", title: "03. Cloud Functions", sub: "Proxy Aman Gemini AI" },
                  ].map((node) => {
                    const isSel = selectedNode === node.id;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedNode(node.id)}
                        className={
                          "p-3.5 rounded-2xl border text-left transition-all cursor-pointer " +
                          (isSel
                            ? "bg-zinc-900 border-emerald-400 ring-2 ring-emerald-400/25 -translate-y-1"
                            : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700")
                        }
                      >
                        <div className="text-xs font-bold text-zinc-100">{node.title}</div>
                        <div className="text-[11px] text-zinc-400 mt-1">{node.sub}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 z-10">
                  <div
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-zinc-950 text-xs font-bold shadow-lg transition-colors duration-300 -rotate-1"
                    style={{ background: stickyColor }}
                  >
                    <Icon.StickyNote width={14} height={14} />
                    <span>Catatan: Pastikan aturan akses Kapten & Anggota diuji sebelum rilis.</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Node aktif: {selectedNode.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 lg:grid-cols-[0.88fr_1.12fr] gap-8 items-center">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold">
                  <Icon.Layers width={13} height={13} />
                  <span>Analitik Beban Kerja & WIP Radar</span>
                </span>
                <h3 className="font-display text-2xl font-extrabold tracking-tight text-zinc-50">
                  Pantau distribusi Story Points & tenggat waktu tanpa menebak-nebak.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Lihat siapa anggota tim yang kelebihan beban tugas, kolom mana yang melampaui batas Work-In-Progress (WIP), dan kartu mana yang mendekati tenggat waktu.
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800 p-5 space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-300 pb-2 border-b border-zinc-800">
                  <span>Distribusi Beban Kerja Tim (Story Points)</span>
                  <span className="font-mono text-emerald-400">Sprint Aktif</span>
                </div>
                {[
                  { name: "Nauval Purnama (Kapten)", role: "Kapten", pct: 82, pts: "14 pt", color: "#34D399", av: "NP" },
                  { name: "Ricky Nugraha", role: "Anggota", pct: 68, pts: "11 pt", color: "#60A5FA", av: "RN" },
                  { name: "Aisyah Fitri", role: "Anggota", pct: 90, pts: "16 pt", color: "#FBBF24", av: "AF" },
                ].map((m) => (
                  <div key={m.name} className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full text-[10px] font-extrabold text-zinc-950 flex items-center justify-center"
                          style={{ background: m.color }}
                        >
                          {m.av}
                        </span>
                        <span className="font-bold text-zinc-100">{m.name}</span>
                      </div>
                      <span className="font-mono font-bold text-zinc-300">
                        {m.pts} · <span className="text-emerald-400">{m.pct}% tuntas</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${m.pct}%`, background: m.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SpotlightBentoCard>
      </div>
    </section>
  );
}

/* ============================================================
   MAIN LANDING PAGE
   ============================================================ */
export default function LandingPage({ user = null, onVisitIndex }) {
  const [scrolled, setScrolled] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const targetRoute = user ? "/dashboard" : "/login";

  useEffect(() => {
    try {
      sessionStorage.setItem("strata-visited-index", "1");
    } catch {}
    if (onVisitIndex) onVisitIndex();
  }, [onVisitIndex]);

  // Lock body scroll saat mobile menu dibuka
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Nomor 5: Scroll Progress Bar & Scroll-Spy Active Section Pill (Dioptimasi dengan requestAnimationFrame)
  useEffect(() => {
    let ticking = false;
    let lastPct = -1;
    let lastSection = "";

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY || document.documentElement.scrollTop || 0;
          setScrolled(y > 8);

          const docHeight =
            document.documentElement.scrollHeight - document.documentElement.clientHeight;
          const pct = docHeight > 0 ? Math.min(100, Math.max(0, (y / docHeight) * 100)) : 0;
          if (Math.abs(pct - lastPct) >= 0.5) {
            lastPct = pct;
            setScrollPct(pct);
          }

          const offsets = NAV_ITEMS.map((item) => {
            const el = document.getElementById(item.id);
            if (!el) return { id: item.id, top: Infinity };
            return { id: item.id, top: el.getBoundingClientRect().top };
          });
          const current = offsets
            .filter((o) => o.top <= 240)
            .sort((a, b) => b.top - a.top)[0];
          const nextSec = current ? current.id : "";
          if (nextSec !== lastSection) {
            lastSection = nextSec;
            setActiveSection(nextSec);
          }
          ticking = false;
        });
        ticking = true;
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-zinc-950 text-zinc-50 overflow-x-hidden relative">
      {/* Top Scroll Progress Bar */}
      <div className="fixed top-0 inset-x-0 h-[2.5px] z-[60] pointer-events-none bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] transition-[width] duration-100 ease-out"
          style={{ width: `${scrollPct}%` }}
        />
      </div>

      <div className="strata-grain" aria-hidden="true" />
      <div className="strata-ambient-glow" aria-hidden="true" />

      {/* ================= NAV ================= */}
      <div className="fixed top-5 inset-x-0 z-50 flex justify-center px-5 pointer-events-none">
        <header
          className={
            "pointer-events-auto w-full max-w-[1180px] rounded-full border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-xl " +
            (scrolled
              ? "border-zinc-700/70 bg-zinc-900/85 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "border-zinc-800/70 bg-zinc-900/65 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]")
          }
        >
          <nav className="flex items-center justify-between h-[60px] pl-5 pr-2">
            <Link to="/" className="flex items-center gap-2.5 font-display font-extrabold text-lg tracking-tight">
              <Logo /> STRATA
            </Link>
            <div className="hidden md:flex items-center gap-1.5 bg-zinc-950/50 border border-zinc-800/70 rounded-full p-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={
                      "px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 " +
                      (isActive
                        ? "bg-emerald-400/15 text-emerald-300 border border-emerald-500/30 shadow-2xs"
                        : "text-zinc-400 hover:text-zinc-100 border border-transparent")
                    }
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={targetRoute}
                className="hidden sm:inline-flex px-5 py-2 rounded-full text-[13.5px] font-semibold border border-zinc-700/70 hover:bg-zinc-800/80 hover:border-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                {user ? "Dashboard" : "Masuk"}
              </Link>
              <MagneticLink
                to={targetRoute}
                className="inline-flex items-center gap-2.5 pl-5 pr-1.5 py-1.5 rounded-full text-[13.5px] font-bold bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 group"
              >
                Mulai gratis
              </MagneticLink>
              <button
                type="button"
                aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((o) => !o)}
                className="md:hidden relative w-10 h-10 rounded-full border border-zinc-700/70 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] active:scale-95 transition-transform"
              >
                <span className={"absolute w-4.5 h-[1.5px] bg-zinc-50 transition-transform duration-300 ease-out will-change-transform " + (mobileOpen ? "rotate-45" : "-translate-y-1.5")} />
                <span className={"absolute w-4.5 h-[1.5px] bg-zinc-50 transition-transform duration-300 ease-out will-change-transform " + (mobileOpen ? "-rotate-45" : "translate-y-1.5")} />
              </button>
            </div>
          </nav>
        </header>
      </div>

      {/* Fullscreen mobile menu (Dioptimasi: hardware acceleration & tanpa backdrop-blur-2xl berat) */}
      <div
        className={
          "fixed inset-0 z-40 bg-zinc-950/98 backdrop-blur-md flex flex-col items-start justify-center gap-1 px-8 transition-opacity duration-300 ease-out " +
          (mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
      >
        {NAV_ITEMS.map((item, i) => (
          <a
            key={item.id}
            href={"#" + item.id}
            onClick={() => setMobileOpen(false)}
            className="font-display text-4xl font-bold py-2.5 active:scale-95 transition-transform duration-200"
            style={{
              opacity: mobileOpen ? 1 : 0,
              transform: mobileOpen ? "translateY(0)" : "translateY(16px)",
              transition: "transform 250ms ease-out, opacity 250ms ease-out",
              transitionDelay: mobileOpen ? `${i * 35 + 40}ms` : "0ms",
            }}
          >
            {item.label}
          </a>
        ))}
        <div
          className="flex gap-3 mt-6"
          style={{
            opacity: mobileOpen ? 1 : 0,
            transform: mobileOpen ? "translateY(0)" : "translateY(16px)",
            transition: "transform 250ms ease-out, opacity 250ms ease-out",
            transitionDelay: mobileOpen ? "220ms" : "0ms",
          }}
        >
          <Link to={targetRoute} onClick={() => setMobileOpen(false)} className="px-5 py-2.5 rounded-full text-sm font-semibold border border-zinc-700/70 active:scale-95 transition-transform">
            {user ? "Dashboard" : "Masuk"}
          </Link>
          <MagneticLink
            to={targetRoute}
            onClick={() => setMobileOpen(false)}
            showArrow={false}
            className="px-5 py-2.5 rounded-full text-sm font-bold bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
          >
            Mulai gratis
          </MagneticLink>
        </div>
      </div>

      {/* ================= HERO ================= */}
      <section className="relative pt-[184px] pb-[110px] px-6 sm:px-8">
        <div className="absolute top-[-120px] left-1/2 -translate-x-[38%] w-[900px] h-[640px] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-[1360px] mx-auto grid grid-cols-1 lg:grid-cols-[0.86fr_1.14fr] gap-10 lg:gap-14 items-center">
          <Reveal>
            <div className="inline-flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-zinc-300 border border-zinc-800/80 rounded-full pl-3 pr-3.5 py-1.5 bg-zinc-900/75 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Manajemen Tugas & Kolaborasi Tim</span>
              <span className="text-zinc-600">·</span>
              <span className="text-emerald-400 font-mono text-[11.5px]">Cloud Real-Time</span>
            </div>

            <h1 className="font-display mt-5 text-[2.3rem] sm:text-5xl lg:text-[3.45rem] font-extrabold tracking-tight leading-[1.06] text-balance">
              Susun setiap lapisan pekerjaan tim, dari rencana sampai rilis.
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-zinc-400 max-w-[46ch]">
              STRATA merapikan tugas ke dalam papan kerja Kanban yang jelas, dilengkapi AI Helper Gemini, Papan Tulis, dan sinkronisasi Cloud Firestore secara langsung.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-8">
              <MagneticLink
                to={targetRoute}
                className="inline-flex items-center gap-2.5 pl-5 pr-1.5 py-1.5 rounded-full text-sm font-bold bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 group"
              >
                Mulai sekarang
              </MagneticLink>
              <a
                href="#ai-suite"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-zinc-300 hover:text-zinc-50 border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                <Icon.Play /> Jelajahi Fitur
              </a>
            </div>

            {/* Metrik Kapabilitas Platform dengan Animated Count-Up */}
            <div className="mt-10 pt-6 border-t border-zinc-900/90 grid grid-cols-3 gap-4 max-w-[460px]">
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                  <AnimatedCounter target={100} suffix="%" />
                </div>
                <div className="text-[11.5px] text-zinc-400 mt-0.5 leading-snug">
                  Akses penuh tanpa biaya
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-zinc-100">
                  <AnimatedCounter target={5} suffix=" Mode" />
                </div>
                <div className="text-[11.5px] text-zinc-400 mt-0.5 leading-snug">
                  Kanban, Sprint, AI, Analitik & Kanvas
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-zinc-100">
                  <AnimatedCounter target={24} suffix="/7" />
                </div>
                <div className="text-[11.5px] text-zinc-400 mt-0.5 leading-snug">
                  Sinkronisasi Cloud Firestore
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <HeroInteractiveBoard />
          </Reveal>
        </div>
      </section>

      {/* ================= FEATURE STRIP ================= */}
      <section id="produk" className="border-t border-zinc-900/80 py-[88px] px-6 sm:px-8">
        <div className="max-w-[1360px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0">
          {[
            { Ic: Icon.Collab, title: "Kerja bareng tanpa tabrakan", desc: "Tetapkan tugas, tandai progres, dan lihat perubahan tim secara langsung di satu papan yang sama." },
            { Ic: Icon.Devices, title: "Papan Pribadi & Tim Terpisah", desc: "Mulai dari ruang kerja pribadimu sendiri, lalu undang kolaborator lewat email kapan saja saat butuh kerja tim." },
            { Ic: Icon.Lock, title: "Hak akses sesuai peran", desc: "Atur peran Kapten, Anggota, atau Viewer lengkap dengan fitur Kunci Prioritas Kapten." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 100} className={"px-0 md:px-8 " + (i > 0 ? "md:border-l border-zinc-900/80 pt-8 md:pt-0 border-t md:border-t-0" : "")}>
              <div className="w-10 h-10 rounded-xl bg-zinc-900/80 border border-zinc-800/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex items-center justify-center text-emerald-400 mb-4">
                <f.Ic />
              </div>
              <h4 className="font-display text-[17px] font-bold tracking-tight">{f.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400 max-w-[34ch]">{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= KANBAN SHOWCASE ================= */}
      <section id="solusi" className="border-t border-zinc-900/80 py-[132px] px-6 sm:px-8">
        <div className="max-w-[1360px] mx-auto grid grid-cols-1 md:grid-cols-[0.82fr_1.18fr] gap-10 md:gap-16 items-center">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Kanban interaktif
            </span>
            <h2 className="font-display mt-3 text-[1.8rem] sm:text-[2.15rem] font-extrabold tracking-tight max-w-[15ch] text-balance leading-[1.12]">
              Pindahkan tugas secepat kamu berpikir.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-zinc-400 max-w-[40ch]">
              Geser kartu antar kolom, ubah urutan prioritas, atur batas WIP kolom, dan lihat progres tim berubah secara langsung — tanpa perlu menyegarkan halaman.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                "Seret kartu antar kolom dengan drag & drop mulus",
                "Kustomisasi warna kolom & batas Work-In-Progress (WIP)",
                "Tandai prioritas Kapten, label warna, dan tenggat waktu",
              ].map((t) => (
                <li key={t} className="flex gap-2.5 items-start text-sm text-zinc-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 flex items-center justify-center mt-0.5 flex-shrink-0"><Icon.Check /></span>{t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={150} className="bg-zinc-900/45 border border-zinc-800/60 rounded-[36px] p-2.5 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="bg-gradient-to-br from-[#17181d] to-[#101115] border border-zinc-700/60 rounded-[28px] p-5 relative h-[300px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full">
                <div className="bg-black/20 border border-zinc-800/70 rounded-2xl p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <h5 className="text-xs font-bold text-zinc-400 mb-2.5">Perlu dikerjakan</h5>
                  <div className="border-[1.5px] border-dashed border-zinc-700/70 rounded-xl h-13" />
                </div>
                <div className="bg-black/20 border border-zinc-800/70 rounded-2xl p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <h5 className="text-xs font-bold text-zinc-400 mb-2.5">Sedang berjalan</h5>
                  <div className="border-[1.5px] border-dashed border-zinc-700/70 rounded-xl h-13" />
                </div>
                <div className="bg-black/20 border border-zinc-800/70 rounded-2xl p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <h5 className="text-xs font-bold text-zinc-400 mb-2.5">Ditinjau</h5>
                  <div className="border-[1.5px] border-dashed border-zinc-700/70 rounded-xl h-13" />
                </div>
              </div>
              <div className="strata-flying-card absolute w-[calc(33.333%-20px)] top-[74px] left-3 bg-zinc-800/95 border border-emerald-500/40 rounded-xl p-2.5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950/90 text-rose-400 border border-rose-900/40 mb-2">Mendesak</span>
                <div className="text-[12.5px] font-semibold text-zinc-100">Bangun endpoint autentikasi</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-zinc-500">12 Sep</span>
                  <span className="w-5.5 h-5.5 rounded-md text-[9.5px] font-bold flex items-center justify-center text-zinc-950" style={{ background: "#ff9498" }}>DP</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= NOMOR 3: AI, WHITEBOARD & ANALYTICS SUITE ================= */}
      <AISuiteShowcase targetRoute={targetRoute} />

      {/* ================= COMMAND PALETTE SHOWCASE ================= */}
      <section className="border-t border-zinc-900/80 py-[132px] px-6 sm:px-8">
        <div className="max-w-[1360px] mx-auto grid grid-cols-1 md:grid-cols-[1.18fr_0.82fr] gap-10 md:gap-16 items-center">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Command palette
            </span>
            <h2 className="font-display mt-3 text-[1.8rem] sm:text-[2.15rem] font-extrabold tracking-tight max-w-[15ch] text-balance leading-[1.12]">
              Semua perintah, satu tombol.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-zinc-400 max-w-[40ch]">
              Tekan <strong className="text-zinc-100 font-mono text-[13.5px] bg-zinc-900 border border-zinc-700/70 px-2 py-0.5 rounded-md">Ctrl + F</strong> dari mana saja untuk berpindah papan, membuat tugas baru, atau menelusuri riwayat pencarian dengan tombol panah atas/bawah.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                "Cari tugas, anggota, atau proyek dalam hitungan detik",
                "Navigasi riwayat pencarian dengan panah keyboard ↑ ↓",
                "Pintasan cepat untuk berpindah tampilan & mode papan",
              ].map((t) => (
                <li key={t} className="flex gap-2.5 items-start text-sm text-zinc-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 flex items-center justify-center mt-0.5 flex-shrink-0"><Icon.Check /></span>{t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={150} className="bg-zinc-900/45 border border-zinc-800/60 rounded-[36px] p-2.5 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="bg-gradient-to-br from-[#17181d] to-[#101115] border border-zinc-700/60 rounded-[28px] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <PaletteTypewriterPreview />
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold px-3 pt-3 pb-1.5">Disarankan</div>
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[13.5px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <span>Buka papan "Peluncuran Produk"</span>
                <span className="text-[11px] font-mono border border-emerald-800/50 bg-emerald-950/60 rounded-md px-2 py-0.5">Enter</span>
              </div>
              {["Buat tugas baru", "Buka AI Helper Gemini", "Buka pengaturan profil"].map((label) => (
                <div key={label} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors text-[13.5px]">
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= NOMOR 2: INTERACTIVE BENTO FEATURES WITH SPOTLIGHT ================= */}
      <section id="fitur" className="border-t border-zinc-900/80 py-[132px] px-6 sm:px-8">
        <div className="max-w-[1360px] mx-auto">
          <Reveal className="max-w-[58ch] mb-14">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Fitur Interaktif — Coba Langsung di Bawah Ini
            </span>
            <h2 className="font-display mt-3 text-[1.8rem] sm:text-[2.15rem] font-extrabold tracking-tight text-balance leading-[1.12]">
              Dibangun untuk tim yang serius soal kerapian kerja.
            </h2>
            <p className="mt-3.5 text-[15.5px] leading-relaxed text-zinc-400">
              Setiap kartu di bawah ini interaktif: klik checklist untuk menguji progres, ganti peran untuk melihat hak akses, atau ketik kata kunci pencarian.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChecklistTile />
            <RoleTile />
            <ActivityTile />
            <SearchTile />
          </div>
        </div>
      </section>

      {/* ================= CTA SECTION ================= */}
      <section id="harga" className="border-t border-zinc-900/80 py-[132px] px-6 sm:px-8">
        <div className="max-w-[1360px] mx-auto">
          <Reveal className="bg-zinc-900/45 border border-zinc-800/60 rounded-[44px] p-2.5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="rounded-[34px] border border-zinc-700/60 bg-[radial-gradient(120%_140%_at_15%_0%,rgba(52,211,153,0.16),transparent_55%)] bg-zinc-900 px-8 sm:px-14 py-11 sm:py-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="max-w-[54ch]">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-4">
                  <Icon.Sparkles width={13} height={13} />
                  <span>Akses Penuh Tanpa Biaya</span>
                </div>
                <h2 className="font-display text-[1.7rem] sm:text-[2.25rem] font-extrabold tracking-tight text-balance leading-[1.12]">
                  Siap merapikan alur kerja timmu? Mulai gratis tanpa batasan fitur.
                </h2>
                <p className="mt-3.5 text-[15px] text-zinc-400 leading-relaxed">
                  Buat <strong className="text-zinc-200">Papan Pribadi</strong> untuk merapikan fokus harianmu atau <strong className="text-zinc-200">Papan Tim</strong> untuk berkolaborasi bersama rekan kerja, lengkap dengan AI Helper Gemini dan sinkronisasi Cloud Firestore.
                </p>
                <div className="flex flex-wrap gap-3 mt-5 text-xs text-zinc-300">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/70 border border-zinc-800">
                    <Icon.Check className="text-emerald-400" /> Login Google & Sinkronisasi Foto Profil
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/70 border border-zinc-800">
                    <Icon.Check className="text-emerald-400" /> AI Helper Gemini di Backend Firebase
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/70 border border-zinc-800">
                    <Icon.Check className="text-emerald-400" /> Multi-Proyek & Kolaborasi Tim
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3.5 flex-shrink-0">
                <MagneticLink
                  to={targetRoute}
                  className="inline-flex items-center gap-2.5 pl-5 pr-1.5 py-1.5 rounded-full text-sm font-bold bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 group"
                >
                  Mulai sekarang
                </MagneticLink>
                <a
                  href="#solusi"
                  className="px-5 py-2.5 rounded-full text-sm font-semibold border border-zinc-700/70 hover:bg-zinc-800/80 hover:border-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                >
                  Lihat demo
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-zinc-900/80 py-14 px-6 sm:px-8">
        <div className="max-w-[1360px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pb-10">
            <div>
              <Link to="/" className="flex items-center gap-2.5 font-display font-extrabold text-lg tracking-tight w-max">
                <Logo /> STRATA
              </Link>
              <p className="mt-3.5 text-[13.5px] text-zinc-500 max-w-[34ch] leading-relaxed">
                Platform manajemen tugas berbasis papan Kanban untuk individu dan tim yang ingin bekerja lebih terstruktur dan transparan.
              </p>
            </div>
            <div>
              <h5 className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 mb-3.5">Jelajahi</h5>
              <div className="flex flex-col gap-2.5 text-[13.5px] text-zinc-400">
                <a href="#solusi" className="hover:text-zinc-50 transition-colors w-max">Kanban board</a>
                <a href="#ai-suite" className="hover:text-zinc-50 transition-colors w-max">AI Helper & Whiteboard</a>
                <a href="#fitur" className="hover:text-zinc-50 transition-colors w-max">Fitur lengkap</a>
                <a href="#harga" className="hover:text-zinc-50 transition-colors w-max">Akses Gratis</a>
                <Link to={targetRoute} className="hover:text-zinc-50 transition-colors w-max">
                  {user ? "Buka Dashboard" : "Masuk / Daftar"}
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-zinc-900/80 text-[12.5px] text-zinc-500">
            <span>&copy; 2026 STRATA. Dibangun dengan React & Firebase Cloud Firestore.</span>
            <div className="flex gap-4">
              <span className="text-zinc-500 hover:text-zinc-400 cursor-pointer transition-colors">Kebijakan Privasi</span>
              <span className="text-zinc-500 hover:text-zinc-400 cursor-pointer transition-colors">Syarat Layanan</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   INTERACTIVE BENTO TILES (NOMOR 2 & 6)
   ============================================================ */
function ChecklistTile() {
  const [items, setItems] = useState([
    { id: 1, text: "Siapkan basis data Firestore", done: true },
    { id: 2, text: "Buat struktur API Cloud Functions", done: true },
    { id: 3, text: "Integrasi Google Sign-In & Avatar", done: false },
    { id: 4, text: "Pengujian menyeluruh", done: false },
  ]);

  function toggleItem(id) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  }

  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <SpotlightBentoCard>
      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-display text-[16px] font-bold tracking-tight">
            Checklist yang mengikuti progres
          </h4>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            {pct}%
          </span>
        </div>
        <p className="mt-1.5 text-[13px] text-zinc-400 leading-relaxed">
          Klik item di bawah untuk mencentang dan lihat bar progres berubah langsung:
        </p>
      </div>
      <div>
        <div className="flex flex-col gap-1.5 mb-3.5">
          {items.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleItem(c.id)}
              className="flex items-center gap-2.5 text-[13px] py-1 px-2 -mx-2 rounded-lg hover:bg-zinc-800/60 transition text-left cursor-pointer"
            >
              <span
                className={
                  "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors " +
                  (c.done ? "bg-emerald-400 text-zinc-950" : "border border-zinc-600")
                }
              >
                {c.done && <Icon.Check />}
              </span>
              <span className={c.done ? "text-zinc-200 line-through decoration-zinc-500" : "text-zinc-300"}>
                {c.text}
              </span>
            </button>
          ))}
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </SpotlightBentoCard>
  );
}

const ROLE_DEMO_INFO = {
  admin: {
    title: "Kapten (Admin)",
    badge: "Akses Penuh",
    desc: "Mengundang kolaborator, mengunci prioritas kartu, menambah kolom, dan mengatur target Sprint.",
  },
  member: {
    title: "Anggota (Member)",
    badge: "Eksekutor Tim",
    desc: "Membuat dan memindahkan kartu tugas, mencentang checklist, serta berdiskusi di kolom komentar.",
  },
  viewer: {
    title: "Viewer (Tamu)",
    badge: "Hanya Baca",
    desc: "Memantau persentase progres sprint dan distribusi kolom tanpa bisa mengubah isi kartu.",
  },
};

function RoleTile() {
  const [selectedRole, setSelectedRole] = useState("admin");
  const info = ROLE_DEMO_INFO[selectedRole];

  return (
    <SpotlightBentoCard delay={80}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-display text-[16px] font-bold tracking-tight">Akses sesuai peran</h4>
          <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
            {info.badge}
          </span>
        </div>
        <p className="mt-1.5 text-[13px] text-zinc-400 leading-relaxed">
          Pilih peran untuk melihat simulasi hak akses di papan kerja:
        </p>
      </div>

      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed">
          <strong className="text-emerald-300 block mb-0.5">{info.title}</strong>
          {info.desc}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "admin", label: "Kapten", dot: "bg-emerald-400" },
            { id: "member", label: "Anggota", dot: "bg-[#5B9DFF]" },
            { id: "viewer", label: "Viewer", dot: "bg-zinc-400" },
          ].map((r) => {
            const active = selectedRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRole(r.id)}
                className={
                  "text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition cursor-pointer " +
                  (active
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-xs"
                    : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:text-zinc-100")
                }
              >
                <span className={"w-1.5 h-1.5 rounded-full " + r.dot} />
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
    </SpotlightBentoCard>
  );
}

function ActivityTile() {
  const items = [
    <>Nauval memindahkan <b className="text-zinc-100">Build API</b> ke Sedang berjalan</>,
    <>Fajar menambahkan komentar di <b className="text-zinc-100">Login Page</b></>,
    <>Dinda menyelesaikan <b className="text-zinc-100">Checklist Testing</b></>,
    <>Aisyah memperbarui tenggat <b className="text-zinc-100">Database Setup</b></>,
    <>AI Helper membuat 4 sub-tugas di <b className="text-zinc-100">Sprint 1</b></>,
  ];
  const doubled = [...items, ...items];
  return (
    <SpotlightBentoCard className="md:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-[16px] font-bold tracking-tight">
            Riwayat aktivitas & notifikasi komentar
          </h4>
          <p className="mt-1.5 text-[13.5px] text-zinc-400 leading-relaxed">
            Setiap perpindahan kartu, balasan komentar, dan perubahan status tercatat rapi. Arahkan kursor ke pita aktivitas di bawah untuk menjeda.
          </p>
        </div>
        <span className="hidden sm:inline-flex text-[10.5px] font-mono text-zinc-400 bg-zinc-950/80 border border-zinc-800 px-2.5 py-1 rounded-full flex-shrink-0">
          Hover untuk jeda
        </span>
      </div>
      <div
        className="overflow-hidden mt-2"
        style={{ maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}
      >
        <div className="strata-marquee-track flex gap-3 w-max cursor-pointer">
          {doubled.map((item, i) => (
            <span
              key={i}
              className="flex-shrink-0 text-xs text-zinc-300 border border-zinc-800/80 hover:border-emerald-500/40 rounded-xl px-3.5 py-2.5 bg-zinc-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] whitespace-nowrap transition-colors"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </SpotlightBentoCard>
  );
}

const SEARCH_DEMO_TASKS = [
  { title: "Bangun endpoint Autentikasi", col: "Sedang berjalan" },
  { title: "Terapkan Google Auth & Foto Profil", col: "Selesai" },
  { title: "Desain ulang kartu Kanban & WIP", col: "Ditinjau" },
  { title: "Migrasi skema Database Firestore", col: "Perlu dikerjakan" },
];

function SearchTile() {
  const [searchVal, setSearchVal] = useState("auth");

  const filtered = useMemo(() => {
    const q = searchVal.trim().toLowerCase();
    if (!q) return SEARCH_DEMO_TASKS.slice(0, 2);
    return SEARCH_DEMO_TASKS.filter((t) => t.title.toLowerCase().includes(q));
  }, [searchVal]);

  return (
    <SpotlightBentoCard delay={120}>
      <div>
        <h4 className="font-display text-[16px] font-bold tracking-tight">Pencarian instan</h4>
        <p className="mt-1.5 text-[13px] text-zinc-400 leading-relaxed">
          Ketik kata kunci atau klik tag di bawah untuk menguji filter langsung:
        </p>
      </div>
      <div>
        <div className="flex items-center gap-2 border border-zinc-700/80 focus-within:border-emerald-400 rounded-xl px-3 py-1.5 text-xs text-zinc-200 bg-zinc-950/70">
          <Icon.Search className="text-zinc-400" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Cari tugas (mis. auth, desain)..."
            className="bg-transparent outline-none w-full text-xs text-zinc-100 placeholder-zinc-500"
          />
        </div>
        <div className="flex gap-1.5 mt-2">
          {["auth", "desain", "database"].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setSearchVal(chip)}
              className={
                "text-[10px] font-mono px-2 py-0.5 rounded-md border transition cursor-pointer " +
                (searchVal.toLowerCase() === chip
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200")
              }
            >
              #{chip}
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex flex-col min-h-[58px]">
          {filtered.length === 0 ? (
            <div className="text-[11.5px] text-zinc-500 py-2">
              Tidak ada tugas dengan kata &ldquo;{searchVal}&rdquo;
            </div>
          ) : (
            filtered.slice(0, 2).map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between gap-2 py-1.5 text-xs text-zinc-300 border-b border-zinc-800/70 last:border-b-0"
              >
                <span className="truncate">{item.title}</span>
                <span className="text-[10px] font-mono text-emerald-400 flex-shrink-0">
                  {item.col}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </SpotlightBentoCard>
  );
}
