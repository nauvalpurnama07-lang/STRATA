import { useState, useRef, useCallback, useMemo } from "react";
import { Icon } from "../icons";
import { MEMBERS, PRIORITY_LABEL, PRIORITY_CLASS } from "../../data/board";

const GROUP_LABELS = { column: "Kolom", priority: "Prioritas", assignee: "Penanggung Jawab" };
const NODE_W = 200;
const NODE_H = 92;
const GROUP_GAP_X = 260;
const NODE_GAP_Y = 24;
const GROUP_HEADER_H = 48;

const STICKY_COLORS = ["#34D399", "#5B9DFF", "#F6C179", "#FF9498"];

function groupKeyFor(task, col, groupBy) {
  if (groupBy === "priority") return task.priority;
  if (groupBy === "assignee") return task.assignee;
  return col.id;
}
function groupLabelFor(key, groupBy) {
  if (groupBy === "priority") return PRIORITY_LABEL[key] || key;
  if (groupBy === "assignee") return key ? (MEMBERS[key]?.name || key) : "Belum diambil";
  return key;
}

function layoutFromBoard(board, groupBy) {
  const groups = new Map();
  const order = [];
  board.forEach((col) => {
    col.tasks.forEach((task) => {
      const key = groupKeyFor(task, col, groupBy);
      if (!groups.has(key)) { groups.set(key, []); order.push(key); }
      groups.get(key).push({ task, col });
    });
  });

  const nodes = [];
  order.forEach((key, gi) => {
    const items = groups.get(key);
    items.forEach((item, ni) => {
      nodes.push({
        id: "task-" + item.task.id,
        type: "task",
        taskId: item.task.id,
        colId: item.col.id,
        groupKey: key,
        x: 60 + gi * GROUP_GAP_X,
        y: 90 + GROUP_HEADER_H + ni * (NODE_H + NODE_GAP_Y),
      });
    });
  });

  const groupHeaders = order.map((key, gi) => ({
    key,
    x: 60 + gi * GROUP_GAP_X,
    y: 60,
    label: groupLabelFor(key, groupBy),
  }));

  return { nodes, groupHeaders };
}

