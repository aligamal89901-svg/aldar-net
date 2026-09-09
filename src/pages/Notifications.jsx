import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Inbox, Trash2 } from "lucide-react";
import LottieIcon from "../components/LottieIcon";
import notifyEmptyAnim from "../assets/lottie/notify-empty.json";
import notifyFullAnim from "../assets/lottie/notify-full.json";
import {
  getNotifications,
  deleteNotification,
  clearNotifications,
  markAllRead,
  relativeTime,
} from "../utils/notifyStore";

function Notifications({ onBack }) {
  const [list, setList] = useState(getNotifications);

  const refresh = () => setList(getNotifications());

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("aldar-notifications-changed", handler);
    markAllRead();
    window.dispatchEvent(new CustomEvent("aldar-notifications-changed"));
    return () => window.removeEventListener("aldar-notifications-changed", handler);
  }, []);

  const hasItems = list.length > 0;

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <div className="mb-4 grid grid-cols-3 items-center">
        <div className="flex justify-start">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-ink/8 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.97]"
          >
            <ArrowRight size={15} />
            رجوع
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-base font-extrabold text-ink">
          {hasItems ? <LottieIcon data={notifyFullAnim} className="h-7 w-7" /> : null}
          الإشعارات
        </div>

        <div className="flex justify-end">
          {hasItems ? (
            <button
              onClick={() => {
                clearNotifications();
                refresh();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-500 transition active:scale-[0.97]"
            >
              <Trash2 size={14} />
              مسح الكل
            </button>
          ) : null}
        </div>
      </div>

      {!hasItems ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 py-12 text-center"
        >
          <LottieIcon data={notifyEmptyAnim} className="h-28 w-28" />
          <div className="text-sm font-bold text-ink">لا توجد إشعارات بعد</div>
          <div className="text-xs text-muted">كل تنبيه جديد سيظهر هنا أولًا بأول</div>
        </motion.div>
      ) : (
        <section className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {list.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 60 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex gap-3 rounded-2xl border border-ink/8 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Inbox size={17} />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">{n.title}</div>
                  <div className="mt-1 text-xs leading-6 text-muted">{n.body}</div>
                  <div className="mt-1.5 text-[10px] font-semibold text-slate-400">
                    {relativeTime(n.time)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    deleteNotification(n.id);
                    refresh();
                  }}
                  className="self-start text-slate-300 transition hover:text-red-400"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      )}
    </main>
  );
}

export default Notifications;