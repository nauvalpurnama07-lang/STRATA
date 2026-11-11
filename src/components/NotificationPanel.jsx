import React, { useState } from "react";
import { Icon } from "./icons";
import { MEMBERS, PRIORITY_LABEL } from "../data/board";

export default function NotificationPanel({
  notifications = [],
  unreadCount = 0,
  onSelectTask,
  onMarkAllAsRead,
  onClose,
  theme = "dark",
}) {
  const isLight = theme === "light";
  const [filter, setFilter] = useState("all"); // "all" | "unread"

  const displayedNotifications =
    filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div
      className={
        "absolute top-[calc(100%+10px)] right-0 w-[360px] sm:w-[420px] max-w-[calc(100vw-32px)] z-40 origin-top-right rounded-3xl border overflow-hidden flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in zoom-in-95 " +
        (isLight
          ? "bg-white/95 border-slate-200/70 text-zinc-900 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "bg-zinc-900/95 border-zinc-800/60 text-zinc-50 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl")
      }
      style={{ maxHeight: "calc(100vh - 120px)" }}
    >
      {/* Panel Header */}
      <div
        className={
          "px-4 py-3.5 border-b flex items-center justify-between gap-3 " +
          (isLight ? "border-slate-200/60 bg-slate-50/70" : "border-zinc-800/50 bg-zinc-900/60")
        }
      >
        <div className="flex items-center gap-2.5">
          <div
            className={
              "w-8 h-8 rounded-xl flex items-center justify-center " +
              (isLight ? "bg-blue-100 text-blue-600" : "bg-blue-950/80 text-blue-400 border border-blue-900/50")
            }
          >
            <Icon.Bell width={16} height={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={"text-[13.5px] font-bold tracking-tight " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                Notifikasi Komentar
              </h3>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-500 text-white shadow-xs">
                  {unreadCount} Baru
                </span>
              ) : (
                <span
                  className={
                    "px-2 py-0.5 rounded-full text-[10.5px] font-semibold " +
                    (isLight ? "bg-slate-200 text-zinc-600" : "bg-zinc-800 text-zinc-400")
                  }
                >
                  {notifications.length} Total
                </span>
              )}
            </div>
            <p className={"text-[11px] " + (isLight ? "text-zinc-500" : "text-zinc-400")}>
              Pembaruan komentar pada kartu tugas papan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              title="Tandai semua sudah dibaca"
              className={
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 " +
                (isLight
                  ? "text-blue-600 hover:bg-blue-50 border border-blue-200/70"
                  : "text-blue-400 hover:bg-blue-950/50 border border-blue-900/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]")
              }
            >
              <Icon.Check width={9} height={9} />
              <span>Tandai dibaca</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup notifikasi"
            className={
              "w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 " +
              (isLight ? "text-zinc-400 hover:bg-slate-200/80 hover:text-zinc-700" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200")
            }
          >
            <Icon.X width={13} height={13} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      {notifications.length > 0 && (
        <div
          className={
            "px-4 pt-2.5 pb-2 border-b flex items-center gap-2 text-[12px] " +
            (isLight ? "border-slate-200/50 bg-white" : "border-zinc-800/40 bg-zinc-900")
          }
        >
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={
              "px-3 py-1 rounded-full font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
              (filter === "all"
                ? isLight
                  ? "bg-slate-200 text-zinc-900 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                  : "bg-zinc-800 text-zinc-100 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : isLight
                ? "text-zinc-500 hover:text-zinc-800"
                : "text-zinc-400 hover:text-zinc-200")
            }
          >
            Semua ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={
              "px-3 py-1 rounded-full font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 " +
              (filter === "unread"
                ? isLight
                  ? "bg-blue-100 text-blue-700 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                  : "bg-blue-950/70 text-blue-300 font-semibold border border-blue-900/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : isLight
                ? "text-zinc-500 hover:text-zinc-800"
                : "text-zinc-400 hover:text-zinc-200")
            }
          >
            <span>Belum dibaca</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Notification List Container */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 max-h-[420px]">
        {displayedNotifications.length === 0 ? (
          <div
            className={
              "text-center py-10 px-4 rounded-xl border border-dashed flex flex-col items-center justify-center " +
              (isLight ? "border-slate-200 bg-slate-50/50 text-zinc-500" : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400")
            }
          >
            <div
              className={
                "w-11 h-11 rounded-2xl flex items-center justify-center mb-2.5 " +
                (isLight ? "bg-slate-200/80 text-zinc-400" : "bg-zinc-800 text-zinc-500")
              }
            >
              <Icon.ChatBubble width={20} height={20} />
            </div>
            <p className={"text-[13px] font-semibold " + (isLight ? "text-zinc-800" : "text-zinc-200")}>
              {filter === "unread" ? "Semua komentar sudah dibaca" : "Belum ada notifikasi komentar"}
            </p>
            <p className="text-[11.5px] mt-1 max-w-[260px] leading-relaxed">
              {filter === "unread"
                ? "Tidak ada komentar baru yang belum Anda periksa."
                : "Komentar yang ditambahkan anggota tim pada kartu tugas akan muncul di sini."}
            </p>
          </div>
        ) : (
          displayedNotifications.map((notif) => {
            const latest = notif.latestComment;
            const memberData = latest?.authorKey ? MEMBERS[latest.authorKey] : null;
            const authorColor = memberData?.color || "#3B82F6";
            const authorInitials = memberData?.initials || latest?.author?.slice(0, 2).toUpperCase() || "US";

            return (
              <div
                key={notif.taskId}
                onClick={() => onSelectTask(notif.taskId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectTask(notif.taskId);
                  }
                }}
                className={
                  "relative p-3 rounded-2xl border text-left cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group active:scale-[0.98] hover:-translate-y-0.5 " +
                  (isLight
                    ? notif.isRead
                      ? "bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-md shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                      : "bg-blue-50/40 border-blue-200/60 hover:border-blue-400 hover:bg-blue-50/70 shadow-sm"
                    : notif.isRead
                    ? "bg-zinc-900/80 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-800/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    : "bg-blue-950/20 border-blue-900/50 hover:border-blue-700/80 hover:bg-blue-950/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]")
                }
              >
                {/* Unread Accent Indicator */}
                {!notif.isRead && (
                  <span className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 animate-pulse" />
                )}

                {/* Top Row: Column & Time */}
                <div className="flex items-center gap-2 mb-1.5 pr-4">
                  <span
                    className={
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-medium border " +
                      (isLight ? "bg-slate-100 border-slate-200 text-zinc-700" : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300")
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: notif.columnDot }}
                    />
                    <span className="truncate max-w-[120px]">{notif.columnName}</span>
                  </span>

                  {notif.taskPriority && (
                    <span
                      className={
                        "text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider " +
                        (notif.taskPriority === "urgent"
                          ? "bg-rose-500/15 text-rose-500"
                          : notif.taskPriority === "high"
                          ? "bg-amber-500/15 text-amber-500"
                          : isLight
                          ? "text-zinc-500 bg-slate-100"
                          : "text-zinc-400 bg-zinc-800")
                      }
                    >
                      {PRIORITY_LABEL[notif.taskPriority] || notif.taskPriority}
                    </span>
                  )}

                  <span className={"text-[10.5px] ml-auto " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                    {latest?.createdAt || "Baru saja"}
                  </span>
                </div>

                {/* Task Title */}
                <h4
                  className={
                    "text-[13px] font-bold leading-snug mb-2 group-hover:text-blue-500 transition-colors " +
                    (isLight ? "text-zinc-900" : "text-zinc-100")
                  }
                >
                  {notif.taskTitle}
                </h4>

                {/* Card Khusus: Comment Callout Box */}
                {latest && (
                  <div
                    className={
                      "p-2.5 rounded-xl border text-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] " +
                      (isLight
                        ? "bg-slate-100/80 border-slate-200/50 text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                        : "bg-zinc-950/60 border-zinc-800/50 text-zinc-300")
                    }
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {memberData?.photoURL ? (
                        <img
                          src={memberData.photoURL}
                          alt={latest.author || "Anggota Tim"}
                          referrerPolicy="no-referrer"
                          className="w-4.5 h-4.5 rounded object-cover shrink-0 shadow-2xs"
                        />
                      ) : (
                        <span
                          className="w-4.5 h-4.5 rounded text-[8.5px] font-bold text-white flex items-center justify-center shrink-0 shadow-2xs"
                          style={{ background: authorColor }}
                        >
                          {authorInitials}
                        </span>
                      )}
                      <span className={"font-semibold text-[11.5px] " + (isLight ? "text-zinc-900" : "text-zinc-100")}>
                        {latest.author || "Anggota Tim"}
                      </span>
                      <span className={"text-[10px] ml-auto " + (isLight ? "text-zinc-400" : "text-zinc-500")}>
                        Komentar terbaru
                      </span>
                    </div>
                    <p className="line-clamp-2 italic leading-relaxed text-[11.5px] pl-0.5">
                      "{latest.text}"
                    </p>
                  </div>
                )}

                {/* Footer: Count & Jump Action */}
                <div className="flex items-center justify-between mt-2 pt-1.5">
                  <span
                    className={
                      "inline-flex items-center gap-1 text-[11px] font-medium " +
                      (isLight ? "text-blue-600" : "text-blue-400")
                    }
                  >
                    <Icon.ChatBubble width={11} height={11} />
                    <span>{notif.commentsCount} komentar</span>
                  </span>

                  <span
                    className={
                      "inline-flex items-center gap-1 text-[11px] font-semibold transition-transform group-hover:translate-x-0.5 " +
                      (isLight ? "text-zinc-500 group-hover:text-blue-600" : "text-zinc-400 group-hover:text-blue-400")
                    }
                  >
                    <span>Buka Kartu</span>
                    <Icon.ArrowRight width={9} height={9} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div
        className={
          "px-4 py-2 border-t text-[11px] flex items-center justify-between " +
          (isLight ? "border-slate-200/50 bg-slate-50/60 text-zinc-500" : "border-zinc-800/40 bg-zinc-900/60 text-zinc-400")
        }
      >
        <span>💡 Klik kartu untuk langsung membuka detail & membalas</span>
        {notifications.length > 0 && (
          <span className="font-semibold">{notifications.length} kartu aktif</span>
        )}
      </div>
    </div>
  );
}