function TaskNode({ task, col, pendingLink }) {
  const m = task.assignee ? MEMBERS[task.assignee] : null;
  return (
    <div
      className={
        "w-full rounded-xl border bg-zinc-800 p-3 shadow-lg select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
        (pendingLink ? "border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/20" : "border-zinc-700/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
      }
    >
      <span className={"inline-flex text-[9.5px] font-bold px-1.5 py-0.5 rounded " + PRIORITY_CLASS[task.priority]}>
        {PRIORITY_LABEL[task.priority]}
      </span>
      <div className="mt-1.5 text-[12.5px] font-semibold leading-snug text-zinc-50 line-clamp-2">{task.title}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">{col?.name}</span>
        {m ? (
          <span className="w-5 h-5 rounded text-[8.5px] font-bold text-white flex items-center justify-center" style={{ background: m.color }}>
            {m.initials}
          </span>
        ) : (
          <span className="text-[9px] text-zinc-600 border border-dashed border-zinc-700 rounded px-1.5 py-0.5">Belum diambil</span>
        )}
      </div>
    </div>
  );
}

function StickyNode({ node, editing, onStartEdit, onBlur, pendingLink }) {
  return (
    <div
      className={"rounded-lg p-3 shadow-lg select-none w-full h-full " + (pendingLink ? "ring-2 ring-emerald-400/70" : "")}
      style={{ background: node.color }}
      onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(node.id); }}
    >
      {editing ? (
        <textarea
          autoFocus
          defaultValue={node.content}
          onBlur={(e) => onBlur(node.id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full h-full min-h-[96px] bg-transparent text-[13px] font-medium text-zinc-950 outline-none resize-none placeholder-zinc-950/50"
          placeholder="Tulis catatan..."
        />
      ) : (
        <p className="text-[13px] font-medium text-zinc-950 whitespace-pre-wrap break-words">
          {node.content || <span className="text-zinc-950/50">Klik dua kali untuk menulis...</span>}
        </p>
      )}
    </div>
  );
}

function TextNode({ node, editing, onStartEdit, onBlur }) {
  return (
    <div className="select-none w-full" onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(node.id); }}>
      {editing ? (
        <input
          autoFocus
          defaultValue={node.content}
          onBlur={(e) => onBlur(node.id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full bg-zinc-900 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-[15px] font-semibold text-zinc-50 outline-none"
        />
      ) : (
        <p className="text-[15px] font-semibold text-zinc-100 px-1">{node.content || "Teks label"}</p>
      )}
    </div>
  );
}

function ShapeNode({ node, pendingLink }) {
  return (
    <div
      className={
        "w-full h-full border-[1.5px] border-dashed border-zinc-600 bg-zinc-800/40 " +
        (node.shape === "circle" ? "rounded-full" : "rounded-2xl") +
        (pendingLink ? " ring-2 ring-emerald-400/70" : "")
      }
    />
  );
}

const CHAT_COLOR = "#1E293B";

function ChatBubbleNode({ node, editing, onStartEdit, onBlur, pendingLink }) {
  return (
    <div className="relative">
      <div
        className={"rounded-xl rounded-bl-sm border border-[#3B82F6]/40 p-3 shadow-lg select-none " + (pendingLink ? "ring-2 ring-emerald-400/70" : "")}
        style={{ background: CHAT_COLOR }}
        onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(node.id); }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-4 h-4 rounded bg-[#3B82F6] text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">{(node.author || "K")[0].toUpperCase()}</span>
          <span className="text-[10.5px] font-semibold text-[#8fb8ff]">{node.author || "Kamu"}</span>
        </div>
        {editing ? (
          <textarea
            autoFocus
            defaultValue={node.content}
            onBlur={(e) => onBlur(node.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full min-h-[52px] bg-transparent text-[13px] text-zinc-100 outline-none resize-none placeholder-zinc-500"
            placeholder="Tulis komentar..."
          />
        ) : (
          <p className="text-[13px] text-zinc-100 whitespace-pre-wrap break-words">
            {node.content || <span className="text-zinc-500">Klik dua kali untuk menulis komentar...</span>}
          </p>
        )}
      </div>
      <div
        className="absolute w-3 h-3 rotate-45 border-b border-r border-[#3B82F6]/40"
        style={{ background: CHAT_COLOR, bottom: -5, left: 14 }}
      />
    </div>
  );
}

export default function WhiteboardCanvas({ board, mode = "presentation" }) {
  const isFree = mode === "free";
  const [groupBy, setGroupBy] = useState("column");
  const [layout, setLayout] = useState(() => (isFree ? { nodes: [], groupHeaders: [] } : layoutFromBoard(board, "column")));
  const [extras, setExtras] = useState([]); // sticky / text / shape / chat nodes
  const [connections, setConnections] = useState([]);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const [scale, setScale] = useState(isFree ? 1 : 0.85);
  const [linkMode, setLinkMode] = useState(false);
  const [pendingFrom, setPendingFrom] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [dirty, setDirty] = useState(false);

  const canvasRef = useRef(null);
  const panState = useRef(null);

  const allNodes = useMemo(() => [...layout.nodes, ...extras], [layout, extras]);

  function findTask(taskId) {
    for (const col of board) {
      const t = col.tasks.find((x) => x.id === taskId);
      if (t) return { task: t, col };
    }
    return null;
  }

  function regenerate(nextGroupBy) {
    setLayout(layoutFromBoard(board, nextGroupBy ?? groupBy));
    setDirty(false);
  }

  function setNodePosition(id, x, y) {
    setLayout((prev) => ({ ...prev, nodes: prev.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) }));
    setExtras((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }

  const startNodeDrag = useCallback((e, node) => {
    if (linkMode) return;
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const origX = node.x, origY = node.y;
    let promoted = false;

    function onMove(ev) {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) promoted = true;
      setNodePosition(node.id, origX + dx, origY + dy);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (promoted) setDirty(true);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkMode, scale]);

  function handleCanvasPointerDown(e) {
    if (e.target !== canvasRef.current && !e.target.dataset.panSurface) return;
    const startX = e.clientX, startY = e.clientY;
    const origin = { ...pan };
    panState.current = true;

    function onMove(ev) {
      setPan({ x: origin.x + (ev.clientX - startX), y: origin.y + (ev.clientY - startY) });
    }
    function onUp() {
      panState.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleWheel(e) {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left, cursorY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale((prevScale) => {
      const next = Math.min(2, Math.max(0.4, prevScale + delta));
      setPan((prevPan) => ({
        x: cursorX - ((cursorX - prevPan.x) / prevScale) * next,
        y: cursorY - ((cursorY - prevPan.y) / prevScale) * next,
      }));
      return next;
    });
  }

  function zoomBy(delta) {
    setScale((s) => Math.min(2, Math.max(0.4, +(s + delta).toFixed(2))));
  }

  function resetView() {
    setPan({ x: 40, y: 20 });
    setScale(isFree ? 1 : 0.85);
  }

  function addExtra(type) {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = (rect.width / 2 - pan.x) / scale;
    const cy = (rect.height / 2 - pan.y) / scale;
    const id = type + "-" + Date.now();
    if (type === "sticky") {
      setExtras((prev) => [...prev, { id, type: "sticky", x: cx - 84, y: cy - 60, w: 168, h: 120, content: "", color: STICKY_COLORS[prev.length % STICKY_COLORS.length] }]);
      setEditingId(id);
    } else if (type === "text") {
      setExtras((prev) => [...prev, { id, type: "text", x: cx - 60, y: cy - 12, w: 220, content: "" }]);
      setEditingId(id);
    } else if (type === "shape") {
      setExtras((prev) => [...prev, { id, type: "shape", x: cx - 90, y: cy - 60, w: 180, h: 120, shape: "rect" }]);
    } else if (type === "chat") {
      setExtras((prev) => [...prev, { id, type: "chat", x: cx - 90, y: cy - 50, w: 190, content: "", author: "Kamu" }]);
      setEditingId(id);
    }
    setDirty(true);
  }

  function importFromBoard() {
    const existingTaskIds = new Set(layout.nodes.map((n) => n.taskId));
    const toImport = [];
    board.forEach((col) => col.tasks.forEach((task) => {
      if (!existingTaskIds.has(task.id)) toImport.push({ task, col });
    }));
    if (!toImport.length) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const baseX = (40 - pan.x) / scale;
    const baseY = (40 - pan.y) / scale;
    const perRow = Math.max(1, Math.floor((rect.width / scale - 40) / GROUP_GAP_X));
    const newNodes = toImport.map((item, i) => ({
      id: "task-" + item.task.id,
      type: "task",
      taskId: item.task.id,
      colId: item.col.id,
      groupKey: null,
      x: baseX + (i % perRow) * GROUP_GAP_X,
      y: baseY + Math.floor(i / perRow) * (NODE_H + NODE_GAP_Y),
    }));
    setLayout((prev) => ({ ...prev, nodes: [...prev.nodes, ...newNodes] }));
    setDirty(true);
  }

  function updateExtraContent(id, content) {
    setExtras((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
    setEditingId(null);
  }

  function removeExtra(id) {
    setExtras((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
  }

  function removeLayoutNode(id) {
    setLayout((prev) => ({ ...prev, nodes: prev.nodes.filter((n) => n.id !== id) }));
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
  }

  function handleNodeClick(node) {
    if (!linkMode) return;
    if (!pendingFrom) { setPendingFrom(node.id); return; }
    if (pendingFrom === node.id) { setPendingFrom(null); return; }
    setConnections((prev) => [...prev, { id: pendingFrom + "-" + node.id + "-" + Date.now(), from: pendingFrom, to: node.id }]);
    setPendingFrom(null);
    setDirty(true);
  }

  function nodeCenter(id) {
    const n = allNodes.find((x) => x.id === id);
    if (!n) return { x: 0, y: 0 };
    const w = n.w || NODE_W, h = n.h || NODE_H;
    return { x: n.x + w / 2, y: n.y + h / 2 };
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/60 rounded-xl p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <button onClick={() => addExtra("sticky")} title="Tambah sticky note" className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 active:scale-90 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <Icon.StickyNote />
          </button>
          <button onClick={() => addExtra("chat")} title="Tambah balon obrolan" className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 active:scale-90 transition">
            <Icon.ChatBubble />
          </button>
          <button onClick={() => addExtra("text")} title="Tambah teks" className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 active:scale-90 transition">
            <Icon.TypeText />
          </button>
          <button onClick={() => addExtra("shape")} title="Tambah kotak" className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 active:scale-90 transition">
            <Icon.Square />
          </button>
          <button
            onClick={() => { setLinkMode((v) => !v); setPendingFrom(null); }}
            title="Hubungkan elemen"
            className={"w-8.5 h-8.5 rounded-lg flex items-center justify-center active:scale-90 transition " + (linkMode ? "bg-emerald-950/60 text-emerald-300" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50")}
          >
            <Icon.Link2 />
          </button>
        </div>

        {isFree ? (
          <button
            onClick={importFromBoard}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 text-[12.5px] font-semibold hover:bg-zinc-800 active:scale-[0.97] transition"
          >
            <Icon.Import /> Impor tugas dari papan
          </button>
        ) : (
          <>
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-1 py-1">
              <Icon.Layers className="text-zinc-500 ml-1.5" />
              <select
                value={groupBy}
                onChange={(e) => { setGroupBy(e.target.value); regenerate(e.target.value); }}
                className="bg-transparent text-[12.5px] font-semibold text-zinc-300 pr-2 py-1.5 outline-none"
              >
                {Object.entries(GROUP_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => regenerate()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 text-[12.5px] font-semibold hover:bg-zinc-800 active:scale-[0.97] transition"
              >
                <Icon.Refresh /> Perbarui dari papan
              </button>
              {dirty && (
                <span className="text-[10.5px] text-amber-400 bg-amber-950/40 border border-amber-900/50 rounded-full px-2.5 py-1 whitespace-nowrap">
                  Posisi tugas akan diatur ulang
                </span>
              )}
            </div>
          </>
        )}

        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/60 rounded-xl p-1 ml-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <button onClick={() => zoomBy(-0.1)} className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 active:scale-90 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"><Icon.ZoomOut /></button>
          <span className="text-[11.5px] font-mono tabular-nums text-zinc-400 w-11 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => zoomBy(0.1)} className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 active:scale-90 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"><Icon.ZoomIn /></button>
          <button onClick={resetView} title="Reset tampilan" className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 active:scale-90 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"><Icon.Frame /></button>
        </div>
      </div>

      {linkMode && (
        <div className="text-[12px] text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 rounded-lg px-3.5 py-2 w-max">
          Mode hubungkan aktif — klik dua elemen berurutan untuk menariknya menjadi satu garis.
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        data-pan-surface="true"
        onPointerDown={handleCanvasPointerDown}
        onWheel={handleWheel}
        className="relative h-[70dvh] min-h-[420px] rounded-3xl border border-zinc-800/40 bg-zinc-900/60 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: `${24 * scale}px ${24 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          {/* connector lines */}
          <svg className="absolute overflow-visible pointer-events-none" width="1" height="1">
            {connections.map((c) => {
              const a = nodeCenter(c.from), b = nodeCenter(c.to);
              return (
                <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#34D399" strokeWidth={2} strokeOpacity={0.55} strokeLinecap="round" />
              );
            })}
          </svg>

          {layout.groupHeaders.map((h) => (
            <div key={h.key} className="absolute text-[13px] font-bold text-zinc-400" style={{ left: h.x, top: h.y, width: NODE_W }}>
              {h.label}
            </div>
          ))}

          {layout.nodes.map((node) => {
            const found = findTask(node.taskId);
            if (!found) return null;
            return (
              <div key={node.id} className="group absolute" style={{ left: node.x, top: node.y, width: NODE_W }} onPointerDown={(e) => startNodeDrag(e, node)} onClick={() => handleNodeClick(node)}>
                <TaskNode task={found.task} col={found.col} pendingLink={pendingFrom === node.id} />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); removeLayoutNode(node.id); }}
                  title="Hapus dari kanvas (tugas tetap ada di papan)"
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <Icon.X width={9} height={9} />
                </button>
              </div>
            );
          })}

          {extras.map((node) => {
            if (node.type === "sticky") {
              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => startNodeDrag(e, node)}
                  onClick={() => handleNodeClick(node)}
                  className="group absolute"
                  style={{ left: node.x, top: node.y, width: node.w || 168, minHeight: node.h || 120 }}
                >
                  <StickyNode node={node} pendingLink={pendingFrom === node.id} editing={editingId === node.id} onStartEdit={setEditingId} onBlur={updateExtraContent} />
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); removeExtra(node.id); }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <Icon.X width={9} height={9} />
                  </button>
                </div>
              );
            }
            if (node.type === "chat") {
              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => startNodeDrag(e, node)}
                  onClick={() => handleNodeClick(node)}
                  className="group absolute"
                  style={{ left: node.x, top: node.y, width: node.w || 190 }}
                >
                  <ChatBubbleNode node={node} pendingLink={pendingFrom === node.id} editing={editingId === node.id} onStartEdit={setEditingId} onBlur={updateExtraContent} />
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); removeExtra(node.id); }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10"
                  >
                    <Icon.X width={9} height={9} />
                  </button>
                </div>
              );
            }
            if (node.type === "text") {
              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => startNodeDrag(e, node)}
                  onClick={() => handleNodeClick(node)}
                  className="group absolute"
                  style={{ left: node.x, top: node.y, width: node.w || 220 }}
                >
                  <TextNode node={node} editing={editingId === node.id} onStartEdit={setEditingId} onBlur={updateExtraContent} />
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); removeExtra(node.id); }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <Icon.X width={9} height={9} />
                  </button>
                </div>
              );
            }
            return (
              <div
                key={node.id}
                onPointerDown={(e) => startNodeDrag(e, node)}
                onClick={() => handleNodeClick(node)}
                className="group absolute"
                style={{ left: node.x, top: node.y, width: node.w || 180, height: node.h || 120 }}
              >
                <ShapeNode node={node} pendingLink={pendingFrom === node.id} />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); removeExtra(node.id); }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <Icon.X width={9} height={9} />
                </button>
              </div>
            );
          })}

          {allNodes.length === 0 && (
            <div className="w-[320px] text-center py-10" style={{ position: "absolute", left: 60, top: 80 }}>
              <p className="text-zinc-500 text-sm">
                {isFree
                  ? "Kanvas kosong — mulai dengan menambahkan sticky note, balon obrolan, atau impor tugas dari papan."
                  : "Belum ada tugas di papan ini untuk ditampilkan."}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11.5px] text-zinc-600">
        {isFree
          ? "Tarik area kosong untuk menggeser, scroll untuk memperbesar/memperkecil. Kanvas ini untuk diskusi dan brainstorming bebas — mengedit tugas tetap dilakukan dari tab Papan."
          : "Tarik area kosong untuk menggeser, scroll untuk memperbesar/memperkecil. Kartu tugas hanya untuk ditata di sini — mengedit tugas tetap dilakukan dari tab Papan."}
      </p>
    </div>
  );
}
