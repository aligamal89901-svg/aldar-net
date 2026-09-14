import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "../firebase";

const SEEN_KEY = "aldar-broadcast-seen";
const DISMISSED_KEY = "aldar-broadcast-dismissed";
const READ_KEY = "aldar-broadcast-read";

let cache = [];

function readLS(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function writeLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function getDismissed() {
  return readLS(DISMISSED_KEY, []);
}

export function dismissBroadcast(id) {
  const list = getDismissed();
  if (!list.includes(id)) {
    list.push(id);
    writeLS(DISMISSED_KEY, list.slice(-100));
  }
  window.dispatchEvent(new CustomEvent("aldar-broadcasts-changed"));
}

export function dismissAllBroadcasts(ids) {
  const list = getDismissed();
  (ids || []).forEach((id) => {
    if (!list.includes(id)) list.push(id);
  });
  writeLS(DISMISSED_KEY, list.slice(-200));
  window.dispatchEvent(new CustomEvent("aldar-broadcasts-changed"));
}

export function getBroadcasts() {
  const dismissed = getDismissed();
  return cache.filter((b) => !dismissed.includes(b.id));
}

export function broadcastUnread() {
  const readTs = readLS(READ_KEY, 0);
  return getBroadcasts().filter((b) => (b.createdAt || 0) > readTs).length;
}

export function markBroadcastsRead() {
  writeLS(READ_KEY, Date.now());
  window.dispatchEvent(new CustomEvent("aldar-broadcasts-changed"));
}

function showSystem(b) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(b.title || "إشعار من الدار نت", { body: b.body || "", tag: b.id });
    }
  } catch {}
}

export function startBroadcastListener() {
  try {
    if (localStorage.getItem(SEEN_KEY) === null) {
      writeLS(SEEN_KEY, Date.now());
    }
  } catch {}

  const q = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"), limit(30));

  return onSnapshot(
    q,
    (snap) => {
      const seen = readLS(SEEN_KEY, 0);
      let maxSeen = seen;
      const fresh = [];

      cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      cache.forEach((b) => {
        const t = b.createdAt || 0;
        if (t > seen) {
          fresh.push(b);
          if (t > maxSeen) maxSeen = t;
        }
      });

      if (maxSeen !== seen) writeLS(SEEN_KEY, maxSeen);

      if (fresh.length > 0) {
        fresh.slice().reverse().forEach(showSystem);
      }

      window.dispatchEvent(new CustomEvent("aldar-broadcasts-changed"));
    },
    () => {}
  );
}