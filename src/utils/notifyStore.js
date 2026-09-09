const KEY = "aldar-notifications";

export function getNotifications() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function saveNotifications(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export function addNotification({ title, body }) {
  const list = getNotifications();
  list.unshift({
    id: Date.now() + Math.random().toString(16).slice(2),
    title,
    body,
    time: Date.now(),
    read: false,
  });
  saveNotifications(list.slice(0, 100));
}

export function markAllRead() {
  saveNotifications(getNotifications().map((n) => ({ ...n, read: true })));
}

export function deleteNotification(id) {
  saveNotifications(getNotifications().filter((n) => n.id !== id));
}

export function clearNotifications() {
  saveNotifications([]);
}

export function unreadCount() {
  return getNotifications().filter((n) => !n.read).length;
}

export function relativeTime(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return min === 1 ? "قبل دقيقة" : min === 2 ? "قبل دقيقتين" : `قبل ${min} دقائق`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return hours === 1 ? "قبل ساعة" : hours === 2 ? "قبل ساعتين" : `قبل ${hours} ساعات`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "قبل يوم" : days === 2 ? "قبل يومين" : `قبل ${days} أيام`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "قبل أسبوع" : weeks === 2 ? "قبل أسبوعين" : `قبل ${weeks} أسابيع`;
  const months = Math.floor(days / 30);
  return months === 1 ? "قبل شهر" : months === 2 ? "قبل شهرين" : `قبل ${months} أشهر`;
}