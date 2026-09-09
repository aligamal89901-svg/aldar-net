import { addNotification } from "./notifyStore";

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function showAppNotification(title, body, options = {}) {
  addNotification({ title, body });
  window.dispatchEvent(new CustomEvent("aldar-notifications-changed"));

  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  const payload = {
    body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: options.tag || "aldar-net",
    data: { url: "/#notifications" },
    ...options,
  };

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, payload);
    return true;
  } catch {
    try {
      new Notification(title, payload);
      return true;
    } catch {
      return false;
    }
  }
}