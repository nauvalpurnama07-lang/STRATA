import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Logo } from "../components/icons";
import Toast, { SPRING } from "../components/Toast";
import {
  MEMBERS,
  PRIORITY_LABEL,
  PRIORITY_CLASS,
  PRIORITY_CLASS_LIGHT,
  COLUMN_THEMES,
  COLUMN_COLOR_PRESETS,
  TASK_LABEL_PRESETS,
  ROLE_LABEL,
  POINT_OPTIONS,
  SPRINT_COLUMNS,
  makeTask,
  initialBoard,
  initialSprint,
  initialProjects,
  createEmptyBoard,
  createStarterBoard,
  canAccountAccessProject,
  getProjectOwnerEmail,
  checklistPct,
} from "../data/board";
import SprintBar from "../components/scrum/SprintBar";
import ViewerBoard from "../components/scrum/ViewerBoard";
import WhiteboardCanvas from "../components/presentation/WhiteboardCanvas";
import AIHelper from "../components/ai/AIHelper";
import ToggleSwitch from "../components/ToggleSwitch";
import NotificationPanel from "../components/NotificationPanel";
import {
  ensureDatabaseSeeded,
  ensureAccountProjectInFirestore,
  subscribeToProjects,
  subscribeToAccounts,
  subscribeToGoogleAuthProfile,
  createProjectInFirestore,
  updateProjectCollaboratorsInFirestore,
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  updateAccountProfileInFirestore,
} from "../firebase";

const DEFAULT_USER = { name: "Pengguna", email: "", initials: "U", role: "admin", memberKey: "u_default" };

const PROJECT_DOT_OPTIONS = [
  { label: "Emerald", color: "#34D399" },
  { label: "Amber", color: "#F59E0B" },
  { label: "Blue", color: "#3B82F6" },
  { label: "Rose", color: "#F43F5E" },
  { label: "Purple", color: "#A855F7" },
  { label: "Cyan", color: "#06B6D4" },
];

const AVATAR_COLOR_PRESETS = [
  { id: "emerald", label: "Emerald Signature", color: "#10B981", hex: "#10B981", ring: "ring-emerald-400" },
  { id: "blue", label: "Ocean Blue", color: "#3B82F6", hex: "#3B82F6", ring: "ring-blue-400" },
  { id: "amber", label: "Amber Gold", color: "#F59E0B", hex: "#F59E0B", ring: "ring-amber-400" },
  { id: "rose", label: "Rose Neon", color: "#EC4899", hex: "#EC4899", ring: "ring-pink-400" },
  { id: "violet", label: "Violet Cyber", color: "#8B5CF6", hex: "#8B5CF6", ring: "ring-violet-400" },
  { id: "cyan", label: "Cyan Electric", color: "#06B6D4", hex: "#06B6D4", ring: "ring-cyan-400" },
  { id: "crimson", label: "Crimson Pulse", color: "#F43F5E", hex: "#F43F5E", ring: "ring-rose-400" },
  { id: "indigo", label: "Indigo Deep", color: "#6366F1", hex: "#6366F1", ring: "ring-indigo-400" },
];

const COLLAB_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4"];

const ID_MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
  jul: 6, agu: 7, agt: 7, sep: 8, okt: 9, nov: 10, des: 11,
};

function evaluateTaskDue(task, colId, isLight = false) {
  const rawDue = String(task?.due || "").trim();
  const isDoneCol = colId === "done" || String(colId || "").toLowerCase().includes("done") || String(colId || "").toLowerCase().includes("selesai");

  if (!rawDue || rawDue.toLowerCase() === "tanpa tenggat" || rawDue === "-") {
    return {
      status: "none",
      label: rawDue || "Tanpa tenggat",
      badgeText: null,
      pillCls: isLight ? "text-zinc-400" : "text-zinc-500",
    };
  }

  if (isDoneCol) {
    return {
      status: "done",
      label: rawDue,
      badgeText: "Selesai",
      pillCls: isLight
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        : "bg-emerald-950/50 text-emerald-300 border border-emerald-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      dotCls: "bg-emerald-400",
    };
  }

  const lower = rawDue.toLowerCase();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let targetDate = null;

  if (task?.dueIso) {
    const parts = String(task.dueIso).split("-").map(Number);
    if (parts.length === 3 && !Number.isNaN(parts[0])) {
      targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }

  if (!targetDate) {
    if (lower === "hari ini") {
      targetDate = todayMidnight;
    } else if (lower === "besok") {
      targetDate = new Date(todayMidnight);
      targetDate.setDate(targetDate.getDate() + 1);
    } else {
      const m = lower.match(/^(\d{1,2})\s+([a-z]{3,})/i);
      if (m) {
        const dayNum = parseInt(m[1], 10);
        const monKey = m[2].slice(0, 3).toLowerCase();
        if (ID_MONTH_MAP[monKey] !== undefined) {
          targetDate = new Date(now.getFullYear(), ID_MONTH_MAP[monKey], dayNum);
        }
      }
    }
  }

  if (targetDate) {
    const diffDays = Math.round((targetDate.getTime() - todayMidnight.getTime()) / 86400000);
    if (diffDays < 0) {
      return {
        status: "overdue",
        label: rawDue,
        badgeText: `Terlambat ${Math.abs(diffDays)}h`,
        pillCls: isLight
          ? "bg-rose-50 text-rose-700 border border-rose-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "bg-rose-950/60 text-rose-300 border border-rose-500/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        dotCls: "bg-rose-500 animate-ping",
      };
    }
    if (diffDays === 0) {
      return {
        status: "today",
        label: rawDue,
        badgeText: "Hari Ini",
        pillCls: isLight
          ? "bg-rose-50 text-rose-700 border border-rose-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "bg-rose-950/55 text-rose-300 border border-rose-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        dotCls: "bg-rose-400 animate-pulse",
      };
    }
    if (diffDays <= 2) {
      return {
        status: "soon",
        label: rawDue,
        badgeText: diffDays === 1 ? "Besok" : `${diffDays} hari lagi`,
        pillCls: isLight
          ? "bg-amber-50 text-amber-800 border border-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "bg-amber-950/55 text-amber-300 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        dotCls: "bg-amber-400",
      };
    }
  }

  return {
    status: "scheduled",
    label: rawDue,
    badgeText: null,
    pillCls: isLight
      ? "bg-slate-100/90 text-zinc-600 border border-slate-200/80"
      : "bg-zinc-800/70 text-zinc-300 border border-zinc-700/60",
    dotCls: "bg-sky-400",
  };
}

function resolveColTheme(col, theme = "dark") {
  if (!col) return COLUMN_THEMES.backlog[theme];
  if (col.themeKey && COLUMN_THEMES[col.themeKey]?.[theme]) {
    return COLUMN_THEMES[col.themeKey][theme];
  }
  if (COLUMN_THEMES[col.id]?.[theme]) {
    return COLUMN_THEMES[col.id][theme];
  }
  const byDot = COLUMN_COLOR_PRESETS.find(
    (p) => p.dot.toLowerCase() === String(col.dot || "").toLowerCase()
  );
  if (byDot && COLUMN_THEMES[byDot.themeKey]?.[theme]) {
    return COLUMN_THEMES[byDot.themeKey][theme];
  }
  return COLUMN_THEMES.backlog[theme];
}

function getMemberProfileByEmail(emailRaw, currentUser, accountsList = []) {
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!email) {
    return { name: "Pengguna", email: "", initials: "U", color: "#10B981", joined: "Aktif", memberKey: "rn" };
  }

  const foundMemberEntry = Object.entries(MEMBERS).find(
    ([, m]) => String(m?.email || "").trim().toLowerCase() === email
  );

  if (currentUser && String(currentUser.email || "").trim().toLowerCase() === email) {
    const cName = currentUser.name || email.split("@")[0];
    const cInitials =
      currentUser.initials ||
      cName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("") ||
      "U";
    const mKey =
      currentUser.memberKey ||
      foundMemberEntry?.[0] ||
      "u_" + email.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 18);
    const foundAccForSelf = Array.isArray(accountsList)
      ? accountsList.find((a) => String(a?.email || "").trim().toLowerCase() === email)
      : null;
    return {
      memberKey: mKey,
      name: cName,
      email,
      initials: cInitials,
      color: currentUser.color || foundAccForSelf?.color || foundMemberEntry?.[1]?.color || "#10B981",
      photoURL:
        currentUser.photoURL ||
        foundAccForSelf?.photoURL ||
        foundMemberEntry?.[1]?.photoURL ||
        null,
      joined: "Akun Kamu",
    };
  }

  const foundAcc = Array.isArray(accountsList)
    ? accountsList.find((a) => String(a?.email || "").trim().toLowerCase() === email)
    : null;
  if (foundAcc) {
    const mKey =
      foundAcc.memberKey ||
      foundMemberEntry?.[0] ||
      "u_" + email.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 18);
    return {
      memberKey: mKey,
      name: foundAcc.name || email.split("@")[0],
      email,
      initials: foundAcc.initials || (foundAcc.name || "U").slice(0, 2).toUpperCase(),
      color: foundAcc.color || foundMemberEntry?.[1]?.color || "#3B82F6",
      photoURL: foundAcc.photoURL || foundMemberEntry?.[1]?.photoURL || null,
      joined: foundAcc.joined || "Terdaftar",
    };
  }

  if (foundMemberEntry) {
    const [mKey, foundMember] = foundMemberEntry;
    return {
      memberKey: mKey,
      name: foundMember.name,
      email,
      initials: foundMember.initials,
      color: foundMember.color || "#3B82F6",
      photoURL: foundMember.photoURL || null,
      joined: foundMember.joined || "Terdaftar",
    };
  }

  const localPart = email.split("@")[0] || "user";
  const words = localPart.split(/[._-]+/).filter(Boolean);
  const displayName = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : localPart.slice(0, 2).toUpperCase();
  const colorIdx =
    email.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    COLLAB_COLORS.length;
  const generatedKey =
    "u_" + email.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 18);

  return {
    memberKey: generatedKey,
    name: displayName || email,
    email,
    initials: initials || "U",
    color: COLLAB_COLORS[colorIdx],
    photoURL: null,
    joined: "Diundang via Email",
  };
}

function getProjectCollaborators(project, currentUser, accountsList = []) {
  const owner = getProjectOwnerEmail(project);
  const rawAllowed = Array.isArray(project?.allowedEmails) ? project.allowedEmails : [];
  const roleMap =
    project?.members && typeof project.members === "object" && !Array.isArray(project.members)
      ? project.members
      : {};
  const uniqueEmails = Array.from(
    new Set(
      [owner, ...rawAllowed]
        .map((e) => String(e || "").trim().toLowerCase())
        .filter((e) => e && e.includes("@"))
    )
  );
  const list = uniqueEmails.map((em) => {
    const prof = getMemberProfileByEmail(em, currentUser, accountsList);
    const isOwner = em === owner;
    const assignedRole = roleMap[em] === "viewer" ? "viewer" : "member";
    const item = {
      ...prof,
      isOwner,
      role: isOwner ? "admin" : assignedRole,
    };
    if (item.memberKey) {
      MEMBERS[item.memberKey] = {
        ...(MEMBERS[item.memberKey] || {}),
        name: item.name,
        initials: item.initials,
        color: item.color,
        email: item.email,
        role: item.role,
        joined: item.joined,
        ...(item.photoURL ? { photoURL: item.photoURL } : {}),
      };
    }
    return item;
  });
  return list;
}

function resolveAssigneeProfile(assigneeKey) {
  if (!assigneeKey) return null;
  if (MEMBERS[assigneeKey]) return { key: assigneeKey, ...MEMBERS[assigneeKey] };
  const lower = String(assigneeKey).trim().toLowerCase();
  const byEmailOrName = Object.entries(MEMBERS).find(
    ([, m]) =>
      String(m?.email || "").trim().toLowerCase() === lower ||
      String(m?.name || "").trim().toLowerCase() === lower
  );
  if (byEmailOrName) return { key: byEmailOrName[0], ...byEmailOrName[1] };
  return null;
}

/* ============================================================
   PROJECT GALLERY (Beranda)
   ============================================================ */
function ProjectThumbnail({ accent, board, theme = "dark" }) {
  const isLight = theme === "light";
  const previewCols = Array.isArray(board) && board.length >= 3
    ? [board[1] || board[0], board[2] || board[1], board[4] || board[2]]
    : [null, null, null];

  return (
    <div className="grid grid-cols-3 gap-1.5 p-3.5 h-full">
      {previewCols.map((colObj, col) => {
        const count = colObj && Array.isArray(colObj.tasks) ? Math.min(colObj.tasks.length, 2) : (col === 1 ? 2 : 1);
        return (
          <div key={col} className="flex flex-col gap-1.5">
            <div className={"h-1.5 w-2/3 rounded-full " + (isLight ? "bg-slate-300" : "bg-zinc-700/70")} />
            {Array.from({ length: Math.max(1, count) }).map((_, row) => (
              <div key={row} className={"rounded-md p-1.5 border " + (isLight ? "bg-white border-slate-200" : "bg-zinc-800/80 border-zinc-700/50")}>
                <div className="h-1 w-7 rounded-full mb-1.5" style={{ background: row === 0 && col === 0 ? accent : (isLight ? "#94a3b8" : "#3f3f46") }} />
                <div className={"h-1.5 w-full rounded-full " + (isLight ? "bg-slate-200" : "bg-zinc-700/60")} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ProjectCard({ project, index, isActive, onOpen, canDelete, onDelete, currentUser, accountsList, theme = "dark" }) {
  const isLight = theme === "light";
  const cols = Array.isArray(project.board) ? project.board : [];
  const totalTasks = cols.reduce((acc, c) => acc + (Array.isArray(c.tasks) ? c.tasks.length : 0), 0);
  const doneCol = cols.find((c) => c.id === "done");
  const doneTasks = doneCol && Array.isArray(doneCol.tasks) ? doneCol.tasks.length : 0;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const collaborators = getProjectCollaborators(project, currentUser, accountsList);

  return (
    <div
      onClick={() => onOpen(index)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(index); } }}
      className={
        "group cursor-pointer text-left rounded-3xl border overflow-hidden hover:border-emerald-500/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col p-1.5 " +
        (isActive
          ? isLight
            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/15 shadow-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
            : "bg-zinc-900/90 border-emerald-500/60 ring-2 ring-emerald-500/15 shadow-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : isLight
          ? "bg-white border-slate-200/80 shadow-sm hover:shadow-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "bg-zinc-900/80 border-zinc-800/60 hover:shadow-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
      }
    >
      <div className={"aspect-[16/9] relative overflow-hidden rounded-2xl border " + (isLight ? "bg-slate-100 border-slate-200/60" : "bg-zinc-800/40 border-zinc-800/60")}>
        <ProjectThumbnail accent={project.dot} board={project.board} theme={theme} />
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {isActive && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-400 text-zinc-950 shadow-sm">
              Aktif
            </span>
          )}
          {project.tag && (
            <span className={"text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border backdrop-blur-md " + (isLight ? "bg-white/90 text-zinc-700 border-slate-200" : "bg-zinc-900/85 text-zinc-300 border-zinc-700/70")}>
              {project.tag}
            </span>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project);
              }}
              title="Hapus papan proyek"
              className={"w-6.5 h-6.5 rounded-full border backdrop-blur-md flex items-center justify-center transition active:scale-90 " + (isLight ? "bg-white/90 border-slate-200 text-zinc-500 hover:text-rose-600 hover:border-rose-200" : "bg-zinc-900/85 border-zinc-700/70 text-zinc-400 hover:text-rose-400 hover:border-rose-800")}
            >
              <Icon.Trash width={12} height={12} />
            </button>
          )}
        </div>
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: project.dot }} />
          <h4 className={"font-display text-[15px] font-bold tracking-tight truncate " + (isLight ? "text-zinc-900" : "text-zinc-50")}>{project.name}</h4>
          <span className={"text-[10px] font-semibold border rounded-full px-2.5 py-0.5 flex-shrink-0 ml-auto " + (isLight ? "text-zinc-600 border-slate-200/80 bg-slate-50" : "text-zinc-400 border-zinc-700/60 bg-zinc-800/50")}>
            {collaborators.length > 1 ? `Tim (${collaborators.length})` : "Pribadi"}
          </span>
        </div>
        <p className={"text-[12.5px] leading-relaxed line-clamp-2 mb-3 flex-1 " + (isLight ? "text-zinc-600" : "text-zinc-400")}>{project.description}</p>

        {/* Mini progress bar per papan Kanban */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className={isLight ? "text-zinc-500 font-medium" : "text-zinc-400 font-medium"}>
              {totalTasks} tugas · {doneTasks} selesai
            </span>
            <span className={"font-mono font-bold " + (isLight ? "text-emerald-700" : "text-emerald-400")}>{pct}%</span>
          </div>
          <div className={"h-1.5 rounded-full overflow-hidden " + (isLight ? "bg-slate-100" : "bg-zinc-800")}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: `${pct}%`, background: project.dot || "#34D399" }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <div className="flex">
              {collaborators.slice(0, 4).map((m, i) =>
                m.photoURL ? (
                  <img
                    key={m.email || i}
                    src={m.photoURL}
                    alt={m.name}
                    title={`${m.name} (${m.email})`}
                    referrerPolicy="no-referrer"
                    className={
                      "w-6 h-6 rounded-lg object-cover border-2 -ml-1.5 first:ml-0 shadow-2xs " +
                      (isLight ? "border-white" : "border-zinc-900")
                    }
                  />
                ) : (
                  <span
                    key={m.email || i}
                    title={`${m.name} (${m.email})`}
                    className={"w-6 h-6 rounded-lg border-2 -ml-1.5 first:ml-0 text-white text-[9px] font-bold flex items-center justify-center shadow-2xs " + (isLight ? "border-white" : "border-zinc-900")}
                    style={{ background: m.color }}
                  >
                    {m.initials}
                  </span>
                )
              )}
            </div>
            <span className={"text-[11px] " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
              {collaborators.length === 1 ? "Hanya kamu" : `${collaborators.length} anggota`}
            </span>
          </div>
          <span className={"text-[11px] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform " + (isLight ? "text-emerald-700" : "text-emerald-400")}>
            Buka Papan →
          </span>
        </div>
      </div>
    </div>
  );
}

function AddProjectCard({ onClick, theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <button
      onClick={onClick}
      className={"rounded-3xl border-[1.5px] border-dashed flex flex-col items-center justify-center gap-2.5 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-[240px] " + (isLight ? "border-slate-300/80 text-zinc-500 hover:border-emerald-500 hover:text-emerald-700 hover:bg-slate-50/80" : "border-zinc-700/70 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-zinc-900/50")}
    >
      <span className={"w-11 h-11 rounded-2xl flex items-center justify-center border transition-colors " + (isLight ? "bg-slate-100 border-slate-200/80" : "bg-zinc-900 border-zinc-800/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")}>
        <Icon.Plus />
      </span>
      <span className="text-[13.5px] font-bold">Buat Papan Proyek Baru</span>
      <span className={"text-[11.5px] max-w-[22ch] text-center " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
        Tersimpan otomatis di tabel <code className="font-mono">projects</code> Firestore
      </span>
    </button>
  );
}


function SettingsRow({ label, description, children, last, theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <div className={"grid grid-cols-1 sm:grid-cols-[1fr_1.1fr] gap-3 sm:gap-8 py-5 " + (last ? "" : (isLight ? "border-b border-slate-200/70" : "border-b border-zinc-800/60"))}>
      <div>
        <div className={"text-[13.5px] font-semibold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>{label}</div>
        {description && <p className={"text-[12.5px] mt-1 leading-relaxed max-w-[38ch] " + (isLight ? "text-zinc-600" : "text-zinc-400")}>{description}</p>}
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function TaskCardBody({ task, theme = "dark", colId, onDelete }) {
  const isLight = theme === "light";
  const m = resolveAssigneeProfile(task.assignee);
  const pct = checklistPct(task);
  const priorityClass = isLight ? PRIORITY_CLASS_LIGHT[task.priority] : PRIORITY_CLASS[task.priority];
  const commentsList = Array.isArray(task.comments) ? task.comments : [];
  const commentCount = commentsList.length;
  const labelsList = Array.isArray(task.labels) ? task.labels : [];
  const doneChecklistCount = Array.isArray(task.checklist)
    ? task.checklist.filter((c) => c.done).length
    : 0;
  const totalChecklistCount = Array.isArray(task.checklist) ? task.checklist.length : 0;
  const dueMeta = evaluateTaskDue(task, colId, isLight);

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={"inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md " + priorityClass}>
          {PRIORITY_LABEL[task.priority]}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          {task.points != null && (
            <span className={"text-[10px] font-mono tabular-nums border rounded-md px-1.5 py-0.5 flex-shrink-0 " + (isLight ? "text-zinc-600 border-slate-200/80 bg-slate-50" : "text-zinc-400 border-zinc-700/70 bg-zinc-900/50")}>
              {task.points} pt
            </span>
          )}
          {onDelete && (
            <div data-no-drag className="flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                aria-label="Hapus tugas"
                className={"w-5.5 h-5.5 rounded-md transition flex items-center justify-center flex-shrink-0 active:scale-90 " + (isLight ? "text-zinc-400 hover:text-zinc-700 hover:bg-slate-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700")}
              >
                <Icon.Dots />
              </button>
            </div>
          )}
        </div>
      </div>

      {labelsList.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {labelsList.map((lbl, idx) => {
            const preset = TASK_LABEL_PRESETS.find(
              (p) => p.id === lbl.id || p.name.toLowerCase() === String(lbl.name || "").toLowerCase()
            );
            const pillCls = preset
              ? isLight
                ? preset.light
                : preset.dark
              : isLight
              ? "bg-slate-100 text-zinc-700 border-slate-200"
              : "bg-zinc-800/90 text-zinc-300 border-zinc-700";
            const dotColor = lbl.dot || preset?.dot || "#10B981";
            return (
              <span
                key={`${lbl.id || lbl.name}-${idx}`}
                className={"inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border " + pillCls}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                <span>{lbl.name}</span>
              </span>
            );
          })}
        </div>
      )}

      <div className={"text-[13.5px] font-semibold leading-snug " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
        {task.title}
      </div>

      {commentCount > 0 && (
        <div className={"flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-1 rounded-md w-fit " +
          (isLight ? "bg-blue-50 text-blue-800 border border-blue-200" : "bg-blue-950/70 text-blue-300 border border-blue-800/80")}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
          </span>
          <Icon.ChatBubble width={11} height={11} className={isLight ? "text-blue-600" : "text-blue-400"} />
          <span>{commentCount} komentar</span>
        </div>
      )}

      {totalChecklistCount > 0 && (
        <div className="flex items-center gap-2">
          <div className={"flex-1 h-1.5 rounded-full overflow-hidden " + (isLight ? "bg-zinc-200" : "bg-zinc-700")}>
            <div className="h-full w-full bg-emerald-500 rounded-full origin-left transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
          <span className={"text-[10.5px] font-mono tabular-nums " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
            {doneChecklistCount}/{totalChecklistCount} ({pct}%)
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mt-0.5">
        {dueMeta.status === "none" ? (
          <span className={"text-[11px] truncate " + dueMeta.pillCls}>{dueMeta.label}</span>
        ) : (
          <span
            className={
              "inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded-lg transition-all " +
              dueMeta.pillCls
            }
            title={
              dueMeta.badgeText
                ? `Tenggat: ${dueMeta.label} (${dueMeta.badgeText})`
                : `Tenggat: ${dueMeta.label}`
            }
          >
            {dueMeta.dotCls && (
              <span className={"w-1.5 h-1.5 rounded-full flex-shrink-0 " + dueMeta.dotCls} />
            )}
            <span>{dueMeta.label}</span>
            {dueMeta.badgeText && dueMeta.label.toLowerCase() !== dueMeta.badgeText.toLowerCase() && (
              <span className="font-mono text-[9.5px] opacity-90">· {dueMeta.badgeText}</span>
            )}
          </span>
        )}
        {task.timeSpent > 0 && (
          <span
            className={"inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border " +
              (isLight ? "bg-slate-100 border-slate-200 text-zinc-600" : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300")}
            title={`Total waktu pengerjaan: ${Math.floor(task.timeSpent / 60)} menit (${task.timeSpent} detik)`}
          >
            <span>⏱</span>
            <span>{Math.floor(task.timeSpent / 60) > 0 ? `${Math.floor(task.timeSpent / 60)}m` : `${task.timeSpent}s`}</span>
          </span>
        )}
        {m ? (
          m.photoURL ? (
            <img
              src={m.photoURL}
              alt={m.name}
              title={m.name}
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-lg object-cover border border-white/20 shadow-xs flex-shrink-0"
            />
          ) : (
            <span
              title={`${m.name}${m.email ? ` (${m.email})` : ""}`}
              className="w-6 h-6 rounded-lg text-[9.5px] font-bold text-white flex items-center justify-center shadow-xs flex-shrink-0 ring-1 ring-white/15"
              style={{ background: m.color || "#10B981" }}
            >
              {m.initials}
            </span>
          )
        ) : (
          <span className={"text-[10.5px] border border-dashed rounded-md px-2 py-0.5 flex-shrink-0 " + (isLight ? "text-zinc-500 border-slate-300/80 bg-slate-50" : "text-zinc-500 border-zinc-700/70")}>
            Belum diambil
          </span>
        )}
      </div>
    </>
  );
}

function TaskCard({
  task,
  colId,
  colTheme,
  theme,
  onOpen,
  onDelete,
  onStartDrag,
  draggable,
  isGhostSource,
  dropIndicator = null,
  locked,
  isCaptain,
  isPersonalBoard = false,
  onTogglePriority,
  bulkMode,
  isSelected,
  onToggleSelect,
}) {
  const isLight = theme === "light";
  const commentsList = Array.isArray(task.comments) ? task.comments : [];
  const hasComments = commentsList.length > 0;

  return (
    <div
      data-taskid={task.id}
      onPointerDown={(e) => {
        if (e.target.closest("[data-no-drag]")) return;
        if (bulkMode) {
          onToggleSelect(task.id);
          return;
        }
        onStartDrag(e, task);
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (bulkMode) onToggleSelect(task.id);
          else onOpen(task.id);
        }
      }}
      className={
        "group relative rounded-2xl p-3.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col gap-2.5 " +
        colTheme.cardAccent + " " +
        (isGhostSource
          ? colTheme.cardGhost
          : (locked
              ? (isLight ? "bg-slate-100/70 border border-slate-200/80 opacity-70 " : "bg-zinc-900/40 border border-zinc-800/80 opacity-65 ")
              : colTheme.cardBg + " " + colTheme.cardHover + " hover:-translate-y-0.5 hover:shadow-xl ") +
            (draggable ? "cursor-grab active:cursor-grabbing " : locked ? "cursor-not-allowed " : "cursor-pointer ") +
            (hasComments ? (isLight ? "ring-1 ring-blue-400/60 " : "ring-1 ring-blue-500/50 ") : "") +
            (isSelected ? "ring-2 ring-emerald-500 shadow-md shadow-emerald-500/15 " : ""))
      }
      style={{
        boxShadow: isLight
          ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px -2px rgba(0,0,0,0.05)"
          : "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 16px -4px rgba(0,0,0,0.4)",
      }}
    >
      {dropIndicator === "before" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-2 left-2 right-2 h-1 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] z-20"
        />
      )}
      {dropIndicator === "after" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2 left-2 right-2 h-1 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] z-20"
        />
      )}
      {isGhostSource ? (
        <div className="h-[52px]" />
      ) : (
        <>
          {/* Mode Pemilihan Massal (Bulk Checkbox) — Hanya tampil di Papan Tim */}
          {!isPersonalBoard && bulkMode && (
            <div data-no-drag className="flex items-center gap-2 pb-1 border-b border-dashed" style={{ borderColor: isLight ? "#CBD5E1" : "#3F3F46" }}>
              <input
                type="checkbox"
                checked={!!isSelected}
                onChange={() => onToggleSelect(task.id)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer"
              />
              <span className={"text-[11px] font-bold " + (isSelected ? "text-emerald-500" : (isLight ? "text-zinc-600" : "text-zinc-400"))}>
                {isSelected ? "Terpilih" : "Pilih kartu"}
              </span>
            </div>
          )}

          {/* Status Prioritas / Gembok & Tombol Kapten — Hanya tampil di Papan Tim */}
          {!isPersonalBoard && (
            <div className="flex items-center justify-between gap-1 flex-wrap">
              {task.prioritized ? (
                <span
                  className={"inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md " +
                    (isLight ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-amber-950/80 text-amber-300 border border-amber-800/60")}
                  title="Tugas ini diprioritaskan oleh Kapten"
                >
                  <Icon.StarFilled width={10} height={10} className="text-amber-500" /> Prioritas Kapten
                </span>
              ) : locked ? (
                <span
                  className={"inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md " +
                    (isLight ? "bg-slate-200/80 text-zinc-600 border border-slate-300" : "bg-zinc-800 text-zinc-400 border border-zinc-700")}
                  title="Kartu ini terkunci — hanya bisa dipindahkan setelah diprioritaskan Kapten"
                >
                  <Icon.Lock width={10} height={10} /> Terkunci (Non-Prioritas)
                </span>
              ) : <span />}

              {/* Tombol Prioritas Langsung untuk Kapten */}
              {isCaptain && !bulkMode && (
                <button
                  data-no-drag
                  onClick={(e) => { e.stopPropagation(); onTogglePriority(task.id); }}
                  title={task.prioritized ? "Klik untuk membatalkan prioritas" : "Klik untuk memprioritaskan kartu ini"}
                  className={"ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold transition active:scale-95 shadow-xs " +
                    (task.prioritized
                      ? (isLight ? "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300" : "bg-amber-950/70 text-amber-300 hover:bg-amber-900 border border-amber-700")
                      : (isLight ? "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-300" : "bg-zinc-800 text-zinc-300 hover:bg-emerald-950/60 hover:text-emerald-300 hover:border-emerald-700 border border-zinc-700"))}
                >
                  {task.prioritized ? <Icon.StarFilled width={11} height={11} className="text-amber-500" /> : <Icon.Star width={11} height={11} />}
                  <span>{task.prioritized ? "Prioritas" : "+ Prioritaskan"}</span>
                </button>
              )}

              {!locked && !bulkMode && (
                <div data-no-drag className="flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                    aria-label="Hapus tugas"
                    className={"w-5.5 h-5.5 rounded-md transition flex items-center justify-center flex-shrink-0 active:scale-90 " + (isLight ? "text-zinc-400 hover:text-zinc-700 hover:bg-slate-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700")}
                  >
                    <Icon.Dots />
                  </button>
                </div>
              )}
            </div>
          )}

          <TaskCardBody
            task={task}
            theme={theme}
            colId={colId}
            isPersonalBoard={isPersonalBoard}
            onDelete={isPersonalBoard && !locked && !bulkMode ? onDelete : null}
          />
        </>
      )}
    </div>
  );
}

function AddTaskInline({ colId, colName, isEmpty, colTheme, theme, disabled, onAdd }) {
  const isLight = theme === "light";
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleSubmit() {
    if (value.trim()) {
      onAdd(colId, value.trim());
      setValue("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title={disabled ? "Viewer tidak dapat menambah tugas" : `Tambah kartu tugas baru di ${colName || "kolom ini"}`}
        className={
          "group w-full rounded-2xl border-[1.5px] border-dashed px-3.5 py-5 min-h-[124px] flex flex-col items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer " +
          (colTheme.addCard || colTheme.btnGhost)
        }
      >
        <span
          className={
            "w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 " +
            (colTheme.addIcon || "")
          }
        >
          <Icon.Plus width={15} height={15} />
        </span>
        <span
          className={
            "text-[13px] font-bold tracking-tight transition-colors " +
            (colTheme.addTitle || "")
          }
        >
          Buat Kartu Tugas Baru
        </span>
        <span
          className={
            "text-[11px] max-w-[22ch] text-center leading-snug transition-colors " +
            (colTheme.addSub || "")
          }
        >
          {isEmpty
            ? `Belum ada tugas di ${colName || "kolom ini"}`
            : `Tambahkan ke kolom ${colName || "ini"}`}
        </span>
      </button>
    );
  }

  return (
    <div
      className={
        "rounded-2xl p-3.5 border flex flex-col gap-2.5 min-h-[124px] justify-between transition-all duration-200 " +
        (colTheme.addForm || "")
      }
    >
      <div className="flex items-center justify-between">
        <span className={"text-[10.5px] font-bold uppercase tracking-wider " + (colTheme.addLabel || "")}>
          + Kartu Baru · {colName}
        </span>
        <span className={"text-[10px] font-mono " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
          Enter ↵
        </span>
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            handleSubmit();
          } else if (e.key === "Escape") {
            setValue("");
            setOpen(false);
          }
        }}
        placeholder="Ketik judul tugas baru..."
        className={
          "w-full px-3 py-2 rounded-xl border text-[12.5px] font-medium focus:outline-none focus:ring-2 transition " +
          colTheme.inputBg
        }
      />
      <div className="flex items-center justify-end gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => {
            setValue("");
            setOpen(false);
          }}
          className={
            "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer " +
            (isLight
              ? "text-zinc-500 hover:bg-slate-100 hover:text-zinc-800"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200")
          }
        >
          Batal
        </button>
        <button
          type="button"
          disabled={!value.trim()}
          onClick={handleSubmit}
          className={
            "px-3 py-1 rounded-lg text-[11px] font-extrabold transition active:scale-95 disabled:opacity-40 cursor-pointer " +
            (colTheme.addSubmit || "bg-emerald-400 text-zinc-950 hover:bg-emerald-300")
          }
        >
          Tambah Kartu
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({
  col,
  colIndex = 0,
  totalCols = 1,
  filteredTasks,
  isFiltering = false,
  onResetFilter,
  role,
  isPersonalBoard = false,
  lockPriority,
  theme,
  onOpenTask,
  onDeleteTask,
  onAddTask,
  onStartDrag,
  drag,
  onTogglePriority,
  bulkMode,
  selectedTaskIds,
  onToggleSelect,
  onUpdateColumn,
  onMoveColumn,
  onDeleteColumn,
}) {
  const isLight = theme === "light";
  const isViewer = !isPersonalBoard && role === "viewer";
  const isCaptain = isPersonalBoard || role === "admin";
  const isMember = !isPersonalBoard && role === "member";
  const isOver = !!drag && drag.hoverId === col.id;
  const hasWip = col.wip != null && Number(col.wip) > 0;
  const wipNum = hasWip ? Number(col.wip) : null;
  const atWip = hasWip && col.tasks.length >= wipNum;
  const overWip = hasWip && col.tasks.length > wipNum;
  const wipPct = hasWip ? Math.min(100, Math.round((col.tasks.length / wipNum) * 100)) : 0;
  const colTheme = resolveColTheme(col, theme);
  const visibleTasks = Array.isArray(filteredTasks) ? filteredTasks : col.tasks;

  const [configOpen, setConfigOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(col.name || "");
  const [wipDraft, setWipDraft] = useState(hasWip ? String(wipNum) : "");
  const [confirmDeleteCol, setConfirmDeleteCol] = useState(false);

  useEffect(() => {
    setNameDraft(col.name || "");
    setWipDraft(col.wip != null && Number(col.wip) > 0 ? String(col.wip) : "");
    setConfirmDeleteCol(false);
  }, [col.id, col.name, col.wip]);

  function handleSaveColumnConfig(e) {
    if (e) e.preventDefault();
    if (!onUpdateColumn) return;
    const cleanName = nameDraft.trim() || col.name || "Kolom";
    const parsedWip = wipDraft === "" || Number(wipDraft) <= 0 ? null : Math.min(99, Math.max(1, Math.round(Number(wipDraft))));
    onUpdateColumn(col.id, { name: cleanName, wip: parsedWip });
    setConfigOpen(false);
  }

  return (
    <div data-colid={col.id} className="flex flex-col w-72 flex-shrink-0">
      <div className="flex flex-col gap-1.5 px-1.5 pb-2.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-2xs" style={{ background: col.dot }} />
            <h4 className={"text-[13.5px] font-bold truncate " + colTheme.colHeader} title={col.name}>
              {col.name}
            </h4>
            <button
              type="button"
              onClick={() => isCaptain && setConfigOpen((v) => !v)}
              title={
                hasWip
                  ? `Batas WIP: ${col.tasks.length} dari maksimal ${wipNum} kartu${isCaptain ? " (Klik untuk atur WIP)" : ""}`
                  : isCaptain
                  ? "Klik untuk mengatur batas WIP & kolom"
                  : `${col.tasks.length} kartu`
              }
              className={
                "text-[11px] rounded-full px-2 py-0.5 font-mono tabular-nums font-bold flex items-center gap-1 flex-shrink-0 transition " +
                (isCaptain ? "cursor-pointer hover:scale-105 " : "cursor-default ") +
                (overWip
                  ? isLight
                    ? "bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"
                    : "bg-rose-950/90 text-rose-300 border border-rose-700/80 shadow-2xs"
                  : atWip
                  ? isLight
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-amber-950/80 text-amber-300 border border-amber-800/70"
                  : colTheme.badge)
              }
            >
              <span>
                {isFiltering && visibleTasks.length !== col.tasks.length
                  ? `${visibleTasks.length}/${col.tasks.length}`
                  : `${col.tasks.length}${hasWip ? `/${wipNum}` : ""}`}
              </span>
              {hasWip && (
                <span className="text-[9px] uppercase tracking-wider opacity-85">
                  {overWip ? "OVER" : atWip ? "MAX" : "WIP"}
                </span>
              )}
            </button>
          </div>

          {isCaptain && !bulkMode && (
            <button
              type="button"
              onClick={() => setConfigOpen((v) => !v)}
              title="Kustomisasi Kolom & Batas WIP"
              aria-label={`Atur kolom ${col.name}`}
              className={
                "w-6.5 h-6.5 rounded-lg border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer active:scale-90 " +
                (configOpen
                  ? "bg-emerald-400 text-zinc-950 border-emerald-300 shadow-xs"
                  : isLight
                  ? "bg-white/80 border-slate-200/90 text-zinc-500 hover:text-zinc-900 hover:bg-white"
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")
              }
            >
              <Icon.Settings width={12} height={12} />
            </button>
          )}
        </div>

        {/* Bar Indikator Kapasitas WIP */}
        {hasWip && (
          <div className="flex items-center gap-2 px-0.5">
            <div className={"flex-1 h-1 rounded-full overflow-hidden " + (isLight ? "bg-slate-200/90" : "bg-zinc-800/90")}>
              <div
                className={
                  "h-full rounded-full transition-all duration-300 " +
                  (overWip
                    ? "bg-rose-500"
                    : atWip
                    ? "bg-amber-500"
                    : "bg-emerald-500")
                }
                style={{ width: `${wipPct}%` }}
              />
            </div>
            <span
              className={
                "text-[9.5px] font-mono font-bold " +
                (overWip
                  ? isLight
                    ? "text-rose-600"
                    : "text-rose-400"
                  : atWip
                  ? isLight
                    ? "text-amber-700"
                    : "text-amber-400"
                  : isLight
                  ? "text-zinc-400"
                  : "text-zinc-500")
              }
            >
              {overWip
                ? `Melebihi WIP (+${col.tasks.length - wipNum})`
                : atWip
                ? "Batas WIP Penuh"
                : `Sisa ${wipNum - col.tasks.length} slot`}
            </span>
          </div>
        )}
      </div>

      {/* Panel Inline Kustomisasi Kolom & Batas WIP */}
      {isCaptain && configOpen && (
        <form
          onSubmit={handleSaveColumnConfig}
          className={
            "mb-2.5 rounded-2xl p-3.5 border flex flex-col gap-3 text-xs transition-all animate-in fade-in " +
            (isLight
              ? "bg-white border-slate-200 shadow-lg shadow-slate-200/60 text-zinc-800"
              : "bg-zinc-900/95 border-zinc-700/80 shadow-xl shadow-black/60 text-zinc-100")
          }
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[11.5px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
              <span>Atur Kolom & WIP</span>
            </span>
            <button
              type="button"
              onClick={() => setConfigOpen(false)}
              className={"w-5.5 h-5.5 rounded-md flex items-center justify-center cursor-pointer " + (isLight ? "text-zinc-400 hover:bg-slate-100" : "text-zinc-400 hover:bg-zinc-800")}
            >
              <Icon.X width={11} height={11} />
            </button>
          </div>

          <div>
            <label className={"block text-[10.5px] font-bold mb-1 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
              Nama Kolom Kanban
            </label>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Contoh: Sedang Berjalan"
              className={
                "w-full px-2.5 py-1.5 rounded-xl border text-[12px] font-semibold outline-none focus:ring-2 focus:ring-emerald-500/40 " +
                (isLight ? "bg-slate-50 border-slate-300 text-zinc-900" : "bg-zinc-950 border-zinc-700 text-zinc-100")
              }
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={"text-[10.5px] font-bold " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                Batas Maksimal WIP (Kartu)
              </label>
              <span className={"text-[10px] font-mono " + (isLight ? "text-emerald-700" : "text-emerald-400")}>
                {wipDraft ? `Maks ${wipDraft} kartu` : "Tanpa batas"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 mb-1.5">
              {[
                { label: "∞", val: "" },
                { label: "2", val: "2" },
                { label: "3", val: "3" },
                { label: "4", val: "4" },
                { label: "5", val: "5" },
                { label: "6", val: "6" },
                { label: "8", val: "8" },
              ].map((opt) => {
                const active = String(wipDraft) === opt.val;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setWipDraft(opt.val)}
                    className={
                      "px-2 py-1 rounded-lg text-[10.5px] font-mono font-bold border transition cursor-pointer " +
                      (active
                        ? "bg-emerald-400 text-zinc-950 border-emerald-300 shadow-2xs"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-zinc-600 hover:bg-slate-100"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800")
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
              <input
                type="number"
                min="1"
                max="99"
                value={wipDraft}
                onChange={(e) => setWipDraft(e.target.value)}
                placeholder="Kustom"
                className={
                  "w-16 px-2 py-1 rounded-lg border text-[11px] font-mono outline-none " +
                  (isLight ? "bg-slate-50 border-slate-300 text-zinc-900" : "bg-zinc-950 border-zinc-700 text-zinc-100")
                }
              />
            </div>
          </div>

          <div>
            <label className={"block text-[10.5px] font-bold mb-1.5 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
              Warna Gradien Kolom
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLUMN_COLOR_PRESETS.map((preset) => {
                const selected =
                  col.themeKey === preset.themeKey ||
                  (!col.themeKey && String(col.dot || "").toLowerCase() === preset.dot.toLowerCase());
                return (
                  <button
                    key={preset.themeKey}
                    type="button"
                    onClick={() =>
                      onUpdateColumn &&
                      onUpdateColumn(col.id, { dot: preset.dot, themeKey: preset.themeKey })
                    }
                    title={preset.label}
                    className={
                      "w-6 h-6 rounded-full flex items-center justify-center transition cursor-pointer " +
                      (selected ? "ring-2 ring-offset-2 ring-emerald-400 scale-110 " + (isLight ? "ring-offset-white" : "ring-offset-zinc-900") : "opacity-75 hover:opacity-100")
                    }
                    style={{ background: preset.dot }}
                  >
                    {selected && <span className="w-2 h-2 rounded-full bg-white shadow-xs" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Geser Posisi Kolom & Hapus Kolom */}
          <div className={"flex items-center justify-between gap-1.5 pt-2 border-t " + (isLight ? "border-slate-200" : "border-zinc-800")}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={colIndex <= 0}
                onClick={() => onMoveColumn && onMoveColumn(col.id, -1)}
                title="Geser kolom ke kiri"
                className={
                  "px-2 py-1 rounded-lg border text-[10.5px] font-bold transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed " +
                  (isLight ? "border-slate-200 bg-slate-50 text-zinc-700 hover:bg-slate-100" : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800")
                }
              >
                ← Kiri
              </button>
              <button
                type="button"
                disabled={colIndex >= totalCols - 1}
                onClick={() => onMoveColumn && onMoveColumn(col.id, 1)}
                title="Geser kolom ke kanan"
                className={
                  "px-2 py-1 rounded-lg border text-[10.5px] font-bold transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed " +
                  (isLight ? "border-slate-200 bg-slate-50 text-zinc-700 hover:bg-slate-100" : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800")
                }
              >
                Kanan →
              </button>
            </div>

            {totalCols > 1 && onDeleteColumn && (
              !confirmDeleteCol ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCol(true)}
                  className={
                    "px-2 py-1 rounded-lg border text-[10.5px] font-bold transition cursor-pointer " +
                    (isLight ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-rose-900/60 text-rose-400 hover:bg-rose-950/50")
                  }
                >
                  Hapus Kolom
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteColumn(col.id);
                    setConfigOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[10.5px] font-extrabold hover:bg-rose-600 transition cursor-pointer"
                >
                  Ya, Hapus ({col.tasks.length})
                </button>
              )
            )}
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setConfigOpen(false)}
              className={
                "px-2.5 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer " +
                (isLight ? "text-zinc-500 hover:bg-slate-100" : "text-zinc-400 hover:bg-zinc-800")
              }
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-emerald-400 text-zinc-950 text-[11px] font-extrabold hover:bg-emerald-300 transition cursor-pointer shadow-xs"
            >
              Simpan Kolom
            </button>
          </div>
        </form>
      )}

      <div
        data-colid={col.id}
        className={"rounded-2xl p-2.5 flex-1 flex flex-col gap-2.5 min-h-[140px] transition-colors border " + (isOver ? colTheme.dropOver : colTheme.colBg)}
      >
        {visibleTasks.map((t) => {
          const locked = !isPersonalBoard && isMember && !t.prioritized;
          const canDrag = isPersonalBoard || isCaptain || (isMember && t.prioritized);
          const isSelected = selectedTaskIds?.includes(t.id);
          return (
            <TaskCard
              key={t.id}
              task={t}
              colId={col.id}
              colTheme={colTheme}
              theme={theme}
              onOpen={onOpenTask}
              onDelete={onDeleteTask}
              onStartDrag={(e) => onStartDrag(e, t, col.id, canDrag)}
              draggable={canDrag && !bulkMode}
              locked={locked}
              isCaptain={isCaptain}
              isPersonalBoard={isPersonalBoard}
              onTogglePriority={onTogglePriority}
              bulkMode={bulkMode}
              isSelected={isSelected}
              onToggleSelect={onToggleSelect}
              isGhostSource={!!drag && drag.id === t.id}
              dropIndicator={
                drag && drag.hoverTaskId === t.id && drag.id !== t.id
                  ? drag.hoverTaskPos
                  : null
              }
            />
          );
        })}
        {isFiltering && visibleTasks.length === 0 && col.tasks.length > 0 && (
          <div
            className={
              "rounded-xl px-3 py-5 text-center border border-dashed flex flex-col items-center gap-1.5 " +
              (isLight
                ? "border-slate-300/80 bg-white/50 text-zinc-500"
                : "border-zinc-800 bg-zinc-950/30 text-zinc-500")
            }
          >
            <span className="text-[11.5px] font-medium">
              Tidak ada kartu yang cocok ({col.tasks.length} tersembunyi)
            </span>
            {onResetFilter && (
              <button
                type="button"
                onClick={onResetFilter}
                className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 underline underline-offset-2 cursor-pointer"
              >
                Tampilkan semua
              </button>
            )}
          </div>
        )}
        <AddTaskInline
          colId={col.id}
          colName={col.name}
          isEmpty={col.tasks.length === 0 && !isFiltering}
          colTheme={colTheme}
          theme={theme}
          disabled={isViewer || bulkMode}
          onAdd={onAddTask}
        />
      </div>
    </div>
  );
}

function AddColumnInline({ onAddColumn, theme = "dark" }) {
  const isLight = theme === "light";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [wip, setWip] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(COLUMN_COLOR_PRESETS[5]); // Purple default for new custom column
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  function handleSubmit(e) {
    if (e) e.preventDefault();
    const clean = name.trim();
    if (!clean || !onAddColumn) return;
    const parsedWip = wip === "" || Number(wip) <= 0 ? null : Math.min(99, Math.max(1, Math.round(Number(wip))));
    onAddColumn({
      name: clean,
      wip: parsedWip,
      dot: selectedPreset.dot,
      themeKey: selectedPreset.themeKey,
    });
    setName("");
    setWip("");
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="flex flex-col w-72 flex-shrink-0 pt-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            "group rounded-2xl border-[1.5px] border-dashed p-5 min-h-[160px] flex flex-col items-center justify-center gap-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer " +
            (isLight
              ? "border-slate-300/90 bg-white/50 hover:bg-white hover:border-emerald-500/70 text-zinc-600 hover:text-emerald-800 shadow-2xs"
              : "border-zinc-800/90 bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-emerald-500/50 text-zinc-400 hover:text-emerald-300")
          }
        >
          <span
            className={
              "w-10 h-10 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105 " +
              (isLight
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300")
            }
          >
            <Icon.Plus width={16} height={16} />
          </span>
          <span className="text-[13px] font-extrabold tracking-tight">
            + Tambah Kolom Kanban
          </span>
          <span className={"text-[11px] text-center max-w-[22ch] leading-snug " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
            Buat tahapan alur kerja kustom beserta batas WIP & warna gradien
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-72 flex-shrink-0 pt-8">
      <form
        onSubmit={handleSubmit}
        className={
          "rounded-2xl p-4 border flex flex-col gap-3 text-xs transition-all " +
          (isLight
            ? "bg-white border-emerald-300 shadow-lg shadow-emerald-500/5 text-zinc-900"
            : "bg-zinc-900/95 border-emerald-500/40 shadow-xl shadow-black/60 text-zinc-100")
        }
      >
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-[12px] text-emerald-400">
            + Kolom Kanban Baru
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={"w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer " + (isLight ? "text-zinc-400 hover:bg-slate-100" : "text-zinc-400 hover:bg-zinc-800")}
          >
            <Icon.X width={12} height={12} />
          </button>
        </div>

        <div>
          <label className={"block text-[10.5px] font-bold mb-1 " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
            Nama Kolom
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: QA Testing / Siap Rilis"
            className={
              "w-full px-3 py-2 rounded-xl border text-[12.5px] font-semibold outline-none focus:ring-2 focus:ring-emerald-500/40 " +
              (isLight ? "bg-slate-50 border-slate-300 text-zinc-900" : "bg-zinc-950 border-zinc-700 text-zinc-100")
            }
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={"text-[10.5px] font-bold " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
              Batas WIP (Opsional)
            </label>
            <span className="text-[10px] font-mono text-emerald-400">
              {wip ? `Maks ${wip} kartu` : "Tanpa batas"}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { label: "∞", val: "" },
              { label: "3", val: "3" },
              { label: "4", val: "4" },
              { label: "5", val: "5" },
              { label: "8", val: "8" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setWip(opt.val)}
                className={
                  "px-2 py-1 rounded-lg text-[10.5px] font-mono font-bold border transition cursor-pointer " +
                  (String(wip) === opt.val
                    ? "bg-emerald-400 text-zinc-950 border-emerald-300"
                    : isLight
                    ? "bg-slate-50 border-slate-200 text-zinc-600"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400")
                }
              >
                {opt.label}
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="99"
              value={wip}
              onChange={(e) => setWip(e.target.value)}
              placeholder="WIP"
              className={
                "w-14 px-2 py-1 rounded-lg border text-[11px] font-mono outline-none " +
                (isLight ? "bg-slate-50 border-slate-300 text-zinc-900" : "bg-zinc-950 border-zinc-700 text-zinc-100")
              }
            />
          </div>
        </div>

        <div>
          <label className={"block text-[10.5px] font-bold mb-1.5 " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
            Warna Gradien Kolom
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLUMN_COLOR_PRESETS.map((preset) => {
              const selected = selectedPreset.themeKey === preset.themeKey;
              return (
                <button
                  key={preset.themeKey}
                  type="button"
                  onClick={() => setSelectedPreset(preset)}
                  title={preset.label}
                  className={
                    "w-6 h-6 rounded-full flex items-center justify-center transition cursor-pointer " +
                    (selected ? "ring-2 ring-offset-2 ring-emerald-400 scale-110 " + (isLight ? "ring-offset-white" : "ring-offset-zinc-900") : "opacity-75 hover:opacity-100")
                  }
                  style={{ background: preset.dot }}
                >
                  {selected && <span className="w-2 h-2 rounded-full bg-white shadow-xs" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={
              "px-3 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer " +
              (isLight ? "text-zinc-500 hover:bg-slate-100" : "text-zinc-400 hover:bg-zinc-800")
            }
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-400 text-zinc-950 text-[11px] font-extrabold hover:bg-emerald-300 transition disabled:opacity-40 cursor-pointer shadow-xs"
          >
            Tambah Kolom
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   COMMAND PALETTE
   ============================================================ */
function CommandPalette({ open, onClose, board, role, onNavigate, onOpenTask, onAddFirst, onLogout, theme = "dark" }) {
  const isLight = theme === "light";
  const [query, setQuery] = useState("");
  const [navPreviewTitle, setNavPreviewTitle] = useState(null);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "history" | "task" | "cmd"
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("strata-search-history");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const inputRef = useRef(null);
  const listContainerRef = useRef(null);
  const itemRefs = useRef([]);
  const lastNavByKeyboard = useRef(false);

  const saveToHistory = useCallback((entry) => {
    if (!entry || !entry.title) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter(
        (h) => !(h.title === entry.title && h.targetType === entry.targetType)
      );
      const next = [
        {
          id: "hist_" + Date.now().toString(36),
          title: entry.title,
          meta: entry.meta || "Riwayat",
          targetType: entry.targetType || entry.type || "task",
          taskId: entry.taskId || null,
          cmdKey: entry.cmdKey || null,
          priority: entry.priority || null,
          colDot: entry.colDot || null,
        },
        ...filtered,
      ].slice(0, 6);
      try {
        localStorage.setItem("strata-search-history", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  function removeHistoryItem(e, title, targetType) {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const next = prev.filter((h) => !(h.title === title && h.targetType === targetType));
      try {
        localStorage.setItem("strata-search-history", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function clearAllHistory(e) {
    if (e) e.stopPropagation();
    setSearchHistory([]);
    try {
      localStorage.removeItem("strata-search-history");
    } catch {}
  }

  useEffect(() => {
    if (open) {
      setQuery("");
      setNavPreviewTitle(null);
      setFilterTab("all");
      setActiveIndex(0);
      lastNavByKeyboard.current = false;
      setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
    }
  }, [open]);

  const isViewer = role === "viewer";
  const staticCommands = [
    ...(isViewer ? [] : [{ cmdKey: "add-task", title: "Tambah tugas baru", meta: "Aksi Cepat", run: () => { onAddFirst(); onClose(); } }]),
    { cmdKey: "nav-home", title: "Buka Beranda & Proyek", meta: "Navigasi", run: () => { onNavigate("home"); onClose(); } },
    { cmdKey: "nav-board", title: "Buka Papan Kanban", meta: "Navigasi", run: () => { onNavigate("board"); onClose(); } },
    { cmdKey: "nav-members", title: "Buka Anggota & Kolaborator", meta: "Navigasi", run: () => { onNavigate("members"); onClose(); } },
    { cmdKey: "nav-profile", title: "Buka Profil Saya", meta: "Navigasi", run: () => { onNavigate("profile"); onClose(); } },
    { cmdKey: "nav-settings", title: "Buka Pengaturan", meta: "Navigasi", run: () => { onNavigate("settings"); onClose(); } },
    { cmdKey: "logout", title: "Keluar dari akun", meta: "Sesi Akun", run: () => { onLogout(); onClose(); } },
  ];

  const q = query.trim().toLowerCase();
  const cmds = q ? staticCommands.filter((c) => c.title.toLowerCase().includes(q) || c.meta.toLowerCase().includes(q)) : staticCommands;
  // Viewer tidak boleh menemukan judul kartu lewat pencarian — hanya gambaran besar.
  const flatTasks = [];
  if (!isViewer) board.forEach((col) => col.tasks.forEach((t) => flatTasks.push({ task: t, col })));
  const matchedTasks = q
    ? flatTasks.filter(
        (t) =>
          t.task.title.toLowerCase().includes(q) ||
          t.col.name.toLowerCase().includes(q) ||
          (t.task.id && t.task.id.toLowerCase().includes(q))
      )
    : flatTasks;
  const tasks = matchedTasks.slice(0, 8);

  // Riwayat pencarian yang relevan dengan kueri
  const matchedHistory = (isViewer ? searchHistory.filter((h) => h.targetType === "cmd") : searchHistory).filter(
    (h) => !q || h.title.toLowerCase().includes(q) || (h.meta && h.meta.toLowerCase().includes(q))
  );

  const historyItems = matchedHistory.map((h) => ({
    type: "history",
    targetType: h.targetType,
    title: h.title,
    taskId: h.taskId,
    priority: h.priority,
    colDot: h.colDot,
    meta: h.meta || "Riwayat",
    run: () => {
      saveToHistory(h);
      if (h.targetType === "task" && h.taskId) {
        const stillExists = flatTasks.some((ft) => ft.task.id === h.taskId);
        if (stillExists) {
          onOpenTask(h.taskId);
          onClose();
          return;
        }
      }
      if (h.cmdKey) {
        const foundCmd = staticCommands.find((c) => c.cmdKey === h.cmdKey);
        if (foundCmd) {
          foundCmd.run();
          return;
        }
      }
      // Fallback: isi kueri dengan judul riwayat
      setQuery(h.title);
      setNavPreviewTitle(null);
    },
  }));

  const cmdItems = cmds.map((c) => ({
    type: "cmd",
    targetType: "cmd",
    cmdKey: c.cmdKey,
    title: c.title,
    meta: c.meta,
    run: () => {
      saveToHistory({ title: c.title, meta: c.meta, targetType: "cmd", cmdKey: c.cmdKey });
      c.run();
    },
  }));

  const taskItems = tasks.map((t) => ({
    type: "task",
    targetType: "task",
    title: t.task.title,
    taskId: t.task.id,
    priority: t.task.priority,
    colDot: t.col.dot,
    meta: t.col.name,
    run: () => {
      saveToHistory({
        title: t.task.title,
        meta: t.col.name,
        targetType: "task",
        taskId: t.task.id,
        priority: t.task.priority,
        colDot: t.col.dot,
      });
      onOpenTask(t.task.id);
      onClose();
    },
  }));

  const items =
    filterTab === "history"
      ? historyItems
      : filterTab === "task"
      ? taskItems
      : filterTab === "cmd"
      ? cmdItems
      : [...historyItems, ...taskItems, ...cmdItems];

  useEffect(() => {
    setActiveIndex(0);
  }, [query, filterTab]);

  // Auto-scroll daftar hasil agar selalu mengikuti pergerakan ArrowUp / ArrowDown
  useEffect(() => {
    if (!open || !lastNavByKeyboard.current) return;
    lastNavByKeyboard.current = false;
    const container = listContainerRef.current;
    const activeEl = itemRefs.current[activeIndex];
    if (!container || !activeEl) return;

    if (activeIndex === 0) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex, open]);

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      if (navPreviewTitle !== null) {
        e.preventDefault();
        setNavPreviewTitle(null);
        return;
      }
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!items.length) return;
      lastNavByKeyboard.current = true;
      const nextIdx = (activeIndex + 1) % items.length;
      setActiveIndex(nextIdx);
      setNavPreviewTitle(items[nextIdx]?.title ?? null);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      lastNavByKeyboard.current = true;
      const nextIdx = (activeIndex - 1 + items.length) % items.length;
      setActiveIndex(nextIdx);
      setNavPreviewTitle(items[nextIdx]?.title ?? null);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[activeIndex]) items[activeIndex].run();
    }
  }

  if (!open) return null;

  const displayedInputValue = navPreviewTitle !== null ? navPreviewTitle : query;
  let lastType = null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4 transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      {/* Doppelrand Double-Bezel Outer Shell */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className={
          "w-full max-w-[600px] rounded-[32px] p-1.5 border backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
          (isLight
            ? "bg-white/80 border-slate-200/90 shadow-[0_32px_80px_-16px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.95)]"
            : "bg-zinc-900/80 border-white/10 shadow-[0_32px_90px_-16px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.08)]")
        }
        style={SPRING}
      >
        <div
          className={
            "relative overflow-hidden rounded-[26px] border " +
            (isLight
              ? "bg-gradient-to-b from-white via-white to-slate-50/90 border-slate-200/80 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,1)]"
              : "bg-gradient-to-b from-zinc-900 via-zinc-900/98 to-zinc-950 border-white/[0.07] text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]")
          }
        >
          {/* Ambient Top Radial Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[360px] h-[120px] rounded-full blur-3xl opacity-25"
            style={{ background: "radial-gradient(circle, #34D399 0%, transparent 70%)" }}
          />

          {/* Search Input Header */}
          <div className={"relative flex items-center gap-3 px-4 py-3.5 border-b " + (isLight ? "border-slate-200/80" : "border-zinc-800/80")}>
            <span
              className={
                "w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-colors " +
                (isLight
                  ? "bg-emerald-50 border-emerald-200/80 text-emerald-600"
                  : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]")
              }
            >
              <Icon.Search width={16} height={16} />
            </span>
            <input
              ref={inputRef}
              value={displayedInputValue}
              onChange={(e) => {
                setNavPreviewTitle(null);
                setQuery(e.target.value);
              }}
              placeholder="Cari kartu tugas, riwayat, atau jalankan perintah..."
              className={
                "flex-1 border-none outline-none text-[14.5px] font-medium bg-transparent " +
                (isLight ? "text-zinc-900 placeholder-zinc-400" : "text-zinc-50 placeholder-zinc-500")
              }
            />
            {navPreviewTitle !== null && (
              <span
                className={
                  "hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex-shrink-0 " +
                  (isLight
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300")
                }
              >
                ↑↓ Pratinjau
              </span>
            )}
            {(query || navPreviewTitle !== null) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setNavPreviewTitle(null);
                  inputRef.current?.focus();
                }}
                aria-label="Hapus kata kunci"
                className={
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs transition cursor-pointer " +
                  (isLight ? "bg-slate-100 text-zinc-500 hover:bg-slate-200 hover:text-zinc-800" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100")
                }
              >
                <Icon.X width={11} height={11} />
              </button>
            )}
            <kbd
              onClick={onClose}
              className={
                "text-[10.5px] font-mono font-bold rounded-lg px-2 py-1 border cursor-pointer transition " +
                (isLight
                  ? "text-zinc-500 border-slate-200/90 bg-slate-50 hover:bg-slate-100 shadow-2xs"
                  : "text-zinc-400 border-white/10 bg-zinc-800/80 hover:bg-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]")
              }
            >
              ESC
            </kbd>
          </div>

          {/* Quick Filter Tabs */}
          {!isViewer && (
            <div className={"flex items-center justify-between gap-2 px-4 py-2 border-b text-[11.5px] overflow-x-auto " + (isLight ? "border-slate-100 bg-slate-50/60" : "border-zinc-800/60 bg-zinc-950/40")}>
              <div className="flex items-center gap-1.5">
                {[
                  { id: "all", label: "Semua", count: historyItems.length + taskItems.length + cmdItems.length },
                  ...(historyItems.length > 0 ? [{ id: "history", label: "Riwayat", count: historyItems.length }] : []),
                  { id: "task", label: "Kartu Tugas", count: taskItems.length },
                  { id: "cmd", label: "Perintah Cepat", count: cmdItems.length },
                ].map((tab) => {
                  const active = filterTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterTab(tab.id)}
                      className={
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer flex-shrink-0 " +
                        (active
                          ? isLight
                            ? "bg-zinc-900 text-white shadow-2xs"
                            : "bg-emerald-400/15 text-emerald-300 border border-emerald-500/30"
                          : isLight
                          ? "text-zinc-500 hover:text-zinc-800 hover:bg-slate-200/60"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60")
                      }
                    >
                      <span>{tab.label}</span>
                      <span className={"text-[10px] font-mono opacity-75"}>({tab.count})</span>
                    </button>
                  );
                })}
              </div>
              {searchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllHistory}
                  className={"text-[10.5px] font-semibold px-2 py-0.5 rounded-md transition cursor-pointer flex-shrink-0 " + (isLight ? "text-zinc-400 hover:text-rose-600 hover:bg-rose-50" : "text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30")}
                >
                  Hapus Riwayat
                </button>
              )}
            </div>
          )}

          {/* Results List (Auto-scrolls on ArrowUp / ArrowDown) */}
          <div ref={listContainerRef} className="max-h-[48vh] overflow-y-auto p-2.5 scroll-smooth">
            {items.length === 0 && (
              <div className={"py-10 px-5 text-center " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                <div className={"w-10 h-10 rounded-2xl mx-auto mb-2.5 flex items-center justify-center border " + (isLight ? "bg-slate-50 border-slate-200 text-zinc-400" : "bg-zinc-900 border-zinc-800 text-zinc-500")}>
                  <Icon.Search width={16} height={16} />
                </div>
                <div className={"text-[13.5px] font-bold " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                  Tidak ditemukan hasil untuk &ldquo;{query}&rdquo;
                </div>
                <div className="text-xs mt-0.5">Coba kata kunci judul tugas atau perintah lain.</div>
              </div>
            )}
            {items.map((item, i) => {
              const showLabel = item.type !== lastType;
              lastType = item.type;
              const isSelected = i === activeIndex;
              const sectionTitle =
                item.type === "history"
                  ? "Riwayat Pencarian Terakhir"
                  : item.type === "cmd"
                  ? "Perintah & Navigasi"
                  : "Kartu Tugas di Papan Aktif";
              return (
                <div key={`${item.type}-${item.taskId || item.cmdKey || item.title}-${i}`}>
                  {showLabel && (
                    <div className={"text-[10px] uppercase tracking-wider font-extrabold px-3 pt-2.5 pb-1.5 flex items-center justify-between " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                      <span>{sectionTitle}</span>
                    </div>
                  )}
                  <div
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => item.run()}
                    className={
                      "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] " +
                      (isSelected
                        ? isLight
                          ? "bg-emerald-50/90 text-emerald-950 border border-emerald-200/80 shadow-2xs"
                          : "bg-emerald-950/45 text-emerald-200 border border-emerald-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : isLight
                        ? "text-zinc-800 hover:bg-slate-100/80 border border-transparent"
                        : "text-zinc-200 hover:bg-zinc-800/50 border border-transparent")
                    }
                  >
                    <span
                      className={
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors border " +
                        (isSelected
                          ? isLight
                            ? "bg-white text-emerald-600 border-emerald-200 shadow-2xs"
                            : "bg-zinc-900 text-emerald-300 border-emerald-500/40"
                          : item.type === "history"
                          ? isLight
                            ? "bg-amber-50/80 text-amber-600 border-amber-200/70"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          : isLight
                          ? "bg-slate-100 text-zinc-600 border-slate-200/70"
                          : "bg-zinc-800/90 text-zinc-400 border-white/[0.05]")
                      }
                    >
                      {item.type === "history" ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                          <path d="M12 7v5l4 2" />
                        </svg>
                      ) : item.type === "cmd" ? (
                        <Icon.Cmd />
                      ) : (
                        <Icon.Task />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate flex items-center gap-2">
                        <span className="truncate">{item.title}</span>
                        {item.type === "history" && (
                          <span className={"text-[9.5px] font-mono px-1.5 py-0.2 rounded border flex-shrink-0 " + (isLight ? "bg-slate-100 border-slate-200 text-zinc-500" : "bg-zinc-800/80 border-zinc-700 text-zinc-400")}>
                            Terakhir dicari
                          </span>
                        )}
                      </div>
                      {(item.type === "task" || item.targetType === "task") && item.taskId && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={"text-[10px] font-mono " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                            #{String(item.taskId).slice(-4).toUpperCase()}
                          </span>
                          {item.priority && (
                            <span className={"text-[9.5px] font-bold px-1.5 py-0.2 rounded " + (isLight ? PRIORITY_CLASS_LIGHT[item.priority] : PRIORITY_CLASS[item.priority])}>
                              {PRIORITY_LABEL[item.priority]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span
                      className={
                        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 " +
                        (isLight
                          ? "bg-white border-slate-200 text-zinc-600"
                          : "bg-zinc-900/90 border-zinc-800 text-zinc-400")
                      }
                    >
                      {item.colDot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.colDot }} />}
                      {item.meta}
                    </span>
                    {item.type === "history" && (
                      <button
                        type="button"
                        onClick={(e) => removeHistoryItem(e, item.title, item.targetType)}
                        title="Hapus dari riwayat pencarian"
                        className={
                          "w-6 h-6 rounded-lg flex items-center justify-center transition flex-shrink-0 cursor-pointer " +
                          (isLight ? "text-zinc-400 hover:text-rose-600 hover:bg-rose-50" : "text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40")
                        }
                      >
                        <Icon.X width={11} height={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Keyboard Navigation Footer */}
          <div
            className={
              "flex items-center justify-between gap-3 px-4 py-2.5 border-t text-[11px] " +
              (isLight ? "border-slate-200/80 bg-slate-50/80 text-zinc-500" : "border-zinc-800/80 bg-zinc-950/70 text-zinc-500")
            }
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className={"px-1.5 py-0.5 rounded border font-mono text-[10px] " + (isLight ? "bg-white border-slate-200 text-zinc-600" : "bg-zinc-900 border-zinc-800 text-zinc-400")}>↑↓</kbd>
                <span>Ikuti & Geser Otomatis</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className={"px-1.5 py-0.5 rounded border font-mono text-[10px] " + (isLight ? "bg-white border-slate-200 text-zinc-600" : "bg-zinc-900 border-zinc-800 text-zinc-400")}>↵</kbd>
                <span>Buka & Simpan Riwayat</span>
              </span>
            </div>
            <span className="font-mono text-[10.5px] opacity-80">
              {items.length > 0 ? `${activeIndex + 1} / ${items.length}` : "0 hasil"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   KOMPONEN DROPDOWN KUSTOM MEWAH (CUSTOM LUXURY DROPDOWNS)
   ============================================================ */
function CustomDropdown({
  trigger,
  children,
  isOpen,
  onToggle,
  onClose,
  disabled = false,
  className = "",
  menuClassName = "",
  theme = "dark",
}) {
  const containerRef = useRef(null);
  const isLight = theme === "light";

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div ref={containerRef} className={"relative " + className}>
      <div onClick={() => !disabled && onToggle()}>
        {trigger}
      </div>
      {isOpen && !disabled && (
        <div
          className={
            "absolute z-50 mt-1.5 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 " +
            (isLight
              ? "bg-white/95 border-slate-200 text-zinc-900 shadow-slate-300/80"
              : "bg-zinc-900/95 border-white/10 text-zinc-100 shadow-black/90") +
            " " +
            menuClassName
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}

function AssigneeDropdown({
  value,
  members = [],
  onChange,
  disabled = false,
  theme = "dark",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isLight = theme === "light";

  const currentMember =
    members.find((m) => m.key === value || (m.email && String(m.email).toLowerCase() === String(value || "").toLowerCase())) ||
    (value ? resolveAssigneeProfile(value) : null);

  return (
    <CustomDropdown
      isOpen={isOpen}
      onToggle={() => setIsOpen((v) => !v)}
      onClose={() => setIsOpen(false)}
      disabled={disabled}
      theme={theme}
      className="w-full"
      menuClassName="left-0 w-full min-w-[230px] max-h-64 overflow-y-auto"
      trigger={
        <button
          type="button"
          disabled={disabled}
          className={
            "w-full text-left text-[12px] font-bold rounded-xl px-2.5 py-2 border flex items-center justify-between gap-2 transition-all cursor-pointer group " +
            (isOpen
              ? "border-emerald-400 ring-2 ring-emerald-500/20 " + (isLight ? "bg-white text-zinc-900 shadow-sm" : "bg-zinc-950 text-zinc-100 shadow-md")
              : isLight
              ? "bg-white border-slate-200 text-zinc-800 hover:border-slate-300 hover:bg-slate-50/70"
              : "bg-zinc-950 border-zinc-800 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/60") +
            (disabled ? " opacity-60 cursor-not-allowed" : "")
          }
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentMember ? (
              currentMember.photoURL ? (
                <img
                  src={currentMember.photoURL}
                  alt={currentMember.name}
                  referrerPolicy="no-referrer"
                  className="w-5.5 h-5.5 rounded-lg object-cover flex-shrink-0 shadow-xs ring-1 ring-emerald-500/30"
                />
              ) : (
                <span
                  className="w-5.5 h-5.5 rounded-lg text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0 shadow-xs"
                  style={{ background: currentMember.color || "#10B981" }}
                >
                  {currentMember.initials || "U"}
                </span>
              )
            ) : (
              <span
                className={
                  "w-5.5 h-5.5 rounded-lg border border-dashed flex items-center justify-center flex-shrink-0 " +
                  (isLight ? "border-slate-300 text-zinc-400" : "border-zinc-700 text-zinc-500")
                }
              >
                <Icon.User width={12} height={12} />
              </span>
            )}
            <span className="truncate">
              {currentMember
                ? (currentMember.isCollab ? `★ ${currentMember.name}` : currentMember.name)
                : "Belum ditugaskan"}
            </span>
          </div>
          <Icon.Chevron
            width={12}
            height={12}
            className={
              "flex-shrink-0 transition-transform duration-200 opacity-60 group-hover:opacity-100 " +
              (isOpen ? "rotate-180 text-emerald-500" : "")
            }
          />
        </button>
      }
    >
      <div className="space-y-1">
        {/* Opsi Kosongkan / Belum Ditugaskan */}
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setIsOpen(false);
          }}
          className={
            "w-full text-left px-2.5 py-1.5 rounded-xl text-[12px] font-semibold flex items-center justify-between gap-2 transition cursor-pointer " +
            (!value
              ? isLight
                ? "bg-emerald-50 text-emerald-900 font-bold"
                : "bg-emerald-500/15 text-emerald-300 font-bold"
              : isLight
              ? "text-zinc-600 hover:bg-slate-100"
              : "text-zinc-400 hover:bg-zinc-800")
          }
        >
          <div className="flex items-center gap-2">
            <span
              className={
                "w-5.5 h-5.5 rounded-lg border border-dashed flex items-center justify-center flex-shrink-0 " +
                (isLight ? "border-slate-300 text-zinc-400" : "border-zinc-700 text-zinc-500")
              }
            >
              <Icon.User width={12} height={12} />
            </span>
            <span>Belum ditugaskan</span>
          </div>
          {!value && <Icon.Check width={13} height={13} className="text-emerald-500 flex-shrink-0" />}
        </button>

        {members.length > 0 && (
          <div className={"my-1 border-t " + (isLight ? "border-slate-100" : "border-zinc-800/80")} />
        )}

        {/* Daftar Anggota Sah Saja */}
        {members.map((member) => {
          const isSelected = value === member.key || (member.email && String(member.email).toLowerCase() === String(value || "").toLowerCase());
          return (
            <button
              key={member.key}
              type="button"
              onClick={() => {
                onChange(member.key);
                setIsOpen(false);
              }}
              className={
                "w-full text-left px-2.5 py-1.5 rounded-xl text-[12px] font-semibold flex items-center justify-between gap-2 transition cursor-pointer " +
                (isSelected
                  ? isLight
                    ? "bg-emerald-50 text-emerald-900 font-bold"
                    : "bg-emerald-500/15 text-emerald-300 font-bold"
                  : isLight
                  ? "text-zinc-800 hover:bg-slate-100"
                  : "text-zinc-200 hover:bg-zinc-800")
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt={member.name}
                    referrerPolicy="no-referrer"
                    className="w-5.5 h-5.5 rounded-lg object-cover flex-shrink-0 shadow-xs ring-1 ring-emerald-500/30"
                  />
                ) : (
                  <span
                    className="w-5.5 h-5.5 rounded-lg text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0 shadow-xs"
                    style={{ background: member.color || "#10B981" }}
                  >
                    {member.initials || "U"}
                  </span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="truncate">
                    {member.isCollab ? `★ ${member.name}` : member.name}
                  </span>
                  {member.role && (
                    <span className={"text-[10px] capitalize " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                      {member.isOwner ? "Pemilik Papan" : member.role === "viewer" ? "Viewer" : "Anggota"}
                    </span>
                  )}
                </div>
              </div>
              {isSelected && <Icon.Check width={13} height={13} className="text-emerald-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </CustomDropdown>
  );
}

function ColumnDropdown({
  value,
  board = [],
  onChange,
  disabled = false,
  theme = "dark",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isLight = theme === "light";
  const currentCol = board.find((c) => c.id === value) || board[0];

  return (
    <CustomDropdown
      isOpen={isOpen}
      onToggle={() => setIsOpen((v) => !v)}
      onClose={() => setIsOpen(false)}
      disabled={disabled}
      theme={theme}
      className="w-full"
      menuClassName="right-0 sm:left-auto w-full min-w-[220px] max-h-64 overflow-y-auto"
      trigger={
        <button
          type="button"
          disabled={disabled}
          className={
            "w-full text-left text-[12px] font-bold rounded-xl px-2.5 py-2 border flex items-center justify-between gap-2 transition-all cursor-pointer group " +
            (isOpen
              ? "border-emerald-400 ring-2 ring-emerald-500/20 " + (isLight ? "bg-white text-zinc-900 shadow-sm" : "bg-zinc-950 text-zinc-100 shadow-md")
              : isLight
              ? "bg-white border-slate-200 text-zinc-800 hover:border-slate-300 hover:bg-slate-50/70"
              : "bg-zinc-950 border-zinc-800 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/60") +
            (disabled ? " opacity-60 cursor-not-allowed" : "")
          }
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentCol && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-2xs"
                style={{ background: currentCol.dot || "#10B981" }}
              />
            )}
            <span className="truncate">
              {currentCol?.name || "Pilih Kolom"}
            </span>
          </div>
          <Icon.Chevron
            width={12}
            height={12}
            className={
              "flex-shrink-0 transition-transform duration-200 opacity-60 group-hover:opacity-100 " +
              (isOpen ? "rotate-180 text-emerald-500" : "")
            }
          />
        </button>
      }
    >
      <div className="space-y-1">
        {board.map((col) => {
          const isSelected = value === col.id;
          const hasWip = col.wip != null && Number(col.wip) > 0;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => {
                onChange(col.id);
                setIsOpen(false);
              }}
              className={
                "w-full text-left px-2.5 py-2 rounded-xl text-[12px] font-semibold flex items-center justify-between gap-2 transition cursor-pointer " +
                (isSelected
                  ? isLight
                    ? "bg-emerald-50 text-emerald-900 font-bold"
                    : "bg-emerald-500/15 text-emerald-300 font-bold"
                  : isLight
                  ? "text-zinc-800 hover:bg-slate-100"
                  : "text-zinc-200 hover:bg-zinc-800")
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-2xs"
                  style={{ background: col.dot || "#10B981" }}
                />
                <span className="truncate">{col.name}</span>
                {hasWip && (
                  <span className={"text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold " + (isLight ? "bg-slate-100 text-zinc-600" : "bg-zinc-800 text-zinc-400")}>
                    {col.tasks.length}/{col.wip}
                  </span>
                )}
              </div>
              {isSelected && <Icon.Check width={13} height={13} className="text-emerald-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </CustomDropdown>
  );
}

function PriorityDropdown({
  value,
  onChange,
  disabled = false,
  theme = "dark",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isLight = theme === "light";

  const options = [
    { id: "urgent", label: "Mendesak", icon: "🔥", desc: "Prioritas Kritis", badge: isLight ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-rose-950/80 text-rose-300 border-rose-700/80" },
    { id: "high", label: "Tinggi", icon: "⚡", desc: "Sangat Penting", badge: isLight ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-amber-950/80 text-amber-300 border-amber-700/80" },
    { id: "medium", label: "Sedang", icon: "📌", desc: "Normal / Reguler", badge: isLight ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-blue-950/80 text-blue-300 border-blue-700/80" },
    { id: "low", label: "Rendah", icon: "🌱", desc: "Fleksibel / Opsional", badge: isLight ? "bg-slate-100 text-slate-700 border-slate-300" : "bg-zinc-800/80 text-zinc-300 border-zinc-700/80" },
  ];

  const current = options.find((o) => o.id === value) || options[2];

  return (
    <CustomDropdown
      isOpen={isOpen}
      onToggle={() => setIsOpen((v) => !v)}
      onClose={() => setIsOpen(false)}
      disabled={disabled}
      theme={theme}
      menuClassName="left-0 min-w-[210px]"
      trigger={
        <button
          type="button"
          disabled={disabled}
          className={
            "text-[11.5px] font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group " +
            current.badge +
            (isOpen ? " ring-2 ring-emerald-500/30" : "") +
            (disabled ? " opacity-60 cursor-not-allowed" : "")
          }
        >
          <span>{current.icon}</span>
          <span>{current.label}</span>
          <Icon.Chevron
            width={10}
            height={10}
            className={
              "transition-transform duration-200 opacity-60 group-hover:opacity-100 " +
              (isOpen ? "rotate-180" : "")
            }
          />
        </button>
      }
    >
      <div className="space-y-1">
        {options.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
              className={
                "w-full text-left px-2.5 py-1.5 rounded-xl text-[12px] font-semibold flex items-center justify-between gap-2 transition cursor-pointer " +
                (isSelected
                  ? isLight
                    ? "bg-slate-100 text-zinc-900 font-bold"
                    : "bg-zinc-800 text-zinc-100 font-bold"
                  : isLight
                  ? "text-zinc-700 hover:bg-slate-50"
                  : "text-zinc-300 hover:bg-zinc-800/60")
              }
            >
              <div className="flex items-center gap-2">
                <span className="text-[13px]">{opt.icon}</span>
                <div className="flex flex-col">
                  <span>{opt.label}</span>
                  <span className={"text-[10px] " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                    {opt.desc}
                  </span>
                </div>
              </div>
              {isSelected && <Icon.Check width={13} height={13} className="text-emerald-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </CustomDropdown>
  );
}

function PointsDropdown({
  value,
  onChange,
  disabled = false,
  theme = "dark",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isLight = theme === "light";

  return (
    <CustomDropdown
      isOpen={isOpen}
      onToggle={() => setIsOpen((v) => !v)}
      onClose={() => setIsOpen(false)}
      disabled={disabled}
      theme={theme}
      menuClassName="left-0 min-w-[170px]"
      trigger={
        <button
          type="button"
          disabled={disabled}
          title="Story Point"
          className={
            "text-[11.5px] font-mono font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group " +
            (isOpen
              ? "border-emerald-400 ring-2 ring-emerald-500/20 " + (isLight ? "bg-white text-zinc-900" : "bg-zinc-950 text-zinc-100")
              : isLight
              ? "border-slate-300 bg-slate-50 text-zinc-800 hover:border-slate-400"
              : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600") +
            (disabled ? " opacity-60 cursor-not-allowed" : "")
          }
        >
          <span className="text-emerald-500 font-sans text-[11px]">🎯</span>
          <span>{value ?? 3} pt</span>
          <Icon.Chevron
            width={10}
            height={10}
            className={
              "transition-transform duration-200 opacity-60 group-hover:opacity-100 " +
              (isOpen ? "rotate-180" : "")
            }
          />
        </button>
      }
    >
      <div className="space-y-1">
        {POINT_OPTIONS.map((pt) => {
          const isSelected = (value ?? 3) === pt;
          return (
            <button
              key={pt}
              type="button"
              onClick={() => {
                onChange(pt);
                setIsOpen(false);
              }}
              className={
                "w-full text-left px-2.5 py-1.5 rounded-xl text-[12px] font-mono font-bold flex items-center justify-between gap-2 transition cursor-pointer " +
                (isSelected
                  ? isLight
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-emerald-500/15 text-emerald-300"
                  : isLight
                  ? "text-zinc-700 hover:bg-slate-100"
                  : "text-zinc-300 hover:bg-zinc-800")
              }
            >
              <span>{pt} Story Points</span>
              {isSelected && <Icon.Check width={13} height={13} className="text-emerald-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </CustomDropdown>
  );
}

function SortDropdown({
  value,
  onChange,
  theme = "dark",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isLight = theme === "light";

  const options = [
    { id: "default", label: "Urutan Asli", icon: "📋" },
    { id: "priority_desc", label: "Prioritas Tertinggi", icon: "🔥" },
    { id: "points_desc", label: "Story Points Terbesar", icon: "📈" },
    { id: "points_asc", label: "Story Points Terkecil", icon: "📉" },
    { id: "title_asc", label: "Judul (A–Z)", icon: "🔤" },
  ];

  const current = options.find((o) => o.id === value) || options[0];

  return (
    <CustomDropdown
      isOpen={isOpen}
      onToggle={() => setIsOpen((v) => !v)}
      onClose={() => setIsOpen(false)}
      theme={theme}
      menuClassName="right-0 min-w-[200px]"
      trigger={
        <button
          type="button"
          className={
            "px-2.5 py-1 rounded-full border text-[11.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 group " +
            (value !== "default"
              ? isLight
                ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs"
                : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-xs"
              : isLight
              ? "bg-slate-50 border-slate-200 text-zinc-700 hover:border-slate-300"
              : "bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-zinc-700") +
            (isOpen ? " ring-2 ring-emerald-500/20" : "")
          }
        >
          <span>{current.icon}</span>
          <span>{current.label}</span>
          <Icon.Chevron
            width={10}
            height={10}
            className={
              "transition-transform duration-200 opacity-60 group-hover:opacity-100 " +
              (isOpen ? "rotate-180" : "")
            }
          />
        </button>
      }
    >
      <div className="space-y-1">
        {options.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
              className={
                "w-full text-left px-2.5 py-1.5 rounded-xl text-[12px] font-semibold flex items-center justify-between gap-2 transition cursor-pointer " +
                (isSelected
                  ? isLight
                    ? "bg-emerald-50 text-emerald-900 font-bold"
                    : "bg-emerald-500/15 text-emerald-300 font-bold"
                  : isLight
                  ? "text-zinc-700 hover:bg-slate-100"
                  : "text-zinc-300 hover:bg-zinc-800")
              }
            >
              <div className="flex items-center gap-2">
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </div>
              {isSelected && <Icon.Check width={13} height={13} className="text-emerald-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </CustomDropdown>
  );
}

/* ============================================================
   TASK DETAIL PANEL (FULL CARD MANAGEMENT — FITUR NOMOR 2)
   ============================================================ */
function formatIndoShortDate(dateObj) {
  if (!dateObj || Number.isNaN(dateObj.getTime())) return "Tanpa tenggat";
  return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function TaskPanel({
  task,
  col,
  board = [],
  collaborators = [],
  role,
  isPersonalBoard = false,
  myMemberKey,
  onClose,
  onUpdate,
  onToggleChecklist,
  onClaim,
  onAddComment,
  onMoveTask,
  onDeleteTask,
  onDuplicateTask,
  onTogglePriority,
  theme = "dark",
}) {
  const isLight = theme === "light";
  const open = !!task;
  const [localTitle, setLocalTitle] = useState("");
  const [localDesc, setLocalDesc] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [editingChecklistIdx, setEditingChecklistIdx] = useState(null);
  const [editingChecklistValue, setEditingChecklistValue] = useState("");
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [customLabelName, setCustomLabelName] = useState("");
  const [customLabelDot, setCustomLabelDot] = useState("#10B981");
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false);

  // Stopwatch / Time Tracker per Kartu Tugas
  const [timerActive, setTimerActive] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

  function handleStartTimer() {
    if (timerActive) return;
    setTimerActive(true);
    timerIntervalRef.current = setInterval(() => {
      setTimerSec((prev) => prev + 1);
    }, 1000);
  }

  function handlePauseTimer() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimerActive(false);
  }

  function handleLogTimer() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimerActive(false);
    if (timerSec <= 0) return;

    const currentTotal = task?.timeSpent || 0;
    const newTotal = currentTotal + timerSec;
    const newLog = {
      id: "log_" + Date.now().toString(36),
      duration: timerSec,
      user: myMemberKey || role || "user",
      timestamp: new Date().toISOString(),
    };
    const currentLogs = Array.isArray(task?.timeLogs) ? task.timeLogs : [];
    onUpdate(task.id, {
      timeSpent: newTotal,
      timeLogs: [newLog, ...currentLogs],
    });
    setTimerSec(0);
  }

  function formatTimeHMS(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  const taskId = task?.id;
  useEffect(() => {
    if (task) {
      setLocalTitle(task.title || "");
      setLocalDesc(task.desc || "");
      setNewComment("");
      setNewChecklistText("");
      setEditingChecklistIdx(null);
      setLabelPickerOpen(false);
      setDuePickerOpen(false);
      setConfirmDeleteTask(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimerActive(false);
      setTimerSec(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function handleSendComment() {
    const text = newComment.trim();
    if (!text || !onAddComment) return;
    onAddComment(task.id, text);
    setNewComment("");
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!task) return null;

  const isViewer = !isPersonalBoard && role === "viewer";
  const isCaptain = isPersonalBoard || role === "admin";
  const canEditCard = !isViewer;
  const canMoveCard = isPersonalBoard || isCaptain || (role === "member" && task.prioritized);
  const m = resolveAssigneeProfile(task.assignee);
  const pct = checklistPct(task);
  const checklistItems = Array.isArray(task.checklist) ? task.checklist : [];
  const doneChecklistCount = checklistItems.filter((c) => c.done).length;
  const labelsList = Array.isArray(task.labels) ? task.labels : [];
  const descDirty = localDesc !== (task.desc || "");

  // Kolaborator yang sah untuk ditugaskan pada tugas di papan ini
  // Pada papan pribadi: HANYA pemilik papan / akun yang sedang login.
  // Pada papan proyek kolaboratif: HANYA kolaborator yang secara resmi diundang di proyek ini.
  const selectableMembers = (() => {
    const map = new Map();
    if (isPersonalBoard) {
      // Papan pribadi: Hanya pemilik/pengguna aktif
      const me =
        (Array.isArray(collaborators) && collaborators[0]) ||
        (myMemberKey ? resolveAssigneeProfile(myMemberKey) : null);
      if (me) {
        const key = me.memberKey || me.key || me.email || myMemberKey;
        map.set(key, {
          key,
          name: me.name || "Saya",
          email: me.email || "",
          initials: me.initials || "ME",
          color: me.color || "#10B981",
          photoURL: me.photoURL || null,
          role: "admin",
          isOwner: true,
          isCollab: false,
        });
      }
    } else if (Array.isArray(collaborators)) {
      // Papan kolaboratif: HANYA kolaborator yang sah di proyek ini
      collaborators.forEach((c) => {
        const key = c.memberKey || c.email;
        if (key) {
          map.set(key, {
            key,
            name: c.name,
            email: c.email,
            initials: c.initials,
            color: c.color,
            photoURL: c.photoURL || null,
            role: c.role,
            isOwner: c.isOwner,
            isCollab: !c.isOwner,
          });
        }
      });
    }

    return Array.from(map.values());
  })();

  // Fungsi Label / Tag Kartu
  function handleTogglePresetLabel(preset) {
    if (!canEditCard) return;
    const exists = labelsList.some(
      (l) => l.id === preset.id || String(l.name || "").toLowerCase() === preset.name.toLowerCase()
    );
    const nextLabels = exists
      ? labelsList.filter(
          (l) => l.id !== preset.id && String(l.name || "").toLowerCase() !== preset.name.toLowerCase()
        )
      : [...labelsList, { id: preset.id, name: preset.name, dot: preset.dot }];
    onUpdate(task.id, { labels: nextLabels });
  }

  function handleAddCustomLabel(e) {
    if (e) e.preventDefault();
    const clean = customLabelName.trim();
    if (!clean || !canEditCard) return;
    const exists = labelsList.some((l) => String(l.name || "").toLowerCase() === clean.toLowerCase());
    if (!exists) {
      onUpdate(task.id, {
        labels: [
          ...labelsList,
          { id: "lbl_" + Date.now().toString(36), name: clean.slice(0, 24), dot: customLabelDot },
        ],
      });
    }
    setCustomLabelName("");
  }

  function handleRemoveLabel(targetLabel) {
    if (!canEditCard) return;
    const nextLabels = labelsList.filter(
      (l) => (l.id && targetLabel.id ? l.id !== targetLabel.id : l.name !== targetLabel.name)
    );
    onUpdate(task.id, { labels: nextLabels });
  }

  // Fungsi Tenggat Waktu (Due Date)
  function handleSetDueOffset(daysOffset) {
    if (!canEditCard) return;
    if (daysOffset === null) {
      onUpdate(task.id, { due: "Tanpa tenggat", dueIso: "" });
      setDuePickerOpen(false);
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const iso = d.toISOString().slice(0, 10);
    onUpdate(task.id, { due: formatIndoShortDate(d), dueIso: iso });
    setDuePickerOpen(false);
  }

  function handleDateInputChange(e) {
    const val = e.target.value;
    if (!val) {
      onUpdate(task.id, { due: "Tanpa tenggat", dueIso: "" });
      return;
    }
    const parsed = new Date(val + "T00:00:00");
    onUpdate(task.id, { due: formatIndoShortDate(parsed), dueIso: val });
  }

  // Fungsi Checklist Sub-Tugas Lengkap (CRUD)
  function handleAddChecklistItem(e) {
    if (e) e.preventDefault();
    const clean = newChecklistText.trim();
    if (!clean || !canEditCard) return;
    const nextChecklist = [...checklistItems, { text: clean, done: false }];
    onUpdate(task.id, { checklist: nextChecklist });
    setNewChecklistText("");
  }

  function handleDeleteChecklistItem(idx) {
    if (!canEditCard) return;
    const nextChecklist = checklistItems.filter((_, i) => i !== idx);
    onUpdate(task.id, { checklist: nextChecklist });
  }

  function handleSaveChecklistEdit(idx) {
    const clean = editingChecklistValue.trim();
    setEditingChecklistIdx(null);
    if (!clean) return;
    const nextChecklist = checklistItems.map((item, i) =>
      i === idx ? { ...item, text: clean } : item
    );
    onUpdate(task.id, { checklist: nextChecklist });
  }

  function handleToggleAllChecklist(doneVal) {
    if (!canEditCard || checklistItems.length === 0) return;
    const nextChecklist = checklistItems.map((item) => ({ ...item, done: doneVal }));
    onUpdate(task.id, { checklist: nextChecklist });
  }

  function handleClearCompletedChecklist() {
    if (!canEditCard) return;
    const nextChecklist = checklistItems.filter((item) => !item.done);
    onUpdate(task.id, { checklist: nextChecklist });
  }

  return (
    <div
      className={
        "fixed inset-0 z-[65] backdrop-blur-md bg-black/60 dark:bg-black/75 transition-opacity duration-300 " +
        (open ? "opacity-100 visible" : "opacity-0 invisible")
      }
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          "absolute top-0 right-0 h-full w-full sm:w-[510px] shadow-2xl p-6 sm:p-7 overflow-y-auto transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] border-l sm:rounded-l-3xl backdrop-blur-2xl " +
          (isLight
            ? "bg-white/95 border-slate-200 text-zinc-900 shadow-slate-300/60"
            : "bg-zinc-950/95 border-white/10 text-zinc-50 shadow-black/90") +
          (open ? " translate-x-0" : " translate-x-full")
        }
        style={{
          boxShadow: isLight
            ? "inset 1px 0 0 rgba(255,255,255,0.9), -10px 0 40px -10px rgba(0,0,0,0.1)"
            : "inset 1px 0 0 rgba(255,255,255,0.08), -20px 0 50px -10px rgba(0,0,0,0.8)",
        }}
      >
        {/* Top Action & Priority Bar */}
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PriorityDropdown
              value={task.priority}
              onChange={(nextP) => onUpdate(task.id, { priority: nextP })}
              disabled={!canEditCard}
              theme={theme}
            />

            <PointsDropdown
              value={task.points ?? 3}
              onChange={(nextPts) => onUpdate(task.id, { points: nextPts })}
              disabled={!canEditCard}
              theme={theme}
            />

            {!isPersonalBoard && isCaptain && onTogglePriority ? (
              <button
                type="button"
                onClick={() => onTogglePriority(task.id)}
                className={
                  "inline-flex items-center gap-1 text-[10.5px] font-bold rounded-xl px-2.5 py-1.5 border transition active:scale-95 cursor-pointer " +
                  (task.prioritized
                    ? isLight
                      ? "text-amber-800 bg-amber-100 border-amber-300"
                      : "text-amber-300 bg-amber-950/60 border-amber-800/60"
                    : isLight
                    ? "text-zinc-600 bg-slate-100 border-slate-200 hover:bg-amber-50 hover:text-amber-800"
                    : "text-zinc-400 bg-zinc-900 border-zinc-800 hover:bg-amber-950/40 hover:text-amber-300")
                }
              >
                {task.prioritized ? (
                  <Icon.StarFilled width={11} height={11} className="text-amber-500" />
                ) : (
                  <Icon.Star width={11} height={11} />
                )}
                <span>{task.prioritized ? "Prioritas Kapten" : "+ Prioritaskan"}</span>
              </button>
            ) : (
              !isPersonalBoard &&
              task.prioritized && (
                <span
                  className={
                    "inline-flex items-center gap-1 text-[10.5px] font-bold rounded-xl px-2.5 py-1 border " +
                    (isLight
                      ? "text-amber-800 bg-amber-100 border-amber-300"
                      : "text-amber-300 bg-amber-950/60 border-amber-800/60")
                  }
                >
                  <Icon.StarFilled width={10} height={10} className="text-amber-500" /> Prioritas
                </span>
              )
            )}
          </div>

          <div className="flex items-center gap-1">
            {canEditCard && onDuplicateTask && (
              <button
                type="button"
                onClick={() => onDuplicateTask(task, col?.id)}
                title="Duplikat kartu ini"
                className={
                  "px-2.5 h-8 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer " +
                  (isLight
                    ? "border-slate-200 bg-slate-50 text-zinc-600 hover:bg-slate-100 hover:text-zinc-900"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800")
                }
              >
                <span>⧉</span>
                <span className="hidden sm:inline">Duplikat</span>
              </button>
            )}
            {canEditCard && onDeleteTask && (
              !confirmDeleteTask ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTask(true)}
                  title="Hapus kartu tugas"
                  className={
                    "w-8 h-8 rounded-xl border flex items-center justify-center transition active:scale-90 cursor-pointer " +
                    (isLight
                      ? "border-rose-200 bg-rose-50/70 text-rose-600 hover:bg-rose-100"
                      : "border-rose-900/50 bg-rose-950/30 text-rose-400 hover:bg-rose-950/60")
                  }
                >
                  <Icon.Trash width={13} height={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  className="px-2.5 h-8 rounded-xl bg-rose-500 text-white text-[11px] font-extrabold hover:bg-rose-600 transition cursor-pointer"
                >
                  Ya, Hapus
                </button>
              )
            )}
            <button
              onClick={onClose}
              aria-label="Tutup panel"
              className={
                "w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition cursor-pointer " +
                (isLight ? "text-zinc-500 hover:bg-slate-100" : "text-zinc-400 hover:bg-zinc-800")
              }
            >
              <Icon.X />
            </button>
          </div>
        </div>

        {/* ID Kartu & Input Judul */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={
              "text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md border " +
              (isLight
                ? "bg-slate-100 border-slate-200 text-zinc-500"
                : "bg-zinc-900 border-zinc-800 text-zinc-400")
            }
          >
            #{String(task.id || "").toUpperCase()}
          </span>
          {col && (
            <span className={"inline-flex items-center gap-1.5 text-[11px] font-semibold " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
              <span className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
              <span>{col.name}</span>
            </span>
          )}
        </div>

        <input
          value={localTitle}
          disabled={!canEditCard}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={() => localTitle.trim() && onUpdate(task.id, { title: localTitle.trim() })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && localTitle.trim()) {
              e.currentTarget.blur();
            }
          }}
          className={
            "text-xl sm:text-2xl font-black tracking-tight w-full outline-none rounded-xl -ml-1.5 px-2 py-1 bg-transparent transition-all duration-200 " +
            (isLight ? "text-zinc-900 focus:bg-slate-100/80" : "text-zinc-50 focus:bg-zinc-900/80")
          }
        />

        {/* Label / Tag Warna-warni Kustom */}
        <div className="mt-3">
          <div className="flex items-center flex-wrap gap-1.5">
            {labelsList.map((lbl, idx) => {
              const preset = TASK_LABEL_PRESETS.find(
                (p) => p.id === lbl.id || p.name.toLowerCase() === String(lbl.name || "").toLowerCase()
              );
              const pillCls = preset
                ? isLight
                  ? preset.light
                  : preset.dark
                : isLight
                ? "bg-slate-100 text-zinc-700 border-slate-200"
                : "bg-zinc-800/90 text-zinc-300 border-zinc-700";
              const dotColor = lbl.dot || preset?.dot || "#10B981";
              return (
                <span
                  key={`${lbl.id || lbl.name}-${idx}`}
                  className={
                    "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border " +
                    pillCls
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
                  <span>{lbl.name}</span>
                  {canEditCard && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(lbl)}
                      className="opacity-65 hover:opacity-100 ml-0.5 cursor-pointer"
                      title={`Hapus label ${lbl.name}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}

            {canEditCard && (
              <button
                type="button"
                onClick={() => setLabelPickerOpen((v) => !v)}
                className={
                  "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-dashed transition cursor-pointer " +
                  (labelPickerOpen
                    ? "bg-emerald-400 text-zinc-950 border-emerald-400"
                    : isLight
                    ? "border-slate-300 text-zinc-500 hover:border-emerald-400 hover:text-emerald-700"
                    : "border-zinc-700 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-300")
                }
              >
                <Icon.Plus width={10} height={10} />
                <span>Label</span>
              </button>
            )}
          </div>

          {labelPickerOpen && canEditCard && (
            <div
              className={
                "mt-2 p-3 rounded-2xl border flex flex-col gap-2.5 text-xs " +
                (isLight ? "bg-slate-50 border-slate-200" : "bg-zinc-900/90 border-zinc-800")
              }
            >
              <div className="flex items-center justify-between">
                <span className={"text-[11px] font-bold " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                  Pilih atau Buat Label Kartu
                </span>
                <button
                  type="button"
                  onClick={() => setLabelPickerOpen(false)}
                  className="text-[11px] font-semibold text-emerald-400 cursor-pointer"
                >
                  Selesai
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TASK_LABEL_PRESETS.map((preset) => {
                  const active = labelsList.some(
                    (l) => l.id === preset.id || String(l.name || "").toLowerCase() === preset.name.toLowerCase()
                  );
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleTogglePresetLabel(preset)}
                      className={
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer " +
                        (active
                          ? (isLight ? preset.light : preset.dark) + " ring-2 ring-emerald-400/50"
                          : isLight
                          ? "bg-white border-slate-200 text-zinc-600 hover:bg-slate-100"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800")
                      }
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: preset.dot }} />
                      <span>{preset.name}</span>
                      {active && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
              <form onSubmit={handleAddCustomLabel} className="flex items-center gap-1.5 pt-1">
                <input
                  type="color"
                  value={customLabelDot}
                  onChange={(e) => setCustomLabelDot(e.target.value)}
                  className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                  title="Warna label kustom"
                />
                <input
                  type="text"
                  value={customLabelName}
                  onChange={(e) => setCustomLabelName(e.target.value)}
                  placeholder="Nama label baru..."
                  className={
                    "flex-1 px-2.5 py-1.5 rounded-xl border text-[11.5px] outline-none " +
                    (isLight ? "bg-white border-slate-300 text-zinc-900" : "bg-zinc-950 border-zinc-800 text-zinc-100")
                  }
                />
                <button
                  type="submit"
                  disabled={!customLabelName.trim()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-400 text-zinc-950 text-[11px] font-extrabold hover:bg-emerald-300 disabled:opacity-40 cursor-pointer"
                >
                  + Buat
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Grid Metadata Interaktif (Ditugaskan, Tenggat Waktu, Pindah Kolom) */}
        <div
          className={
            "grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 p-3 rounded-2xl border " +
            (isLight ? "bg-slate-50/80 border-slate-200/80" : "bg-zinc-900/60 border-zinc-800/80")
          }
        >
          {/* 1. Ditugaskan ke (Assignee) */}
          <div className="flex flex-col gap-1">
            <span className={"text-[10.5px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
              Ditugaskan Ke
            </span>
            <AssigneeDropdown
              value={task.assignee}
              members={selectableMembers}
              onChange={(nextKey) => onUpdate(task.id, { assignee: nextKey })}
              disabled={!canEditCard}
              theme={theme}
            />
            {canEditCard && myMemberKey && task.assignee !== myMemberKey && (
              <button
                type="button"
                onClick={() =>
                  onClaim && !task.assignee && role === "member"
                    ? onClaim(task.id)
                    : onUpdate(task.id, { assignee: myMemberKey })
                }
                className="text-left text-[10.5px] font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer mt-0.5"
              >
                + Tugaskan ke saya
              </button>
            )}
          </div>

          {/* 2. Tenggat Waktu (Due Date) */}
          <div className="flex flex-col gap-1">
            <span className={"text-[10.5px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
              Tenggat Waktu
            </span>
            <button
              type="button"
              disabled={!canEditCard}
              onClick={() => setDuePickerOpen((v) => !v)}
              className={
                "w-full text-left text-[12px] font-bold rounded-xl px-2.5 py-2 border flex items-center justify-between gap-1.5 transition cursor-pointer group " +
                (duePickerOpen
                  ? "border-emerald-400 ring-2 ring-emerald-500/20 " + (isLight ? "bg-white text-zinc-900 shadow-sm" : "bg-zinc-950 text-zinc-100 shadow-md")
                  : isLight
                  ? "bg-white border-slate-200 text-zinc-800 hover:border-slate-300 hover:bg-slate-50/70"
                  : "bg-zinc-950 border-zinc-800 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/60") +
                (!canEditCard ? " opacity-60 cursor-not-allowed" : "")
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[12px] text-emerald-500 flex-shrink-0">📅</span>
                <span className="truncate">{task.due || "Tanpa tenggat"}</span>
              </div>
              <Icon.Chevron
                width={12}
                height={12}
                className={
                  "flex-shrink-0 transition-transform duration-200 opacity-60 group-hover:opacity-100 " +
                  (duePickerOpen ? "rotate-180 text-emerald-500" : "")
                }
              />
            </button>
          </div>

          {/* 3. Pindah Kolom Cepat */}
          <div className="flex flex-col gap-1">
            <span className={"text-[10.5px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
              Kolom Papan
            </span>
            <ColumnDropdown
              value={col?.id || ""}
              board={board}
              onChange={(nextColId) => {
                if (onMoveTask && nextColId && nextColId !== col?.id) {
                  onMoveTask(task.id, nextColId);
                }
              }}
              disabled={!canMoveCard || !onMoveTask}
              theme={theme}
            />
          </div>
        </div>

        {/* Drawer Pemilih Tenggat Waktu & Preset Cepat */}
        {duePickerOpen && canEditCard && (
          <div
            className={
              "mt-2 p-3 rounded-2xl border flex flex-col gap-2.5 text-xs " +
              (isLight ? "bg-slate-50 border-slate-200" : "bg-zinc-900/90 border-zinc-800")
            }
          >
            <div className="flex items-center justify-between">
              <span className={"text-[11px] font-bold " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                Atur Tenggat Waktu Kartu
              </span>
              <button
                type="button"
                onClick={() => setDuePickerOpen(false)}
                className="text-[11px] font-semibold text-emerald-400 cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "Hari Ini", offset: 0 },
                { label: "Besok", offset: 1 },
                { label: "+3 Hari", offset: 3 },
                { label: "Minggu Depan", offset: 7 },
                { label: "Tanpa Tenggat", offset: null },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSetDueOffset(preset.offset)}
                  className={
                    "px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer " +
                    (isLight
                      ? "bg-white border-slate-200 text-zinc-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-emerald-950/40 hover:border-emerald-500/40 hover:text-emerald-300")
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className={"text-[11px] font-medium " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                Pilih tanggal kalender:
              </span>
              <input
                type="date"
                value={task.dueIso || ""}
                onChange={handleDateInputChange}
                className={
                  "px-2.5 py-1 rounded-xl border text-[11.5px] font-mono outline-none " +
                  (isLight ? "bg-white border-slate-300 text-zinc-900" : "bg-zinc-950 border-zinc-700 text-zinc-100")
                }
              />
            </div>
          </div>
        )}

        {/* Widget Pelacak Waktu Kerja (Stopwatch / Time Tracker) */}
        <div
          className={
            "mt-4 p-3.5 rounded-2xl border transition-all duration-300 " +
            (isLight
              ? "bg-slate-50/90 border-slate-200/90 shadow-2xs"
              : "bg-zinc-900/70 border-zinc-800/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]")
          }
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={"text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                <span>⏱️</span>
                <span>Pelacak Waktu Kerja (Time Tracker)</span>
              </span>
              {timerActive && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Merekam
                </span>
              )}
            </div>

            <span className={"text-[11px] font-mono " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
              Total: <strong className="font-bold text-emerald-500">{formatTimeHMS(task.timeSpent || 0)}</strong>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <div className="flex items-baseline gap-2">
              <span className={"font-mono text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums " + (timerActive ? "text-emerald-400" : isLight ? "text-zinc-800" : "text-zinc-100")}>
                {formatTimeHMS(timerSec)}
              </span>
              <span className={"text-[11px] font-medium " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                {timerActive ? "waktu sesi aktif" : "siap mencatat"}
              </span>
            </div>

            {canEditCard && (
              <div className="flex items-center gap-1.5 ml-auto">
                {!timerActive ? (
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 text-[11.5px] font-bold hover:bg-emerald-400 active:scale-95 transition cursor-pointer shadow-xs"
                  >
                    <span>▶</span>
                    <span>Mulai</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseTimer}
                    className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11.5px] font-bold active:scale-95 transition cursor-pointer " + (isLight ? "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200" : "bg-amber-950/60 border-amber-700/60 text-amber-300 hover:bg-amber-900/60")}
                  >
                    <span>⏸</span>
                    <span>Jeda</span>
                  </button>
                )}

                {timerSec > 0 && (
                  <button
                    type="button"
                    onClick={handleLogTimer}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 text-white text-[11.5px] font-bold hover:bg-blue-400 active:scale-95 transition cursor-pointer shadow-xs"
                  >
                    <span>✓</span>
                    <span>Catat ({formatTimeHMS(timerSec)})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Deskripsi Tugas */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <h5 className={"text-[12px] font-bold " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
              Deskripsi & Catatan Teknis
            </h5>
            {descDirty && (
              <button
                type="button"
                onClick={() => onUpdate(task.id, { desc: localDesc })}
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-400 text-zinc-950 hover:bg-emerald-300 transition cursor-pointer"
              >
                Simpan Deskripsi
              </button>
            )}
          </div>
          <textarea
            value={localDesc}
            disabled={!canEditCard}
            onChange={(e) => setLocalDesc(e.target.value)}
            onBlur={() => onUpdate(task.id, { desc: localDesc })}
            placeholder="Tambahkan detail tugas, kriteria penerimaan (Definition of Done), atau tautan dokumen..."
            rows={3}
            className={
              "w-full text-[13px] leading-relaxed outline-none rounded-2xl p-3 resize-y border transition " +
              (isLight
                ? "bg-slate-50/70 border-slate-200/90 text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-emerald-500"
                : "bg-zinc-900/50 border-zinc-800/90 text-zinc-200 placeholder-zinc-600 focus:bg-zinc-900 focus:border-emerald-500/60")
            }
          />
        </div>

        {/* Manajemen Checklist Sub-Tugas Lengkap (CRUD) */}
        <div className="mt-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h5 className={"text-[12px] font-bold flex items-center gap-2 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
              <span>Checklist Sub-Tugas</span>
              <span
                className={
                  "text-[10.5px] font-mono px-2 py-0.5 rounded-full border " +
                  (isLight ? "bg-slate-100 border-slate-200 text-zinc-700" : "bg-zinc-900 border-zinc-800 text-zinc-300")
                }
              >
                {doneChecklistCount}/{checklistItems.length}
              </span>
            </h5>

            {canEditCard && checklistItems.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleAllChecklist(doneChecklistCount < checklistItems.length)}
                  className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 cursor-pointer"
                >
                  {doneChecklistCount < checklistItems.length ? "Tandai Semua" : "Reset Semua"}
                </button>
                {doneChecklistCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCompletedChecklist}
                    className={"text-[11px] font-semibold cursor-pointer " + (isLight ? "text-zinc-400 hover:text-rose-600" : "text-zinc-500 hover:text-rose-400")}
                  >
                    Hapus Selesai
                  </button>
                )}
              </div>
            )}
          </div>

          {checklistItems.length > 0 && (
            <div className="flex items-center gap-2.5 mb-3">
              <div className={"flex-1 h-1.5 rounded-full overflow-hidden " + (isLight ? "bg-slate-200" : "bg-zinc-800")}>
                <div
                  className="h-full w-full bg-emerald-500 rounded-full origin-left transition-transform duration-500"
                  style={{ transform: `scaleX(${pct / 100})` }}
                />
              </div>
              <span className={"text-xs font-bold font-mono tabular-nums w-9 text-right " + (isLight ? "text-emerald-700" : "text-emerald-400")}>
                {pct}%
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {checklistItems.map((c, i) => (
              <div
                key={i}
                className={
                  "group flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-[13px] transition " +
                  (isLight
                    ? "bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/70"
                    : "bg-zinc-900/50 border-zinc-800/70 hover:bg-zinc-900")
                }
              >
                <button
                  type="button"
                  disabled={!canEditCard}
                  onClick={() => onToggleChecklist(task.id, i)}
                  className={
                    "w-4.5 h-4.5 rounded-md border-[1.5px] flex items-center justify-center flex-shrink-0 active:scale-90 transition cursor-pointer " +
                    (c.done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : isLight
                      ? "border-slate-300 hover:border-emerald-500"
                      : "border-zinc-600 hover:border-emerald-400")
                  }
                >
                  {c.done && <Icon.Check />}
                </button>

                {editingChecklistIdx === i ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingChecklistValue}
                    onChange={(e) => setEditingChecklistValue(e.target.value)}
                    onBlur={() => handleSaveChecklistEdit(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveChecklistEdit(i);
                      if (e.key === "Escape") setEditingChecklistIdx(null);
                    }}
                    className={
                      "flex-1 text-[13px] px-2 py-0.5 rounded-lg border outline-none " +
                      (isLight ? "bg-white border-emerald-400 text-zinc-900" : "bg-zinc-950 border-emerald-500 text-zinc-100")
                    }
                  />
                ) : (
                  <span
                    onClick={() => {
                      if (!canEditCard) return;
                      setEditingChecklistIdx(i);
                      setEditingChecklistValue(c.text);
                    }}
                    title={canEditCard ? "Klik untuk mengubah teks item" : ""}
                    className={
                      "flex-1 cursor-text select-none " +
                      (c.done
                        ? isLight
                          ? "text-zinc-400 line-through"
                          : "text-zinc-500 line-through"
                        : isLight
                        ? "text-zinc-800"
                        : "text-zinc-200")
                    }
                  >
                    {c.text}
                  </span>
                )}

                {canEditCard && (
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklistItem(i)}
                    title="Hapus item checklist"
                    className={
                      "w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer " +
                      (isLight
                        ? "text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                        : "text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40")
                    }
                  >
                    <Icon.X width={11} height={11} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Input Tambah Item Checklist Baru */}
          {canEditCard && (
            <form onSubmit={handleAddChecklistItem} className="flex items-center gap-2 mt-2.5">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Tambah sub-tugas / langkah checklist baru..."
                className={
                  "flex-1 px-3 py-2 rounded-xl border text-[12.5px] outline-none transition " +
                  (isLight
                    ? "bg-slate-50 border-slate-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-emerald-500"
                    : "bg-zinc-900/70 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/60")
                }
              />
              <button
                type="submit"
                disabled={!newChecklistText.trim()}
                className={
                  "px-3.5 py-2 rounded-xl text-[12px] font-bold transition active:scale-95 disabled:opacity-40 cursor-pointer flex-shrink-0 " +
                  (isLight
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-emerald-400 text-zinc-950 hover:bg-emerald-300")
                }
              >
                + Tambah
              </button>
            </form>
          )}
        </div>

        {/* Diskusi & Komentar */}
        <div className="mt-6 pt-5 border-t border-dashed" style={{ borderColor: isLight ? "#E2E8F0" : "#27272A" }}>
          <div className="flex items-center justify-between mb-3">
            <h5 className={"text-[12.5px] font-bold flex items-center gap-2 " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
              <Icon.ChatBubble width={14} height={14} className={isLight ? "text-blue-600" : "text-blue-400"} />
              Diskusi & Komentar
              <span className={"text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold " + (isLight ? "bg-slate-100 text-slate-700" : "bg-zinc-800 text-zinc-300")}>
                {Array.isArray(task.comments) ? task.comments.length : 0}
              </span>
            </h5>
          </div>

          {/* Form input komentar */}
          <div className={"mb-4 p-2.5 rounded-xl border " + (isLight ? "bg-slate-50 border-slate-200" : "bg-zinc-900/60 border-zinc-800")}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
              placeholder="Tulis komentar... (Tekan Enter untuk mengirim)"
              rows={2}
              className={"w-full text-[13px] bg-transparent outline-none resize-none leading-relaxed " + (isLight ? "text-zinc-900 placeholder-zinc-400" : "text-zinc-100 placeholder-zinc-500")}
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: isLight ? "#E2E8F0" : "#27272A" }}>
              <span className={"text-[11px] " + (isLight ? "text-zinc-400" : "text-zinc-500")}>Enter untuk kirim, Shift+Enter untuk baris baru</span>
              <button
                type="button"
                onClick={handleSendComment}
                disabled={!newComment.trim()}
                className={"px-3 py-1.5 rounded-lg text-[12px] font-semibold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer " +
                  (isLight ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs" : "bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400")}
              >
                Kirim
              </button>
            </div>
          </div>

          {/* Daftar komentar */}
          {(!task.comments || task.comments.length === 0) ? (
            <div className={"text-center py-6 text-[12.5px] rounded-xl border border-dashed " + (isLight ? "border-slate-200 text-zinc-400" : "border-zinc-800 text-zinc-500")}>
              Belum ada komentar di kartu ini. Tulis tanggapan atau pembaruan pertama tim!
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {task.comments.map((c, i) => {
                const memberData = c.authorKey ? MEMBERS[c.authorKey] : null;
                const authorColor = memberData?.color || "#3B82F6";
                const authorInitials = memberData?.initials || c.author?.slice(0, 2).toUpperCase() || "US";
                const authorPhoto = memberData?.photoURL || c.authorPhotoURL || null;
                return (
                  <div
                    key={c.id || i}
                    className={"p-3 rounded-xl border transition-all " + (isLight ? "bg-slate-50/90 border-slate-200/90" : "bg-zinc-900/50 border-zinc-800/80")}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {authorPhoto ? (
                          <img
                            src={authorPhoto}
                            alt={c.author || "Anggota Tim"}
                            referrerPolicy="no-referrer"
                            className="w-5.5 h-5.5 rounded-md object-cover shadow-xs flex-shrink-0"
                          />
                        ) : (
                          <span
                            className="w-5.5 h-5.5 rounded-md text-white text-[9.5px] font-bold flex items-center justify-center shadow-xs flex-shrink-0"
                            style={{ background: authorColor }}
                          >
                            {authorInitials}
                          </span>
                        )}
                        <span className={"text-[12.5px] font-semibold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                          {c.author || "Anggota Tim"}
                        </span>
                      </div>
                      <span className={"text-[11px] " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                        {c.createdAt || "Baru saja"}
                      </span>
                    </div>
                    <p className={"text-[13px] leading-relaxed pl-7.5 whitespace-pre-wrap " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                      {c.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HIGH-END INVITE COLLABORATOR & ACTOR ROLE MODAL
   ============================================================ */
function InviteCollaboratorModal({
  open,
  onClose,
  projectName,
  ownerName,
  ownerEmail,
  isPersonalBoard,
  initialEmail = "",
  inviting = false,
  onConfirmInvite,
  theme = "dark",
}) {
  const isLight = theme === "light";
  const [emailText, setEmailText] = useState(initialEmail);
  const [selectedRole, setSelectedRole] = useState("member");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setEmailText(initialEmail || "");
      setSelectedRole("member");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, initialEmail]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open && !inviting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, inviting, onClose]);

  if (!open) return null;

  const parsedEmails = emailText
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && s.includes("@") && s !== ownerEmail);

  const actorOptions = [
    {
      id: "member",
      title: "Anggota Tim",
      badge: "Aktor Eksekutor",
      accent: "#34D399",
      accentSoft: isLight
        ? "from-emerald-50/95 via-white to-teal-50/60 border-emerald-400 ring-2 ring-emerald-500/15"
        : "from-emerald-950/55 via-zinc-900/95 to-teal-950/35 border-emerald-500/60 ring-2 ring-emerald-500/15",
      desc: "Bekerja aktif menyelesaikan kartu tugas, berdiskusi, dan memperbarui progres di papan Kanban.",
      perks: [
        "Membuat kartu tugas baru & menulis komentar diskusi",
        "Mengambil & memindahkan kartu prioritas di papan Kanban",
        "Mengikuti fokus prioritas sprint yang ditetapkan Kapten",
      ],
    },
    {
      id: "viewer",
      title: "Viewer (Pengamat)",
      badge: "Akses Baca Saja",
      accent: "#F59E0B",
      accentSoft: isLight
        ? "from-amber-50/95 via-white to-orange-50/60 border-amber-400 ring-2 ring-amber-500/15"
        : "from-amber-950/55 via-zinc-900/95 to-orange-950/35 border-amber-500/60 ring-2 ring-amber-500/15",
      desc: "Hanya melihat gambaran besar progres sprint dan distribusi kolom tanpa mengubah isi papan.",
      perks: [
        "Melihat ringkasan progres, metrik sprint & distribusi kolom",
        "Tidak dapat menambah, mengedit, atau memindahkan kartu tugas",
        "Cocok untuk klien, stakeholder, atau pengawas proyek",
      ],
    },
  ];

  function handleSubmit(e) {
    e.preventDefault();
    if (parsedEmails.length === 0 || inviting) return;
    onConfirmInvite(parsedEmails.join(", "), selectedRole);
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={() => !inviting && onClose()}
    >
      {/* Doppelrand Double-Bezel Outer Shell */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          "w-full max-w-[620px] rounded-[32px] p-1.5 border backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
          (isLight
            ? "bg-white/75 border-slate-200/90 shadow-[0_32px_80px_-16px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.95)]"
            : "bg-zinc-900/75 border-white/10 shadow-[0_32px_90px_-16px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.08)]")
        }
      >
        {/* Inner Surface */}
        <form
          onSubmit={handleSubmit}
          className={
            "relative overflow-hidden rounded-[26px] border p-6 sm:p-7 " +
            (isLight
              ? "bg-gradient-to-b from-white via-white to-slate-50/90 border-slate-200/80 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,1)]"
              : "bg-gradient-to-b from-zinc-900 via-zinc-900/98 to-zinc-950 border-white/[0.07] text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]")
          }
        >
          {/* Ambient Top Specular Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[380px] h-[140px] rounded-full blur-3xl opacity-30"
            style={{
              background:
                selectedRole === "member"
                  ? "radial-gradient(circle, #34D399 0%, transparent 70%)"
                  : "radial-gradient(circle, #F59E0B 0%, transparent 70%)",
            }}
          />

          {/* Header */}
          <div className="relative flex items-start justify-between gap-4 pb-5 border-b border-dashed" style={{ borderColor: isLight ? "#E2E8F0" : "#27272A" }}>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10.5px] font-extrabold uppercase tracking-wider mb-2.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Konfirmasi Undangan & Pemilihan Aktor
              </div>
              <h2 className={"font-display text-xl sm:text-[22px] font-extrabold tracking-tight " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                Undang Kolaborator ke &ldquo;{projectName}&rdquo;
              </h2>
              <p className={"text-[12.5px] mt-1 leading-relaxed " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                Tentukan email rekan yang diundang dan pilih peran aktor mereka di papan Kanban ini.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={inviting}
              aria-label="Tutup pop-up"
              className={
                "w-9 h-9 rounded-2xl border flex items-center justify-center flex-shrink-0 transition active:scale-90 cursor-pointer " +
                (isLight
                  ? "bg-slate-50 border-slate-200 text-zinc-500 hover:text-zinc-900 hover:bg-slate-100"
                  : "bg-zinc-800/80 border-zinc-700/70 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")
              }
            >
              <Icon.X width={15} height={15} />
            </button>
          </div>

          {/* Automatic Captaincy Banner */}
          <div
            className={
              "mt-5 rounded-2xl p-4 border flex items-start gap-3.5 transition-all " +
              (isLight
                ? "bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-white border-emerald-200/90 shadow-2xs"
                : "bg-gradient-to-r from-emerald-950/45 via-zinc-900/90 to-zinc-900 border-emerald-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]")
            }
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-400 text-zinc-950 flex items-center justify-center flex-shrink-0 font-black shadow-md shadow-emerald-500/20">
              <Icon.StarFilled width={18} height={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={"text-[13px] font-extrabold " + (isLight ? "text-emerald-950" : "text-emerald-300")}>
                  {isPersonalBoard
                    ? "Papan Pribadi → Otomatis Aktifkan Mode Tim"
                    : "Otoritas Pembuat Papan Kanban"}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-zinc-950">
                  Pembuat = Kapten
                </span>
              </div>
              <p className={"text-[12px] mt-1 leading-relaxed " + (isLight ? "text-zinc-600" : "text-zinc-300")}>
                Sebagai pembuat papan, <b>{ownerName}</b> (<code className="font-mono text-[11px]">{ownerEmail}</code>) otomatis menjadi <b>Kapten</b> yang mengatur Sprint & Prioritas, sedangkan orang yang diundang akan berperan sebagai <b>{selectedRole === "member" ? "Anggota" : "Viewer"}</b>.
              </p>
            </div>
          </div>

          {/* Input Email Kolaborator */}
          <div className="mt-5">
            <label className={"block text-[12px] font-bold mb-2 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
              1. Alamat Email Kolaborator yang Diundang
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                required
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                placeholder="Ketik email kolaborator (contoh: fajar@peluncuran.id, dina@peluncuran.id)"
                className={
                  "w-full px-4 py-3 rounded-2xl border text-[13.5px] font-mono focus:outline-none focus:ring-2 transition " +
                  (isLight
                    ? "bg-slate-50 border-slate-300 text-zinc-900 focus:bg-white focus:ring-emerald-500/40 focus:border-emerald-500"
                    : "bg-zinc-950/90 border-zinc-800 text-zinc-100 focus:ring-emerald-500/30 focus:border-emerald-400")
                }
              />
            </div>
            {parsedEmails.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className={"text-[11px] font-medium " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                  Akan diundang ({parsedEmails.length}):
                </span>
                {parsedEmails.map((em) => (
                  <span
                    key={em}
                    className={
                      "inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border " +
                      (isLight
                        ? "bg-slate-100 border-slate-300 text-zinc-800"
                        : "bg-zinc-800/90 border-zinc-700 text-zinc-200")
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: selectedRole === "member" ? "#34D399" : "#F59E0B" }}
                    />
                    {em}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Pemilihan Aktor (Anggota vs Viewer) */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2.5">
              <label className={"text-[12px] font-bold " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                2. Pilih Peran Aktor untuk Kolaborator Ini
              </label>
              <span className={"text-[11px] font-mono " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                Dapat diubah kapan saja oleh Kapten
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {actorOptions.map((opt) => {
                const active = selectedRole === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedRole(opt.id)}
                    className={
                      "group text-left rounded-[22px] p-4 border bg-gradient-to-br transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer flex flex-col justify-between " +
                      (active
                        ? opt.accentSoft + " shadow-lg"
                        : isLight
                        ? "from-slate-50/80 to-white border-slate-200/90 hover:border-slate-300 opacity-85 hover:opacity-100"
                        : "from-zinc-900/80 to-zinc-950/90 border-zinc-800/80 hover:border-zinc-700 opacity-80 hover:opacity-100")
                    }
                    style={{
                      boxShadow: active
                        ? isLight
                          ? "inset 0 1px 0 rgba(255,255,255,0.95), 0 12px 28px -8px rgba(15,23,42,0.12)"
                          : "inset 0 1px 0 rgba(255,255,255,0.1), 0 14px 32px -8px rgba(0,0,0,0.65)"
                        : undefined,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-zinc-950"
                          style={{ background: opt.accent }}
                        >
                          {opt.badge}
                        </span>
                        <span
                          className={
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors " +
                            (active
                              ? "border-transparent text-zinc-950"
                              : isLight
                              ? "border-slate-300"
                              : "border-zinc-700")
                          }
                          style={{ background: active ? opt.accent : "transparent" }}
                        >
                          {active && <Icon.Check width={11} height={11} />}
                        </span>
                      </div>

                      <div className={"font-display text-[16px] font-extrabold tracking-tight " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                        {opt.title}
                      </div>
                      <p className={"text-[11.5px] mt-1 leading-relaxed " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                        {opt.desc}
                      </p>
                    </div>

                    <ul className="mt-3.5 pt-3 border-t border-dashed space-y-1.5" style={{ borderColor: isLight ? "#CBD5E1" : "#27272A" }}>
                      {opt.perks.map((perk, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] leading-snug">
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                            style={{ background: opt.accent }}
                          />
                          <span className={isLight ? "text-zinc-700 font-medium" : "text-zinc-300 font-medium"}>
                            {perk}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ringkasan Konfirmasi & Tombol Aksi */}
          <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: isLight ? "#E2E8F0" : "#27272A" }}>
            <div className={"text-[11.5px] " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
              {parsedEmails.length > 0 ? (
                <span>
                  Siap mengundang <b>{parsedEmails.length} orang</b> sebagai{" "}
                  <b className={selectedRole === "member" ? "text-emerald-400" : "text-amber-400"}>
                    {selectedRole === "member" ? "Anggota Tim" : "Viewer"}
                  </b>
                </span>
              ) : (
                <span>Masukkan minimal 1 alamat email kolaborator yang valid.</span>
              )}
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={inviting}
                onClick={onClose}
                className={
                  "px-4 py-2.5 rounded-full border text-[12.5px] font-semibold transition active:scale-95 cursor-pointer " +
                  (isLight
                    ? "border-slate-300 bg-white text-zinc-700 hover:bg-slate-100"
                    : "border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800")
                }
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={inviting || parsedEmails.length === 0}
                className={
                  "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-extrabold transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg " +
                  (selectedRole === "member"
                    ? "bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-emerald-500/20"
                    : "bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-amber-500/20")
                }
              >
                <Icon.Users width={14} height={14} />
                <span>
                  {inviting
                    ? "Mengirim Undangan..."
                    : `Konfirmasi & Undang sebagai ${selectedRole === "member" ? "Anggota" : "Viewer"}`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   HIGH-END SPRINT SUMMARY & RETROSPECTIVE MODAL
   ============================================================ */
function SprintSummaryModal({
  open,
  onClose,
  board,
  sprint,
  projectName,
  onConfirmEndSprint,
  onCopyReport,
  theme = "dark",
}) {
  const isLight = theme === "light";
  const [unfinishedAction, setUnfinishedAction] = useState("backlog");
  const [clearDone, setClearDone] = useState(true);
  const [retroNote, setRetroNote] = useState("");
  const [nextGoal, setNextGoal] = useState("");

  useEffect(() => {
    if (open) {
      setUnfinishedAction("backlog");
      setClearDone(true);
      setRetroNote("");
      setNextGoal(`Menyelesaikan target prioritas utama Sprint #${(sprint?.number || 1) + 1}.`);
    }
  }, [open, sprint?.number]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const doneCol = board.find((c) => c.id === "done");
  const doneTasks = doneCol && Array.isArray(doneCol.tasks) ? doneCol.tasks : [];
  const donePoints = doneTasks.reduce((n, t) => n + (t.points || 0), 0);

  const unfinishedCols = board.filter((c) => SPRINT_COLUMNS.includes(c.id) && c.id !== "done");
  const unfinishedTasks = unfinishedCols.flatMap((c) =>
    (c.tasks || []).map((t) => ({ ...t, colName: c.name, colDot: c.dot }))
  );
  const unfinishedPoints = unfinishedTasks.reduce((n, t) => n + (t.points || 0), 0);

  const totalSprintPoints = donePoints + unfinishedPoints;
  const totalSprintTasks = doneTasks.length + unfinishedTasks.length;
  const completionPct =
    totalSprintPoints > 0
      ? Math.round((donePoints / totalSprintPoints) * 100)
      : totalSprintTasks > 0
      ? Math.round((doneTasks.length / totalSprintTasks) * 100)
      : 0;

  const historyList = Array.isArray(sprint.history) ? sprint.history : [];
  const avgVelocity = historyList.length
    ? Math.round(historyList.reduce((n, h) => n + (h.points || 0), 0) / historyList.length)
    : donePoints;
  const velocityDelta = donePoints - avgVelocity;

  function handleCopyMarkdown() {
    const lines = [
      `# Ringkasan Akhir Sprint #${sprint.number} — ${projectName}`,
      `- **Tujuan Sprint:** ${sprint.goal || "-"}`,
      `- **Pencapaian Poin:** ${donePoints} / ${totalSprintPoints} Story Points (${completionPct}%)`,
      `- **Kartu Selesai:** ${doneTasks.length} kartu`,
      `- **Kartu Belum Selesai:** ${unfinishedTasks.length} kartu (${unfinishedPoints} poin)`,
      retroNote.trim() ? `- **Catatan Retrospektif:** ${retroNote.trim()}` : null,
      "",
      `## Daftar Kartu Selesai (${doneTasks.length})`,
      ...(doneTasks.length > 0
        ? doneTasks.map((t) => `- [x] ${t.title} (${t.points || 0} poin)`)
        : ["- (Belum ada kartu selesai)"]),
      "",
      `## Kartu Belum Selesai (${unfinishedTasks.length})`,
      ...(unfinishedTasks.length > 0
        ? unfinishedTasks.map((t) => `- [ ] ${t.title} [${t.colName}] (${t.points || 0} poin)`)
        : ["- (Semua kartu sprint selesai!)"]),
    ].filter((x) => x !== null);

    const reportText = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(reportText).catch(() => {});
    }
    if (onCopyReport) onCopyReport(reportText);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onConfirmEndSprint({
      unfinishedAction,
      clearDone,
      retroNote: retroNote.trim(),
      nextGoal: nextGoal.trim(),
    });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-[90] flex items-center justify-center p-4 overflow-y-auto strata-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Ringkasan Akhir Sprint #${sprint.number}`}
    >
      {/* Outer Doppelrand Shell */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          "w-full max-w-2xl rounded-[32px] p-1.5 border transition-all my-auto " +
          (isLight
            ? "bg-slate-200/80 border-slate-300/90 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
            : "bg-zinc-900/80 border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.85)]")
        }
      >
        {/* Inner Surface */}
        <form
          onSubmit={handleSubmit}
          className={
            "relative overflow-hidden rounded-[26px] p-5 sm:p-6.5 border " +
            (isLight
              ? "bg-white border-white text-zinc-900"
              : "bg-zinc-950 border-white/[0.07] text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]")
          }
        >
          {/* Ambient Top Accent Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-44 rounded-full blur-3xl opacity-25"
            style={{
              background:
                completionPct >= 75
                  ? "radial-gradient(circle, #34D399 0%, #06B6D4 60%, transparent 100%)"
                  : "radial-gradient(circle, #F59E0B 0%, #34D399 65%, transparent 100%)",
            }}
          />

          {/* Top Header */}
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10.5px] font-mono font-bold uppercase tracking-[0.14em] mb-2.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
                <Icon.Sparkle width={12} height={12} />
                Evaluasi & Penutupan Sprint #{sprint.number}
              </div>
              <h2
                className={
                  "font-display text-xl sm:text-2xl font-extrabold tracking-tight text-balance " +
                  (isLight ? "text-zinc-900" : "text-zinc-50")
                }
              >
                Ringkasan Akhir Sprint #{sprint.number}
              </h2>
              <p className={"text-[12.5px] mt-1 leading-relaxed " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                Tinjau capaian poin pada papan <b className={isLight ? "text-zinc-900" : "text-zinc-100"}>&ldquo;{projectName}&rdquo;</b> dan tentukan alur kartu untuk Sprint #{sprint.number + 1}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={
                "w-8 h-8 rounded-full border flex items-center justify-center transition active:scale-90 flex-shrink-0 cursor-pointer " +
                (isLight
                  ? "border-slate-200 bg-slate-100 text-zinc-500 hover:text-zinc-900 hover:bg-slate-200"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")
              }
              aria-label="Tutup modal ringkasan sprint"
            >
              <Icon.X width={14} height={14} />
            </button>
          </div>

          {/* Bento Metrics Summary */}
          <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div
              className={
                "rounded-2xl p-3.5 border " +
                (isLight ? "bg-emerald-50/70 border-emerald-200/80" : "bg-emerald-950/25 border-emerald-500/25")
              }
            >
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">
                Penyelesaian
              </div>
              <div className={"font-display text-2xl font-black font-mono tabular-nums mt-1 " + (isLight ? "text-emerald-900" : "text-emerald-300")}>
                {completionPct}%
              </div>
              <div className={"text-[10.5px] mt-0.5 " + (isLight ? "text-emerald-700" : "text-emerald-400/80")}>
                Hari {sprint.day || 1} dari {sprint.durationDays || 14}
              </div>
            </div>

            <div
              className={
                "rounded-2xl p-3.5 border " +
                (isLight ? "bg-slate-50 border-slate-200/80" : "bg-zinc-900/70 border-zinc-800")
              }
            >
              <div className={"text-[10px] font-mono font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                Story Points
              </div>
              <div className={"font-display text-2xl font-black font-mono tabular-nums mt-1 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                {donePoints}<span className="text-sm font-normal opacity-50">/{totalSprintPoints}</span>
              </div>
              <div className={"text-[10.5px] mt-0.5 " + (velocityDelta >= 0 ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold")}>
                {velocityDelta >= 0 ? `+${velocityDelta} dari rata-rata` : `${velocityDelta} dari rata-rata`}
              </div>
            </div>

            <div
              className={
                "rounded-2xl p-3.5 border " +
                (isLight ? "bg-slate-50 border-slate-200/80" : "bg-zinc-900/70 border-zinc-800")
              }
            >
              <div className={"text-[10px] font-mono font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                Kartu Selesai
              </div>
              <div className={"font-display text-2xl font-black font-mono tabular-nums mt-1 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                {doneTasks.length}
              </div>
              <div className={"text-[10.5px] mt-0.5 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                Di kolom Selesai
              </div>
            </div>

            <div
              className={
                "rounded-2xl p-3.5 border " +
                (unfinishedTasks.length > 0
                  ? isLight
                    ? "bg-amber-50/70 border-amber-200/80"
                    : "bg-amber-950/20 border-amber-500/25"
                  : isLight
                  ? "bg-slate-50 border-slate-200/80"
                  : "bg-zinc-900/70 border-zinc-800")
              }
            >
              <div className={"text-[10px] font-mono font-bold uppercase tracking-wider " + (unfinishedTasks.length > 0 ? "text-amber-500" : isLight ? "text-zinc-400" : "text-zinc-500")}>
                Belum Selesai
              </div>
              <div className={"font-display text-2xl font-black font-mono tabular-nums mt-1 " + (unfinishedTasks.length > 0 ? (isLight ? "text-amber-900" : "text-amber-300") : isLight ? "text-zinc-900" : "text-zinc-50")}>
                {unfinishedTasks.length}
              </div>
              <div className={"text-[10.5px] mt-0.5 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                {unfinishedPoints} poin tersisa
              </div>
            </div>
          </div>

          {/* Daftar Ringkas Kartu Selesai & Belum Selesai */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={
                "rounded-2xl p-3.5 border max-h-36 overflow-y-auto " +
                (isLight ? "bg-slate-50/70 border-slate-200/80" : "bg-zinc-900/50 border-zinc-800/80")
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <Icon.Check width={12} height={12} /> Selesai ({doneTasks.length})
                </span>
                <span className={"text-[10px] font-mono " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                  {donePoints} pt
                </span>
              </div>
              {doneTasks.length === 0 ? (
                <p className={"text-[11.5px] py-2 " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                  Belum ada kartu di kolom Selesai.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {doneTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className={"truncate font-medium " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                        {t.title}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                        {t.points || 0}p
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className={
                "rounded-2xl p-3.5 border max-h-36 overflow-y-auto " +
                (isLight ? "bg-slate-50/70 border-slate-200/80" : "bg-zinc-900/50 border-zinc-800/80")
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Belum Selesai ({unfinishedTasks.length})
                </span>
                <span className={"text-[10px] font-mono " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                  {unfinishedPoints} pt
                </span>
              </div>
              {unfinishedTasks.length === 0 ? (
                <p className="text-[11.5px] py-2 text-emerald-500 font-semibold">
                  Luar biasa! Semua kartu sprint ini tuntas 100%.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {unfinishedTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className={"truncate font-medium " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                        {t.title}
                      </span>
                      <span className={"font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 " + (isLight ? "bg-amber-100 text-amber-800" : "bg-amber-500/10 text-amber-300")}>
                        {t.colName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pilihan Penanganan Kartu yang Belum Selesai */}
          {unfinishedTasks.length > 0 && (
            <div className="mt-4">
              <label className={"block text-[11.5px] font-bold mb-2 " + (isLight ? "text-zinc-800" : "text-zinc-200")}>
                Tindakan untuk {unfinishedTasks.length} Kartu yang Belum Selesai:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    key: "backlog",
                    title: "Kembalikan ke Backlog Produk",
                    badge: "Standar Scrum",
                    desc: "Pindahkan kartu yang belum selesai kembali ke kolom Backlog untuk diprioritaskan ulang.",
                  },
                  {
                    key: "keep",
                    title: "Lanjutkan di Sprint Berikutnya",
                    badge: "Carry Over",
                    desc: `Biarkan kartu tetap berada di kolom saat ini untuk langsung dilanjutkan di Sprint #${sprint.number + 1}.`,
                  },
                ].map((opt) => {
                  const active = unfinishedAction === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setUnfinishedAction(opt.key)}
                      className={
                        "text-left rounded-2xl p-3.5 border transition-all cursor-pointer " +
                        (active
                          ? isLight
                            ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20"
                            : "bg-emerald-950/30 border-emerald-500/50 ring-2 ring-emerald-500/20"
                          : isLight
                          ? "bg-slate-50 border-slate-200 hover:bg-slate-100"
                          : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700")
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={"text-[12.5px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                          {opt.title}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                          {opt.badge}
                        </span>
                      </div>
                      <p className={"text-[11px] mt-1 leading-relaxed " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opsi Arsip Kolom Selesai & Catatan Retrospektif */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={"block text-[11.5px] font-bold mb-1.5 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                Catatan Retrospektif Sprint #{sprint.number} (Opsional)
              </label>
              <input
                type="text"
                value={retroNote}
                onChange={(e) => setRetroNote(e.target.value)}
                placeholder="Apa yang berjalan baik atau perlu diperbaiki?"
                className={
                  "w-full px-3.5 py-2 rounded-xl border text-[12.5px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 " +
                  (isLight
                    ? "bg-slate-50 border-slate-300 text-zinc-900 focus:bg-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-emerald-500")
                }
              />
            </div>

            <div>
              <label className={"block text-[11.5px] font-bold mb-1.5 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                Target Awal Sprint #{sprint.number + 1}
              </label>
              <input
                type="text"
                value={nextGoal}
                onChange={(e) => setNextGoal(e.target.value)}
                placeholder={`Tujuan utama Sprint #${sprint.number + 1}...`}
                className={
                  "w-full px-3.5 py-2 rounded-xl border text-[12.5px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 " +
                  (isLight
                    ? "bg-slate-50 border-slate-300 text-zinc-900 focus:bg-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-emerald-500")
                }
              />
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3 pt-2">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={clearDone}
                onChange={(e) => setClearDone(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
              <span className={"text-[12px] font-medium " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                Arsipkan & bersihkan kolom <b>Selesai</b> ({doneTasks.length} kartu) untuk memulai Sprint #{sprint.number + 1} yang bersih
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div
            className="mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-2.5"
            style={{ borderColor: isLight ? "#E2E8F0" : "#27272A" }}
          >
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className={
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[12px] font-semibold transition active:scale-95 cursor-pointer " +
                (isLight
                  ? "border-slate-300 bg-slate-50 text-zinc-700 hover:bg-slate-100"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800")
              }
            >
              <Icon.Frame width={13} height={13} className="text-emerald-400" />
              <span>Salin Laporan Sprint (.md)</span>
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className={
                  "px-4 py-2.5 rounded-full border text-[12.5px] font-semibold transition active:scale-95 cursor-pointer " +
                  (isLight
                    ? "border-slate-300 bg-white text-zinc-700 hover:bg-slate-100"
                    : "border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800")
                }
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-400 text-zinc-950 text-[12.5px] font-extrabold hover:bg-emerald-300 transition active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Icon.Check width={14} height={14} />
                <span>Konfirmasi & Akhiri Sprint #{sprint.number}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */
export default function DashboardPage({ user, onLogout }) {
  const navigate = useNavigate();
  const currentUser = user || DEFAULT_USER;
  const firstName = currentUser.name.split(" ")[0];

  const [board, setBoard] = useState(initialBoard);
  const [sprint, setSprint] = useState(initialSprint);
  const [view, setView] = useState("board");
  const [boardMode, setBoardMode] = useState("kanban");
  const [role, setRole] = useState(currentUser.role || "admin");
  const [theme, setTheme] = useState(() => localStorage.getItem("strata-theme") || "dark");
  const isLight = theme === "light";
  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("strata-theme", next);
      showToast(next === "light" ? "Beralih ke Tema Terang (Light Mode)." : "Beralih ke Tema Gelap (Dark Mode).");
      return next;
    });
  }
  const [lockPriority, setLockPriority] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const handleSidebarMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setSidebarHovered(true);
  };

  const handleSidebarMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setSidebarHovered(false);
    }, 220);
  };

  useEffect(() => {
    function handleWindowScroll() {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setIsScrolledDown((prev) => {
        if (y > 40 && !prev) return true;
        if (y <= 16 && prev) return false;
        return prev;
      });
    }
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    handleWindowScroll();
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);

  // Kunci scroll body saat sidebar mobile terbuka agar tidak memicu overdraw/lag
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Fitur Auto-Scroll & Navigasi Horizontal Papan Kanban (Kanan / Kiri)
  const kanbanScrollRef = useRef(null);
  const [kanbanScrollState, setKanbanScrollState] = useState({ canLeft: false, canRight: false });

  const updateKanbanScrollState = useCallback(() => {
    const el = kanbanScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const canLeft = el.scrollLeft > 6;
    const canRight = el.scrollLeft < maxScroll - 6;
    setKanbanScrollState((prev) => {
      if (prev.canLeft === canLeft && prev.canRight === canRight) return prev;
      return { canLeft, canRight };
    });
  }, []);

  const setKanbanScrollEl = useCallback((node) => {
    if (kanbanScrollRef.cleanup) {
      kanbanScrollRef.cleanup();
      kanbanScrollRef.cleanup = null;
    }
    kanbanScrollRef.current = node;
    if (node) {
      updateKanbanScrollState();
      const ro = new ResizeObserver(() => updateKanbanScrollState());
      ro.observe(node);
      window.addEventListener("resize", updateKanbanScrollState);

      // Opsi 2 (Dioptimasi untuk Touchpad Laptop):
      // Kunci scroll halaman total saat kursor/dua jari berada di atas papan Kanban,
      // dan alihkan geseran touchpad (vertikal maupun horizontal) murni untuk menggeser papan ke kiri/kanan.
      function onBoardWheel(e) {
        if (node.scrollWidth <= node.clientWidth) return;

        // 1. Kunci total scroll halaman (window) agar tidak ikut naik/turun
        e.preventDefault();

        // 2. Geser papan Kanban secara horizontal
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          // Geser 2 jari vertikal di touchpad -> papan geser horizontal
          node.scrollLeft += e.deltaY;
        } else {
          // Geser 2 jari horizontal di touchpad -> papan geser horizontal
          node.scrollLeft += e.deltaX;
        }
      }

      node.addEventListener("wheel", onBoardWheel, { passive: false });

      kanbanScrollRef.cleanup = () => {
        ro.disconnect();
        window.removeEventListener("resize", updateKanbanScrollState);
        node.removeEventListener("wheel", onBoardWheel);
      };
    }
  }, [updateKanbanScrollState]);

  function scrollKanban(dir) {
    const el = kanbanScrollRef.current;
    if (!el) return;
    const amount = 320;
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  const isBoardPanning = useRef(false);
  const panStartRef = useRef({ x: 0, scrollLeft: 0, hasMoved: false });

  function handleBoardPointerDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest("[data-taskid], button, input, select, textarea, a, form, [data-no-pan]")) {
      return;
    }
    const container = kanbanScrollRef.current;
    if (!container) return;

    isBoardPanning.current = true;
    panStartRef.current = {
      x: e.clientX,
      scrollLeft: container.scrollLeft,
      hasMoved: false,
    };

    function onPanMove(ev) {
      if (!isBoardPanning.current || !kanbanScrollRef.current) return;
      const dx = ev.clientX - panStartRef.current.x;
      if (!panStartRef.current.hasMoved && Math.abs(dx) > 3) {
        panStartRef.current.hasMoved = true;
        kanbanScrollRef.current.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }
      if (panStartRef.current.hasMoved) {
        kanbanScrollRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
      }
    }

    function onPanUp() {
      isBoardPanning.current = false;
      if (kanbanScrollRef.current) {
        kanbanScrollRef.current.style.cursor = "";
      }
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPanMove);
      window.removeEventListener("pointerup", onPanUp);
    }

    window.addEventListener("pointermove", onPanMove);
    window.addEventListener("pointerup", onPanUp);
  }

  const [emailNotif, setEmailNotif] = useState(true);
  const [soundNotif, setSoundNotif] = useState(false);
  const [confirmDanger, setConfirmDanger] = useState(false);
  const userEmail = (currentUser.email || "").trim().toLowerCase();
  const savedProfileMeta = useMemo(() => {
    try {
      const raw = localStorage.getItem(`strata-profile-meta-${userEmail}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [userEmail]);
  const [profileName, setProfileName] = useState(() => savedProfileMeta?.name || currentUser.name);
  const [profileTitle, setProfileTitle] = useState(() => savedProfileMeta?.title || "Product Lead");
  const [profileBio, setProfileBio] = useState(() => savedProfileMeta?.bio || "");
  const [profileColor, setProfileColor] = useState(() => savedProfileMeta?.color || currentUser.color || "#10B981");
  const [profilePhotoURL, setProfilePhotoURL] = useState(() => savedProfileMeta?.photoURL || currentUser.photoURL || "");
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [avatarStudioOpen, setAvatarStudioOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [allProjects, setAllProjects] = useState(() => initialProjects());

  // Hanya papan Kanban yang dimiliki / diizinkan untuk akun yang sedang login
  const projects = useMemo(
    () => allProjects.filter((p) => canAccountAccessProject(p, userEmail)),
    [allProjects, userEmail]
  );

  const [activeProjectId, setActiveProjectId] = useState("");
  const activeProjectIdRef = useRef("");
  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  const activeProject = useMemo(() => {
    return (
      projects.find((p) => p.id === activeProjectId) ||
      projects[0] || {
        id: `proj-akun-${userEmail.replace(/[^a-z0-9]+/g, "-")}`,
        name: `Ruang Kerja ${firstName}`,
        tag: "Pribadi",
        dot: "#34D399",
        type: "personal",
        ownerEmail: userEmail,
        allowedEmails: [userEmail],
        createdBy: userEmail,
        description: `Papan kerja Kanban khusus milik akun ${userEmail}.`,
        members: { [userEmail]: "admin" },
      }
    );
  }, [projects, activeProjectId, userEmail, firstName]);

  const [accountsList, setAccountsList] = useState([]);
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [invitingCollab, setInvitingCollab] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteModalInitialEmail, setInviteModalInitialEmail] = useState("");
  const [drag, setDrag] = useState(null);
  const dragGhostRef = useRef(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const activeProjectCollaborators = useMemo(
    () => getProjectCollaborators(activeProject, currentUser, accountsList),
    [activeProject, currentUser, accountsList]
  );

  // Papan Kanban Pribadi (hanya 1 orang / pembuat saja) tidak menggunakan peran Kapten/Anggota/Viewer.
  // Begitu ada kolaborator yang diundang (> 1 orang), pembuat otomatis jadi Kapten ("admin")
  // dan orang yang diundang menjadi "member" (Anggota) atau "viewer" (Viewer) sesuai pilihan Kapten.
  const isPersonalBoard = activeProjectCollaborators.length <= 1;
  const activeProjectOwnerEmail = getProjectOwnerEmail(activeProject);
  const isCurrentUserOwner = activeProjectOwnerEmail === userEmail;

  const autoAssignedRole = useMemo(() => {
    if (isPersonalBoard) return "admin";
    if (isCurrentUserOwner) return "admin";
    const myCollab = activeProjectCollaborators.find((c) => c.email === userEmail);
    return myCollab?.role === "viewer" ? "viewer" : "member";
  }, [isPersonalBoard, isCurrentUserOwner, activeProjectCollaborators, userEmail]);

  // Hanya Pembuat Papan Kanban atau Kapten yang berhak mengundang kolaborator baru
  const canInviteCollaborators = isCurrentUserOwner || role === "admin";

  useEffect(() => {
    setRole(autoAssignedRole);
    if (isPersonalBoard) {
      setBulkMode(false);
      setSelectedTaskIds([]);
    }
  }, [autoAssignedRole, isPersonalBoard, activeProject.id]);

  useEffect(() => {
    const unsubAcc = subscribeToAccounts((list) => {
      if (Array.isArray(list)) setAccountsList(list);
    });
    const unsubGoogle = subscribeToGoogleAuthProfile((fbProfile) => {
      if (
        fbProfile &&
        fbProfile.email &&
        fbProfile.email.toLowerCase() === userEmail &&
        fbProfile.photoURL
      ) {
        setProfilePhotoURL((prev) => prev || fbProfile.photoURL);
        setAvatarImgError(false);
      }
    });
    return () => {
      if (unsubAcc) unsubAcc();
      if (unsubGoogle) unsubGoogle();
    };
  }, [userEmail]);

  useEffect(() => {
    const accMatch = accountsList.find(
      (a) => String(a?.email || "").trim().toLowerCase() === userEmail
    );
    const incomingPhoto = currentUser.photoURL || accMatch?.photoURL || "";
    if (incomingPhoto && !profilePhotoURL) {
      setProfilePhotoURL(incomingPhoto);
      setAvatarImgError(false);
    }
  }, [currentUser.photoURL, accountsList, userEmail, profilePhotoURL]);

  // State Form Input Proyek & Papan Kanban Baru (Database Firestore /projects)
  const [showNewProjectForm, setShowNewProjectForm] = useState(true);
  const [newProjName, setNewProjName] = useState("");
  const [newProjTag, setNewProjTag] = useState("Sprint 1");
  const [newProjType, setNewProjType] = useState("personal");
  const [newProjDot, setNewProjDot] = useState("#34D399");
  const [newProjTemplate, setNewProjTemplate] = useState("starter");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjInvitedEmails, setNewProjInvitedEmails] = useState("");
  const [newProjInviteRole, setNewProjInviteRole] = useState("member");
  const [creatingProject, setCreatingProject] = useState(false);

  const [projAddOpen, setProjAddOpen] = useState(false);
  const [projAddValue, setProjAddValue] = useState("");
  const toastTimer = useRef(null);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem("strata-read-notifs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isRemoteUpdate = useRef(false);
  const firestoreReady = useRef(false);
  const lastSavedJson = useRef("");
  const provisioningAccountRef = useRef(false);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => setLoadingBoard(false), 650);
    let unsub = null;

    ensureDatabaseSeeded().then(() => {
      unsub = subscribeToProjects(async (projList) => {
        if (!Array.isArray(projList)) return;
        setAllProjects(projList);

        let myAccessible = projList.filter((p) => canAccountAccessProject(p, userEmail));

        // Jika akun ini belum punya papan Kanban sendiri di database, buatkan otomatis papan pribadinya
        if (myAccessible.length === 0 && !provisioningAccountRef.current) {
          provisioningAccountRef.current = true;
          const createdForAccount = await ensureAccountProjectInFirestore(currentUser, projList);
          provisioningAccountRef.current = false;
          if (createdForAccount) {
            myAccessible = [createdForAccount];
            setAllProjects((prev) => {
              const exists = prev.some((x) => x.id === createdForAccount.id);
              return exists ? prev : [...prev, createdForAccount];
            });
          }
        }

        const currentActiveId = activeProjectIdRef.current;
        const targetProj = myAccessible.find((p) => p.id === currentActiveId) || myAccessible[0];
        if (!targetProj) {
          setLoadingBoard(false);
          return;
        }

        if (targetProj.id !== currentActiveId) {
          activeProjectIdRef.current = targetProj.id;
          setActiveProjectId(targetProj.id);
        }

        const incomingJson = JSON.stringify({
          projectId: targetProj.id,
          board: targetProj.board,
          sprint: targetProj.sprint,
          lockPriority: !!targetProj.lockPriority,
        });
        if (incomingJson === lastSavedJson.current) {
          firestoreReady.current = true;
          setLoadingBoard(false);
          return;
        }
        isRemoteUpdate.current = true;
        lastSavedJson.current = incomingJson;
        if (Array.isArray(targetProj.board) && targetProj.board.length > 0) {
          setBoard(targetProj.board);
        }
        if (targetProj.sprint && typeof targetProj.sprint === "object") {
          setSprint(targetProj.sprint);
        }
        if (typeof targetProj.lockPriority === "boolean") {
          setLockPriority(targetProj.lockPriority);
        } else if (typeof targetProj.restrictToPriority === "boolean") {
          setLockPriority(targetProj.restrictToPriority);
        }
        firestoreReady.current = true;
        setLoadingBoard(false);
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 60);
      });
    });

    return () => {
      clearTimeout(fallbackTimer);
      if (unsub) unsub();
    };
  }, [userEmail]);

  useEffect(() => {
    if (!firestoreReady.current || isRemoteUpdate.current || !activeProjectId) return;
    const currentJson = JSON.stringify({
      projectId: activeProjectId,
      board,
      sprint,
      lockPriority: !!lockPriority,
    });
    if (currentJson === lastSavedJson.current) return;

    // Sinkronkan state lokal daftar allProjects agar kartu & tabel di Beranda langsung ter-update
    setAllProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, board, sprint, lockPriority: !!lockPriority }
          : p
      )
    );

    const timer = setTimeout(() => {
      lastSavedJson.current = currentJson;
      saveProjectToFirestore(activeProjectId, {
        board,
        sprint,
        lockPriority: !!lockPriority,
        updatedBy: userEmail,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [board, sprint, lockPriority, activeProjectId, userEmail]);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2400);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setCmdOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const commentNotifications = useMemo(() => {
    const list = [];
    for (const col of board) {
      for (const task of col.tasks) {
        const comments = Array.isArray(task.comments) ? task.comments : [];
        if (comments.length > 0) {
          const latestComment = comments[comments.length - 1];
          const isRead = readNotifIds.includes(task.id);
          list.push({
            taskId: task.id,
            taskTitle: task.title,
            taskPriority: task.priority,
            columnId: col.id,
            columnName: col.name,
            columnDot: col.dot,
            commentsCount: comments.length,
            latestComment: latestComment,
            isRead: isRead,
            task: task,
          });
        }
      }
    }
    return list;
  }, [board, readNotifIds]);

  const unreadCount = commentNotifications.filter((n) => !n.isRead).length;

  function markAsRead(taskId) {
    setReadNotifIds((prev) => {
      if (prev.includes(taskId)) return prev;
      const next = [...prev, taskId];
      try {
        localStorage.setItem("strata-read-notifs", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function markAllAsRead() {
    const allTaskIds = commentNotifications.map((n) => n.taskId);
    setReadNotifIds(allTaskIds);
    try {
      localStorage.setItem("strata-read-notifs", JSON.stringify(allTaskIds));
    } catch {}
    showToast("Semua notifikasi komentar ditandai sudah dibaca.");
  }

  function findTask(id) {
    for (const col of board) {
      const t = col.tasks.find((x) => x.id === id);
      if (t) return { task: t, col };
    }
    return null;
  }
  const activeFound = activeTaskId ? findTask(activeTaskId) : null;

  const [activityLog, setActivityLog] = useState(() => {
    try {
      const saved = localStorage.getItem("strata-board-activity-log");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const logBoardActivity = useCallback(
    (actionTitle, detailText = "", category = "card") => {
      const actorName = (profileName || currentUser.name || "Pengguna").trim();
      const entry = {
        id: "act_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 5),
        projectId: activeProjectIdRef.current || activeProject.id,
        actor: actorName,
        actorEmail: userEmail,
        actorColor: profileColor || "#10B981",
        title: actionTitle,
        detail: detailText,
        category,
        timeLabel: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dateLabel: new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        }),
        ts: Date.now(),
      };
      setActivityLog((prev) => {
        const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 60);
        try {
          localStorage.setItem("strata-board-activity-log", JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [profileName, currentUser.name, activeProject.id, userEmail, profileColor]
  );

  function addTask(colId, title, priority = "medium") {
    if (role === "viewer") return;
    const defaultAssignee =
      currentUser.memberKey ||
      Object.keys(MEMBERS).find(
        (k) =>
          String(MEMBERS[k]?.email || "").toLowerCase() === userEmail ||
          MEMBERS[k]?.name === currentUser.name
      ) ||
      "rn";
    let targetColName = "Papan";
    setBoard((prev) => {
      const targetCol = prev.some((c) => c.id === colId) ? colId : prev[0].id;
      const foundCol = prev.find((c) => c.id === targetCol);
      if (foundCol) targetColName = foundCol.name;
      return prev.map((c) =>
        c.id === targetCol
          ? {
              ...c,
              tasks: [
                ...c.tasks,
                makeTask({ title, priority, due: "Tanpa tenggat", assignee: defaultAssignee }),
              ],
            }
          : c
      );
    });
    logBoardActivity(`Menambahkan kartu "${title}"`, `Kolom: ${targetColName}`, "create");
    showToast("Tugas ditambahkan.");
  }
  function applyAITemplate(templateTasks) {
    if (role === "viewer") return;
    const defaultAssignee =
      currentUser.memberKey ||
      Object.keys(MEMBERS).find(
        (k) =>
          String(MEMBERS[k]?.email || "").toLowerCase() === userEmail ||
          MEMBERS[k]?.name === currentUser.name
      ) ||
      "rn";
    setBoard((prev) =>
      prev.map((c) => {
        const toAdd = templateTasks.filter(
          (t) => (prev.some((bc) => bc.id === t.column) ? t.column : prev[0].id) === c.id
        );
        if (!toAdd.length) return c;
        return {
          ...c,
          tasks: [
            ...c.tasks,
            ...toAdd.map((t) =>
              makeTask({
                title: t.title,
                priority: t.priority,
                due: "Tanpa tenggat",
                assignee: defaultAssignee,
              })
            ),
          ],
        };
      })
    );
    logBoardActivity(
      `Menerapkan ${templateTasks.length} kartu AI`,
      "Dibuat bersama asisten AI STRATA",
      "ai"
    );
    showToast(`${templateTasks.length} kartu tugas dari asisten AI berhasil diterapkan ke papan!`);
  }
  function deleteTask(id) {
    const found = findTask(id);
    setBoard((prev) => prev.map((c) => ({ ...c, tasks: c.tasks.filter((x) => x.id !== id) })));
    if (activeTaskId === id) setActiveTaskId(null);
    if (found?.task) {
      logBoardActivity(`Menghapus kartu "${found.task.title}"`, `Dari kolom ${found.col?.name || ""}`, "delete");
    }
    showToast("Tugas dihapus.");
  }
  function moveTask(id, targetColId, targetTaskId = null, dropPos = "after") {
    if (role === "viewer") return;
    const found = findTask(id);
    const currentTask = found?.task;
    const sourceCol = found?.col;
    if (!currentTask || !sourceCol) return;

    if (role === "member" && !isPersonalBoard && !currentTask.prioritized) {
      showToast("Hanya tugas yang diprioritaskan Kapten yang dapat dipindahkan oleh Anggota.");
      return;
    }

    const isSameCol = sourceCol.id === targetColId;
    if (isSameCol && (!targetTaskId || targetTaskId === id)) {
      return;
    }

    const targetMeta = board.find((c) => c.id === targetColId);
    if (
      !isSameCol &&
      targetMeta?.wip != null &&
      targetMeta.tasks.length >= targetMeta.wip &&
      role !== "admin" &&
      !isPersonalBoard
    ) {
      showToast(`Kolom "${targetMeta.name}" sudah mencapai batas WIP (${targetMeta.wip}). Selesaikan kartu lain dulu.`);
      return;
    }

    setBoard((prev) => {
      let moved = null;
      const withoutTask = prev.map((c) => {
        const idx = c.tasks.findIndex((t) => t.id === id);
        if (idx > -1) {
          moved = c.tasks[idx];
          return { ...c, tasks: c.tasks.filter((t) => t.id !== id) };
        }
        return c;
      });
      if (!moved) return prev;
      if (role === "member" && !moved.assignee && myMemberKey) {
        moved = { ...moved, assignee: myMemberKey };
      }
      const next = withoutTask.map((c) => {
        if (c.id !== targetColId) return c;
        const list = [...c.tasks];
        if (targetTaskId && targetTaskId !== id) {
          const targetIdx = list.findIndex((t) => t.id === targetTaskId);
          if (targetIdx > -1) {
            const insertAt = dropPos === "before" ? targetIdx : targetIdx + 1;
            list.splice(insertAt, 0, moved);
            return { ...c, tasks: list };
          }
        }
        list.push(moved);
        return { ...c, tasks: list };
      });
      const target = next.find((c) => c.id === targetColId);
      if (isSameCol) {
        showToast(`Urutan "${moved.title}" diperbarui di ${target?.name || "kolom"}.`);
      } else {
        showToast(`"${moved.title}" dipindahkan ke ${target?.name || "kolom"}.`);
      }
      return next;
    });

    if (isSameCol) {
      logBoardActivity(`Mengatur urutan "${currentTask.title}"`, `Di dalam kolom ${sourceCol.name}`, "move");
    } else if (targetMeta) {
      logBoardActivity(
        `Memindahkan "${currentTask.title}"`,
        `${sourceCol.name} → ${targetMeta.name}`,
        "move"
      );
    }
  }

  function togglePriority(id) {
    if (!isPersonalBoard && role !== "admin") return;
    const found = findTask(id);
    setBoard((prev) => {
      let isNowPrioritized = false;
      let taskTitle = "";
      const next = prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => {
          if (t.id === id) {
            isNowPrioritized = !t.prioritized;
            taskTitle = t.title;
            return { ...t, prioritized: isNowPrioritized };
          }
          return t;
        }),
      }));
      showToast(isNowPrioritized ? `"${taskTitle}" diprioritaskan oleh Kapten.` : `Prioritas "${taskTitle}" dicabut.`);
      return next;
    });
    if (found?.task) {
      logBoardActivity(
        !found.task.prioritized
          ? `Memprioritaskan "${found.task.title}"`
          : `Mencabut prioritas "${found.task.title}"`,
        `Kolom: ${found.col?.name || ""}`,
        "priority"
      );
    }
  }

  function toggleSelectTask(id) {
    setSelectedTaskIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleBulkPrioritize(prioritize = true) {
    if (selectedTaskIds.length === 0) return;
    setBoard((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (selectedTaskIds.includes(t.id) ? { ...t, prioritized: prioritize } : t)),
      }))
    );
    showToast(
      prioritize
        ? `${selectedTaskIds.length} kartu berhasil diprioritaskan oleh Kapten.`
        : `Prioritas ${selectedTaskIds.length} kartu telah dicabut.`
    );
    setSelectedTaskIds([]);
    setBulkMode(false);
  }

  function handleSelectAllTasks() {
    const allIds = board.flatMap((c) => c.tasks.map((t) => t.id));
    if (selectedTaskIds.length === allIds.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(allIds);
    }
  }

  function addComment(id, text) {
    const authorName = profileName.trim() || currentUser.name;
    const authorKey = myMemberKey || "rn";
    const newComment = {
      id: "c_" + Date.now().toString(36),
      author: authorName,
      authorKey: authorKey,
      text: text.trim(),
      createdAt: "Baru saja",
    };
    setBoard((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                comments: Array.isArray(t.comments) ? [...t.comments, newComment] : [newComment],
              }
            : t
        ),
      }))
    );
    setReadNotifIds((prev) => {
      const next = prev.filter((x) => x !== id);
      try {
        localStorage.setItem("strata-read-notifs", JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast("Komentar berhasil dikirim.");
  }

  function claimTask(id) {
    if (role !== "member" || !myMemberKey) return;
    setBoard((prev) => prev.map((c) => ({
      ...c,
      tasks: c.tasks.map((t) => (t.id === id && !t.assignee ? { ...t, assignee: myMemberKey } : t)),
    })));
    showToast("Tugas sudah kamu ambil.");
  }
  const [confirmEndInSettings, setConfirmEndInSettings] = useState(false);

  function startSprint(options = {}) {
    if (role !== "admin") {
      showToast("Hanya Kapten yang dapat memulai dan mengatur sprint.");
      return;
    }
    const shouldPull =
      options.autoPullPrioritized !== undefined
        ? !!options.autoPullPrioritized
        : sprint.autoPullPrioritized !== false;
    const nextDuration = Number(options.durationDays || sprint.durationDays || 14);
    const nextGoal =
      (options.goal !== undefined ? options.goal : sprint.goal || "").trim() ||
      `Menyelesaikan target utama Sprint #${sprint.number} tepat waktu.`;
    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    let pulledCount = 0;
    let committedPoints = 0;

    setBoard((prev) => {
      const backlogCol = prev.find((c) => c.id === "backlog");
      const prioritizedToPull =
        shouldPull && backlogCol
          ? backlogCol.tasks.filter((t) => t.prioritized)
          : [];
      pulledCount = prioritizedToPull.length;

      const nextBoard = prev.map((c) => {
        if (c.id === "backlog" && pulledCount > 0) {
          return { ...c, tasks: c.tasks.filter((t) => !t.prioritized) };
        }
        if (c.id === "todo" && pulledCount > 0) {
          return { ...c, tasks: [...c.tasks, ...prioritizedToPull] };
        }
        return c;
      });

      committedPoints = nextBoard
        .filter((c) => SPRINT_COLUMNS.includes(c.id))
        .reduce((sum, c) => sum + c.tasks.reduce((m, t) => m + (t.points || 0), 0), 0);

      return nextBoard;
    });

    setSprint((prev) => ({
      ...prev,
      active: true,
      goal: nextGoal,
      day: 1,
      durationDays: nextDuration,
      autoPullPrioritized: shouldPull,
      startedAt: todayStr,
      burndown: [committedPoints],
    }));
    setConfirmEndInSettings(false);

    showToast(
      pulledCount > 0
        ? `Sprint #${sprint.number} dimulai (${nextDuration} hari)! ${pulledCount} kartu prioritas otomatis masuk ke Sprint Backlog.`
        : `Sprint #${sprint.number} resmi dimulai (${nextDuration} hari)!`
    );
  }

  const [sprintSummaryOpen, setSprintSummaryOpen] = useState(false);

  function endSprint() {
    if (!isPersonalBoard && role !== "admin") {
      showToast("Hanya Kapten yang dapat mengakhiri sprint.");
      return;
    }
    setSprintSummaryOpen(true);
  }

  function confirmEndSprint(options = {}) {
    if (!isPersonalBoard && role !== "admin") {
      showToast("Hanya Kapten yang dapat mengakhiri sprint.");
      return;
    }
    const {
      unfinishedAction = "backlog",
      clearDone = true,
      retroNote = "",
      nextGoal = "",
    } = options;

    const endedNum = sprint.number;
    const doneCol = board.find((c) => c.id === "done");
    const doneTasksCount = doneCol && Array.isArray(doneCol.tasks) ? doneCol.tasks.length : 0;
    const donePoints = doneCol ? doneCol.tasks.reduce((n, t) => n + (t.points || 0), 0) : 0;
    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    setBoard((prev) => {
      const unfinished = prev
        .filter((c) => SPRINT_COLUMNS.includes(c.id) && c.id !== "done")
        .flatMap((c) => c.tasks.map((t) => ({ ...t, prioritized: false })));

      return prev.map((c) => {
        if (c.id === "backlog") {
          return unfinishedAction === "backlog"
            ? { ...c, tasks: [...c.tasks, ...unfinished] }
            : c;
        }
        if (c.id === "done") {
          return clearDone ? { ...c, tasks: [] } : c;
        }
        if (SPRINT_COLUMNS.includes(c.id)) {
          return unfinishedAction === "keep" ? c : { ...c, tasks: [] };
        }
        return c;
      });
    });

    const historyEntry = {
      n: endedNum,
      points: donePoints,
      doneTasks: doneTasksCount,
      endedAt: todayStr,
      ...(retroNote ? { note: retroNote } : {}),
    };

    setSprint((prev) => ({
      ...prev,
      active: false,
      number: prev.number + 1,
      day: 1,
      goal: nextGoal || `Menyelesaikan target prioritas utama Sprint #${prev.number + 1}.`,
      endedAt: todayStr,
      history: [...(Array.isArray(prev.history) ? prev.history : []), historyEntry].slice(-5),
      burndown: [],
    }));
    setLockPriority(false);
    setConfirmEndInSettings(false);
    setSprintSummaryOpen(false);
    showToast(
      `Sprint #${endedNum} selesai (${donePoints} poin)! Siap memulai Sprint #${endedNum + 1}.`
    );
  }
  function updateTask(id, patch) {
    setBoard((prev) => prev.map((c) => ({ ...c, tasks: c.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })));
  }
  function toggleChecklist(id, idx) {
    setBoard((prev) => prev.map((c) => ({
      ...c,
      tasks: c.tasks.map((t) => {
        if (t.id !== id) return t;
        const checklist = t.checklist.map((item, i) => (i === idx ? { ...item, done: !item.done } : item));
        return { ...t, checklist };
      }),
    })));
  }

  function duplicateTask(taskToClone, colId) {
    if (role === "viewer" || !taskToClone) return;
    const cloned = makeTask({
      ...taskToClone,
      id: undefined,
      title: `${taskToClone.title} (Salinan)`,
      checklist: Array.isArray(taskToClone.checklist)
        ? taskToClone.checklist.map((item) => ({ ...item }))
        : [],
      labels: Array.isArray(taskToClone.labels)
        ? taskToClone.labels.map((lbl) => ({ ...lbl }))
        : [],
      comments: [],
    });
    setBoard((prev) => {
      const targetCol = prev.some((c) => c.id === colId) ? colId : prev[0]?.id;
      return prev.map((c) =>
        c.id === targetCol ? { ...c, tasks: [...c.tasks, cloned] } : c
      );
    });
    setActiveTaskId(cloned.id);
    logBoardActivity(`Menduplikasi kartu "${taskToClone.title}"`, `ID Baru: #${String(cloned.id).toUpperCase()}`, "create");
    showToast(`Kartu "${taskToClone.title}" berhasil diduplikasi.`);
  }

  // ============================================================
  // 3. KUSTOMISASI KOLOM KANBAN & BATAS WIP
  // ============================================================
  function updateColumn(colId, patch) {
    if (!isPersonalBoard && role !== "admin") {
      showToast("Hanya Pembuat Papan / Kapten yang dapat mengatur kolom Kanban.");
      return;
    }
    setBoard((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, ...patch } : c))
    );
    const wipLabel =
      patch.wip === null || patch.wip === undefined
        ? "tanpa batas (∞)"
        : `maks ${patch.wip} kartu`;
    logBoardActivity(
      `Mengatur kolom "${patch.name || colId}"`,
      `Batas WIP: ${wipLabel}`,
      "column"
    );
    showToast(
      `Kolom "${patch.name || colId}" diperbarui (WIP: ${wipLabel}).`
    );
  }

  function moveColumn(colId, dir) {
    if (!isPersonalBoard && role !== "admin") return;
    setBoard((prev) => {
      const idx = prev.findIndex((c) => c.id === colId);
      if (idx === -1) return prev;
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      showToast(`Urutan kolom "${moved.name}" digeser.`);
      return next;
    });
  }

  function deleteColumn(colId) {
    if (!isPersonalBoard && role !== "admin") return;
    setBoard((prev) => {
      if (prev.length <= 1) {
        showToast("Minimal harus ada 1 kolom di papan Kanban.");
        return prev;
      }
      const target = prev.find((c) => c.id === colId);
      if (!target) return prev;
      const orphanTasks = Array.isArray(target.tasks) ? target.tasks : [];
      const remaining = prev.filter((c) => c.id !== colId);
      if (orphanTasks.length > 0 && remaining.length > 0) {
        remaining[0] = {
          ...remaining[0],
          tasks: [...(remaining[0].tasks || []), ...orphanTasks],
        };
        showToast(
          `Kolom "${target.name}" dihapus. ${orphanTasks.length} kartu dipindahkan ke "${remaining[0].name}".`
        );
      } else {
        showToast(`Kolom "${target.name}" dihapus.`);
      }
      logBoardActivity(`Menghapus kolom "${target.name}"`, `${orphanTasks.length} kartu dipindahkan`, "column");
      return remaining;
    });
  }

  function addColumn({ name, wip, dot, themeKey }) {
    if (!isPersonalBoard && role !== "admin") {
      showToast("Hanya Pembuat Papan / Kapten yang dapat menambah kolom baru.");
      return;
    }
    const cleanName = String(name || "").trim();
    if (!cleanName) return;
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 18);
    const newCol = {
      id: `col-${slug || "kustom"}-${Date.now().toString(36).slice(-4)}`,
      name: cleanName,
      dot: dot || "#60A5FA",
      themeKey: themeKey || "progress",
      wip: wip === null || wip === undefined ? null : Math.max(1, Number(wip)),
      tasks: [],
    };
    setBoard((prev) => [...prev, newCol]);
    logBoardActivity(`Menambah kolom baru "${cleanName}"`, wip ? `Batas WIP: ${wip}` : "Tanpa batas WIP", "column");
    showToast(`Kolom baru "${cleanName}" ditambahkan ke papan Kanban!`);
    setTimeout(() => {
      if (kanbanScrollRef.current) {
        kanbanScrollRef.current.scrollTo({
          left: kanbanScrollRef.current.scrollWidth,
          behavior: "smooth",
        });
      }
    }, 120);
  }

  function startDrag(e, task, colId, canDrag) {
    if (e.button !== undefined && e.button !== 0) return;
    if (bulkMode) return;
    if (!canDrag) {
      if (role === "member" && !task.prioritized) {
        showToast("Hanya tugas yang diprioritaskan Kapten yang dapat dipindahkan oleh Anggota.");
      } else if (role === "viewer") {
        showToast("Peran Viewer hanya memiliki hak baca.");
      }
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const offsetX = startX - rect.left, offsetY = startY - rect.top;
    let promoted = false;
    let currentX = startX, currentY = startY;
    let autoScrollRaf = null;
    let hoverRaf = null;
    let lastHover = { hoverId: colId, hoverTaskId: null, hoverTaskPos: "after" };

    function getHoverInfo(cx, cy) {
      const el = document.elementFromPoint(cx, cy);
      const colEl = el && el.closest("[data-colid]");
      const hoverId = colEl ? colEl.getAttribute("data-colid") : null;
      const taskEl = el && el.closest("[data-taskid]");
      const hoverTaskId = taskEl ? taskEl.getAttribute("data-taskid") : null;
      let hoverTaskPos = "after";
      if (taskEl) {
        const tRect = taskEl.getBoundingClientRect();
        hoverTaskPos = cy < tRect.top + tRect.height / 2 ? "before" : "after";
      }
      return { hoverId, hoverTaskId, hoverTaskPos };
    }

    function checkAndApplyHover(cx, cy) {
      const { hoverId, hoverTaskId, hoverTaskPos } = getHoverInfo(cx, cy);
      if (
        hoverId !== lastHover.hoverId ||
        hoverTaskId !== lastHover.hoverTaskId ||
        hoverTaskPos !== lastHover.hoverTaskPos
      ) {
        lastHover = { hoverId, hoverTaskId, hoverTaskPos };
        setDrag((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            hoverId,
            hoverTaskId,
            hoverTaskPos,
          };
        });
      }
    }

    function autoScrollLoop() {
      if (promoted && kanbanScrollRef.current) {
        const container = kanbanScrollRef.current;
        const cRect = container.getBoundingClientRect();

        // Zona tepi pemicu auto-scroll horizontal
        const edgeZone = Math.min(150, Math.max(80, cRect.width * 0.15));
        const effectiveRight = Math.min(cRect.right, window.innerWidth);
        const effectiveLeft = Math.max(cRect.left, 0);

        const distFromRight = effectiveRight - currentX;
        const distFromLeft = currentX - effectiveLeft;

        let deltaScroll = 0;

        if (distFromRight < edgeZone && currentX <= effectiveRight + 50 && distFromRight >= -40) {
          // Kursor di sisi kanan papan -> auto scroll ke kanan
          const factor = Math.max(0, Math.min(1, (edgeZone - distFromRight) / edgeZone));
          deltaScroll = Math.round(factor * 22) + 4;
          container.scrollLeft += deltaScroll;
        } else if (distFromLeft < edgeZone && currentX >= effectiveLeft - 50 && distFromLeft >= -40) {
          // Kursor di sisi kiri papan -> auto scroll ke kiri
          const factor = Math.max(0, Math.min(1, (edgeZone - distFromLeft) / edgeZone));
          deltaScroll = -(Math.round(factor * 22) + 4);
          container.scrollLeft += deltaScroll;
        }

        if (deltaScroll !== 0) {
          checkAndApplyHover(currentX, currentY);
        }
      }
      if (promoted) {
        autoScrollRaf = requestAnimationFrame(autoScrollLoop);
      }
    }

    function onMove(ev) {
      if (!canDrag) return;
      currentX = ev.clientX;
      currentY = ev.clientY;
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!promoted) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        promoted = true;
        document.body.classList.add("strata-dragging");
        const info = getHoverInfo(ev.clientX, ev.clientY);
        lastHover = info;
        setDrag({
          id: task.id,
          task,
          colId,
          initialX: ev.clientX,
          initialY: ev.clientY,
          offsetX,
          offsetY,
          w: rect.width,
          hoverId: info.hoverId,
          hoverTaskId: info.hoverTaskId,
          hoverTaskPos: info.hoverTaskPos,
        });
        autoScrollRaf = requestAnimationFrame(autoScrollLoop);
        return;
      }

      // Direct GPU Transform update: 0 React re-renders while moving!
      const posX = ev.clientX - offsetX;
      const posY = ev.clientY - offsetY;
      if (dragGhostRef.current) {
        dragGhostRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
      }

      // Check hover target throttled via requestAnimationFrame
      if (!hoverRaf) {
        hoverRaf = requestAnimationFrame(() => {
          hoverRaf = null;
          checkAndApplyHover(currentX, currentY);
        });
      }
    }

    function onUp(ev) {
      if (autoScrollRaf) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
      }
      if (hoverRaf) {
        cancelAnimationFrame(hoverRaf);
        hoverRaf = null;
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.classList.remove("strata-dragging");
      if (!promoted) {
        setActiveTaskId(task.id);
        return;
      }
      const { hoverId: targetCol, hoverTaskId: targetTaskId, hoverTaskPos: dropPos } = getHoverInfo(ev.clientX, ev.clientY);
      if (targetCol) moveTask(task.id, targetCol, targetTaskId, dropPos);
      setDrag(null);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
  }

  function selectProject(proj, switchToBoard = true) {
    if (!proj) return;
    if (!canAccountAccessProject(proj, userEmail)) {
      const owner = getProjectOwnerEmail(proj);
      showToast(`Akses Ditolak! Papan "${proj.name}" milik akun ${owner} dan tidak dapat diakses oleh ${userEmail}.`);
      return;
    }
    isRemoteUpdate.current = true;
    const nextId = proj.id || "proj-peluncuran-q4";
    activeProjectIdRef.current = nextId;
    setActiveProjectId(nextId);

    const nextBoard = Array.isArray(proj.board) && proj.board.length > 0 ? proj.board : initialBoard();
    const nextSprint = proj.sprint && typeof proj.sprint === "object" ? proj.sprint : initialSprint();
    const nextLock = !!proj.lockPriority;

    lastSavedJson.current = JSON.stringify({
      projectId: nextId,
      board: nextBoard,
      sprint: nextSprint,
      lockPriority: nextLock,
    });

    setBoard(nextBoard);
    setSprint(nextSprint);
    setLockPriority(nextLock);
    setActiveTaskId(null);
    setSelectedTaskIds([]);
    setBulkMode(false);

    if (switchToBoard) {
      setView("board");
      setBoardMode("kanban");
      setSidebarOpen(false);
    }

    setTimeout(() => {
      isRemoteUpdate.current = false;
    }, 80);
  }

  function openProject(index) {
    const p = projects[index];
    if (!p) return;
    selectProject(p, true);
    showToast(`Membuka papan Kanban "${p.name}".`);
  }

  async function handleCreateProject(e, openImmediately = true) {
    if (e) e.preventDefault();
    const trimmedName = newProjName.trim();
    if (!trimmedName) {
      showToast("Masukkan nama proyek terlebih dahulu.");
      return;
    }
    setCreatingProject(true);
    try {
      const invitedList = newProjInvitedEmails
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s && s.includes("@") && s !== userEmail);
      const effectiveType = invitedList.length > 0 ? "team" : newProjType;
      const roleMap = { [userEmail]: "admin" };
      invitedList.forEach((em) => {
        roleMap[em] = newProjInviteRole === "viewer" ? "viewer" : "member";
      });

      const created = await createProjectInFirestore({
        name: trimmedName,
        description: newProjDesc.trim() || `Papan kerja Kanban khusus milik akun ${userEmail} untuk proyek ${trimmedName}.`,
        type: effectiveType,
        dot: newProjDot,
        tag: newProjTag.trim() || "Sprint 1",
        template: newProjTemplate,
        members: roleMap,
        createdBy: userEmail,
        ownerEmail: userEmail,
        allowedEmails: [userEmail, ...invitedList],
      });

      setAllProjects((prev) => {
        const exists = prev.some((x) => x.id === created.id);
        return exists ? prev.map((x) => (x.id === created.id ? created : x)) : [...prev, created];
      });

      setNewProjName("");
      setNewProjDesc("");
      setNewProjInvitedEmails("");
      setNewProjInviteRole("member");
      setNewProjTag("Sprint 1");

      if (openImmediately) {
        selectProject(created, true);
        showToast(
          invitedList.length > 0
            ? `Papan Tim "${created.name}" dibuat! Kamu otomatis menjadi Kapten dan ${invitedList.length} kolaborator sebagai ${newProjInviteRole === "viewer" ? "Viewer" : "Anggota"}.`
            : `Papan Pribadi "${created.name}" berhasil dibuat khusus untuk akun ${userEmail}!`
        );
      } else {
        showToast(`Proyek "${created.name}" berhasil ditambahkan ke tabel database akun kamu.`);
      }
    } catch (err) {
      console.error(err);
      showToast("Gagal membuat proyek baru. Coba lagi.");
    } finally {
      setCreatingProject(false);
    }
  }

  async function handleQuickCreateProject(nameText) {
    const trimmed = nameText.trim();
    if (!trimmed) return;
    setProjAddValue("");
    setProjAddOpen(false);
    const created = await createProjectInFirestore({
      name: trimmed,
      description: `Papan kerja Kanban khusus milik akun ${userEmail} untuk proyek ${trimmed}.`,
      type: "personal",
      dot: "#34D399",
      tag: "Sprint 1",
      template: "starter",
      members: { [userEmail]: "admin" },
      createdBy: userEmail,
      ownerEmail: userEmail,
      allowedEmails: [userEmail],
    });
    setAllProjects((prev) => {
      const exists = prev.some((x) => x.id === created.id);
      return exists ? prev.map((x) => (x.id === created.id ? created : x)) : [...prev, created];
    });
    selectProject(created, true);
    showToast(`Papan Pribadi "${created.name}" dibuat khusus untuk akun ${userEmail}.`);
  }

  async function handleDeleteProject(proj) {
    if (!proj || !proj.id) return;
    if (!canAccountAccessProject(proj, userEmail)) {
      showToast("Akses Ditolak! Kamu tidak bisa menghapus papan milik akun lain.");
      return;
    }
    if (projects.length <= 1) {
      showToast("Minimal harus ada 1 papan proyek aktif untuk akun kamu.");
      return;
    }
    const remainingMy = projects.filter((p) => p.id !== proj.id);
    setAllProjects((prev) => prev.filter((p) => p.id !== proj.id));
    if (activeProjectId === proj.id && remainingMy.length > 0) {
      selectProject(remainingMy[0], false);
    }
    await deleteProjectFromFirestore(proj.id);
    showToast(`Proyek "${proj.name}" dihapus dari database.`);
  }

  function openInviteModal(prefillEmail = "") {
    if (!canInviteCollaborators) {
      showToast("Hanya pembuat papan Kanban atau Kapten yang dapat mengundang orang lain.");
      return;
    }
    setInviteModalInitialEmail((prefillEmail || inviteEmailInput || "").trim());
    setInviteModalOpen(true);
  }

  function handleInviteCollaborator(e, customEmail = "") {
    if (e) e.preventDefault();
    if (!canInviteCollaborators) {
      showToast("Hanya pembuat papan Kanban atau Kapten yang dapat mengundang orang lain.");
      return;
    }
    const rawInput = (customEmail || inviteEmailInput || "").trim();
    openInviteModal(rawInput);
  }

  async function handleConfirmInviteCollaborator(rawEmails, chosenActorRole = "member") {
    if (!canInviteCollaborators) {
      showToast("Hanya pembuat papan Kanban atau Kapten yang dapat mengundang orang lain.");
      return;
    }
    const emailsToAdd = String(rawEmails || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && s.includes("@"));

    if (emailsToAdd.length === 0) {
      showToast("Masukkan format email yang valid (contoh: nama@email.com).");
      return;
    }

    const owner = getProjectOwnerEmail(activeProject);
    const existingAllowed =
      Array.isArray(activeProject.allowedEmails) && activeProject.allowedEmails.length > 0
        ? activeProject.allowedEmails
        : [owner];
    const nextAllowed = Array.from(new Set([owner, ...existingAllowed, ...emailsToAdd]));

    const existingRoleMap =
      activeProject?.members &&
      typeof activeProject.members === "object" &&
      !Array.isArray(activeProject.members)
        ? { ...activeProject.members }
        : {};
    const nextRoleMap = { ...existingRoleMap, [owner]: "admin" };
    const normalizedRole = chosenActorRole === "viewer" ? "viewer" : "member";
    emailsToAdd.forEach((em) => {
      if (em !== owner) {
        nextRoleMap[em] = normalizedRole;
      }
    });

    setInvitingCollab(true);
    try {
      const updatedPatch = await updateProjectCollaboratorsInFirestore(
        activeProject.id,
        owner,
        nextAllowed,
        userEmail,
        nextRoleMap
      );
      if (updatedPatch) {
        setAllProjects((prev) =>
          prev.map((p) => (p.id === activeProject.id ? { ...p, ...updatedPatch } : p))
        );
      }
      setInviteEmailInput("");
      setInviteModalOpen(false);
      showToast(
        `Undangan dikonfirmasi! Pembuat papan otomatis menjadi Kapten dan ${emailsToAdd.join(", ")} bergabung sebagai ${normalizedRole === "viewer" ? "Viewer" : "Anggota"}.`
      );
    } catch (err) {
      console.error(err);
      showToast("Gagal mengundang kolaborator.");
    } finally {
      setInvitingCollab(false);
    }
  }

  async function handleChangeCollaboratorRole(targetEmail, nextActorRole) {
    const target = String(targetEmail || "").trim().toLowerCase();
    const owner = getProjectOwnerEmail(activeProject);
    if (!target || target === owner) return;
    if (userEmail !== owner) {
      showToast("Hanya Kapten (pembuat papan) yang dapat mengubah peran kolaborator.");
      return;
    }

    const existingAllowed =
      Array.isArray(activeProject.allowedEmails) && activeProject.allowedEmails.length > 0
        ? activeProject.allowedEmails
        : [owner, target];
    const existingRoleMap =
      activeProject?.members &&
      typeof activeProject.members === "object" &&
      !Array.isArray(activeProject.members)
        ? { ...activeProject.members }
        : {};
    const normalizedRole = nextActorRole === "viewer" ? "viewer" : "member";
    const nextRoleMap = {
      ...existingRoleMap,
      [owner]: "admin",
      [target]: normalizedRole,
    };

    const updatedPatch = await updateProjectCollaboratorsInFirestore(
      activeProject.id,
      owner,
      existingAllowed,
      userEmail,
      nextRoleMap
    );
    if (updatedPatch) {
      setAllProjects((prev) =>
        prev.map((p) => (p.id === activeProject.id ? { ...p, ...updatedPatch } : p))
      );
    }
    showToast(
      `Peran ${target} di papan "${activeProject.name}" diubah menjadi ${normalizedRole === "viewer" ? "Viewer" : "Anggota"}.`
    );
  }

  async function handleRemoveCollaborator(emailToRemove) {
    const target = String(emailToRemove || "").trim().toLowerCase();
    const owner = getProjectOwnerEmail(activeProject);
    if (!target || target === owner) {
      showToast("Pemilik ruang kerja tidak dapat dihapus.");
      return;
    }

    const existingAllowed = Array.isArray(activeProject.allowedEmails)
      ? activeProject.allowedEmails
      : [owner];
    const nextAllowed = existingAllowed.filter((e) => String(e).trim().toLowerCase() !== target);

    const existingRoleMap =
      activeProject?.members &&
      typeof activeProject.members === "object" &&
      !Array.isArray(activeProject.members)
        ? { ...activeProject.members }
        : {};
    delete existingRoleMap[target];
    existingRoleMap[owner] = "admin";

    const updatedPatch = await updateProjectCollaboratorsInFirestore(
      activeProject.id,
      owner,
      nextAllowed,
      userEmail,
      existingRoleMap
    );
    if (updatedPatch) {
      setAllProjects((prev) =>
        prev.map((p) => (p.id === activeProject.id ? { ...p, ...updatedPatch } : p))
      );
    }
    showToast(
      nextAllowed.length <= 1
        ? `Akses ${target} dicabut. Papan "${activeProject.name}" kembali menjadi Papan Pribadi.`
        : `Akses ${target} ke ruang kerja "${activeProject.name}" telah dicabut.`
    );
  }

  function addFirstColumnTask() {
    setView("board");
    showToast("Gunakan tombol \u201cTambah tugas\u201d pada kolom Perlu Dikerjakan.");
  }

  function handleLogout() {
    onLogout();
    navigate("/login", { replace: true });
  }

  const totalTasks = board.reduce((n, c) => n + c.tasks.length, 0);
  const doneCol = board.find((c) => c.id === "done");
  const doneTasks = doneCol && Array.isArray(doneCol.tasks) ? doneCol.tasks.length : 0;
  const donePct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const isSprintActive = sprint.active !== false;
  const sprintDurationDays = sprint.durationDays || 14;
  const sprintCommittedPoints = board
    .filter((c) => SPRINT_COLUMNS.includes(c.id))
    .reduce((n, c) => n + c.tasks.reduce((m, t) => m + (t.points || 0), 0), 0);
  const sprintDonePoints = doneCol && Array.isArray(doneCol.tasks)
    ? doneCol.tasks.reduce((n, t) => n + (t.points || 0), 0)
    : 0;
  const backlogCol = board.find((c) => c.id === "backlog");
  const backlogPrioritizedCount =
    backlogCol && Array.isArray(backlogCol.tasks)
      ? backlogCol.tasks.filter((t) => t.prioritized).length
      : 0;
  const allProjectsTotalTasks = useMemo(
    () =>
      projects.reduce(
        (sum, p) =>
          sum +
          (Array.isArray(p.board)
            ? p.board.reduce((cSum, col) => cSum + (Array.isArray(col.tasks) ? col.tasks.length : 0), 0)
            : 0),
        0
      ),
    [projects]
  );
  const allProjectsDoneTasks = useMemo(
    () =>
      projects.reduce((sum, p) => {
        const doneCol = Array.isArray(p.board) ? p.board.find((c) => c.id === "done") : null;
        return sum + (doneCol && Array.isArray(doneCol.tasks) ? doneCol.tasks.length : 0);
      }, 0),
    [projects]
  );
  const isViewer = !isPersonalBoard && role === "viewer";
  const roleLabel = isPersonalBoard ? "Papan Pribadi" : ROLE_LABEL[role];
  // Auto-shrink saat scroll ke bawah dan kembali membesar halus saat di-hover (debounced)
  const autoShrunkByScroll = isScrolledDown && !sidebarHovered;
  const railCollapsed = sidebarCollapsed || autoShrunkByScroll;
  const isFloatingDock = isScrolledDown;
  const myMemberKey =
    currentUser.memberKey ||
    Object.keys(MEMBERS).find(
      (k) =>
        String(MEMBERS[k]?.email || "").toLowerCase() === userEmail ||
        String(MEMBERS[k]?.name || "").toLowerCase() === String(currentUser.name || "").toLowerCase()
    ) ||
    activeProjectCollaborators.find((c) => c.email === userEmail)?.memberKey ||
    "rn";
  const myTasks = board.flatMap((c) =>
    c.tasks
      .filter(
        (t) =>
          t.assignee === myMemberKey ||
          String(t.assignee || "").toLowerCase() === userEmail
      )
      .map((t) => ({ ...t, colId: c.id }))
  );
  const myDone = myTasks.filter((t) => t.colId === "done").length;
  const myActive = myTasks.length - myDone;
  const displayName = profileName.trim() || currentUser.name;
  const displayInitials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || currentUser.initials;
  const activeAvatarUrl =
    (!avatarImgError &&
      (profilePhotoURL ||
        currentUser.photoURL ||
        (myMemberKey && MEMBERS[myMemberKey]?.photoURL) ||
        accountsList.find((a) => String(a?.email || "").trim().toLowerCase() === userEmail)?.photoURL)) ||
    "";

  // Sinkronkan identitas aktif ke MEMBERS agar langsung tampil di kartu & komentar
  useEffect(() => {
    if (myMemberKey) {
      MEMBERS[myMemberKey] = {
        ...(MEMBERS[myMemberKey] || {}),
        name: displayName,
        initials: displayInitials,
        color: profileColor || "#10B981",
        email: userEmail,
        title: profileTitle,
        bio: profileBio,
        ...(activeAvatarUrl ? { photoURL: activeAvatarUrl } : { photoURL: null }),
      };
    }
  }, [myMemberKey, displayName, displayInitials, profileColor, userEmail, profileTitle, profileBio, activeAvatarUrl]);

  async function handleSaveProfile(customPatch = null) {
    const cleanName = (customPatch?.name !== undefined ? customPatch.name : profileName).trim() || currentUser.name;
    const cleanTitle = (customPatch?.title !== undefined ? customPatch.title : profileTitle).trim() || "Product Lead";
    const cleanBio = (customPatch?.bio !== undefined ? customPatch.bio : profileBio).trim();
    const cleanColor = customPatch?.color || profileColor || "#10B981";
    const cleanPhoto = customPatch?.photoURL !== undefined ? customPatch.photoURL : profilePhotoURL;
    const nextInitials =
      cleanName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("") || currentUser.initials || "U";

    setSavingProfile(true);
    try {
      const metaPayload = {
        name: cleanName,
        initials: nextInitials,
        title: cleanTitle,
        bio: cleanBio,
        color: cleanColor,
        photoURL: cleanPhoto || "",
      };
      try {
        localStorage.setItem(`strata-profile-meta-${userEmail}`, JSON.stringify(metaPayload));
        const sessionRaw = localStorage.getItem("strata-user");
        if (sessionRaw) {
          const parsedSession = JSON.parse(sessionRaw);
          if (parsedSession && String(parsedSession.email || "").toLowerCase() === userEmail) {
            localStorage.setItem(
              "strata-user",
              JSON.stringify({
                ...parsedSession,
                name: cleanName,
                initials: nextInitials,
                color: cleanColor,
                photoURL: cleanPhoto || null,
              })
            );
          }
        }
      } catch {}

      await updateAccountProfileInFirestore(myMemberKey || userEmail, {
        name: cleanName,
        initials: nextInitials,
        color: cleanColor,
        title: cleanTitle,
        bio: cleanBio,
        photoURL: cleanPhoto || null,
        email: userEmail,
      });

      setProfileSaved(true);
      logBoardActivity(`Memperbarui profil & avatar (${cleanName})`, cleanTitle, "profile");
      showToast("Profil & identitas avatar berhasil disimpan ke Cloud Firestore!");
    } catch (err) {
      console.error(err);
      showToast("Profil disimpan secara lokal.");
    } finally {
      setSavingProfile(false);
    }
  }

  function handleAvatarFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      showToast("Ukuran gambar maksimal 1.5 MB agar cepat disinkronkan.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setProfilePhotoURL(dataUrl);
      setProfileSaved(false);
      handleSaveProfile({ photoURL: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  // ============================================================
  // 1. FILTER & SORTIR CEPAT PAPAN KANBAN
  // ============================================================
  const [boardFilterPreset, setBoardFilterPreset] = useState("all");
  const [boardSearchText, setBoardSearchText] = useState("");
  const [boardSortBy, setBoardSortBy] = useState("default");

  function resetBoardFilters() {
    setBoardFilterPreset("all");
    setBoardSearchText("");
    setBoardSortBy("default");
  }

  const allBoardTasksFlat = useMemo(() => board.flatMap((c) => c.tasks || []), [board]);
  const highPriorityCount = useMemo(
    () => allBoardTasksFlat.filter((t) => t.priority === "high" || t.priority === "urgent").length,
    [allBoardTasksFlat]
  );
  const mediumPriorityCount = useMemo(
    () => allBoardTasksFlat.filter((t) => t.priority === "medium").length,
    [allBoardTasksFlat]
  );
  const lowPriorityCount = useMemo(
    () => allBoardTasksFlat.filter((t) => t.priority === "low").length,
    [allBoardTasksFlat]
  );
  const captainPrioritizedTotalCount = useMemo(
    () => allBoardTasksFlat.filter((t) => t.prioritized).length,
    [allBoardTasksFlat]
  );

  const isBoardFiltered =
    boardFilterPreset !== "all" || boardSearchText.trim() !== "" || boardSortBy !== "default";

  const filteredBoard = useMemo(() => {
    const q = boardSearchText.trim().toLowerCase();
    const prioWeight = { urgent: 4, high: 3, medium: 2, low: 1 };

    return board.map((col) => {
      let list = Array.isArray(col.tasks) ? [...col.tasks] : [];

      if (boardFilterPreset === "mine") {
        list = list.filter(
          (t) =>
            t.assignee === myMemberKey ||
            String(t.assignee || "").toLowerCase() === userEmail
        );
      } else if (boardFilterPreset === "captain") {
        list = list.filter((t) => !!t.prioritized);
      } else if (boardFilterPreset === "high") {
        list = list.filter((t) => t.priority === "high" || t.priority === "urgent");
      } else if (boardFilterPreset === "medium") {
        list = list.filter((t) => t.priority === "medium");
      } else if (boardFilterPreset === "low") {
        list = list.filter((t) => t.priority === "low");
      }

      if (q) {
        list = list.filter((t) => {
          const titleMatch = (t.title || "").toLowerCase().includes(q);
          const descMatch = (t.desc || "").toLowerCase().includes(q);
          const dueMatch = (t.due || "").toLowerCase().includes(q);
          const resolvedAssignee = resolveAssigneeProfile(t.assignee);
          const memberName = (resolvedAssignee?.name || "").toLowerCase();
          const labelMatch = Array.isArray(t.labels)
            ? t.labels.some((l) => String(l.name || l.text || "").toLowerCase().includes(q))
            : false;
          return titleMatch || descMatch || dueMatch || memberName.includes(q) || labelMatch;
        });
      }

      if (boardSortBy === "priority_desc") {
        list.sort(
          (a, b) =>
            (prioWeight[b.priority] || 0) - (prioWeight[a.priority] || 0) ||
            Number(!!b.prioritized) - Number(!!a.prioritized)
        );
      } else if (boardSortBy === "points_desc") {
        list.sort((a, b) => (b.points || 0) - (a.points || 0));
      } else if (boardSortBy === "points_asc") {
        list.sort((a, b) => (a.points || 0) - (b.points || 0));
      } else if (boardSortBy === "title_asc") {
        list.sort((a, b) => (a.title || "").localeCompare(b.title || "", "id"));
      }

      return { ...col, filteredTasks: list };
    });
  }, [board, boardFilterPreset, boardSearchText, boardSortBy, myMemberKey, userEmail]);

  const filteredTasksCount = useMemo(
    () => filteredBoard.reduce((n, c) => n + (c.filteredTasks ? c.filteredTasks.length : 0), 0),
    [filteredBoard]
  );

  // ============================================================
  // ANALITIK BEBAN KERJA TIM & RADAR TENGGAT WAKTU
  // ============================================================
  const boardAnalytics = useMemo(() => {
    const workloadMap = new Map();
    activeProjectCollaborators.forEach((c) => {
      const k = c.memberKey || c.email;
      workloadMap.set(k, {
        key: k,
        name: c.name,
        email: c.email,
        initials: c.initials,
        color: c.color,
        photoURL: c.photoURL || null,
        role: c.role,
        isOwner: c.isOwner,
        total: 0,
        done: 0,
        inProgress: 0,
        points: 0,
        donePoints: 0,
      });
    });

    const dueRadar = {
      overdue: [],
      today: [],
      soon: [],
      done: [],
    };

    let unassignedCount = 0;
    let totalPointsAll = 0;

    board.forEach((col) => {
      const isDone =
        col.id === "done" ||
        String(col.name || "").toLowerCase().includes("selesai");
      const isProg =
        col.id === "progress" ||
        col.id === "review" ||
        String(col.name || "").toLowerCase().includes("sedang");

      (col.tasks || []).forEach((t) => {
        const pts = Number(t.points || 0);
        totalPointsAll += pts;
        const dueState = evaluateTaskDue(t, col.id, isLight);
        const enriched = { ...t, colId: col.id, colName: col.name, colDot: col.dot, dueState };
        if (dueState.status === "overdue") dueRadar.overdue.push(enriched);
        else if (dueState.status === "today") dueRadar.today.push(enriched);
        else if (dueState.status === "soon") dueRadar.soon.push(enriched);
        else if (dueState.status === "done") dueRadar.done.push(enriched);

        const resolved = resolveAssigneeProfile(t.assignee);
        if (!resolved) {
          unassignedCount += 1;
          return;
        }
        const mKey = resolved.key;
        if (!workloadMap.has(mKey)) {
          workloadMap.set(mKey, {
            key: mKey,
            name: resolved.name,
            email: resolved.email || "",
            initials: resolved.initials || "U",
            color: resolved.color || "#3B82F6",
            photoURL: resolved.photoURL || null,
            role: resolved.role || "member",
            isOwner: false,
            total: 0,
            done: 0,
            inProgress: 0,
            points: 0,
            donePoints: 0,
          });
        }
        const entry = workloadMap.get(mKey);
        entry.total += 1;
        entry.points += pts;
        if (isDone) {
          entry.done += 1;
          entry.donePoints += pts;
        } else if (isProg) {
          entry.inProgress += 1;
        }
      });
    });

    const membersWorkload = Array.from(workloadMap.values()).sort(
      (a, b) => b.total - a.total || b.points - a.points
    );

    return {
      membersWorkload,
      dueRadar,
      unassignedCount,
      totalPointsAll,
    };
  }, [board, activeProjectCollaborators, isLight]);

  const projectActivityList = useMemo(() => {
    const filtered = activityLog.filter(
      (a) => !a.projectId || a.projectId === activeProject.id
    );
    return filtered;
  }, [activityLog, activeProject.id]);

  // ============================================================
  // 5. EKSPOR CSV, BACKUP JSON & IMPOR PAPAN PROYEK
  // ============================================================
  const importFileInputRef = useRef(null);

  function handleExportBoardCSV() {
    const headers = [
      "ID Kartu",
      "Kolom",
      "Judul Tugas",
      "Prioritas",
      "Prioritas Kapten",
      "Story Points",
      "Penanggung Jawab",
      "Tenggat Waktu",
      "Label",
      "Checklist Selesai",
      "Total Checklist",
      "Jumlah Komentar",
    ];
    const rows = [];
    board.forEach((col) => {
      (col.tasks || []).forEach((t) => {
        const assigneeProf = resolveAssigneeProfile(t.assignee);
        const labelsStr = Array.isArray(t.labels)
          ? t.labels.map((l) => l.name).join(" | ")
          : "";
        const chkTotal = Array.isArray(t.checklist) ? t.checklist.length : 0;
        const chkDone = Array.isArray(t.checklist)
          ? t.checklist.filter((c) => c.done).length
          : 0;
        const row = [
          t.id || "",
          col.name || col.id,
          t.title || "",
          PRIORITY_LABEL[t.priority] || t.priority || "Sedang",
          t.prioritized ? "Ya" : "Tidak",
          t.points ?? 0,
          assigneeProf ? assigneeProf.name : "Belum ditugaskan",
          t.due || "Tanpa tenggat",
          labelsStr,
          chkDone,
          chkTotal,
          Array.isArray(t.comments) ? t.comments.length : 0,
        ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
        rows.push(row.join(","));
      });
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = (activeProject.name || "strata-board")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    a.href = url;
    a.download = `${slug}-sprint-${sprint.number || 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logBoardActivity(`Mengekspor tabel CSV (${totalTasks} kartu)`, `${slug}-sprint-${sprint.number || 1}.csv`, "export");
    showToast(`Data papan "${activeProject.name}" berhasil diekspor ke CSV!`);
  }

  function handleExportBoardJSON() {
    const payload = {
      schemaVersion: "strata-v2",
      exportedAt: new Date().toISOString(),
      exportedBy: userEmail,
      project: {
        id: activeProject.id,
        name: activeProject.name,
        tag: activeProject.tag,
        dot: activeProject.dot,
        description: activeProject.description,
      },
      sprint,
      board,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = (activeProject.name || "strata-board")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    a.href = url;
    a.download = `${slug}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    logBoardActivity(`Backup JSON papan diunduh`, `${slug}-backup.json`, "export");
    showToast(`File cadangan JSON "${activeProject.name}" berhasil diunduh!`);
  }

  function handleImportBoardJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const importedBoard = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.board)
          ? parsed.board
          : null;
        if (!importedBoard || importedBoard.length === 0) {
          showToast("Format file JSON tidak valid: properti board tidak ditemukan.");
          return;
        }
        const sanitizedBoard = importedBoard.map((col, idx) => ({
          id: col.id || `col-imp-${idx}`,
          name: col.name || `Kolom ${idx + 1}`,
          dot: col.dot || "#34D399",
          themeKey: col.themeKey || undefined,
          wip: col.wip ?? null,
          tasks: Array.isArray(col.tasks) ? col.tasks.map((t) => makeTask(t)) : [],
        }));
        setBoard(sanitizedBoard);
        if (parsed.sprint && typeof parsed.sprint === "object") {
          setSprint((prev) => ({ ...prev, ...parsed.sprint }));
        }
        const importedTaskCount = sanitizedBoard.reduce((s, c) => s + c.tasks.length, 0);
        logBoardActivity(
          `Mengimpor cadangan JSON (${sanitizedBoard.length} kolom, ${importedTaskCount} kartu)`,
          file.name,
          "import"
        );
        showToast(
          `Berhasil mengimpor ${sanitizedBoard.length} kolom dan ${importedTaskCount} kartu dari ${file.name}!`
        );
      } catch (err) {
        console.error(err);
        showToast("Gagal membaca file JSON. Pastikan file backup STRATA valid.");
      } finally {
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  // ============================================================
  // 4. PENGATURAN PROYEK / PAPAN KANBAN AKTIF (REAL-TIME FIRESTORE)
  // ============================================================
  const [settingsProjName, setSettingsProjName] = useState(activeProject.name || "");
  const [settingsProjTag, setSettingsProjTag] = useState(activeProject.tag || "Sprint 1");
  const [settingsProjDesc, setSettingsProjDesc] = useState(activeProject.description || "");
  const [settingsProjDot, setSettingsProjDot] = useState(activeProject.dot || "#34D399");
  const [settingsProjSaved, setSettingsProjSaved] = useState(true);
  const [savingProjSettings, setSavingProjSettings] = useState(false);
  const [confirmResetBoard, setConfirmResetBoard] = useState(false);

  useEffect(() => {
    setSettingsProjName(activeProject.name || "");
    setSettingsProjTag(activeProject.tag || "Sprint 1");
    setSettingsProjDesc(activeProject.description || "");
    setSettingsProjDot(activeProject.dot || "#34D399");
    setSettingsProjSaved(true);
    setConfirmResetBoard(false);
    setConfirmDanger(false);
  }, [activeProject.id]);

  async function handleSaveProjectSettings(e) {
    if (e) e.preventDefault();
    if (!isPersonalBoard && role !== "admin") {
      showToast("Hanya Pembuat Papan / Kapten yang dapat mengubah pengaturan papan.");
      return;
    }
    const cleanName = settingsProjName.trim();
    if (!cleanName) {
      showToast("Nama papan proyek tidak boleh kosong.");
      return;
    }
    const cleanTag = settingsProjTag.trim() || "Sprint 1";
    const cleanDesc =
      settingsProjDesc.trim() || `Papan kerja Kanban untuk proyek ${cleanName}.`;
    const cleanDot = settingsProjDot || "#34D399";

    setSavingProjSettings(true);
    try {
      setAllProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? {
                ...p,
                name: cleanName,
                tag: cleanTag,
                description: cleanDesc,
                dot: cleanDot,
              }
            : p
        )
      );
      await saveProjectToFirestore(activeProject.id, {
        name: cleanName,
        tag: cleanTag,
        description: cleanDesc,
        dot: cleanDot,
        updatedBy: userEmail,
      });
      setSettingsProjSaved(true);
      logBoardActivity(`Memperbarui identitas papan "${cleanName}"`, `Tag: ${cleanTag}`, "settings");
      showToast(`Pengaturan papan "${cleanName}" berhasil disimpan ke database!`);
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan pengaturan papan.");
    } finally {
      setSavingProjSettings(false);
    }
  }

  function handleResetBoardTasks(mode = "empty") {
    if (!isPersonalBoard && role !== "admin") {
      showToast("Hanya Pembuat Papan / Kapten yang dapat mereset papan.");
      return;
    }
    const nextBoard =
      mode === "starter"
        ? createStarterBoard(activeProject.name)
        : createEmptyBoard();
    setBoard(nextBoard);
    setConfirmResetBoard(false);
    logBoardActivity(
      mode === "starter" ? "Mereset papan ke 3 tugas awal" : "Mengosongkan seluruh kartu papan",
      activeProject.name,
      "reset"
    );
    showToast(
      mode === "starter"
        ? `Papan "${activeProject.name}" direset ke 3 tugas awal.`
        : `Semua kartu di papan "${activeProject.name}" berhasil dikosongkan.`
    );
  }

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [view]);

  return (
    <div
      className={"min-h-dvh w-full max-w-full overflow-x-clip flex flex-col md:flex-row " + (isLight ? "theme-light bg-slate-100 text-zinc-900" : "bg-zinc-950 text-zinc-50")}
    >
      <div className="strata-grain" aria-hidden="true" />
      <div className="strata-ambient-glow" aria-hidden="true" />
      <a
        href="#dashboard-main-content"
        className={"fixed left-3 -top-14 focus:top-3 z-[95] text-sm font-semibold px-4 py-2.5 rounded-xl transition-[top] duration-300 shadow-md " + (isLight ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-900")}
      >
        Lompat ke konten utama
      </a>

      {/* Spacer kolom untuk menjaga tata letak sidebar */}
      <div
        aria-hidden="true"
        className={
          "hidden md:block flex-shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] " +
          (railCollapsed ? "w-[74px]" : "w-[264px]")
        }
      />

      {/* Sidebar Navigation (Auto-shrink floating capsule saat di-scroll) */}
      <div
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className={
          "fixed z-[55] flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width,transform] " +
          (isFloatingDock
            ? "inset-y-0 left-0 md:inset-y-3 md:left-3 md:h-[calc(100dvh-24px)] "
            : "inset-y-0 left-0 h-dvh ") +
          (railCollapsed ? "w-72 md:w-[74px]" : "w-72 md:w-[264px]") +
          " " +
          (sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")
        }
      >
        <aside
          className={
            "flex flex-col h-full w-full overflow-y-auto overflow-x-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
            (railCollapsed ? "p-4 md:p-3" : "p-4") +
            " " +
            (isFloatingDock
              ? "border-r md:border md:rounded-3xl strata-sidebar-floating " +
                (isLight
                  ? "bg-white/95 border-slate-200 shadow-xl"
                  : "bg-zinc-900/95 border-zinc-800 shadow-2xl")
              : "border-r " +
                (isLight ? "bg-white border-slate-200" : "bg-zinc-900 border-zinc-800"))
          }
        >
          <div className={"flex items-center gap-2 font-extrabold text-[17px] pb-5 pt-1.5 min-w-0 transition-all duration-300 " + (railCollapsed ? "justify-center px-0" : "px-1.5")}>
            <div className="relative flex-shrink-0">
              <Logo />
            </div>
            {!railCollapsed && <span className="truncate min-w-0">STRATA</span>}
            {!railCollapsed && (
              <button
                onClick={() => {
                  setSidebarCollapsed(true);
                  setSidebarHovered(false);
                }}
                title="Ciutkan sidebar"
                aria-label="Ciutkan sidebar"
                className={"hidden md:flex ml-auto w-7 h-7 rounded-lg border items-center justify-center active:scale-90 transition cursor-pointer flex-shrink-0 " + (isLight ? "bg-slate-50 border-slate-200 text-zinc-500 hover:text-zinc-900 hover:bg-slate-100" : "bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700")}
              >
                <Icon.Chevron className="rotate-90" />
              </button>
            )}
            <button aria-label="Tutup menu" className={"md:hidden ml-auto w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition flex-shrink-0 " + (isLight ? "text-zinc-500 hover:bg-slate-100" : "text-zinc-400 hover:bg-zinc-800")} onClick={() => setSidebarOpen(false)}>
              <Icon.X />
            </button>
          </div>

          {railCollapsed && (
            <button
              onClick={() => {
                if (isScrolledDown) {
                  setSidebarHovered(true);
                } else {
                  setSidebarCollapsed(false);
                }
              }}
              title="Perluas sidebar"
              aria-label="Perluas sidebar"
              className={"hidden md:flex mx-auto mb-3 w-9 h-9 rounded-xl border items-center justify-center active:scale-90 transition cursor-pointer " + (isLight ? "bg-slate-50 border-slate-200 text-zinc-600 hover:text-zinc-900 hover:bg-slate-100" : "bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:text-zinc-50 hover:bg-zinc-700")}
            >
              <Icon.Chevron className="-rotate-90" />
            </button>
          )}

        <button
          onClick={() => setView("home")}
          title={`Ruang kerja ${firstName}`}
          className={"w-full min-w-0 flex items-center gap-2.5 rounded-xl border mb-4 text-[13px] font-semibold active:scale-[0.98] transition-all duration-200 " + (railCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5") + " " + (isLight ? "border-slate-200 hover:bg-slate-100/80 text-zinc-900 shadow-2xs" : "border-zinc-800 hover:bg-zinc-800/60 text-zinc-100 shadow-2xs")}
        >
          <span className="w-6.5 h-6.5 rounded-lg bg-emerald-400 flex-shrink-0 shadow-xs" />
          {!railCollapsed && (
            <>
              <span className="flex-1 min-w-0 text-left truncate">Ruang kerja {firstName}</span>
              <span className="flex-shrink-0">
                <Icon.Chevron />
              </span>
            </>
          )}
        </button>

        <nav className="flex flex-col gap-1 mb-5 min-w-0">
          {[
            { id: "home", label: "Beranda & Proyek", Ic: Icon.Home },
            { id: "board", label: "Papan Kanban", Ic: Icon.Board },
            { id: "members", label: "Anggota", Ic: Icon.Users },
            { id: "settings", label: "Pengaturan", Ic: Icon.Settings },
          ].map((n) => (
            <button
              key={n.id}
              title={n.label}
              onClick={() => { setView(n.id); setSidebarOpen(false); }}
              className={
                "w-full min-w-0 flex items-center gap-2.5 rounded-xl text-[13.5px] font-semibold transition-all duration-200 active:scale-[0.97] " +
                (railCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5") +
                " " +
                (view === n.id
                  ? isLight
                    ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80 shadow-2xs"
                    : "bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20"
                  : isLight
                  ? "text-zinc-600 hover:bg-slate-100 hover:text-zinc-900 border border-transparent"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 border border-transparent")
              }
            >
              <span className="flex-shrink-0">
                <n.Ic />
              </span>
              {!railCollapsed && <span className="truncate min-w-0">{n.label}</span>}
            </button>
          ))}
        </nav>

        {!railCollapsed && (
          <div className="flex items-center justify-between px-2.5 pb-1.5 min-w-0">
            <span className={"text-[11px] font-bold uppercase tracking-wider truncate " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
              Papan Akunmu ({projects.length})
            </span>
          </div>
        )}
        <div className={"flex flex-col gap-1 mb-2 min-w-0 " + (railCollapsed ? "items-center" : "")}>
          {projects.map((p, i) => {
            const isProjActive = p.id === activeProject.id;
            const projTasksCount = Array.isArray(p.board)
              ? p.board.reduce((acc, c) => acc + (Array.isArray(c.tasks) ? c.tasks.length : 0), 0)
              : 0;
            return (
              <button
                key={p.id || i}
                title={`${p.name} (${projTasksCount} tugas)`}
                onClick={() => openProject(i)}
                className={
                  "flex items-center gap-2.5 rounded-xl text-[13px] active:scale-[0.98] transition-all duration-200 min-w-0 " +
                  (railCollapsed ? "justify-center w-9 h-9" : "px-2.5 py-2 w-full") +
                  " " +
                  (isProjActive
                    ? isLight
                      ? "bg-slate-100 text-zinc-900 font-bold border border-slate-300/80 shadow-2xs"
                      : "bg-zinc-800/90 text-zinc-50 font-bold border border-zinc-700/80 shadow-2xs"
                    : isLight
                    ? "text-zinc-600 hover:bg-slate-100 hover:text-zinc-900 border border-transparent"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-50 border border-transparent")
                }
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.dot || "#34D399" }} />
                {!railCollapsed && (
                  <>
                    <span className="flex-1 min-w-0 text-left truncate">{p.name}</span>
                    <span className={"flex-shrink-0 text-[10.5px] font-mono px-1.5 py-0.5 rounded-md " + (isProjActive ? (isLight ? "bg-white text-zinc-700" : "bg-zinc-900 text-zinc-300") : (isLight ? "text-zinc-400" : "text-zinc-500"))}>
                      {projTasksCount}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        {railCollapsed ? (
          <button onClick={() => { setSidebarCollapsed(false); setSidebarHovered(true); setProjAddOpen(true); }} title="Proyek baru" className={"flex items-center justify-center w-9 h-9 mx-auto rounded-xl active:scale-[0.98] transition " + (isLight ? "text-zinc-400 hover:bg-slate-100 hover:text-zinc-900" : "text-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50")}>
            <Icon.Plus />
          </button>
        ) : !projAddOpen ? (
          <button onClick={() => setProjAddOpen(true)} className={"w-full min-w-0 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium active:scale-[0.98] transition " + (isLight ? "text-emerald-700 hover:bg-emerald-50" : "text-emerald-400 hover:bg-emerald-950/30")}>
            <span className="flex-shrink-0"><Icon.Plus /></span>
            <span className="truncate">Tambah papan cepat</span>
          </button>
        ) : (
          <div className="px-2.5 py-1">
            <input
              autoFocus
              value={projAddValue}
              onChange={(e) => setProjAddValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && projAddValue.trim()) {
                  handleQuickCreateProject(projAddValue);
                } else if (e.key === "Escape") { setProjAddValue(""); setProjAddOpen(false); }
              }}
              placeholder="Nama proyek, lalu Enter"
              className={"w-full px-2.5 py-2 rounded-lg border text-[12.5px] focus:outline-none focus:ring-2 " + (isLight ? "border-slate-300 bg-white text-zinc-900 focus:ring-emerald-500" : "border-zinc-700 bg-zinc-900 text-zinc-50 focus:ring-emerald-900")}
            />
          </div>
        )}

        <div className={"mt-auto pt-3 border-t flex flex-col gap-2 min-w-0 " + (isLight ? "border-slate-200" : "border-zinc-800") + (railCollapsed ? " items-center" : "")}>
          {isScrolledDown && (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              title="Kembali ke atas halaman"
              className={
                "flex items-center justify-center gap-2 rounded-xl border text-[11px] font-semibold transition-all duration-200 active:scale-95 cursor-pointer " +
                (railCollapsed ? "w-9 h-9" : "w-full px-2.5 py-1.5") +
                " " +
                (isLight
                  ? "bg-emerald-50/90 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20")
              }
            >
              <Icon.Chevron className="rotate-180 flex-shrink-0" />
              {!railCollapsed && <span className="truncate">Kembali ke Atas</span>}
            </button>
          )}
          {railCollapsed ? (
            <span title={roleLabel} className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          ) : (
            <span className={"inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1.5 rounded-full max-w-full " + (isLight ? "bg-slate-100 text-zinc-700 border border-slate-200" : "bg-zinc-800 text-zinc-300")}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="truncate">{roleLabel}</span>
            </span>
          )}
        </div>
        </aside>
      </div>

      <div
        className={
          "fixed inset-0 bg-black/60 z-[50] md:hidden transition-opacity duration-300 ease-out " +
          (sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-clip">
        <header className={"sticky top-0 z-20 backdrop-blur-xl border-b flex items-center gap-2.5 sm:gap-3.5 px-4 sm:px-6 py-3 transition-colors " + (isLight ? "bg-white/85 border-slate-200/80 text-zinc-900 shadow-2xs" : "bg-zinc-950/80 border-white/5 text-zinc-50 shadow-2xs")}>
          <button aria-label="Buka menu" className={"md:hidden w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 active:scale-95 transition " + (isLight ? "border-slate-200 text-zinc-700 hover:bg-slate-100" : "border-zinc-800 text-zinc-300 hover:bg-zinc-800")} onClick={() => setSidebarOpen(true)}>
            <Icon.Menu />
          </button>
          <div className={"hidden sm:flex items-center gap-2 text-[13px] min-w-0 flex-shrink " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: activeProject.dot || "#34D399" }}></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: activeProject.dot || "#34D399" }}></span>
            </span>
            <b className={"truncate max-w-[140px] lg:max-w-[240px] xl:max-w-[300px] " + (isLight ? "text-zinc-900 font-bold" : "text-zinc-50 font-bold")}>{activeProject.name}</b>
            {activeProject.tag && (
              <span className="hidden lg:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                {activeProject.tag}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className={
              "group relative flex-1 max-w-[440px] flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-full border backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.985] min-w-0 cursor-pointer " +
              (isLight
                ? "border-slate-200/90 bg-white/90 text-zinc-500 hover:border-emerald-400/80 hover:bg-white shadow-2xs hover:shadow-[0_8px_24px_-6px_rgba(16,185,129,0.16)]"
                : "border-white/[0.08] bg-zinc-900/75 text-zinc-400 hover:border-emerald-500/40 hover:bg-zinc-900/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_-6px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_26px_-6px_rgba(16,185,129,0.2)]")
            }
          >
            <span
              className={
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
                (isLight
                  ? "bg-slate-100 border-slate-200/80 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500"
                  : "bg-zinc-800/90 border-white/[0.07] text-emerald-400 group-hover:bg-emerald-400 group-hover:text-zinc-950 group-hover:border-emerald-300 group-hover:shadow-[0_0_12px_rgba(52,211,153,0.4)]")
              }
            >
              <Icon.Search width={13.5} height={13.5} />
            </span>
            <span
              className={
                "flex-1 text-left text-[12.5px] font-medium tracking-tight truncate transition-colors " +
                (isLight ? "text-zinc-500 group-hover:text-zinc-800" : "text-zinc-400 group-hover:text-zinc-100")
              }
            >
              Cari tugas, kolom, atau perintah...
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 flex-shrink-0">
              <kbd
                className={
                  "text-[10px] font-mono font-bold rounded-full px-2 py-0.5 border transition-colors " +
                  (isLight
                    ? "border-slate-200/90 text-zinc-500 bg-slate-50 group-hover:border-emerald-200 group-hover:bg-emerald-50/70 group-hover:text-emerald-700"
                    : "border-white/[0.08] text-zinc-400 bg-zinc-800/80 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 group-hover:text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
                }
              >
                Ctrl F
              </kbd>
            </span>
          </button>
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <button
              onClick={toggleTheme}
              title={isLight ? "Beralih ke Tema Gelap" : "Beralih ke Tema Terang"}
              aria-label={isLight ? "Beralih ke Tema Gelap" : "Beralih ke Tema Terang"}
              className={"w-9.5 h-9.5 rounded-xl flex items-center justify-center transition active:scale-90 " + (isLight ? "text-amber-600 hover:bg-amber-50" : "text-amber-400 hover:bg-zinc-800")}
            >
              {isLight ? <Icon.Moon width={18} height={18} /> : <Icon.Sun width={18} height={18} />}
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                title="Notifikasi Komentar"
                aria-label="Notifikasi Komentar"
                className={
                  "relative w-9.5 h-9.5 rounded-xl flex items-center justify-center active:scale-90 transition " +
                  (isLight ? "text-zinc-600 hover:bg-slate-100" : "text-zinc-400 hover:bg-zinc-800") +
                  (notifOpen ? (isLight ? " bg-slate-100 text-zinc-900" : " bg-zinc-800 text-zinc-100") : "")
                }
              >
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow-xs animate-pulse ring-2 ring-white dark:ring-zinc-900">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : (
                  commentNotifications.length > 0 && (
                    <span className={"absolute top-2 right-2 w-1.5 h-1.5 rounded-full " + (isLight ? "bg-blue-500" : "bg-blue-400")} />
                  )
                )}
                <Icon.Bell />
              </button>

              {notifOpen && (
                <NotificationPanel
                  notifications={commentNotifications}
                  unreadCount={unreadCount}
                  onSelectTask={(taskId) => {
                    markAsRead(taskId);
                    setView("board");
                    setActiveTaskId(taskId);
                    setNotifOpen(false);
                  }}
                  onMarkAllAsRead={markAllAsRead}
                  onClose={() => setNotifOpen(false)}
                  theme={theme}
                />
              )}
            </div>
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className={
                  "group flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full border backdrop-blur-md active:scale-[0.97] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer " +
                  (isLight
                    ? "bg-white/90 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 shadow-2xs"
                    : "bg-zinc-900/75 border-white/[0.08] hover:border-white/[0.16] hover:bg-zinc-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]") +
                  (userMenuOpen
                    ? isLight
                      ? " ring-2 ring-emerald-500/20 border-emerald-400"
                      : " ring-2 ring-emerald-500/20 border-emerald-500/40 bg-zinc-800/90"
                    : "")
                }
              >
                {activeAvatarUrl ? (
                  <img
                    src={activeAvatarUrl}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarImgError(true)}
                    className="relative w-7 h-7 rounded-full object-cover shadow-xs ring-1 ring-emerald-500/40 flex-shrink-0"
                  />
                ) : (
                  <span
                    className="relative w-7 h-7 rounded-full text-zinc-950 text-[11px] font-extrabold tracking-tight flex items-center justify-center shadow-xs ring-1 ring-black/10 flex-shrink-0"
                    style={{ background: profileColor || "#10B981" }}
                  >
                    {displayInitials}
                  </span>
                )}
                <span className={"hidden sm:inline text-[13px] font-semibold tracking-tight truncate max-w-[110px] " + (isLight ? "text-zinc-800" : "text-zinc-100")}>
                  {displayName.split(" ")[0]}
                </span>
                <Icon.Chevron
                  className={
                    "transition-transform duration-200 " +
                    (userMenuOpen ? "rotate-180 " : "") +
                    (isLight ? "text-zinc-400 group-hover:text-zinc-700" : "text-zinc-500 group-hover:text-zinc-300")
                  }
                />
              </button>

              {/* Dropdown Menu Profil — Clean Doppelrand */}
              <div
                className={
                  "absolute top-[calc(100%+10px)] right-0 w-64 rounded-[24px] p-1 border backdrop-blur-2xl z-30 origin-top-right transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] " +
                  (isLight
                    ? "bg-white/90 border-slate-200/90 text-zinc-900 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)]"
                    : "bg-zinc-900/90 border-white/10 text-zinc-50 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]") +
                  (userMenuOpen ? " opacity-100 scale-100 visible translate-y-0" : " opacity-0 scale-95 invisible -translate-y-1 pointer-events-none")
                }
              >
                <div
                  className={
                    "rounded-[19px] p-1.5 border " +
                    (isLight
                      ? "bg-white border-slate-100"
                      : "bg-zinc-900/95 border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]")
                  }
                >
                  {/* Identitas Singkat */}
                  <div className={"flex items-center gap-3 px-2.5 py-2.5 border-b mb-1 " + (isLight ? "border-slate-100" : "border-zinc-800/80")}>
                    {activeAvatarUrl ? (
                      <img
                        src={activeAvatarUrl}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarImgError(true)}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-xs ring-2 ring-emerald-500/35"
                      />
                    ) : (
                      <span
                        className="w-9 h-9 rounded-full text-zinc-950 text-xs font-extrabold flex items-center justify-center flex-shrink-0 shadow-xs"
                        style={{ background: profileColor || "#10B981" }}
                      >
                        {displayInitials}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={"text-[13px] font-bold truncate " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                          {displayName}
                        </span>
                      </div>
                      <div className={"text-[11px] truncate " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                        {currentUser.email}
                      </div>
                      <span
                        className={
                          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 " +
                          (isPersonalBoard
                            ? isLight
                              ? "bg-slate-100 text-zinc-600"
                              : "bg-zinc-800 text-zinc-300"
                            : isLight
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-emerald-500/15 text-emerald-300")
                        }
                      >
                        <span className={"w-1.5 h-1.5 rounded-full " + (isPersonalBoard ? "bg-zinc-400" : "bg-emerald-400")} />
                        {isPersonalBoard
                          ? "Papan Pribadi"
                          : isCurrentUserOwner
                          ? "Kapten Papan"
                          : ROLE_LABEL[autoAssignedRole]}
                      </span>
                    </div>
                  </div>

                  {/* Navigasi Menu */}
                  <button
                    type="button"
                    onClick={() => {
                      setView("profile");
                      setUserMenuOpen(false);
                    }}
                    className={"w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium active:scale-[0.98] transition cursor-pointer " + (isLight ? "text-zinc-700 hover:bg-slate-100 hover:text-zinc-900" : "text-zinc-200 hover:bg-zinc-800/80 hover:text-white")}
                  >
                    <Icon.User width={15} height={15} className=" opacity-75" />
                    <span>Profil saya</span>
                  </button>

                  {canInviteCollaborators && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        openInviteModal("");
                      }}
                      className={"w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium active:scale-[0.98] transition cursor-pointer " + (isLight ? "text-zinc-700 hover:bg-slate-100 hover:text-zinc-900" : "text-zinc-200 hover:bg-zinc-800/80 hover:text-white")}
                    >
                      <Icon.Users width={15} height={15} className="text-emerald-400" />
                      <span>Undang kolaborator</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setView("settings");
                      setUserMenuOpen(false);
                    }}
                    className={"w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium active:scale-[0.98] transition cursor-pointer " + (isLight ? "text-zinc-700 hover:bg-slate-100 hover:text-zinc-900" : "text-zinc-200 hover:bg-zinc-800/80 hover:text-white")}
                  >
                    <Icon.Settings width={15} height={15} className="opacity-75" />
                    <span>Pengaturan</span>
                  </button>

                  <div className={"my-1 border-t " + (isLight ? "border-slate-100" : "border-zinc-800/80")} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={"w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium text-rose-500 active:scale-[0.98] transition cursor-pointer " + (isLight ? "hover:bg-rose-50" : "hover:bg-rose-950/40")}
                  >
                    <Icon.Logout width={15} height={15} />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main id="dashboard-main-content" className="flex-1 min-w-0 w-full px-5 sm:px-7 py-6 pb-16">
          {view === "home" && (
            <section className="w-full max-w-7xl mx-auto space-y-8">
              {/* Top Hero & Action Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider mb-3 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <Icon.Shield width={13} height={13} />
                    Isolasi Papan Per Akun Aktif · {userEmail}
                  </div>
                  <h1 className={"font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-balance " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                    Selamat siang, {firstName}.
                  </h1>
                  <p className={"mt-1.5 text-[14.5px] " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                    Setiap akun memiliki papan Kanban tersendiri di database. Akun lain <b>tidak dapat mengakses</b> papan Kanban milikmu tanpa izin.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowNewProjectForm((v) => !v)}
                    className={
                      "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold transition-all duration-200 active:scale-95 shadow-sm " +
                      (showNewProjectForm
                        ? isLight
                          ? "bg-slate-200 text-zinc-800 hover:bg-slate-300"
                          : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700"
                        : "bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-emerald-500/20")
                    }
                  >
                    <Icon.Plus width={14} height={14} />
                    {showNewProjectForm ? "Sembunyikan Form Input" : "Input Proyek Kanban Baru"}
                  </button>
                  <button
                    onClick={() => setView("board")}
                    className={"inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-[13px] font-semibold transition-all duration-200 active:scale-95 " + (isLight ? "bg-white border-slate-200 text-zinc-800 hover:bg-slate-50 shadow-2xs" : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800")}
                  >
                    <Icon.Board width={14} height={14} />
                    Buka Papan Aktif
                  </button>
                </div>
              </div>

              {/* Ringkasan Statistik Lintas Proyek Akun Ini */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={"rounded-3xl p-1.5 border " + (isLight ? "bg-slate-200/60 border-slate-200/80" : "bg-zinc-900/50 border-zinc-800/70")}>
                  <div className={"rounded-[20px] px-5 py-4 border h-full " + (isLight ? "bg-white border-white shadow-2xs" : "bg-zinc-900 border-zinc-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]")}>
                    <div className="flex items-center justify-between">
                      <span className={"text-[11px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>Papan Milik Akunmu</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className={"font-display text-2xl font-extrabold tracking-tight font-mono tabular-nums mt-1.5 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                      {projects.length} Papan Aktif
                    </div>
                    <div className={"text-[12px] mt-1 " + (isLight ? "text-emerald-700 font-medium" : "text-emerald-400 font-medium")}>
                      Terkunci khusus untuk {userEmail}
                    </div>
                  </div>
                </div>
                <div className={"rounded-3xl p-1.5 border " + (isLight ? "bg-slate-200/60 border-slate-200/80" : "bg-zinc-900/50 border-zinc-800/70")}>
                  <div className={"rounded-[20px] px-5 py-4 border h-full " + (isLight ? "bg-white border-white shadow-2xs" : "bg-zinc-900 border-zinc-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]")}>
                    <div className="flex items-center justify-between">
                      <span className={"text-[11px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>Tugas di Papan Akunmu</span>
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                    </div>
                    <div className={"font-display text-2xl font-extrabold tracking-tight font-mono tabular-nums mt-1.5 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                      {allProjectsTotalTasks} Tugas ({allProjectsDoneTasks} Selesai)
                    </div>
                    <div className={"text-[12px] mt-1 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                      {totalTasks} tugas pada papan <b className={isLight ? "text-zinc-800" : "text-zinc-200"}>{activeProject.name}</b>
                    </div>
                  </div>
                </div>
                <div className={"rounded-3xl p-1.5 border " + (isLight ? "bg-slate-200/60 border-slate-200/80" : "bg-zinc-900/50 border-zinc-800/70")}>
                  <div className={"rounded-[20px] px-5 py-4 border h-full " + (isLight ? "bg-white border-white shadow-2xs" : "bg-zinc-900 border-zinc-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]")}>
                    <div className="flex items-center justify-between">
                      <span className={"text-[11px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>Papan yang Sedang Aktif</span>
                      <span className="w-2 h-2 rounded-full" style={{ background: activeProject.dot || "#34D399" }} />
                    </div>
                    <div className={"font-display text-xl font-extrabold tracking-tight truncate mt-1.5 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                      {activeProject.name}
                    </div>
                    <div className={"text-[12px] mt-1 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                      Sprint #{sprint.number} · {donePct}% selesai
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM INPUT PROYEK BARU PER PAPAN KANBAN (DATABASE FIRESTORE) */}
              {showNewProjectForm && (
                <div className={"rounded-[28px] p-1.5 border transition-all " + (isLight ? "bg-slate-200/70 border-slate-300/80 shadow-sm" : "bg-zinc-900/60 border-zinc-800/80 shadow-2xl")}>
                  <form
                    onSubmit={(e) => handleCreateProject(e, true)}
                    className={"rounded-[22px] p-6 border " + (isLight ? "bg-white border-white" : "bg-zinc-900/95 border-zinc-800/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-zinc-800/40 dark:border-zinc-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: newProjDot }} />
                          <h2 className={"font-display text-[17px] font-extrabold tracking-tight " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                            Input Proyek Baru & Buat Papan Kanban Pribadi / Tim
                          </h2>
                        </div>
                        <p className={"text-[12.5px] mt-1 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                          Papan yang kamu buat otomatis dikunci untuk akun <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{userEmail}</code> dan tidak bisa diakses akun lain.
                        </p>
                      </div>
                      <span className={"inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg border " + (isLight ? "bg-slate-50 border-slate-200 text-zinc-600" : "bg-zinc-950 border-zinc-800 text-zinc-400")}>
                        <Icon.Lock width={12} height={12} className="text-emerald-400" /> Pemilik: {userEmail}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-5">
                        <label className={"block text-[12px] font-bold mb-1.5 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                          Nama Proyek / Papan Kanban *
                        </label>
                        <input
                          type="text"
                          required
                          value={newProjName}
                          onChange={(e) => setNewProjName(e.target.value)}
                          placeholder="Contoh: Integrasi Payment Gateway Q1"
                          className={"w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition " + (isLight ? "bg-slate-50 border-slate-300 text-zinc-900 focus:bg-white" : "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-emerald-500")}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className={"block text-[12px] font-bold mb-1.5 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                          Label / Tag Sprint
                        </label>
                        <input
                          type="text"
                          value={newProjTag}
                          onChange={(e) => setNewProjTag(e.target.value)}
                          placeholder="Sprint 1 / Q4"
                          className={"w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition " + (isLight ? "bg-slate-50 border-slate-300 text-zinc-900 focus:bg-white" : "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-emerald-500")}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className={"block text-[12px] font-bold mb-1.5 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                          Mode Akses
                        </label>
                        <select
                          value={newProjType}
                          onChange={(e) => setNewProjType(e.target.value)}
                          className={"w-full px-3 py-2.5 rounded-xl border text-[13.5px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition " + (isLight ? "bg-slate-50 border-slate-300 text-zinc-900" : "bg-zinc-950 border-zinc-800 text-zinc-100")}
                        >
                          <option value="personal">Privat (Hanya Akunmu)</option>
                          <option value="team">Tim (Undang Email)</option>
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className={"block text-[12px] font-bold mb-1.5 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                          Template Papan Awal
                        </label>
                        <select
                          value={newProjTemplate}
                          onChange={(e) => setNewProjTemplate(e.target.value)}
                          className={"w-full px-3 py-2.5 rounded-xl border text-[13.5px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition " + (isLight ? "bg-slate-50 border-slate-300 text-zinc-900" : "bg-zinc-950 border-zinc-800 text-zinc-100")}
                        >
                          <option value="starter">Siap Pakai (3 Tugas Awal)</option>
                          <option value="empty">Papan Kosong (0 Tugas)</option>
                        </select>
                      </div>

                      <div className="md:col-span-5">
                        <label className={"block text-[12px] font-bold mb-1.5 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                          Deskripsi & Sasaran Proyek
                        </label>
                        <input
                          type="text"
                          value={newProjDesc}
                          onChange={(e) => setNewProjDesc(e.target.value)}
                          placeholder="Ringkasan ruang lingkup proyek..."
                          className={"w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition " + (isLight ? "bg-slate-50 border-slate-300 text-zinc-900 focus:bg-white" : "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-emerald-500")}
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className={"block text-[12px] font-bold mb-1.5 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                          Undang Kolaborator (Opsional, pisahkan koma)
                        </label>
                        <input
                          type="text"
                          value={newProjInvitedEmails}
                          onChange={(e) => setNewProjInvitedEmails(e.target.value)}
                          placeholder="Kosongkan untuk Papan Pribadi (tanpa Kapten/Anggota)"
                          className={"w-full px-3.5 py-2.5 rounded-xl border text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition " + (isLight ? "bg-slate-50 border-slate-300 text-zinc-900 focus:bg-white" : "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-emerald-500")}
                        />
                        {newProjInvitedEmails.trim() ? (
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                            <span className={"text-[11px] font-semibold " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                              Kamu otomatis jadi <b className="text-emerald-500">Kapten</b>. Peran undangan:
                            </span>
                            <div className={"inline-flex items-center gap-1 p-0.5 rounded-lg border " + (isLight ? "bg-slate-100 border-slate-200" : "bg-zinc-900 border-zinc-800")}>
                              <button
                                type="button"
                                onClick={() => setNewProjInviteRole("member")}
                                className={"px-2.5 py-1 rounded-md text-[11px] font-bold transition " + (newProjInviteRole === "member" ? "bg-emerald-400 text-zinc-950 shadow-2xs" : (isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-200"))}
                              >
                                Anggota
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewProjInviteRole("viewer")}
                                className={"px-2.5 py-1 rounded-md text-[11px] font-bold transition " + (newProjInviteRole === "viewer" ? "bg-sky-400 text-zinc-950 shadow-2xs" : (isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-200"))}
                              >
                                Viewer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={"text-[11px] mt-1.5 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                            Papan pribadi bebas dari atribut Kapten, Anggota, atau Viewer.
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-3">
                        <label className={"block text-[12px] font-bold mb-1.5 " + (isLight ? "text-zinc-700" : "text-zinc-300")}>
                          Warna Identitas Papan
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          {PROJECT_DOT_OPTIONS.map((opt) => (
                            <button
                              key={opt.color}
                              type="button"
                              onClick={() => setNewProjDot(opt.color)}
                              title={opt.label}
                              className={
                                "w-7 h-7 rounded-full flex items-center justify-center transition-transform " +
                                (newProjDot === opt.color ? "scale-115 ring-2 ring-offset-2 ring-emerald-400 dark:ring-offset-zinc-900" : "opacity-75 hover:opacity-100")
                              }
                              style={{ background: opt.color }}
                            >
                              {newProjDot === opt.color && <Icon.Check width={12} height={12} className="text-zinc-950 stroke-[2.5]" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2.5 mt-5 pt-4 border-t border-zinc-800/30 dark:border-zinc-800">
                      <button
                        type="button"
                        disabled={creatingProject || !newProjName.trim()}
                        onClick={(e) => handleCreateProject(e, false)}
                        className={"px-4 py-2.5 rounded-full border text-[13px] font-semibold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed " + (isLight ? "border-slate-300 bg-slate-50 text-zinc-800 hover:bg-slate-100" : "border-zinc-700 bg-zinc-800/70 text-zinc-200 hover:bg-zinc-800")}
                      >
                        Simpan ke Galeri Saja
                      </button>
                      <button
                        type="submit"
                        disabled={creatingProject || !newProjName.trim()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-400 text-zinc-950 text-[13px] font-bold hover:bg-emerald-300 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/15"
                      >
                        <Icon.Plus width={14} height={14} />
                        {creatingProject ? "Menyimpan ke Database..." : "Buat Proyek & Buka Papan Kanban"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* GALERI VISUAL PAPAN PROYEK */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={"font-display text-[16px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                    Galeri Pratinjau Papan Kanban
                  </h3>
                  <span className={"text-xs " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                    Klik kartu proyek untuk membuka papan Kanban
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {projects.map((p, i) => (
                    <ProjectCard
                      key={p.id || i}
                      project={p}
                      index={i}
                      isActive={p.id === activeProject.id}
                      onOpen={openProject}
                      canDelete={projects.length > 1}
                      onDelete={handleDeleteProject}
                      currentUser={currentUser}
                      accountsList={accountsList}
                      theme={theme}
                    />
                  ))}
                  <AddProjectCard
                    onClick={() => {
                      setShowNewProjectForm(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    theme={theme}
                  />
                </div>
              </div>
            </section>
          )}

          {view === "board" && (
            <section className="w-full min-w-0 max-w-full">
              {/* Bar Pemilih Proyek Cepat di Atas Papan Kanban */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 border-b border-zinc-800/40 dark:border-zinc-800/60">
                <span className={"text-[11px] font-bold uppercase tracking-wider mr-1 flex-shrink-0 " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                  Papan Proyek:
                </span>
                {projects.map((p, idx) => {
                  const isCurr = p.id === activeProject.id;
                  const count = Array.isArray(p.board)
                    ? p.board.reduce((acc, c) => acc + (Array.isArray(c.tasks) ? c.tasks.length : 0), 0)
                    : 0;
                  return (
                    <button
                      key={p.id || idx}
                      onClick={() => openProject(idx)}
                      className={
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all flex-shrink-0 active:scale-95 " +
                        (isCurr
                          ? isLight
                            ? "bg-zinc-900 text-white shadow-xs"
                            : "bg-emerald-400/15 text-emerald-300 border border-emerald-500/30 shadow-xs"
                          : isLight
                          ? "bg-white border border-slate-200 text-zinc-600 hover:text-zinc-900 hover:bg-slate-50"
                          : "bg-zinc-900/70 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")
                      }
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: p.dot || "#34D399" }} />
                      <span>{p.name}</span>
                      <span className="text-[10.5px] font-mono opacity-75">({count})</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    setView("home");
                    setShowNewProjectForm(true);
                  }}
                  className={"inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold flex-shrink-0 transition active:scale-95 " + (isLight ? "text-emerald-700 hover:bg-emerald-50" : "text-emerald-400 hover:bg-emerald-950/40")}
                >
                  <Icon.Plus width={12} height={12} /> Proyek Baru
                </button>
              </div>

              {isViewer ? (
                <>
                  <h1 className={"text-2xl font-extrabold tracking-tight text-balance mb-5 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                    {activeProject.name} {activeProject.tag ? `— ${activeProject.tag}` : ""}
                  </h1>
                  <ViewerBoard board={board} sprint={sprint} theme={theme} />
                </>
              ) : (
                <>
                  <SprintBar
                    board={board}
                    sprint={sprint}
                    role={role}
                    isPersonalBoard={isPersonalBoard}
                    lockPriority={lockPriority}
                    theme={theme}
                    onGoalChange={(goal) => setSprint((prev) => ({ ...prev, goal }))}
                    onToggleLock={() => {
                      setLockPriority((v) => !v);
                      showToast(!lockPriority ? "Anggota dibatasi ke kartu berbintang." : "Semua kartu kembali bisa diambil anggota.");
                    }}
                    onStartSprint={startSprint}
                    onEndSprint={endSprint}
                    onOpenSettings={() => setView("settings")}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3.5 mb-5">
                    <div className="min-w-[240px] flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: activeProject.dot || "#34D399" }} />
                        <h1 className={"text-2xl font-extrabold tracking-tight text-balance truncate " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                          {activeProject.name} {activeProject.tag ? `— ${activeProject.tag}` : ""}
                        </h1>
                      </div>
                      <div className={"text-[13px] mt-1 line-clamp-1 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                        {totalTasks} tugas di {board.length} kolom · {activeProject.description}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 max-w-full">
                      <div className={"flex items-center gap-1 border rounded-full p-1 backdrop-blur-md transition-all max-w-full overflow-x-auto " + (isLight ? "bg-slate-200/70 border-slate-300/80 shadow-2xs" : "bg-zinc-900/80 border-white/5 shadow-2xs")}>
                        <button
                          onClick={() => setBoardMode("kanban")}
                          className={"flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 active:scale-95 cursor-pointer flex-shrink-0 " + (boardMode === "kanban" ? (isLight ? "bg-white text-zinc-900 shadow-xs" : "bg-zinc-800 text-zinc-50 shadow-xs") : (isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-200"))}
                        >
                          <Icon.Board width={14} height={14} /> Papan
                        </button>
                        <button
                          onClick={() => setBoardMode("analytics")}
                          className={"flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 active:scale-95 cursor-pointer flex-shrink-0 " + (boardMode === "analytics" ? (isLight ? "bg-white text-zinc-900 shadow-xs" : "bg-zinc-800 text-zinc-50 shadow-xs") : (isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-200"))}
                        >
                          <Icon.Sparkles width={13} height={13} className="text-emerald-400" />
                          <span>Analitik</span>
                          {boardAnalytics.dueRadar.overdue.length > 0 && (
                            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9.5px] font-mono font-extrabold flex items-center justify-center">
                              {boardAnalytics.dueRadar.overdue.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setBoardMode("presentation")}
                          className={"flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 active:scale-95 cursor-pointer flex-shrink-0 " + (boardMode === "presentation" ? (isLight ? "bg-white text-zinc-900 shadow-xs" : "bg-zinc-800 text-zinc-50 shadow-xs") : (isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-200"))}
                        >
                          <Icon.Frame width={14} height={14} /> Presentasi
                        </button>
                        <button
                          onClick={() => setBoardMode("free")}
                          className={"flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 active:scale-95 cursor-pointer flex-shrink-0 " + (boardMode === "free" ? (isLight ? "bg-white text-zinc-900 shadow-xs" : "bg-zinc-800 text-zinc-50 shadow-xs") : (isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-200"))}
                        >
                          <Icon.ChatBubble width={14} height={14} /> Bebas
                        </button>
                      </div>
                      {(boardMode === "kanban" || boardMode === "analytics") && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={handleExportBoardCSV}
                            title="Ekspor seluruh kartu papan ini ke tabel CSV (Excel / Google Sheets)"
                            className={"flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[12.5px] font-semibold active:scale-95 transition-all duration-200 cursor-pointer " +
                              (isLight ? "border-slate-300 bg-white text-zinc-700 hover:bg-slate-50 shadow-xs" : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800")}
                          >
                            <Icon.Copy width={13} height={13} className="text-emerald-400" />
                            <span>Ekspor CSV</span>
                          </button>
                          {isPersonalBoard ? (
                            canInviteCollaborators && (
                              <button
                                onClick={() => openInviteModal("")}
                                title="Undang kolaborator dan pilih peran aktornya (Anggota / Viewer)"
                                className={"flex items-center gap-2 px-3.5 py-2 rounded-full border text-[12.5px] font-semibold active:scale-95 transition-all duration-200 cursor-pointer " +
                                  (isLight ? "border-slate-300 bg-white text-zinc-800 hover:bg-slate-50 shadow-xs" : "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800")}
                              >
                                <Icon.Users width={14} height={14} className="text-emerald-400" />
                                <span>Undang Kolaborator</span>
                              </button>
                            )
                          ) : (
                            <>
                              <button
                                onClick={() => setView("members")}
                                title="Lihat anggota dan peran di papan ini"
                                className={"flex items-center gap-2 px-3.5 py-2 rounded-full border text-[12.5px] font-semibold active:scale-95 transition-all duration-200 cursor-pointer " +
                                  (isLight ? "border-slate-300 bg-white text-zinc-800 hover:bg-slate-50 shadow-xs" : "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800")}
                              >
                                <Icon.Users width={14} height={14} className="text-emerald-400" />
                                <span>Kolaborator ({activeProjectCollaborators.length})</span>
                              </button>
                              {canInviteCollaborators && (
                                <button
                                  onClick={() => openInviteModal("")}
                                  title="Khusus Pembuat Papan / Kapten: Undang kolaborator baru & pilih peran aktor"
                                  className={"flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[12.5px] font-bold active:scale-95 transition-all duration-200 cursor-pointer " +
                                    (isLight ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20")}
                                >
                                  <Icon.Plus width={13} height={13} />
                                  <span>Undang</span>
                                </button>
                              )}
                            </>
                          )}
                          {!isPersonalBoard && role === "admin" && boardMode === "kanban" && (
                            <button
                              onClick={() => {
                                setBulkMode((v) => !v);
                                if (bulkMode) setSelectedTaskIds([]);
                              }}
                              className={"flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-semibold active:scale-95 transition-all duration-200 " +
                                (bulkMode
                                  ? (isLight ? "bg-amber-100 border-amber-300 text-amber-900 shadow-xs" : "bg-amber-950/70 border-amber-700 text-amber-300")
                                  : (isLight ? "border-slate-300 bg-white text-zinc-800 hover:bg-slate-50 shadow-xs" : "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"))}
                            >
                              <Icon.StarFilled width={13} height={13} className={bulkMode ? "text-amber-500" : (isLight ? "text-amber-600" : "text-amber-400")} />
                              <span>{bulkMode ? "Keluar Bulk" : "Pilih Massal"}</span>
                            </button>
                          )}
                          <button
                            onClick={addFirstColumnTask}
                            className={"flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-bold active:scale-95 transition-all duration-200 shadow-xs cursor-pointer " + (isLight ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md" : "border-emerald-500/40 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 hover:shadow-emerald-500/20")}
                          >
                            <Icon.Plus /> Tambah tugas
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* All sub-views stay mounted so switching tabs never discards
                      whiteboard edits; only visibility toggles. */}
                  <div className="w-full min-w-0 max-w-full" style={{ display: boardMode === "kanban" ? "block" : "none" }}>
                    {/* HIGH-END FILTER & SORTIR CEPAT PAPAN KANBAN */}
                    <div
                      className={
                        "rounded-[24px] p-1 border mb-4 transition-all " +
                        (isLight
                          ? "bg-slate-200/65 border-slate-300/80 shadow-2xs"
                          : "bg-zinc-900/60 border-white/[0.06] shadow-lg shadow-black/25")
                      }
                    >
                      <div
                        className={
                          "rounded-[20px] px-3.5 py-2.5 border flex flex-wrap items-center justify-between gap-2.5 " +
                          (isLight
                            ? "bg-white/95 border-white"
                            : "bg-zinc-900/95 border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]")
                        }
                      >
                        {/* Kiri: Quick Filter Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={
                              "text-[10.5px] font-mono font-bold uppercase tracking-wider mr-1 " +
                              (isLight ? "text-zinc-400" : "text-zinc-500")
                            }
                          >
                            Filter:
                          </span>
                          {[
                            {
                              id: "all",
                              label: "Semua",
                              count: totalTasks,
                              dot: null,
                            },
                            {
                              id: "mine",
                              label: "Tugas Saya",
                              count: myTasks.length,
                              dot: "#10B981",
                            },
                            ...(!isPersonalBoard
                              ? [
                                  {
                                    id: "captain",
                                    label: "Prioritas Kapten",
                                    count: captainPrioritizedTotalCount,
                                    star: true,
                                  },
                                ]
                              : []),
                            {
                              id: "high",
                              label: "Tinggi",
                              count: highPriorityCount,
                              dot: "#F43F5E",
                            },
                            {
                              id: "medium",
                              label: "Sedang",
                              count: mediumPriorityCount,
                              dot: "#F59E0B",
                            },
                            {
                              id: "low",
                              label: "Rendah",
                              count: lowPriorityCount,
                              dot: "#38BDF8",
                            },
                          ].map((pill) => {
                            const active = boardFilterPreset === pill.id;
                            return (
                              <button
                                key={pill.id}
                                type="button"
                                onClick={() =>
                                  setBoardFilterPreset((prev) =>
                                    prev === pill.id && pill.id !== "all" ? "all" : pill.id
                                  )
                                }
                                className={
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold transition-all active:scale-95 cursor-pointer " +
                                  (active
                                    ? isLight
                                      ? "bg-zinc-900 text-white shadow-2xs"
                                      : "bg-emerald-400 text-zinc-950 shadow-sm shadow-emerald-500/20"
                                    : isLight
                                    ? "bg-slate-100 text-zinc-600 hover:bg-slate-200/80 hover:text-zinc-900"
                                    : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200")
                                }
                              >
                                {pill.star && (
                                  <Icon.StarFilled
                                    width={11}
                                    height={11}
                                    className={active ? (isLight ? "text-amber-300" : "text-zinc-950") : "text-amber-400"}
                                  />
                                )}
                                {pill.dot && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ background: active && !isLight ? "#09090B" : pill.dot }}
                                  />
                                )}
                                <span>{pill.label}</span>
                                <span
                                  className={
                                    "text-[10px] font-mono tabular-nums px-1 rounded " +
                                    (active
                                      ? isLight
                                        ? "bg-white/20 text-white"
                                        : "bg-zinc-950/15 text-zinc-950 font-extrabold"
                                      : isLight
                                      ? "text-zinc-400"
                                      : "text-zinc-500")
                                  }
                                >
                                  {pill.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Kanan: Inline Search Kartu & Sortir */}
                        <div className="flex items-center gap-2 flex-wrap ml-auto">
                          <div className="relative">
                            <Icon.Search
                              width={12}
                              height={12}
                              className={
                                "absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none " +
                                (isLight ? "text-zinc-400" : "text-zinc-500")
                              }
                            />
                            <input
                              type="text"
                              value={boardSearchText}
                              onChange={(e) => setBoardSearchText(e.target.value)}
                              placeholder="Saring judul kartu..."
                              className={
                                "pl-7 pr-6 py-1 rounded-full border text-[11.5px] w-40 sm:w-44 focus:w-52 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 " +
                                (isLight
                                  ? "bg-slate-50 border-slate-200 text-zinc-900 placeholder-zinc-400 focus:bg-white"
                                  : "bg-zinc-950/80 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50")
                              }
                            />
                            {boardSearchText && (
                              <button
                                type="button"
                                onClick={() => setBoardSearchText("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                                title="Bersihkan kata kunci"
                              >
                                <Icon.X width={11} height={11} />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={
                                "text-[10.5px] font-mono font-bold uppercase tracking-wider hidden sm:inline " +
                                (isLight ? "text-zinc-400" : "text-zinc-500")
                              }
                            >
                              Urutkan:
                            </span>
                            <SortDropdown
                              value={boardSortBy}
                              onChange={setBoardSortBy}
                              theme={theme}
                            />
                          </div>

                          {isBoardFiltered && (
                            <div className="flex items-center gap-1.5 pl-1 border-l border-zinc-700/30">
                              <span
                                className={
                                  "text-[11px] font-mono font-semibold " +
                                  (isLight ? "text-emerald-700" : "text-emerald-400")
                                }
                              >
                                {filteredTasksCount}/{totalTasks} kartu
                              </span>
                              <button
                                type="button"
                                onClick={resetBoardFilters}
                                className={
                                  "px-2.5 py-1 rounded-full text-[11px] font-bold transition active:scale-95 cursor-pointer " +
                                  (isLight
                                    ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                    : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25")
                                }
                              >
                                Reset
                              </button>
                            </div>
                          )}

                          {/* Tombol Cepat Geser Papan Kanban Kiri & Kanan */}
                          <div className="flex items-center gap-1 pl-1 border-l border-zinc-700/30">
                            <button
                              type="button"
                              onClick={() => scrollKanban("left")}
                              disabled={!kanbanScrollState.canLeft}
                              title="Geser Papan ke Kiri"
                              aria-label="Geser papan ke kiri"
                              className={
                                "w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed " +
                                (isLight
                                  ? "border-slate-200 bg-slate-50 text-zinc-600 hover:bg-slate-100"
                                  : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800")
                              }
                            >
                              <Icon.Chevron width={11} height={11} className="rotate-90 stroke-[2.4]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => scrollKanban("right")}
                              disabled={!kanbanScrollState.canRight}
                              title="Geser Papan ke Kanan"
                              aria-label="Geser papan ke kanan"
                              className={
                                "w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed " +
                                (isLight
                                  ? "border-slate-200 bg-slate-50 text-zinc-600 hover:bg-slate-100"
                                  : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800")
                              }
                            >
                              <Icon.Chevron width={11} height={11} className="-rotate-90 stroke-[2.4]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {loadingBoard ? (
                      <div className="flex gap-4 overflow-x-auto pb-2 w-full max-w-full">
                        {board.map((_, i) => (
                          <div key={i} className="w-72 flex-shrink-0 flex flex-col gap-2.5">
                            <div className={"h-5 w-1/2 rounded-md animate-pulse " + (isLight ? "bg-slate-200" : "bg-zinc-800")} />
                            <div className={"h-20 rounded-xl animate-pulse " + (isLight ? "bg-slate-200" : "bg-zinc-800")} />
                            <div className={"h-16 rounded-xl animate-pulse " + (isLight ? "bg-slate-200" : "bg-zinc-800")} />
                            <div className={"h-16 rounded-xl animate-pulse " + (isLight ? "bg-slate-200" : "bg-zinc-800")} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="relative group/kanban w-full max-w-full">
                        {/* Tombol Melayang Geser Kiri */}
                        {kanbanScrollState.canLeft && (
                          <button
                            type="button"
                            onClick={() => scrollKanban("left")}
                            title="Geser Papan ke Kiri"
                            aria-label="Geser papan ke kiri"
                            className={
                              "absolute -left-2 sm:left-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border shadow-xl backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer hover:scale-110 " +
                              (drag ? "pointer-events-none opacity-20 " : "") +
                              (isLight
                                ? "bg-white/95 border-slate-300 text-zinc-700 hover:bg-white hover:text-emerald-600 shadow-slate-300/80"
                                : "bg-zinc-900/95 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400 shadow-black/90")
                            }
                          >
                            <Icon.Chevron width={13} height={13} className="rotate-90 stroke-[2.5]" />
                          </button>
                        )}
                        {/* Tombol Melayang Geser Kanan */}
                        {kanbanScrollState.canRight && (
                          <button
                            type="button"
                            onClick={() => scrollKanban("right")}
                            title="Geser Papan ke Kanan"
                            aria-label="Geser papan ke kanan"
                            className={
                              "absolute -right-2 sm:right-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border shadow-xl backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer hover:scale-110 " +
                              (drag ? "pointer-events-none opacity-20 " : "") +
                              (isLight
                                ? "bg-white/95 border-slate-300 text-zinc-700 hover:bg-white hover:text-emerald-600 shadow-slate-300/80"
                                : "bg-zinc-900/95 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400 shadow-black/90")
                            }
                          >
                            <Icon.Chevron width={13} height={13} className="-rotate-90 stroke-[2.5]" />
                          </button>
                        )}

                        {/* Indikator Gradasi Tepi Kiri & Kanan */}
                        {kanbanScrollState.canLeft && (
                          <div
                            aria-hidden="true"
                            className={
                              "pointer-events-none absolute left-0 top-0 bottom-4 w-8 z-10 bg-gradient-to-r " +
                              (isLight ? "from-slate-100/70 to-transparent" : "from-zinc-950/70 to-transparent")
                            }
                          />
                        )}
                        {kanbanScrollState.canRight && (
                          <div
                            aria-hidden="true"
                            className={
                              "pointer-events-none absolute right-0 top-0 bottom-4 w-8 z-10 bg-gradient-to-l " +
                              (isLight ? "from-slate-100/70 to-transparent" : "from-zinc-950/70 to-transparent")
                            }
                          />
                        )}

                        <div
                          ref={setKanbanScrollEl}
                          onPointerDown={handleBoardPointerDown}
                          onScroll={updateKanbanScrollState}
                          className="flex gap-4 overflow-x-auto overscroll-contain pt-1 pb-4 px-0.5 w-full max-w-full select-none cursor-grab active:cursor-grabbing"
                        >
                          {filteredBoard.map((col, idx) => (
                            <KanbanColumn
                              key={col.id}
                              col={col}
                              colIndex={idx}
                              totalCols={filteredBoard.length}
                              filteredTasks={col.filteredTasks}
                              isFiltering={isBoardFiltered}
                              onResetFilter={resetBoardFilters}
                              role={role}
                              isPersonalBoard={isPersonalBoard}
                              lockPriority={lockPriority}
                              theme={theme}
                              onOpenTask={setActiveTaskId}
                              onDeleteTask={deleteTask}
                              onAddTask={addTask}
                              onStartDrag={startDrag}
                              onTogglePriority={togglePriority}
                              onUpdateColumn={updateColumn}
                              onMoveColumn={moveColumn}
                              onDeleteColumn={deleteColumn}
                              drag={drag}
                              bulkMode={!isPersonalBoard && bulkMode}
                              selectedTaskIds={selectedTaskIds}
                              onToggleSelect={toggleSelectTask}
                            />
                          ))}
                          {(isPersonalBoard || role === "admin") && (
                            <AddColumnInline onAddColumn={addColumn} theme={theme} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Floating Action Bar untuk Mode Bulk Kapten */}
                    {!isPersonalBoard && bulkMode && role === "admin" && (
                      <div className={"fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4.5 py-2.5 rounded-full shadow-2xl border backdrop-blur-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 " +
                        (isLight ? "bg-white/95 border-slate-300/80 text-zinc-900 shadow-slate-300/70" : "bg-zinc-900/95 border-white/10 text-zinc-50 shadow-black/90")}>
                        <span className="text-[12.5px] font-bold flex items-center gap-2 pr-2.5 border-r border-zinc-700/30">
                          <span className="w-5.5 h-5.5 rounded-full bg-emerald-500 text-white text-[11px] font-mono font-black flex items-center justify-center shadow-xs">
                            {selectedTaskIds.length}
                          </span>
                          <span className="hidden sm:inline">kartu dipilih</span>
                        </span>
                        <button
                          onClick={() => handleBulkPrioritize(true)}
                          disabled={selectedTaskIds.length === 0}
                          className={"flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed " +
                            (isLight ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs" : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400")}
                        >
                          <Icon.StarFilled width={12} height={12} />
                          Prioritaskan ({selectedTaskIds.length})
                        </button>
                        <button
                          onClick={() => handleBulkPrioritize(false)}
                          disabled={selectedTaskIds.length === 0}
                          className={"flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed " +
                            (isLight ? "border-slate-300 text-zinc-700 hover:bg-slate-100" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800")}
                        >
                          Hapus Prioritas
                        </button>
                        <button
                          onClick={handleSelectAllTasks}
                          className={"px-3 py-1.5 rounded-full text-xs font-medium transition-colors " + (isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-200")}
                        >
                          {selectedTaskIds.length === totalTasks ? "Batal Semua" : "Pilih Semua"}
                        </button>
                        <button
                          onClick={() => { setBulkMode(false); setSelectedTaskIds([]); }}
                          className={"w-7 h-7 rounded-full flex items-center justify-center transition active:scale-90 " + (isLight ? "text-zinc-400 hover:text-zinc-700 hover:bg-slate-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800")}
                          title="Tutup mode pilih massal"
                        >
                          <Icon.X width={13} height={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* HIGH-END DOPPELRAND BENTO ANALITIK TIM, RADAR TENGGAT & AKTIVITAS */}
                  <div style={{ display: boardMode === "analytics" ? "block" : "none" }}>
                    <div className="space-y-4">
                      {/* Baris 1: 4 Metrik Eksekutif Doppelrand */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {[
                          {
                            label: "Total Story Points",
                            value: `${boardAnalytics.totalPointsAll} pt`,
                            sub: `${totalTasks} kartu aktif di ${board.length} kolom`,
                            accent: "#10B981",
                            badge: "Kapasitas",
                          },
                          {
                            label: "Terlambat / Overdue",
                            value: `${boardAnalytics.dueRadar.overdue.length} kartu`,
                            sub:
                              boardAnalytics.dueRadar.today.length > 0
                                ? `+ ${boardAnalytics.dueRadar.today.length} jatuh tempo hari ini`
                                : "Semua kartu lain aman",
                            accent: boardAnalytics.dueRadar.overdue.length > 0 ? "#F43F5E" : "#10B981",
                            badge: boardAnalytics.dueRadar.overdue.length > 0 ? "Perlu Tindakan" : "Sehat",
                          },
                          {
                            label: "Mendekati Tenggat",
                            value: `${boardAnalytics.dueRadar.soon.length + boardAnalytics.dueRadar.today.length} kartu`,
                            sub: "Dalam 48 jam ke depan",
                            accent: "#F59E0B",
                            badge: "Radar 48J",
                          },
                          {
                            label: "Belum Ditugaskan",
                            value: `${boardAnalytics.unassignedCount} kartu`,
                            sub: `${boardAnalytics.membersWorkload.length} kolaborator terdaftar`,
                            accent: "#38BDF8",
                            badge: "Distribusi",
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className={
                              "rounded-3xl p-1 border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
                              (isLight
                                ? "bg-slate-200/70 border-slate-300/80 shadow-xs"
                                : "bg-zinc-900/60 border-white/[0.06] shadow-xl shadow-black/30")
                            }
                          >
                            <div
                              className={
                                "rounded-2xl p-4 h-full border flex flex-col justify-between " +
                                (isLight
                                  ? "bg-white border-white"
                                  : "bg-zinc-900/95 border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
                              }
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={"text-[11px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                                  {stat.label}
                                </span>
                                <span
                                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                                  style={{
                                    color: stat.accent,
                                    borderColor: `${stat.accent}40`,
                                    backgroundColor: `${stat.accent}15`,
                                  }}
                                >
                                  {stat.badge}
                                </span>
                              </div>
                              <div className={"text-2xl font-extrabold font-mono tabular-nums mt-2.5 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                                {stat.value}
                              </div>
                              <div className={"text-[11.5px] mt-1 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                                {stat.sub}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Baris 2: Bento Grid 3 Kolom (Beban Kerja Tim, Radar Tenggat Waktu, Log Aktivitas Real-Time) */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* Kolom 1 (5 col): Matriks Beban Kerja Anggota & Kolaborator */}
                        <div
                          className={
                            "lg:col-span-5 rounded-3xl p-1.5 border " +
                            (isLight
                              ? "bg-slate-200/70 border-slate-300/80 shadow-xs"
                              : "bg-zinc-900/60 border-white/[0.06] shadow-xl shadow-black/35")
                          }
                        >
                          <div
                            className={
                              "rounded-2xl p-5 h-full border flex flex-col " +
                              (isLight
                                ? "bg-white border-white"
                                : "bg-zinc-900/95 border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
                            }
                          >
                            <div className="flex items-center justify-between gap-2 mb-4">
                              <div>
                                <div className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-emerald-500">
                                  Team Workload Matrix
                                </div>
                                <h3 className={"text-[15.5px] font-extrabold mt-0.5 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                                  Distribusi Tugas & Story Points
                                </h3>
                              </div>
                              <span className={"text-[11px] font-mono px-2.5 py-1 rounded-full border " + (isLight ? "bg-slate-100 border-slate-200 text-zinc-700" : "bg-zinc-800 border-zinc-700 text-zinc-300")}>
                                {boardAnalytics.membersWorkload.length} anggota
                              </span>
                            </div>

                            <div className="space-y-3 flex-1">
                              {boardAnalytics.membersWorkload.map((m) => {
                                const pctDone = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
                                return (
                                  <div
                                    key={m.key}
                                    className={
                                      "rounded-xl p-3 border transition-all " +
                                      (isLight
                                        ? "bg-slate-50/90 border-slate-200/80 hover:bg-slate-100/70"
                                        : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700")
                                    }
                                  >
                                    <div className="flex items-center justify-between gap-2.5">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {m.photoURL ? (
                                          <img
                                            src={m.photoURL}
                                            alt={m.name}
                                            referrerPolicy="no-referrer"
                                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-emerald-500/30"
                                          />
                                        ) : (
                                          <span
                                            className="w-8 h-8 rounded-full text-[11px] font-extrabold text-zinc-950 flex items-center justify-center flex-shrink-0"
                                            style={{ background: m.color || "#34D399" }}
                                          >
                                            {m.initials}
                                          </span>
                                        )}
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className={"text-[13px] font-bold truncate " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                                              {m.name}
                                            </span>
                                            {m.isOwner && (
                                              <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                Kapten
                                              </span>
                                            )}
                                          </div>
                                          <div className={"text-[11px] font-mono " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                                            {m.done}/{m.total} selesai · {m.inProgress} dikerjakan
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className={"text-[12.5px] font-mono font-extrabold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                                          {m.points} pt
                                        </div>
                                        <div className="text-[10.5px] font-mono text-emerald-500 font-bold">
                                          {pctDone}% tuntas
                                        </div>
                                      </div>
                                    </div>
                                    <div className={"w-full h-1.5 rounded-full overflow-hidden mt-2.5 " + (isLight ? "bg-slate-200" : "bg-zinc-800")}>
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                          width: `${Math.max(m.total > 0 ? 6 : 0, pctDone)}%`,
                                          background: m.color || "#10B981",
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Kolom 2 (4 col): Radar Tenggat Waktu & Kapasitas WIP Kolom */}
                        <div
                          className={
                            "lg:col-span-4 rounded-3xl p-1.5 border " +
                            (isLight
                              ? "bg-slate-200/70 border-slate-300/80 shadow-xs"
                              : "bg-zinc-900/60 border-white/[0.06] shadow-xl shadow-black/35")
                          }
                        >
                          <div
                            className={
                              "rounded-2xl p-5 h-full border flex flex-col justify-between gap-4 " +
                              (isLight
                                ? "bg-white border-white"
                                : "bg-zinc-900/95 border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
                            }
                          >
                            <div>
                              <div className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-amber-500">
                                Due Date & WIP Radar
                              </div>
                              <h3 className={"text-[15.5px] font-extrabold mt-0.5 mb-3.5 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                                Pemantauan Tenggat & Kapasitas
                              </h3>

                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {[
                                  ...boardAnalytics.dueRadar.overdue,
                                  ...boardAnalytics.dueRadar.today,
                                  ...boardAnalytics.dueRadar.soon,
                                ].length === 0 ? (
                                  <div className={"rounded-xl p-4 border text-center " + (isLight ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" : "bg-emerald-950/20 border-emerald-500/20 text-emerald-300")}>
                                    <div className="text-[12.5px] font-bold">Tidak ada kartu kritis!</div>
                                    <div className="text-[11px] opacity-80 mt-0.5">
                                      Seluruh kartu berada dalam jadwal aman atau sudah selesai.
                                    </div>
                                  </div>
                                ) : (
                                  [
                                    ...boardAnalytics.dueRadar.overdue,
                                    ...boardAnalytics.dueRadar.today,
                                    ...boardAnalytics.dueRadar.soon,
                                  ].map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => setActiveTaskId(item.id)}
                                      className={
                                        "w-full text-left rounded-xl p-2.5 border flex items-center justify-between gap-2 transition active:scale-[0.99] cursor-pointer " +
                                        (isLight
                                          ? "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                          : "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700")
                                      }
                                    >
                                      <div className="min-w-0">
                                        <div className={"text-[12.5px] font-bold truncate " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                                          {item.title}
                                        </div>
                                        <div className={"text-[10.5px] mt-0.5 flex items-center gap-1.5 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.colDot || "#34D399" }} />
                                          <span>{item.colName}</span>
                                          <span>·</span>
                                          <span className="font-mono">{item.due}</span>
                                        </div>
                                      </div>
                                      <span className={"text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex-shrink-0 " + (item.dueState.pillCls || "")}>
                                        {item.dueState.badgeText || item.dueState.label}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Kesehatan Kapasitas Kolom (WIP Health) */}
                            <div className={"pt-3.5 border-t " + (isLight ? "border-slate-200" : "border-zinc-800")}>
                              <div className={"text-[11px] font-mono font-bold uppercase tracking-wider mb-2 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                                Kesehatan WIP Kolom
                              </div>
                              <div className="space-y-1.5">
                                {board.map((c) => {
                                  const count = (c.tasks || []).length;
                                  const wip = c.wip;
                                  const over = wip && count > wip;
                                  return (
                                    <div key={c.id} className="flex items-center justify-between text-[11.5px]">
                                      <span className="flex items-center gap-1.5 truncate">
                                        <span className="w-2 h-2 rounded-full" style={{ background: c.dot || "#34D399" }} />
                                        <span className={isLight ? "text-zinc-700 font-semibold" : "text-zinc-300 font-semibold"}>
                                          {c.name}
                                        </span>
                                      </span>
                                      <span
                                        className={
                                          "font-mono text-[11px] px-2 py-0.5 rounded " +
                                          (over
                                            ? "bg-rose-500/15 text-rose-400 font-bold"
                                            : isLight
                                            ? "text-zinc-600 bg-slate-100"
                                            : "text-zinc-400 bg-zinc-800/80")
                                        }
                                      >
                                        {count}{wip ? ` / ${wip} maks` : " kartu"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Kolom 3 (3 col): Live Activity Stream */}
                        <div
                          className={
                            "lg:col-span-3 rounded-3xl p-1.5 border " +
                            (isLight
                              ? "bg-slate-200/70 border-slate-300/80 shadow-xs"
                              : "bg-zinc-900/60 border-white/[0.06] shadow-xl shadow-black/35")
                          }
                        >
                          <div
                            className={
                              "rounded-2xl p-5 h-full border flex flex-col " +
                              (isLight
                                ? "bg-white border-white"
                                : "bg-zinc-900/95 border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
                            }
                          >
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                              <div>
                                <div className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-sky-400">
                                  Live Activity Log
                                </div>
                                <h3 className={"text-[15.5px] font-extrabold mt-0.5 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                                  Jejak Aktivitas Papan
                                </h3>
                              </div>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            </div>

                            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 flex-1">
                              {projectActivityList.length === 0 ? (
                                <div className={"text-[12px] py-8 text-center " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                                  Belum ada aktivitas tercatat di sesi ini. Geser kartu, tambah komentar, atau perbarui kolom untuk melihat log langsung.
                                </div>
                              ) : (
                                projectActivityList.slice(0, 20).map((act) => (
                                  <div
                                    key={act.id}
                                    className={
                                      "rounded-xl p-2.5 border text-[11.5px] " +
                                      (isLight
                                        ? "bg-slate-50/90 border-slate-200/80"
                                        : "bg-zinc-950/60 border-zinc-800/80")
                                    }
                                  >
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className="font-bold text-emerald-500 truncate">
                                        {act.actor || act.actorName}
                                      </span>
                                      <span className={"text-[10px] font-mono flex-shrink-0 " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                                        {act.timeLabel || act.time}
                                      </span>
                                    </div>
                                    <div className={"mt-0.5 font-medium " + (isLight ? "text-zinc-800" : "text-zinc-200")}>
                                      {act.title || act.action}
                                    </div>
                                    {act.detail && (
                                      <div className={"text-[10.5px] font-mono mt-0.5 truncate " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                                        {act.detail}
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: boardMode === "presentation" ? "block" : "none" }}>
                    <WhiteboardCanvas board={board} mode="presentation" />
                  </div>

                  <div style={{ display: boardMode === "free" ? "block" : "none" }}>
                    <WhiteboardCanvas board={board} mode="free" />
                  </div>
                </>
              )}
            </section>
          )}

          {view === "members" && (
            <section className="w-full max-w-7xl mx-auto space-y-6">
              {/* Pilih Papan Proyek yang Ingin Dikelola Kolaboratornya */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800/40 dark:border-zinc-800/60">
                <span className={"text-[11px] font-bold uppercase tracking-wider mr-1 flex-shrink-0 " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                  Pilih Ruang Kerja:
                </span>
                {projects.map((p, idx) => {
                  const isCurr = p.id === activeProject.id;
                  const cCount = getProjectCollaborators(p, currentUser, accountsList).length;
                  return (
                    <button
                      key={p.id || idx}
                      onClick={() => selectProject(p, false)}
                      className={
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all flex-shrink-0 active:scale-95 " +
                        (isCurr
                          ? isLight
                            ? "bg-zinc-900 text-white shadow-xs"
                            : "bg-emerald-400/15 text-emerald-300 border border-emerald-500/30 shadow-xs"
                          : isLight
                          ? "bg-white border border-slate-200 text-zinc-600 hover:text-zinc-900 hover:bg-slate-50"
                          : "bg-zinc-900/70 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")
                      }
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: p.dot || "#34D399" }} />
                      <span>{p.name}</span>
                      <span className="text-[10.5px] font-mono opacity-75">({cCount} org)</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className={"inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider mb-2.5 " +
                    (isPersonalBoard
                      ? (isLight ? "bg-slate-100 text-zinc-700 border-slate-300" : "bg-zinc-800/90 text-zinc-300 border-white/10")
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")}
                  >
                    <Icon.Shield width={13} height={13} />
                    {isPersonalBoard ? "Mode Papan Pribadi (Tanpa Peran Tim)" : "Mode Kolaborasi Tim Aktif"}
                  </div>
                  <h1 className={"text-2xl font-extrabold tracking-tight text-balance " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                    Anggota & Kolaborator — {activeProject.name}
                  </h1>
                  <p className={"text-[13.5px] mt-1 " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                    {isPersonalBoard
                      ? `Saat ini "${activeProject.name}" adalah papan pribadi tanpa atribut Kapten, Anggota, atau Viewer. Hanya pembuat papan yang dapat mengundang orang lain dan otomatis menjadi Kapten.`
                      : `${activeProjectCollaborators.length} pengguna berkolaborasi di "${activeProject.name}". Hanya Pembuat Papan (Kapten) yang dapat mengundang orang lain dan mengatur peran Anggota atau Viewer.`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {canInviteCollaborators && (
                    <button
                      type="button"
                      onClick={() => openInviteModal("")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400 text-zinc-950 text-[12.5px] font-bold hover:bg-emerald-300 transition active:scale-95 shadow-sm cursor-pointer"
                    >
                      <Icon.Plus width={14} height={14} /> Undang & Pilih Aktor
                    </button>
                  )}
                  <button
                    onClick={() => setView("board")}
                    className={"inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[12.5px] font-semibold transition active:scale-95 " + (isLight ? "bg-white border-slate-200 text-zinc-800 hover:bg-slate-50" : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800")}
                  >
                    <Icon.Board width={14} height={14} /> Kembali ke Papan
                  </button>
                </div>
              </div>

              {/* Form Undang Pengguna Lain — Khusus Pembuat Papan Kanban atau Kapten */}
              {canInviteCollaborators ? (
                <div className={"rounded-[32px] p-1.5 border " + (isLight ? "bg-slate-200/70 border-slate-300/80 shadow-xs" : "bg-zinc-900/60 border-white/[0.07] shadow-xl")}>
                  <form
                    onSubmit={(e) => handleInviteCollaborator(e)}
                    className={"rounded-[26px] p-5 sm:p-6 border " + (isLight ? "bg-white border-white" : "bg-zinc-900 border-white/[0.06]")}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <h3 className={"font-display text-[15.5px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                        Undang Kolaborator ke &ldquo;{activeProject.name}&rdquo;
                      </h3>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Icon.StarFilled width={11} height={11} /> Otoritas Pembuat Papan / Kapten
                      </span>
                    </div>
                    <p className={"text-[12.5px] mb-4 leading-relaxed " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                      Sebagai pembuat papan / Kapten, hanya kamu yang dapat mengundang orang lain ke papan ini. Masukkan alamat email rekan tim lalu tekan tombol di samping untuk membuka <b>Pop-Up Konfirmasi & Pemilihan Peran Aktor (Anggota / Viewer)</b>.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={inviteEmailInput}
                        onChange={(e) => setInviteEmailInput(e.target.value)}
                        placeholder="Masukkan email teman (contoh: fajar@peluncuran.id atau nama@gmail.com)"
                        className={"flex-1 px-4 py-2.5 rounded-2xl border text-[13.5px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition " + (isLight ? "bg-slate-50 border-slate-300 text-zinc-900 focus:bg-white" : "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-emerald-500")}
                      />
                      <button
                        type="submit"
                        disabled={invitingCollab}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-400 text-zinc-950 text-[13px] font-bold hover:bg-emerald-300 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                      >
                        <Icon.Users width={14} height={14} />
                        {invitingCollab ? "Mengundang..." : "Pilih Aktor & Undang..."}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className={"rounded-[32px] p-1.5 border " + (isLight ? "bg-slate-200/70 border-slate-300/80 shadow-xs" : "bg-zinc-900/60 border-white/[0.07] shadow-xl")}>
                  <div className={"rounded-[26px] p-5 sm:p-6 border flex items-start gap-3.5 " + (isLight ? "bg-white border-white" : "bg-zinc-900 border-white/[0.06]")}>
                    <div className={"w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border " + (isLight ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-amber-500/10 border-amber-500/25 text-amber-400")}>
                      <Icon.Lock width={16} height={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={"font-display text-[14.5px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                          Undangan Kolaborator Khusus Pembuat Papan / Kapten
                        </h3>
                        <span className={"text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full border " + (isLight ? "bg-slate-100 border-slate-200 text-zinc-700" : "bg-zinc-800 border-zinc-700 text-zinc-300")}>
                          Peranmu: {roleLabel}
                        </span>
                      </div>
                      <p className={"text-[12.5px] mt-1 leading-relaxed " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                        Hanya pembuat papan Kanban atau <b>Kapten</b> (<code className="font-mono text-[11.5px]">{activeProjectOwnerEmail}</code>) yang dapat mengundang orang lain serta menentukan peran aktor (Anggota / Viewer) di papan <b>{activeProject.name}</b>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Daftar Pengguna yang Memiliki Akses ke Ruang Kerja Ini */}
              <div className={"flex flex-col gap-px rounded-3xl overflow-hidden border " + (isLight ? "bg-slate-200 border-slate-200" : "bg-zinc-800 border-zinc-800")}>
                {activeProjectCollaborators.map((m, i) => {
                  const isCurrentUserOwner = getProjectOwnerEmail(activeProject) === userEmail;
                  const canRevoke = !m.isOwner && (isCurrentUserOwner || m.email === userEmail);
                  const memberRole = m.isOwner ? "admin" : (m.role === "viewer" ? "viewer" : "member");
                  const memberPhoto = m.email === userEmail && activeAvatarUrl ? activeAvatarUrl : m.photoURL;
                  return (
                    <div key={m.email || i} className={"flex flex-wrap sm:flex-nowrap items-center gap-3.5 px-5 py-4 " + (isLight ? "bg-white" : "bg-zinc-900")}>
                      {memberPhoto ? (
                        <img
                          src={memberPhoto}
                          alt={m.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-xs ring-1 ring-emerald-500/30"
                        />
                      ) : (
                        <span
                          className="w-10 h-10 rounded-xl text-white text-[13px] font-bold flex items-center justify-center flex-shrink-0 shadow-xs"
                          style={{ background: m.color }}
                        >
                          {m.initials}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={"text-sm font-bold " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                            {m.name}
                          </span>
                          {m.email === userEmail && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                              Kamu
                            </span>
                          )}
                        </div>
                        <div className={"text-xs font-mono mt-0.5 " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                          {m.email}
                        </div>
                      </div>

                      {isPersonalBoard ? (
                        <span
                          className={
                            "text-[11.5px] font-bold px-3 py-1 rounded-full border " +
                            (isLight
                              ? "bg-slate-100 text-zinc-700 border-slate-200"
                              : "bg-zinc-800/80 text-zinc-300 border-white/10")
                          }
                        >
                          Pemilik Papan Pribadi
                        </span>
                      ) : m.isOwner ? (
                        <span
                          className={
                            "inline-flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1 rounded-full border " +
                            (isLight
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-emerald-950/60 text-emerald-300 border-emerald-800/50")
                          }
                        >
                          <Icon.StarFilled width={11} height={11} className="text-emerald-400" />
                          Kapten · Pemilik Papan
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {isCurrentUserOwner ? (
                            <div
                              className={"inline-flex items-center gap-1 p-1 rounded-xl border " + (isLight ? "bg-slate-100 border-slate-200" : "bg-zinc-950 border-zinc-800")}
                              title="Ubah peran aktor kolaborator ini"
                            >
                              <button
                                type="button"
                                onClick={() => handleChangeCollaboratorRole(m.email, "member")}
                                className={
                                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer " +
                                  (memberRole === "member"
                                    ? "bg-emerald-400 text-zinc-950 shadow-2xs"
                                    : isLight
                                    ? "text-zinc-600 hover:text-zinc-900"
                                    : "text-zinc-400 hover:text-zinc-200")
                                }
                              >
                                Anggota
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChangeCollaboratorRole(m.email, "viewer")}
                                className={
                                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer " +
                                  (memberRole === "viewer"
                                    ? "bg-sky-400 text-zinc-950 shadow-2xs"
                                    : isLight
                                    ? "text-zinc-600 hover:text-zinc-900"
                                    : "text-zinc-400 hover:text-zinc-200")
                                }
                              >
                                Viewer
                              </button>
                            </div>
                          ) : (
                            <span
                              className={
                                "text-[11.5px] font-bold px-3 py-1 rounded-full border " +
                                (memberRole === "viewer"
                                  ? isLight
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : "bg-sky-950/50 text-sky-300 border-sky-800/50"
                                  : isLight
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-blue-950/50 text-blue-300 border-blue-800/50")
                              }
                            >
                              {memberRole === "viewer" ? "Viewer · Pengamat" : "Anggota · Eksekutor"}
                            </span>
                          )}
                        </div>
                      )}

                      {canRevoke ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveCollaborator(m.email)}
                          className={"text-xs font-semibold px-3 py-1.5 rounded-xl border transition active:scale-95 cursor-pointer " + (isLight ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-rose-900/50 text-rose-400 hover:bg-rose-950/40")}
                        >
                          {m.email === userEmail ? "Keluar" : "Cabut Akses"}
                        </button>
                      ) : (
                        <span className={"hidden sm:block text-xs w-28 text-right " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                          {m.joined}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {view === "profile" && (
            <section className="w-full max-w-7xl mx-auto">
              <h1 className={"text-2xl font-extrabold tracking-tight text-balance mb-1 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>Profil saya</h1>
              <p className={"text-[13.5px] mb-7 " + (isLight ? "text-zinc-600" : "text-zinc-500")}>Atur identitas, keamanan akun, dan lihat tugas yang ditugaskan ke kamu.</p>

              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
                {/* Identity card (High-End Doppelrand + Interactive Avatar Studio) */}
                <div className={"rounded-3xl p-1.5 border lg:sticky lg:top-24 " + (isLight ? "bg-slate-200/70 border-slate-300/80 shadow-xs" : "bg-zinc-900/60 border-white/[0.06] shadow-xl shadow-black/35")}>
                  <div className={"rounded-2xl p-6 border " + (isLight ? "bg-white border-white" : "bg-zinc-900/95 border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")}>
                    <div className="flex flex-col items-center text-center">
                      {activeAvatarUrl ? (
                        <img
                          src={activeAvatarUrl}
                          alt={displayName}
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarImgError(true)}
                          className="w-24 h-24 rounded-[28px] object-cover shadow-2xl ring-2 ring-emerald-500/40"
                        />
                      ) : (
                        <div
                          className="w-24 h-24 rounded-[28px] flex items-center justify-center shadow-2xl transition-colors duration-300"
                          style={{ background: profileColor || "#34D399" }}
                        >
                          <span className="text-zinc-950 font-extrabold text-3xl tracking-tight">{displayInitials}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setAvatarStudioOpen((v) => !v)}
                        className={"mt-4 px-3.5 py-2 rounded-xl border text-[12.5px] font-semibold active:scale-[0.97] transition cursor-pointer " + (isLight ? "border-slate-300 text-zinc-700 hover:bg-slate-100" : "border-zinc-700 text-zinc-200 hover:bg-zinc-800")}
                      >
                        {avatarStudioOpen ? "Tutup Studio Avatar" : "Kustomisasi Avatar / Foto"}
                      </button>

                      {avatarStudioOpen && (
                        <div className={"w-full mt-3.5 p-3.5 rounded-2xl border text-left space-y-3 " + (isLight ? "bg-slate-50 border-slate-200" : "bg-zinc-950/80 border-zinc-800")}>
                          <div className="flex items-center justify-between">
                            <span className={"text-[11px] font-mono font-bold uppercase tracking-wider " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
                              Warna Avatar
                            </span>
                            {profilePhotoURL && (
                              <button
                                type="button"
                                onClick={() => {
                                  setProfilePhotoURL("");
                                  setProfileSaved(false);
                                }}
                                className="text-[11px] font-semibold text-rose-400 hover:underline cursor-pointer"
                              >
                                Hapus Foto
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {AVATAR_COLOR_PRESETS.map((preset) => {
                              const active = !profilePhotoURL && profileColor === preset.hex;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    setProfilePhotoURL("");
                                    setProfileColor(preset.hex);
                                    setProfileSaved(false);
                                  }}
                                  title={preset.label}
                                  className={
                                    "h-8 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer " +
                                    (active ? "ring-2 ring-offset-2 ring-emerald-400 ring-offset-zinc-950 scale-105" : "opacity-85 hover:opacity-100")
                                  }
                                  style={{ background: preset.hex }}
                                >
                                  {active && <Icon.Check width={13} height={13} className="text-zinc-950" />}
                                </button>
                              );
                            })}
                          </div>
                          <div className={"pt-2.5 border-t " + (isLight ? "border-slate-200" : "border-zinc-800")}>
                            <label className={"w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-bold transition cursor-pointer " + (isLight ? "bg-white border-slate-300 text-zinc-800 hover:bg-slate-100" : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800")}>
                              <Icon.Plus width={13} height={13} className="text-emerald-400" />
                              <span>Unggah Foto Profil</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      )}

                      <div className={"mt-5 text-[17px] font-bold text-balance " + (isLight ? "text-zinc-900" : "text-zinc-50")}>{displayName}</div>
                      <div className={"text-[13px] mt-0.5 " + (isLight ? "text-zinc-600" : "text-zinc-400")}>{profileTitle || "Belum ada jabatan"}</div>
                      <div className={"text-[12px] mt-1 break-all " + (isLight ? "text-zinc-500" : "text-zinc-500")}>{currentUser.email}</div>
                      <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                        <span className={"inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full " + (isLight ? "bg-emerald-100 text-emerald-800" : "bg-emerald-950/60 text-emerald-300")}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {isPersonalBoard ? "Papan Pribadi" : roleLabel}
                        </span>
                        {currentUser.provider === "google" && (
                          <span className={"inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full " + (isLight ? "bg-slate-100 text-zinc-700 border border-slate-200" : "bg-zinc-800 text-zinc-300")}>
                            <Icon.Google width={12} height={12} /> Google
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={"mt-6 pt-5 border-t grid grid-cols-3 gap-2 text-center " + (isLight ? "border-slate-200" : "border-zinc-800")}>
                      <div>
                        <div className={"text-xl font-extrabold font-mono tabular-nums " + (isLight ? "text-zinc-900" : "text-zinc-50")}>{myActive}</div>
                        <div className={"text-[11px] mt-0.5 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>Aktif</div>
                      </div>
                      <div>
                        <div className={"text-xl font-extrabold font-mono tabular-nums " + (isLight ? "text-zinc-900" : "text-zinc-50")}>{myDone}</div>
                        <div className={"text-[11px] mt-0.5 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>Selesai</div>
                      </div>
                      <div>
                        <div className={"text-[13px] font-bold leading-tight pt-1.5 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>{myMemberKey && MEMBERS[myMemberKey] ? MEMBERS[myMemberKey].joined : "Hari ini"}</div>
                        <div className={"text-[11px] mt-1 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>Bergabung</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-5 min-w-0">
                  <div className={"border rounded-2xl px-6 " + (isLight ? "bg-white border-slate-200 shadow-xs" : "bg-zinc-900 border-zinc-800")}>
                    <div className="pt-6 pb-1 flex items-center justify-between gap-3">
                      <h3 className={"text-[15px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-50")}>Informasi pribadi</h3>
                      {!profileSaved && (
                        <span className={"text-[11px] rounded-full px-2.5 py-1 " + (isLight ? "text-amber-800 bg-amber-100 border border-amber-200" : "text-amber-400 bg-amber-950/40 border border-amber-900/50")}>Belum disimpan</span>
                      )}
                    </div>
                    <SettingsRow label="Nama lengkap" description="Ditampilkan di kartu tugas, komentar, dan daftar anggota." theme={theme}>
                      <input
                        value={profileName}
                        onChange={(e) => { setProfileName(e.target.value); setProfileSaved(false); }}
                        className={"w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 " + (isLight ? "border-slate-300 bg-slate-50 text-zinc-900 focus:bg-white" : "border-zinc-700 bg-zinc-950 text-zinc-50 focus:ring-emerald-900")}
                      />
                    </SettingsRow>
                    <SettingsRow label="Jabatan" description="Membantu rekan tim mengenali peran kamu." theme={theme}>
                      <input
                        value={profileTitle}
                        onChange={(e) => { setProfileTitle(e.target.value); setProfileSaved(false); }}
                        placeholder="Contoh: Product Lead"
                        className={"w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 " + (isLight ? "border-slate-300 bg-slate-50 text-zinc-900 placeholder-zinc-400 focus:bg-white" : "border-zinc-700 bg-zinc-950 text-zinc-50 placeholder-zinc-600 focus:ring-emerald-900")}
                      />
                    </SettingsRow>
                    <SettingsRow label="Bio singkat" description="Satu-dua kalimat tentang apa yang kamu kerjakan." theme={theme}>
                      <textarea
                        value={profileBio}
                        onChange={(e) => { setProfileBio(e.target.value); setProfileSaved(false); }}
                        rows={3}
                        placeholder="Ceritakan singkat tentang diri kamu..."
                        className={"w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 " + (isLight ? "border-slate-300 bg-slate-50 text-zinc-900 placeholder-zinc-400 focus:bg-white" : "border-zinc-700 bg-zinc-950 text-zinc-50 placeholder-zinc-600 focus:ring-emerald-900")}
                      />
                    </SettingsRow>
                    <SettingsRow label="Alamat email" description="Dipakai untuk masuk, jadi tidak bisa diubah di sini." last theme={theme}>
                      <input
                        value={currentUser.email}
                        readOnly
                        className={"w-full px-3.5 py-2.5 rounded-xl border text-sm cursor-not-allowed " + (isLight ? "border-slate-200 bg-slate-100 text-zinc-500" : "border-zinc-800 bg-zinc-900 text-zinc-500")}
                      />
                    </SettingsRow>
                    <div className={"flex items-center justify-end gap-2.5 py-4 border-t " + (isLight ? "border-slate-200" : "border-zinc-800")}>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileName(savedProfileMeta?.name || currentUser.name);
                          setProfileTitle(savedProfileMeta?.title || "Product Lead");
                          setProfileBio(savedProfileMeta?.bio || "");
                          setProfileColor(savedProfileMeta?.color || "#34D399");
                          setProfilePhotoURL(savedProfileMeta?.photoURL || "");
                          setProfileSaved(true);
                        }}
                        disabled={profileSaved || savingProfile}
                        className={"px-4 py-2.5 rounded-xl border text-[13px] font-semibold active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer " + (isLight ? "border-slate-300 text-zinc-700 hover:bg-slate-100" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800")}
                      >
                        Batalkan
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={profileSaved || savingProfile}
                        className="px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-[13px] font-bold hover:bg-emerald-400 active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                      >
                        {savingProfile ? "Menyimpan..." : "Simpan ke Cloud & Lokal"}
                      </button>
                    </div>
                  </div>

                  <div className={"border rounded-2xl px-6 " + (isLight ? "bg-white border-slate-200 shadow-xs" : "bg-zinc-900 border-zinc-800")}>
                    <div className="pt-6 pb-1">
                      <h3 className={"text-[15px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-50")}>Keamanan</h3>
                    </div>
                    <SettingsRow label="Kata sandi" description="Ganti kata sandi secara berkala agar akun tetap aman." theme={theme}>
                      <button
                        onClick={() => showToast("Ubah kata sandi belum tersedia di demo.")}
                        className={"px-4 py-2.5 rounded-xl border text-[13px] font-semibold active:scale-[0.97] transition " + (isLight ? "border-slate-300 text-zinc-700 hover:bg-slate-100" : "border-zinc-700 text-zinc-200 hover:bg-zinc-800")}
                      >
                        Ubah kata sandi
                      </button>
                    </SettingsRow>
                    <SettingsRow label="Masuk dengan Google" description="Hubungkan akun Google untuk masuk tanpa mengetik kata sandi." theme={theme}>
                      {currentUser.provider === "google" ? (
                        <span className={"inline-flex items-center gap-2 text-[12.5px] font-semibold rounded-full px-3 py-1.5 " + (isLight ? "text-emerald-800 bg-emerald-100" : "text-emerald-300 bg-emerald-950/50")}>
                          <Icon.Check /> Terhubung
                        </span>
                      ) : (
                        <button
                          onClick={() => showToast("Menghubungkan Google belum tersedia di demo.")}
                          className={"inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-semibold active:scale-[0.97] transition " + (isLight ? "border-slate-300 text-zinc-700 hover:bg-slate-100" : "border-zinc-700 text-zinc-200 hover:bg-zinc-800")}
                        >
                          <Icon.Google width={15} height={15} /> Hubungkan
                        </button>
                      )}
                    </SettingsRow>
                    <SettingsRow label="Sesi aktif" description="Perangkat yang saat ini sedang masuk ke akun kamu." last theme={theme}>
                      <div className={"flex items-center gap-3 w-full border rounded-xl px-3.5 py-2.5 " + (isLight ? "bg-slate-50 border-slate-200" : "bg-zinc-950 border-zinc-800")}>
                        <span className="relative w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0">
                          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                        </span>
                        <div className="min-w-0">
                          <div className={"text-[13px] font-semibold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>Browser ini</div>
                          <div className={"text-[11.5px] " + (isLight ? "text-zinc-500" : "text-zinc-500")}>Aktif sekarang</div>
                        </div>
                      </div>
                    </SettingsRow>
                  </div>

                  <div className={"border rounded-2xl p-6 " + (isLight ? "bg-white border-slate-200 shadow-xs" : "bg-zinc-900 border-zinc-800")}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={"text-[15px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-50")}>Tugas saya</h3>
                      <span className={"text-[11.5px] font-mono tabular-nums " + (isLight ? "text-zinc-500" : "text-zinc-500")}>{myTasks.length} tugas</span>
                    </div>
                    {myTasks.length === 0 ? (
                      <div className={"text-center py-8 border border-dashed rounded-xl " + (isLight ? "border-slate-200" : "border-zinc-800")}>
                        <p className={"text-[13px] font-semibold " + (isLight ? "text-zinc-600" : "text-zinc-400")}>Belum ada tugas untuk kamu</p>
                        <p className={"text-[12px] mt-1 " + (isLight ? "text-zinc-400" : "text-zinc-600")}>Tugas yang ditugaskan ke kamu akan muncul di sini.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {myTasks.slice(0, 5).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setActiveTaskId(t.id)}
                            className={"flex items-center gap-3 text-left px-3.5 py-3 rounded-xl border active:scale-[0.99] transition " + (isLight ? "border-slate-200 bg-slate-50 hover:border-emerald-500 hover:bg-slate-100" : "border-zinc-800 bg-zinc-950/40 hover:border-emerald-600/40")}
                          >
                            <span className={"inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 " + (isLight ? PRIORITY_CLASS_LIGHT[t.priority] : PRIORITY_CLASS[t.priority])}>{PRIORITY_LABEL[t.priority]}</span>
                            <span className={"flex-1 text-[13px] font-semibold truncate " + (isLight ? "text-zinc-900" : "text-zinc-100")}>{t.title}</span>
                            <span className={"text-[11.5px] flex-shrink-0 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>{board.find((c) => c.id === t.colId)?.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {view === "settings" && (
            <section className="w-full max-w-7xl mx-auto">
              {/* Bar Pemilih Proyek yang Ingin Diatur */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 border-b border-zinc-800/40 dark:border-zinc-800/60">
                <span className={"text-[11px] font-bold uppercase tracking-wider mr-1 flex-shrink-0 " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                  Pilih Papan Proyek:
                </span>
                {projects.map((p, idx) => {
                  const isCurr = p.id === activeProject.id;
                  return (
                    <button
                      key={p.id || idx}
                      type="button"
                      onClick={() => selectProject(p, false)}
                      className={
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all flex-shrink-0 active:scale-95 cursor-pointer " +
                        (isCurr
                          ? isLight
                            ? "bg-zinc-900 text-white shadow-xs"
                            : "bg-emerald-400/15 text-emerald-300 border border-emerald-500/30 shadow-xs"
                          : isLight
                          ? "bg-white border border-slate-200 text-zinc-600 hover:text-zinc-900 hover:bg-slate-50"
                          : "bg-zinc-900/70 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")
                      }
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: p.dot || "#34D399" }} />
                      <span>{p.name}</span>
                      {p.tag && <span className="text-[10px] font-mono opacity-70">· {p.tag}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
                <div>
                  <h1 className={"text-2xl font-extrabold tracking-tight text-balance mb-1 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                    Pengaturan — {activeProject.name}
                  </h1>
                  <p className={"text-[13.5px] " + (isLight ? "text-zinc-600" : "text-zinc-500")}>
                    Kelola identitas papan Kanban, preferensi tampilan, siklus sprint, dan pemeliharaan data proyek secara real-time di database.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView("board")}
                  className={"inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[12.5px] font-semibold transition active:scale-95 cursor-pointer " + (isLight ? "bg-white border-slate-200 text-zinc-800 hover:bg-slate-50" : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800")}
                >
                  <Icon.Board width={14} height={14} /> Buka Papan Kanban
                </button>
              </div>

              {/* Identitas Ruang Kerja & Papan Kanban Aktif (Tersimpan ke Firestore) */}
              <form
                onSubmit={handleSaveProjectSettings}
                className={"border rounded-2xl overflow-hidden " + (isLight ? "bg-white border-slate-200 shadow-xs" : "bg-zinc-900 border-zinc-800")}
              >
                <div className={"flex flex-wrap items-center gap-4 px-6 pt-6 pb-5 border-b " + (isLight ? "border-slate-200" : "border-zinc-800")}>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
                    style={{ background: settingsProjDot || "#34D399" }}
                  >
                    <span className="text-zinc-950 font-extrabold text-xl">
                      {(settingsProjName.trim() || activeProject.name || "P")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className={"text-[15.5px] font-bold truncate " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                        {settingsProjName.trim() || activeProject.name}
                      </div>
                      <span
                        className={
                          "text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full border " +
                          (isLight ? "bg-slate-100 border-slate-200 text-zinc-700" : "bg-zinc-800 border-zinc-700 text-zinc-300")
                        }
                      >
                        {settingsProjTag.trim() || "Sprint 1"}
                      </span>
                      {!settingsProjSaved && (
                        <span className={"text-[11px] font-semibold rounded-full px-2.5 py-0.5 " + (isLight ? "text-amber-800 bg-amber-100 border border-amber-200" : "text-amber-300 bg-amber-950/50 border border-amber-800/60")}>
                          Perubahan belum disimpan
                        </span>
                      )}
                    </div>
                    <div className={"text-[12.5px] mt-0.5 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                      ID Database: <code className="font-mono text-[11.5px]">{activeProject.id}</code> · Pemilik: <span className="font-mono">{activeProjectOwnerEmail}</span>
                    </div>
                  </div>
                </div>

                <div className="px-6">
                  <SettingsRow
                    label="Nama papan / proyek aktif"
                    description="Judul proyek yang tampil di Beranda, sidebar, dan bagian atas tab Papan Kanban."
                    theme={theme}
                  >
                    <input
                      type="text"
                      required
                      disabled={!isPersonalBoard && role !== "admin"}
                      value={settingsProjName}
                      onChange={(e) => {
                        setSettingsProjName(e.target.value);
                        setSettingsProjSaved(false);
                      }}
                      placeholder="Contoh: Peluncuran Produk — Q4"
                      className={"w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 " + (isLight ? "border-slate-300 bg-slate-50 text-zinc-900 focus:bg-white" : "border-zinc-700 bg-zinc-950 text-zinc-50 focus:ring-emerald-900")}
                    />
                  </SettingsRow>

                  <SettingsRow
                    label="Label / Tag kategori & sprint"
                    description="Menentukan lencana kategori serta nuansa warna kartu proyek di Galeri Beranda (contoh: Q4, Sprint 1, Mobile, Backend)."
                    theme={theme}
                  >
                    <input
                      type="text"
                      disabled={!isPersonalBoard && role !== "admin"}
                      value={settingsProjTag}
                      onChange={(e) => {
                        setSettingsProjTag(e.target.value);
                        setSettingsProjSaved(false);
                      }}
                      placeholder="Contoh: Sprint 1 / Q4 / Mobile"
                      className={"w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 " + (isLight ? "border-slate-300 bg-slate-50 text-zinc-900 focus:bg-white" : "border-zinc-700 bg-zinc-950 text-zinc-50 focus:ring-emerald-900")}
                    />
                  </SettingsRow>

                  <SettingsRow
                    label="Deskripsi & sasaran papan"
                    description="Ringkasan ruang lingkup proyek yang tampil di bawah judul papan dan kartu galeri."
                    theme={theme}
                  >
                    <textarea
                      rows={2}
                      disabled={!isPersonalBoard && role !== "admin"}
                      value={settingsProjDesc}
                      onChange={(e) => {
                        setSettingsProjDesc(e.target.value);
                        setSettingsProjSaved(false);
                      }}
                      placeholder="Jelaskan sasaran utama papan proyek ini..."
                      className={"w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 " + (isLight ? "border-slate-300 bg-slate-50 text-zinc-900 focus:bg-white" : "border-zinc-700 bg-zinc-950 text-zinc-50 focus:ring-emerald-900")}
                    />
                  </SettingsRow>

                  <SettingsRow
                    label="Warna identitas papan"
                    description="Pilih aksen warna indikator dan gradien kartu untuk membedakan papan proyek ini."
                    last
                    theme={theme}
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {PROJECT_DOT_OPTIONS.map((opt) => {
                        const selected = settingsProjDot === opt.color;
                        return (
                          <button
                            key={opt.color}
                            type="button"
                            disabled={!isPersonalBoard && role !== "admin"}
                            onClick={() => {
                              setSettingsProjDot(opt.color);
                              setSettingsProjSaved(false);
                            }}
                            title={opt.label}
                            className={
                              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition cursor-pointer disabled:opacity-50 " +
                              (selected
                                ? isLight
                                  ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                                  : "bg-zinc-800 text-white border-white/25 shadow-xs"
                                : isLight
                                ? "bg-slate-50 border-slate-200 text-zinc-700 hover:bg-slate-100"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700")
                            }
                          >
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ background: opt.color }}
                            />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </SettingsRow>

                  <div className={"flex flex-wrap items-center justify-between gap-3 py-4 border-t " + (isLight ? "border-slate-200" : "border-zinc-800")}>
                    <span className={"text-[12px] " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                      {isPersonalBoard || role === "admin"
                        ? "Perubahan akan langsung disinkronkan ke koleksi /projects di Cloud Firestore."
                        : "Hanya Pembuat Papan / Kapten yang dapat mengubah identitas proyek."}
                    </span>
                    <div className="flex items-center gap-2.5 ml-auto">
                      <button
                        type="button"
                        disabled={settingsProjSaved || savingProjSettings}
                        onClick={() => {
                          setSettingsProjName(activeProject.name || "");
                          setSettingsProjTag(activeProject.tag || "Sprint 1");
                          setSettingsProjDesc(activeProject.description || "");
                          setSettingsProjDot(activeProject.dot || "#34D399");
                          setSettingsProjSaved(true);
                        }}
                        className={"px-4 py-2 rounded-xl border text-[12.5px] font-semibold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer " + (isLight ? "border-slate-300 text-zinc-700 hover:bg-slate-100" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800")}
                      >
                        Batalkan
                      </button>
                      <button
                        type="submit"
                        disabled={settingsProjSaved || savingProjSettings || (!isPersonalBoard && role !== "admin")}
                        className="px-5 py-2 rounded-xl bg-emerald-400 text-zinc-950 text-[12.5px] font-extrabold hover:bg-emerald-300 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                      >
                        {savingProjSettings ? "Menyimpan..." : "Simpan Pengaturan Papan"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Preferensi */}
              <div className={"border rounded-2xl px-6 mt-5 " + (isLight ? "bg-white border-slate-200 shadow-xs" : "bg-zinc-900 border-zinc-800")}>
                <div className="pt-6 pb-1">
                  <h3 className={"text-[15px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-50")}>Preferensi</h3>
                </div>
                <SettingsRow label="Notifikasi email" description="Kirim ringkasan harian tugas yang mendekati tenggat." theme={theme}>
                  <ToggleSwitch checked={emailNotif} onChange={setEmailNotif} label="Notifikasi email" theme={theme} />
                </SettingsRow>
                <SettingsRow label="Suara notifikasi" description="Bunyikan nada singkat saat ada tugas baru ditambahkan." theme={theme}>
                  <ToggleSwitch checked={soundNotif} onChange={setSoundNotif} label="Suara notifikasi" theme={theme} />
                </SettingsRow>
                <SettingsRow label="Tema tampilan" description={isLight ? "Tema terang sedang aktif. Klik tombol switch untuk beralih ke tema gelap." : "Tema gelap sedang aktif. Klik tombol switch untuk beralih ke tema terang."} last theme={theme}>
                  <div className="flex items-center gap-3">
                    <ToggleSwitch checked={!isLight} onChange={toggleTheme} label="Tema tampilan (terang / gelap)" theme={theme} />
                    <span className={"text-[12.5px] font-medium " + (isLight ? "text-zinc-700" : "text-zinc-400")}>
                      {isLight ? "Terang (Light Mode)" : "Gelap (Dark Mode)"}
                    </span>
                  </div>
                </SettingsRow>
              </div>

              {/* Manajemen & Siklus Sprint (Mulai & Akhiri Sprint) */}
              <div className={"border rounded-2xl overflow-hidden mt-5 " + (isLight ? "bg-white border-slate-200 shadow-xs" : "bg-zinc-900 border-zinc-800")}>
                <div className={"flex flex-wrap items-center justify-between gap-4 px-6 pt-6 pb-5 border-b " + (isLight ? "border-slate-200 bg-slate-50/60" : "border-zinc-800 bg-zinc-950/40")}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className={"text-[15.5px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                        Manajemen & Siklus Sprint — {activeProject.name}
                      </h3>
                      {isSprintActive ? (
                        <span className={"inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border " + (isLight ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300")}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Sprint #{sprint.number} Aktif (Hari {sprint.day}/{sprintDurationDays})
                        </span>
                      ) : (
                        <span className={"inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border " + (isLight ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-amber-500/10 border-amber-500/30 text-amber-300")}>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          Persiapan Sprint #{sprint.number} (Belum Dimulai)
                        </span>
                      )}
                    </div>
                    <p className={"text-[12.5px] mt-1 leading-relaxed " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                      Mulai sprint baru, atur tujuan & durasi kerja, tarik kartu prioritas dari Backlog, atau buka ringkasan retrospektif akhir sprint.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView("board")}
                    className={"inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[12px] font-semibold transition active:scale-95 flex-shrink-0 " + (isLight ? "bg-white border-slate-300 text-zinc-800 hover:bg-slate-100" : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800")}
                  >
                    <Icon.Board width={14} height={14} /> Lihat di Papan Kanban →
                  </button>
                </div>

                {/* Ringkasan Cepat Metrik Sprint */}
                <div className={"grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-4 border-b " + (isLight ? "border-slate-200/80 bg-white" : "border-zinc-800/80 bg-zinc-900/50")}>
                  <div className={"rounded-xl p-3 border " + (isLight ? "bg-slate-50 border-slate-200/80" : "bg-zinc-950/60 border-zinc-800")}>
                    <div className={"text-[10.5px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>Status Siklus</div>
                    <div className={"text-sm font-extrabold mt-1 " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                      {isSprintActive
                        ? `Sprint #${sprint.number} Sedang Berjalan`
                        : `Sprint #${sprint.number} Siap Dimulai`}
                    </div>
                    <div className={"text-[11.5px] mt-0.5 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                      {isSprintActive
                        ? `Dimulai: ${sprint.startedAt || "Hari ini"}`
                        : sprint.endedAt
                        ? `Sprint #${Math.max(sprint.number - 1, 1)} selesai: ${sprint.endedAt}`
                        : "Menunggu Kapten memulai sprint"}
                    </div>
                  </div>
                  <div className={"rounded-xl p-3 border " + (isLight ? "bg-slate-50 border-slate-200/80" : "bg-zinc-950/60 border-zinc-800")}>
                    <div className={"text-[10.5px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>Progres Poin Sprint</div>
                    <div className={"text-sm font-extrabold font-mono tabular-nums mt-1 " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                      {sprintDonePoints} / {sprintCommittedPoints} poin selesai
                    </div>
                    <div className={"text-[11.5px] mt-0.5 " + (isLight ? "text-emerald-700" : "text-emerald-400")}>
                      {sprintCommittedPoints > 0
                        ? `${Math.round((sprintDonePoints / sprintCommittedPoints) * 100)}% komitmen sprint tercapai`
                        : "Belum ada kartu di kolom sprint"}
                    </div>
                  </div>
                  <div className={"rounded-xl p-3 border " + (isLight ? "bg-slate-50 border-slate-200/80" : "bg-zinc-950/60 border-zinc-800")}>
                    <div className={"text-[10.5px] font-bold uppercase tracking-wider " + (isLight ? "text-zinc-400" : "text-zinc-500")}>Backlog Prioritas Kapten</div>
                    <div className={"text-sm font-extrabold font-mono tabular-nums mt-1 " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                      {backlogPrioritizedCount} kartu berbintang
                    </div>
                    <div className={"text-[11.5px] mt-0.5 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                      Siap ditarik ke Sprint Backlog saat mulai
                    </div>
                  </div>
                </div>

                <div className="px-6">
                  <SettingsRow
                    label={`Tujuan Sprint #${sprint.number}`}
                    description="Target utama yang tampil di bagian atas papan Kanban sebagai panduan tim."
                    theme={theme}
                  >
                    <input
                      value={sprint.goal || ""}
                      disabled={!isPersonalBoard && role !== "admin"}
                      onChange={(e) => setSprint((prev) => ({ ...prev, goal: e.target.value }))}
                      placeholder="Contoh: Selesaikan integrasi pembayaran & onboarding pengguna..."
                      className={"w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 " + (isLight ? "border-slate-300 bg-slate-50 text-zinc-900 focus:bg-white" : "border-zinc-700 bg-zinc-950 text-zinc-50 focus:ring-emerald-900")}
                    />
                  </SettingsRow>

                  <SettingsRow
                    label="Durasi & hari berjalan sprint"
                    description="Tentukan panjang siklus sprint (mingguan / 2 mingguan) dan hari sprint yang sedang berjalan."
                    theme={theme}
                  >
                    <div className="flex flex-wrap items-center gap-2.5 w-full">
                      <select
                        value={sprintDurationDays}
                        disabled={!isPersonalBoard && role !== "admin"}
                        onChange={(e) => {
                          const nextDur = Number(e.target.value);
                          setSprint((prev) => ({
                            ...prev,
                            durationDays: nextDur,
                            day: Math.min(prev.day || 1, nextDur),
                          }));
                          showToast(`Durasi sprint diubah menjadi ${nextDur} hari.`);
                        }}
                        className={"px-3.5 py-2.5 rounded-xl border text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 " + (isLight ? "border-slate-300 bg-slate-50 text-zinc-900" : "border-zinc-700 bg-zinc-950 text-zinc-100")}
                      >
                        <option value={7}>7 Hari (1 Minggu)</option>
                        <option value={14}>14 Hari (2 Minggu - Standar)</option>
                        <option value={21}>21 Hari (3 Minggu)</option>
                        <option value={30}>30 Hari (4 Minggu)</option>
                      </select>

                      <div className={"inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border " + (isLight ? "bg-slate-50 border-slate-200" : "bg-zinc-950 border-zinc-800")}>
                        <button
                          type="button"
                          disabled={(!isPersonalBoard && role !== "admin") || (sprint.day || 1) <= 1}
                          onClick={() =>
                            setSprint((prev) => ({
                              ...prev,
                              day: Math.max((prev.day || 1) - 1, 1),
                            }))
                          }
                          className={"w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center transition active:scale-90 disabled:opacity-40 " + (isLight ? "bg-white border-slate-300 text-zinc-700 hover:bg-slate-100" : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800")}
                        >
                          -
                        </button>
                        <span className={"text-[12.5px] font-mono font-bold px-2 " + (isLight ? "text-zinc-800" : "text-zinc-200")}>
                          Hari {sprint.day || 1} / {sprintDurationDays}
                        </span>
                        <button
                          type="button"
                          disabled={(!isPersonalBoard && role !== "admin") || (sprint.day || 1) >= sprintDurationDays}
                          onClick={() =>
                            setSprint((prev) => ({
                              ...prev,
                              day: Math.min((prev.day || 1) + 1, sprintDurationDays),
                            }))
                          }
                          className={"w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center transition active:scale-90 disabled:opacity-40 " + (isLight ? "bg-white border-slate-300 text-zinc-700 hover:bg-slate-100" : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800")}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </SettingsRow>

                  <SettingsRow
                    label="Tarik otomatis kartu prioritas saat Mulai Sprint"
                    description="Jika aktif, kartu berbintang di Backlog Produk otomatis dipindahkan ke kolom Sprint Backlog saat kamu menekan Mulai Sprint."
                    theme={theme}
                  >
                    <div className="flex items-center gap-3">
                      <ToggleSwitch
                        checked={sprint.autoPullPrioritized !== false}
                        onChange={(val) =>
                          setSprint((prev) => ({ ...prev, autoPullPrioritized: val }))
                        }
                        label="Tarik otomatis kartu prioritas saat Mulai Sprint"
                        theme={theme}
                      />
                      <span className={"text-[12.5px] font-medium " + (isLight ? "text-zinc-700" : "text-zinc-400")}>
                        {sprint.autoPullPrioritized !== false
                          ? `Aktif (${backlogPrioritizedCount} kartu siap ditarik)`
                          : "Nonaktif (pindahkan manual)"}
                      </span>
                    </div>
                  </SettingsRow>

                  {!isPersonalBoard && (
                    <SettingsRow
                      label="Batasi anggota ke kartu prioritas"
                      description="Kunci fokus sprint agar Anggota hanya bisa mengambil dan memindahkan kartu yang sudah ditandai bintang oleh Kapten."
                      theme={theme}
                    >
                      <div className="flex items-center gap-3">
                        <ToggleSwitch
                          checked={lockPriority}
                          onChange={() => {
                            if (role !== "admin") {
                              showToast("Hanya Kapten yang dapat mengubah kunci prioritas sprint.");
                              return;
                            }
                            setLockPriority((v) => !v);
                            showToast(!lockPriority ? "Anggota dibatasi ke kartu berbintang." : "Semua kartu kembali bisa diambil anggota.");
                          }}
                          label="Batasi anggota ke kartu prioritas"
                          theme={theme}
                        />
                        <span className={"text-[12.5px] font-medium " + (isLight ? "text-zinc-700" : "text-zinc-400")}>
                          {lockPriority ? "Terkunci ke kartu berbintang" : "Terbuka untuk semua kartu"}
                        </span>
                      </div>
                    </SettingsRow>
                  )}

                  <SettingsRow
                    label="Mulai & Akhiri Siklus Sprint"
                    description={
                      isSprintActive
                        ? `Sprint #${sprint.number} sedang aktif berjalan. Klik "Akhiri & Ringkas Sprint" untuk membuka evaluasi capaian poin dan menentukan nasib kartu yang belum selesai.`
                        : `Sprint #${sprint.number} belum dimulai. Klik tombol Mulai Sprint untuk memulai Hari 1 dan menarik kartu prioritas ke Sprint Backlog.`
                    }
                    last={!Array.isArray(sprint.history) || sprint.history.length === 0}
                    theme={theme}
                  >
                    <div className="flex flex-wrap items-center gap-2.5 w-full">
                      {/* Tombol Mulai Sprint */}
                      <button
                        type="button"
                        disabled={!isPersonalBoard && role !== "admin"}
                        onClick={() =>
                          startSprint({
                            goal: sprint.goal,
                            durationDays: sprintDurationDays,
                            autoPullPrioritized: sprint.autoPullPrioritized !== false,
                          })
                        }
                        className={
                          "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer " +
                          (!isSprintActive
                            ? "bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-md shadow-emerald-500/20"
                            : isLight
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                            : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25")
                        }
                      >
                        <span className={"w-2 h-2 rounded-full " + (!isSprintActive ? "bg-zinc-950 animate-pulse" : "bg-emerald-400")} />
                        {!isSprintActive
                          ? `Mulai Sprint #${sprint.number} Sekarang`
                          : `Mulai / Reset Sprint #${sprint.number} (Hari 1)`}
                      </button>

                      {/* Tombol Akhiri Sprint -> Buka Modal Ringkasan Sprint */}
                      {isSprintActive && (
                        <button
                          type="button"
                          disabled={!isPersonalBoard && role !== "admin"}
                          onClick={() => endSprint()}
                          className={
                            "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer " +
                            (isLight
                              ? "border-slate-300 bg-white text-zinc-800 hover:bg-slate-100"
                              : "border-zinc-700 bg-zinc-800/90 text-zinc-100 hover:bg-zinc-800")
                          }
                        >
                          <Icon.Check width={14} height={14} className="text-emerald-400" />
                          <span>Akhiri & Ringkas Sprint #{sprint.number}</span>
                        </button>
                      )}
                    </div>
                  </SettingsRow>

                  {Array.isArray(sprint.history) && sprint.history.length > 0 && (
                    <SettingsRow
                      label="Riwayat & Evaluasi Sprint Sebelumnya"
                      description="Catatan velocity dan retrospektif dari sprint yang telah diselesaikan pada papan ini."
                      last
                      theme={theme}
                    >
                      <div className="w-full space-y-2">
                        {[...sprint.history].reverse().map((h, i) => (
                          <div
                            key={`${h.n}-${i}`}
                            className={
                              "rounded-xl px-3.5 py-2.5 border flex flex-wrap items-center justify-between gap-2 " +
                              (isLight ? "bg-slate-50 border-slate-200" : "bg-zinc-950/60 border-zinc-800")
                            }
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-mono font-extrabold text-emerald-500">
                                  Sprint #{h.n}
                                </span>
                                {h.endedAt && (
                                  <span className={"text-[11px] " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                                    · {h.endedAt}
                                  </span>
                                )}
                              </div>
                              {h.note && (
                                <p className={"text-[11.5px] mt-0.5 " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                                  &ldquo;{h.note}&rdquo;
                                </p>
                              )}
                            </div>
                            <span className={"text-[11.5px] font-mono font-bold px-2.5 py-1 rounded-lg border " + (isLight ? "bg-white border-slate-200 text-zinc-800" : "bg-zinc-900 border-zinc-800 text-zinc-200")}>
                              {h.points || 0} poin{typeof h.doneTasks === "number" ? ` · ${h.doneTasks} kartu` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </SettingsRow>
                  )}
                </div>
              </div>

              {/* Peran & akses */}
              <div className={"border rounded-2xl p-6 mt-5 " + (isLight ? "bg-white border-slate-200 shadow-xs" : "bg-zinc-900 border-zinc-800")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={"text-[15px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-50")}>Peran & akses kolaborasi</h3>
                  <span className={"text-[11px] font-bold px-2.5 py-1 rounded-full border " +
                    (isPersonalBoard
                      ? (isLight ? "bg-slate-100 text-zinc-700 border-slate-300" : "bg-zinc-800 text-zinc-300 border-white/10")
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")}
                  >
                    {isPersonalBoard ? "Papan Pribadi (Tanpa Peran)" : `Mode Tim Aktif (${roleLabel})`}
                  </span>
                </div>
                <p className={"text-[12.5px] mt-1 mb-5 leading-relaxed " + (isLight ? "text-zinc-600" : "text-zinc-500")}>
                  {isPersonalBoard
                    ? "Papan pribadi tidak menggunakan peran Kapten, Anggota, atau Viewer. Begitu kamu mengundang kolaborator lain, kamu otomatis menjadi Kapten dan dapat memilih peran Anggota atau Viewer untuk orang yang diundang."
                    : "Pembuat papan otomatis menjadi Kapten, sedangkan kolaborator yang diundang berperan sebagai Anggota atau Viewer sesuai pilihan Kapten."}
                </p>
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-left border-collapse min-w-[460px]">
                    <thead>
                      <tr>
                        <th className={"px-2 pb-3 text-[11px] font-bold uppercase tracking-wide " + (isLight ? "text-zinc-500" : "text-zinc-500")}>Hak akses</th>
                        <th className="px-2 pb-3 text-[11px] font-bold text-emerald-500 text-center w-24">Kapten</th>
                        <th className={"px-2 pb-3 text-[11px] font-bold text-center w-24 " + (isLight ? "text-zinc-600" : "text-zinc-400")}>Anggota</th>
                        <th className={"px-2 pb-3 text-[11px] font-bold text-center w-20 " + (isLight ? "text-zinc-500" : "text-zinc-500")}>Viewer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Melihat gambaran besar papan", perm: [true, true, true] },
                        { label: "Melihat judul, catatan & checklist tiap kartu", perm: [true, true, false] },
                        { label: "Mengambil & memindahkan kartu prioritas", perm: [true, true, false] },
                        { label: "Memindahkan kartu di luar prioritas", perm: [true, "lock", false] },
                        { label: "Mengundang orang lain & memilih peran aktor", perm: [true, false, false] },
                        { label: "Menandai prioritas & mengatur sprint", perm: [true, false, false] },
                        { label: "Menghapus tugas & mengubah pengaturan", perm: [true, false, false] },
                      ].map((row) => (
                        <tr key={row.label} className={"border-t " + (isLight ? "border-slate-200" : "border-zinc-800")}>
                          <td className={"px-2 py-3 text-[13px] " + (isLight ? "text-zinc-700" : "text-zinc-300")}>{row.label}</td>
                          {row.perm.map((allowed, i) => (
                            <td key={i} className="px-2 py-3 text-center">
                              {allowed === "lock" ? (
                                <Icon.Lock width={13} height={13} className="text-amber-500 mx-auto" />
                              ) : allowed ? (
                                <Icon.Check className="text-emerald-500 mx-auto" />
                              ) : (
                                <span className={"block w-1.5 h-1.5 rounded-full mx-auto " + (isLight ? "bg-slate-300" : "bg-zinc-700")} />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={"text-[11.5px] mt-3 flex items-center gap-1.5 " + (isLight ? "text-zinc-500" : "text-zinc-600")}>
                  <Icon.Lock width={12} height={12} /> Tergantung apakah Kapten sedang mengunci sprint ke kartu berbintang.
                </p>
              </div>

              {/* Ekspor, Impor & Cadangan Data Papan (CSV / JSON) */}
              <div
                className={
                  "rounded-3xl p-1.5 border mt-5 " +
                  (isLight
                    ? "bg-slate-200/70 border-slate-300/80 shadow-xs"
                    : "bg-zinc-900/60 border-white/[0.06] shadow-xl shadow-black/35")
                }
              >
                <div
                  className={
                    "rounded-2xl p-6 border space-y-4 " +
                    (isLight
                      ? "bg-white border-white"
                      : "bg-zinc-900/95 border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-emerald-500">
                        Portabilitas & Cadangan Data
                      </div>
                      <h3 className={"text-[15.5px] font-extrabold mt-0.5 " + (isLight ? "text-zinc-900" : "text-zinc-50")}>
                        Ekspor CSV, Backup JSON & Pemulihan Papan
                      </h3>
                    </div>
                    <span className={"text-[11px] font-mono px-2.5 py-1 rounded-full border " + (isLight ? "bg-slate-100 border-slate-200 text-zinc-700" : "bg-zinc-800 border-zinc-700 text-zinc-300")}>
                      {board.length} kolom · {totalTasks} kartu
                    </span>
                  </div>
                  <p className={"text-[12.5px] leading-relaxed " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                    Unduh laporan seluruh kartu tugas dalam format tabel <b>CSV</b> (kompatibel penuh dengan Microsoft Excel & Google Sheets), simpan arsip <b>JSON</b> lengkap beserta struktur kolom & Sprint, atau pulihkan papan dari file backup JSON.
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleExportBoardCSV}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-[12.5px] font-extrabold hover:bg-emerald-400 active:scale-95 transition shadow-xs cursor-pointer"
                    >
                      <Icon.Copy width={14} height={14} />
                      <span>Ekspor Tabel CSV (.csv)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportBoardJSON}
                      className={
                        "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12.5px] font-bold active:scale-95 transition cursor-pointer " +
                        (isLight
                          ? "border-slate-300 bg-white text-zinc-800 hover:bg-slate-100"
                          : "border-zinc-700 bg-zinc-800/90 text-zinc-100 hover:bg-zinc-800")
                      }
                    >
                      <Icon.Sparkles width={14} height={14} className="text-sky-400" />
                      <span>Unduh Backup JSON (.json)</span>
                    </button>
                    {(isPersonalBoard || role === "admin") && (
                      <>
                        <button
                          type="button"
                          onClick={() => importFileInputRef.current?.click()}
                          className={
                            "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12.5px] font-bold active:scale-95 transition cursor-pointer " +
                            (isLight
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20")
                          }
                        >
                          <Icon.Plus width={14} height={14} />
                          <span>Impor / Pulihkan JSON</span>
                        </button>
                        <input
                          ref={importFileInputRef}
                          type="file"
                          accept=".json,application/json"
                          onChange={handleImportBoardJSON}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Zona Bahaya & Pemeliharaan Papan */}
              <div className={"border rounded-2xl p-6 mt-5 space-y-5 " + (isLight ? "bg-white border-rose-200 shadow-xs" : "bg-zinc-900 border-rose-900/40")}>
                <div>
                  <h3 className="text-[15px] font-bold text-rose-500">Zona Bahaya & Pemeliharaan Papan</h3>
                  <p className={"text-[12.5px] mt-1 " + (isLight ? "text-zinc-600" : "text-zinc-400")}>
                    Tindakan pembersihan kartu atau penghapusan papan proyek <b className={isLight ? "text-zinc-900" : "text-zinc-200"}>&ldquo;{activeProject.name}&rdquo;</b> dari database.
                  </p>
                </div>

                {/* Baris 1: Reset / Kosongkan Isi Papan */}
                {(isPersonalBoard || role === "admin") && (
                  <div className={"flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t " + (isLight ? "border-slate-200" : "border-zinc-800")}>
                    <div>
                      <div className={"text-[13.5px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                        Reset atau Kosongkan Kartu di Papan Ini
                      </div>
                      <p className={"text-[12px] mt-0.5 max-w-[52ch] " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                        Bersihkan seluruh kartu tugas ({totalTasks} tugas) di papan ini menjadi kosong (0 tugas) atau kembalikan ke 3 kartu awal.
                      </p>
                    </div>
                    {!confirmResetBoard ? (
                      <button
                        type="button"
                        onClick={() => setConfirmResetBoard(true)}
                        className={"px-4 py-2.5 rounded-xl border text-[12.5px] font-semibold active:scale-95 transition flex-shrink-0 cursor-pointer " + (isLight ? "border-amber-300 text-amber-800 hover:bg-amber-50" : "border-amber-800/60 text-amber-300 hover:bg-amber-950/40")}
                      >
                        Reset Isi Papan
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleResetBoardTasks("empty")}
                          className="px-3.5 py-2 rounded-xl bg-rose-500 text-white text-[12px] font-bold hover:bg-rose-600 active:scale-95 transition cursor-pointer"
                        >
                          Kosongkan (0 Tugas)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetBoardTasks("starter")}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 text-[12px] font-bold hover:bg-amber-400 active:scale-95 transition cursor-pointer"
                        >
                          Reset ke 3 Tugas Awal
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmResetBoard(false)}
                          className={"px-3 py-2 rounded-xl border text-[12px] font-semibold active:scale-95 transition cursor-pointer " + (isLight ? "border-slate-300 text-zinc-700 hover:bg-slate-100" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800")}
                        >
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Baris 2: Hapus Papan Proyek atau Keluar dari Kolaborasi */}
                <div className={"flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t " + (isLight ? "border-slate-200" : "border-zinc-800")}>
                  <div>
                    <div className={"text-[13.5px] font-bold " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                      {isCurrentUserOwner
                        ? `Hapus Papan Proyek "${activeProject.name}"`
                        : `Keluar dari Proyek "${activeProject.name}"`}
                    </div>
                    <p className={"text-[12px] mt-0.5 max-w-[52ch] " + (isLight ? "text-zinc-500" : "text-zinc-500")}>
                      {isCurrentUserOwner
                        ? projects.length > 1
                          ? "Menghapus papan proyek ini secara permanen dari koleksi /projects di Cloud Firestore. Tindakan ini tidak bisa dibatalkan."
                          : "Ini adalah satu-satunya papan proyek aktif di akun kamu. Buat papan proyek lain terlebih dahulu jika ingin menghapus papan ini."
                        : "Cabut akses akun kamu dari papan kolaborasi ini. Kamu tidak akan lagi melihat papan ini di daftar proyekmu."}
                    </p>
                  </div>
                  {!confirmDanger ? (
                    <button
                      type="button"
                      disabled={isCurrentUserOwner && projects.length <= 1}
                      onClick={() => setConfirmDanger(true)}
                      className={"px-4 py-2.5 rounded-xl border text-[12.5px] font-semibold active:scale-95 transition flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer " + (isLight ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-rose-900/60 text-rose-400 hover:bg-rose-950/40")}
                    >
                      {isCurrentUserOwner ? "Hapus Papan Proyek" : "Keluar dari Proyek"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDanger(false);
                          if (isCurrentUserOwner) {
                            handleDeleteProject(activeProject);
                          } else {
                            handleRemoveCollaborator(userEmail);
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-rose-500 text-white text-[12.5px] font-bold hover:bg-rose-600 active:scale-95 transition shadow-xs cursor-pointer"
                      >
                        {isCurrentUserOwner ? "Ya, Hapus Permanen" : "Ya, Keluar Sekarang"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDanger(false)}
                        className={"px-3.5 py-2.5 rounded-xl border text-[12.5px] font-semibold active:scale-95 transition cursor-pointer " + (isLight ? "border-slate-300 text-zinc-700 hover:bg-slate-100" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800")}
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        board={board}
        role={role}
        onNavigate={setView}
        onOpenTask={setActiveTaskId}
        onAddFirst={addFirstColumnTask}
        onLogout={handleLogout}
        theme={theme}
      />

      <TaskPanel
        task={activeFound ? activeFound.task : null}
        col={activeFound ? activeFound.col : null}
        board={board}
        role={role}
        isPersonalBoard={isPersonalBoard}
        myMemberKey={myMemberKey}
        collaborators={activeProjectCollaborators}
        onClose={() => setActiveTaskId(null)}
        onUpdate={updateTask}
        onMoveTask={moveTask}
        onDeleteTask={deleteTask}
        onDuplicateTask={duplicateTask}
        onTogglePriority={togglePriority}
        onToggleChecklist={toggleChecklist}
        onClaim={claimTask}
        onAddComment={addComment}
        theme={theme}
      />

      {drag && (() => {
        const dragCol = board.find((c) => c.id === drag.colId);
        const dragTheme = resolveColTheme(dragCol, theme);
        const initialLeft = (drag.initialX || 0) - (drag.offsetX || 0);
        const initialTop = (drag.initialY || 0) - (drag.offsetY || 0);
        return (
          <div
            ref={dragGhostRef}
            aria-hidden="true"
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              transform: `translate3d(${initialLeft}px, ${initialTop}px, 0)`,
              width: drag.w,
              zIndex: 75,
              pointerEvents: "none",
              willChange: "transform",
            }}
          >
            <div className={"strata-drag-ghost rounded-xl p-3.5 flex flex-col gap-2.5 " + (dragTheme?.cardAccent || "") + " " + (dragTheme?.cardBg || (isLight ? "bg-white shadow-xl border border-slate-300" : "bg-zinc-800 border border-emerald-500/40"))}>
              <TaskCardBody task={drag.task} theme={theme} colId={drag.colId} isPersonalBoard={isPersonalBoard} />
            </div>
          </div>
        );
      })()}

      <InviteCollaboratorModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        projectName={activeProject.name}
        ownerName={displayName}
        ownerEmail={activeProjectOwnerEmail}
        isPersonalBoard={isPersonalBoard}
        initialEmail={inviteModalInitialEmail}
        inviting={invitingCollab}
        onConfirmInvite={handleConfirmInviteCollaborator}
        theme={theme}
      />

      <SprintSummaryModal
        open={sprintSummaryOpen}
        onClose={() => setSprintSummaryOpen(false)}
        board={board}
        sprint={sprint}
        projectName={activeProject.name}
        onConfirmEndSprint={confirmEndSprint}
        onCopyReport={() => showToast("Laporan ringkasan Sprint (.md) berhasil disalin ke clipboard!")}
        theme={theme}
      />

      <AIHelper
        role={role}
        onAddTask={addTask}
        onApplyTemplate={applyAITemplate}
        board={board}
        sprint={sprint}
        projectName={activeProject.name}
        theme={theme}
      />

      <Toast message={toastMsg} position="bottom-24 right-6" />
    </div>
  );
}
