import { showAppNotification } from "./notify";

const EXPIRY_KEY = "aldar-card-expiry";
const LEAD_KEY = "aldar-reminder-lead";
const FIRED_KEY = "aldar-reminder-fired";

export function getExpiryDate() {
  try {
    return localStorage.getItem(EXPIRY_KEY) || "";
  } catch {
    return "";
  }
}

export function getLead() {
  try {
    const raw = localStorage.getItem(LEAD_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { value: 3, unit: "days" };
}

export function saveLead(lead) {
  try {
    localStorage.setItem(LEAD_KEY, JSON.stringify(lead));
  } catch {}
}

export function deadlineOf(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + "T00:00:00").getTime();
}

export function leadMs(lead) {
  const v = Math.max(0, Number(lead.value) || 0);
  return lead.unit === "hours" ? v * 3600000 : v * 86400000;
}

export function reminderDateText() {
  const deadline = deadlineOf(getExpiryDate());
  if (deadline === null) return "";
  const d = new Date(deadline - leadMs(getLead()));
  return d.toLocaleString("ar", { dateStyle: "full", timeStyle: "short" });
}

function firedKeys() {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY)) || [];
  } catch {
    return [];
  }
}

function markFired(key) {
  try {
    const keys = firedKeys();
    keys.push(key);
    localStorage.setItem(FIRED_KEY, JSON.stringify(keys.slice(-20)));
  } catch {}
}

export async function checkReminder() {
  try {
    const deadline = deadlineOf(getExpiryDate());
    if (deadline === null) return;

    const now = Date.now();
    const lead = getLead();
    const fireAt = deadline - leadMs(lead);
    const keys = firedKeys();

    if (now >= fireAt && now < deadline) {
      const key = `lead|${getExpiryDate()}|${lead.value}${lead.unit}`;
      if (!keys.includes(key)) {
        markFired(key);
        const hoursLeft = Math.max(1, Math.round((deadline - now) / 3600000));
        const label =
          hoursLeft >= 48
            ? `${Math.round(hoursLeft / 24)} يوم تقريبًا`
            : `${hoursLeft} ساعة تقريبًا`;
        await showAppNotification(
          "الدار نت ⏰",
          `اقترب انتهاء كرتك — باقي ${label}. جدّد الآن لضمان استمرار الخدمة.`
        );
      }
    }

    if (now >= deadline) {
      const key = `expired|${getExpiryDate()}`;
      if (!keys.includes(key)) {
        markFired(key);
        await showAppNotification(
          "الدار نت ⛔",
          "انتهت صلاحية كرتك — جدّد الآن من أقرب نقطة بيع."
        );
      }
    }
  } catch {}
}

let started = false;

export function startReminderScheduler() {
  if (started) return;
  started = true;
  checkReminder();
  setInterval(checkReminder, 60000);
}