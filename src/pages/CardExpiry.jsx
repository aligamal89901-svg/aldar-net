import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import LottieIcon from "../components/LottieIcon";
import { requestNotificationPermission } from "../utils/notify";
import { getLead, saveLead, reminderDateText, checkReminder } from "../utils/reminder";
import mycardHeroAnim from "../assets/lottie/mycard-hero.json";
import mycardBellAnim from "../assets/lottie/mycard-bell.json";

const STORAGE_KEY = "aldar-card-expiry";

function getSavedDate() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - today) / 86400000);
}

function Ring({ left }) {
  const total = 30;
  const clamped = left === null ? 0 : Math.max(0, Math.min(total, left));
  const ratio = clamped / total;
  const r = 52;
  const c = 2 * Math.PI * r;
  const color =
    left === null ? "#94a3b8" : left <= 0 ? "#ef4444" : left <= 3 ? "#f59e0b" : "#0891b2";

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-ink">{left === null ? "—" : left}</span>
        <span className="text-[10px] font-semibold text-muted">يوم متبقٍ</span>
      </div>
    </div>
  );
}

function CardExpiry() {
  const [date, setDate] = useState(getSavedDate);
  const [saved, setSaved] = useState(getSavedDate);
  const [lead, setLead] = useState(getLead);
  const [reminderAt, setReminderAt] = useState(reminderDateText);
  const [permission, setPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  const left = daysLeft(saved);

  const status = useMemo(() => {
    if (left === null) return { text: "لم يُحفظ تاريخ بعد", tone: "text-muted" };
    if (left < 0) return { text: "انتهت صلاحية الكرت", tone: "text-red-500" };
    if (left === 0) return { text: "ينتهي اليوم", tone: "text-red-500" };
    if (left <= 3) return { text: "اقترب الانتهاء — جهّز التجديد", tone: "text-amber-500" };
    return { text: "الكرت ساري", tone: "text-emerald-500" };
  }, [left]);

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, date);
      setSaved(date);
      setReminderAt(reminderDateText());
      checkReminder();
    } catch {}
  };

  const saveLeadSettings = () => {
    saveLead(lead);
    setReminderAt(reminderDateText());
    checkReminder();
  };

  const enable = async () => {
    const ok = await requestNotificationPermission();
    setPermission(ok ? "granted" : "denied");
  };

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <SectionTitle title="كرتي" subtitle="متابعة صلاحية الكرت والتذكير قبل الانتهاء" />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative mb-3 overflow-hidden rounded-3xl border border-brand/25 bg-gradient-to-b from-brand/10 to-white p-5 text-center"
      >
        <div className="mx-auto flex h-28 w-28 items-center justify-center">
          <LottieIcon data={mycardHeroAnim} className="h-28 w-28" />
        </div>
        <div className="mt-2 text-base font-extrabold text-ink">تابع كرتك أولًا بأول</div>
        <div className="mt-1 text-[11px] leading-6 text-muted">
          احفظ تاريخ الانتهاء وحدّد توقيت التذكير، والتطبيق يتكفل بالباقي.
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07, duration: 0.35, ease: "easeOut" }}
        className="flex items-center gap-5 rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
      >
        <Ring left={left} />
        <div className="flex-1">
          <div className="text-base font-extrabold text-ink">حالة الكرت</div>
          <div className={`mt-1 text-sm font-semibold ${status.tone}`}>{status.text}</div>
          {saved ? (
            <div className="mt-2 text-[11px] text-muted">تاريخ الانتهاء: {saved}</div>
          ) : null}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.35, ease: "easeOut" }}
        className="mt-3 rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
      >
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <CalendarCheck size={17} className="text-brand" />
          تحديث تاريخ الانتهاء
        </label>
        <div className="mt-3 flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-xl border border-ink/10 bg-slate-50 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand/40 focus:bg-white"
          />
          <button
            onClick={save}
            disabled={!date}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-40"
          >
            حفظ
          </button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.21, duration: 0.35, ease: "easeOut" }}
        className="mt-3 rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
      >
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <CalendarCheck size={17} className="text-brand" />
          توقيت التذكير
        </label>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            min="1"
            value={lead.value}
            onChange={(e) => setLead({ ...lead, value: e.target.value })}
            className="w-24 rounded-xl border border-ink/10 bg-slate-50 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand/40 focus:bg-white"
          />
          <select
            value={lead.unit}
            onChange={(e) => setLead({ ...lead, unit: e.target.value })}
            className="flex-1 rounded-xl border border-ink/10 bg-slate-50 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand/40 focus:bg-white"
          >
            <option value="days">يوم</option>
            <option value="hours">ساعة</option>
          </select>
          <button
            onClick={saveLeadSettings}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition active:scale-[0.97]"
          >
            حفظ
          </button>
        </div>
        {reminderAt ? (
          <div className="mt-2 text-[11px] text-muted">موعد وصول التذكير: {reminderAt}</div>
        ) : null}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.35, ease: "easeOut" }}
        className="mt-3 rounded-3xl border border-ink/8 bg-white p-5 text-center shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center">
          <LottieIcon data={mycardBellAnim} className="h-20 w-20" />
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-sm font-extrabold text-ink">
          تذكير الانتهاء
          {permission === "granted" ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 size={13} /> مفعّل
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs leading-6 text-muted">
          سيصلك إشعار نظام حقيقي في الموعد المحدد أعلاه، ويظهر أعلى الشاشة مثل
          إشعارات واتساب تمامًا، ويسجَّل في لوحة الإشعارات داخل التطبيق.
        </p>
        {permission !== "granted" ? (
          <button
            onClick={enable}
            className="mt-3 rounded-xl border border-brand/30 bg-brand/10 px-6 py-2.5 text-xs font-bold text-brand transition active:scale-[0.97]"
          >
            تفعيل الإشعارات
          </button>
        ) : null}
      </motion.section>
    </main>
  );
}

export default CardExpiry;