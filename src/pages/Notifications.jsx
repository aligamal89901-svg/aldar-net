import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Inbox, Trash2, Megaphone, Wrench, Gift, AlertTriangle, ShoppingCart, CheckCircle2, XCircle, Clock, Package, AlertCircle, RefreshCw, Eye, EyeOff, Copy, Check } from "lucide-react";
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
import {
  getBroadcasts,
  dismissBroadcast,
  dismissAllBroadcasts,
  markBroadcastsRead,
} from "../utils/broadcasts";
import { collection, onSnapshot, doc, updateDoc, runTransaction, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";

const KIND_META = {
  general: { label: "عام", Icon: Megaphone, cls: "bg-brand/10 text-brand" },
  maintenance: { label: "صيانة", Icon: Wrench, cls: "bg-amber-500/15 text-amber-600" },
  offer: { label: "عرض", Icon: Gift, cls: "bg-green-500/15 text-green-600" },
  alert: { label: "تنبيه", Icon: AlertTriangle, cls: "bg-red-500/15 text-red-500" },
};

const ORDER_STATUS_META = {
  pending: { label: "قيد المراجعة", Icon: Clock, cls: "text-amber-500 bg-amber-50 border-amber-200" },
  approved: { label: "تمت الموافقة", Icon: CheckCircle2, cls: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: "مرفوض", Icon: XCircle, cls: "text-red-500 bg-red-50 border-red-200" },
};

function Notifications({ onBack }) {
  const [local, setLocal] = useState(getNotifications);
  const [broadcasts, setBroadcasts] = useState(getBroadcasts);
  const [tab, setTab] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [requests, setRequests] = useState([]);
  const [plans, setPlans] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [orderError, setOrderError] = useState("");
  const [hiddenCodes, setHiddenCodes] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAdmin(!!user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(collection(db, "purchaseRequests"), (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
  }, [isAdmin]);

  useEffect(() => {
    return onSnapshot(collection(db, "plans"), (snap) => {
      setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const refresh = () => {
    setLocal(getNotifications());
    setBroadcasts(getBroadcasts());
  };

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("aldar-notifications-changed", handler);
    window.addEventListener("aldar-broadcasts-changed", handler);
    markAllRead();
    markBroadcastsRead();
    window.dispatchEvent(new CustomEvent("aldar-notifications-changed"));
    return () => {
      window.removeEventListener("aldar-notifications-changed", handler);
      window.removeEventListener("aldar-broadcasts-changed", handler);
    };
  }, []);

  const items = [
    ...local.map((n) => ({ source: "local", id: n.id, title: n.title, body: n.body, time: n.time, kind: null })),
    ...broadcasts.map((b) => ({ source: "bc", id: b.id, title: b.title, body: b.body, time: b.createdAt || 0, kind: b.kind || "general" })),
  ].sort((a, b) => b.time - a.time);

  const hasItems = items.length > 0;
  const pendingOrders = requests.filter((r) => r.status === "pending").length;

  const clearAll = () => {
    clearNotifications();
    dismissAllBroadcasts(broadcasts.map((b) => b.id));
    refresh();
  };

  const removeOne = (item) => {
    if (item.source === "local") deleteNotification(item.id);
    else dismissBroadcast(item.id);
    refresh();
  };

  const getPlan = (planId) => plans.find((p) => p.id === planId);

  const approveRequest = async (req) => {
    setProcessing(req.id);
    setOrderError("");
    try {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "purchaseRequests", req.id);
        const reqSnap = await transaction.get(reqRef);
        if (!reqSnap.exists()) throw new Error("الطلب غير موجود");
        const reqData = reqSnap.data();
        if (reqData.status !== "pending") throw new Error("الطلب تم معالجته مسبقًا");

        const cardsSnap = await getDocs(collection(db, "availableCards"));
        const availableCards = cardsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((c) => c.status === "available" && c.planId === reqData.planId)
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        if (availableCards.length === 0) throw new Error("لا توجد كروت متوفرة لهذه الفئة في المخزون");

        const cardDoc = availableCards[0];
        const cardRef = doc(db, "availableCards", cardDoc.id);
        const cardSnap = await transaction.get(cardRef);
        if (cardSnap.data().status !== "available") throw new Error("الكرت تم سحبه مسبقًا");

        transaction.update(cardRef, { status: "sold", soldTo: req.id, soldAt: Date.now() });
        transaction.update(reqRef, {
          status: "approved",
          cardCode: cardDoc.code,
          cardId: cardDoc.id,
          approvedAt: Date.now(),
        });
      });
    } catch (err) {
      setOrderError(err.message || "تعذر الموافقة على الطلب");
    }
    setProcessing(null);
  };

  const rejectRequest = async (req) => {
    setProcessing(req.id);
    setOrderError("");
    try {
      await updateDoc(doc(db, "purchaseRequests", req.id), {
        status: "rejected",
        rejectedAt: Date.now(),
      });
    } catch (err) {
      setOrderError("تعذر رفض الطلب");
    }
    setProcessing(null);
  };

  const toggleCodeVisibility = (id) => {
    setHiddenCodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCode = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {}
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

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
          {hasItems || (isAdmin && requests.length > 0) ? <LottieIcon data={notifyFullAnim} className="h-7 w-7" /> : null}
          الإشعارات
        </div>

        <div className="flex justify-end">
          {hasItems && tab === "all" ? (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-500 transition active:scale-[0.97]"
            >
              <Trash2 size={14} />
              مسح الكل
            </button>
          ) : null}
        </div>
      </div>

      {isAdmin ? (
        <div className="mb-4 flex gap-2 rounded-2xl border border-brand/15 bg-gradient-to-l from-brand/5 to-white p-1.5">
          <button
            onClick={() => setTab("all")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold transition active:scale-[0.97] ${
              tab === "all"
                ? "bg-gradient-to-l from-brand to-brand-2 text-white shadow-[0_6px_16px_rgba(8,145,178,0.3)]"
                : "border border-brand/15 bg-white text-muted"
            }`}
          >
            <Megaphone size={14} />
            الإشعارات
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold transition active:scale-[0.97] ${
              tab === "orders"
                ? "bg-gradient-to-l from-amber-500 to-amber-600 text-white shadow-[0_6px_16px_rgba(245,158,11,0.3)]"
                : "border border-amber-500/15 bg-white text-muted"
            }`}
          >
            <ShoppingCart size={14} />
            طلبات الشراء
            {pendingOrders > 0 ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {pendingOrders}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {tab === "orders" && isAdmin ? (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center justify-between rounded-2xl border border-brand/15 bg-gradient-to-l from-brand/5 to-white p-4">
            <div className="flex items-center gap-3">
              <Package size={24} className="text-brand" />
              <div>
                <div className="text-sm font-extrabold text-ink">{pendingOrders} طلب قيد المراجعة</div>
                <div className="text-[10px] text-muted">من أصل {requests.length} طلب إجمالي</div>
              </div>
            </div>
            <button onClick={() => window.location.reload()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition active:scale-[0.95]">
              <RefreshCw size={16} />
            </button>
          </motion.div>

          {orderError ? (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-500">
              <AlertCircle size={14} /> {orderError}
            </motion.div>
          ) : null}

          {requests.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 py-12 text-center">
              <Package size={40} className="text-brand" />
              <div className="text-sm font-bold text-ink">لا توجد طلبات شراء بعد</div>
              <div className="text-xs text-muted">طلبات العملاء ستظهر هنا أولًا بأول</div>
            </motion.div>
          ) : (
            <section className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {requests.map((r) => {
                  const plan = getPlan(r.planId);
                  const meta = ORDER_STATUS_META[r.status] || ORDER_STATUS_META.pending;
                  const StatusIcon = meta.Icon;
                  const isProcessing = processing === r.id;
                  const isHidden = hiddenCodes[r.id];
                  return (
                    <motion.div key={r.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`overflow-hidden rounded-2xl border-2 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)] ${meta.cls.split(" ").find((c) => c.startsWith("border-"))}`}>
                      <div className={`flex items-center justify-between border-b px-4 py-3 ${meta.cls.split(" ").slice(1).join(" ")}`}>
                        <div className="flex items-center gap-2">
                          <StatusIcon size={16} />
                          <span className="text-xs font-extrabold">{meta.label}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {new Date(r.createdAt || 0).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-base font-extrabold text-ink">{plan ? `${plan.price} ريال — ${plan.gb} قيقا` : "فئة غير معروفة"}</div>
                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                              <span>👤 {r.name}</span>
                              <span dir="ltr">📱 {r.phone}</span>
                            </div>
                            {r.note ? <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[10px] leading-5 text-muted">ملاحظة: {r.note}</div> : null}
                          </div>
                        </div>

                        {r.receipt ? (
                          <div className="mt-3">
                            <div className="text-[10px] font-bold text-muted mb-1.5">سند الدفع</div>
                            <div className="overflow-hidden rounded-xl border border-ink/10">
                              <img src={`data:${r.receiptType || "image/jpeg"};base64,${r.receipt}`} alt="سند" className="max-h-32 w-full object-contain bg-white" />
                            </div>
                          </div>
                        ) : null}

                        {r.status === "approved" && r.cardCode ? (
                          <div className="mt-3 rounded-xl bg-green-50 p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] font-bold text-green-700">الكرت المسحوب</div>
                              <div className="flex gap-1.5">
                                <button onClick={() => toggleCodeVisibility(r.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-green-600 transition active:scale-[0.95]">
                                  {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <button onClick={() => copyCode(r.cardCode, r.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-green-600 transition active:scale-[0.95]">
                                  {copiedId === r.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                            </div>
                            <div dir="ltr" className={`mt-1 text-lg font-extrabold tracking-wider ${isHidden ? "text-transparent select-none" : "text-ink"}`}>
                              {isHidden ? "••••••••" : r.cardCode}
                            </div>
                          </div>
                        ) : null}

                        {r.status === "pending" ? (
                          <div className="mt-4 flex gap-2">
                            <button onClick={() => rejectRequest(r)} disabled={isProcessing} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-500 transition active:scale-[0.97] disabled:opacity-40">
                              <XCircle size={14} />
                              {isProcessing ? "جارٍ..." : "رفض"}
                            </button>
                            <button onClick={() => approveRequest(r)} disabled={isProcessing} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-green-500 to-green-600 py-2.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(34,197,94,0.3)] transition active:scale-[0.97] disabled:opacity-40">
                              <CheckCircle2 size={14} />
                              {isProcessing ? "جارٍ السحب..." : "موافقة وسحب كرت"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </section>
          )}
        </>
      ) : (
        <>
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
                {items.map((n) => {
                  const meta = n.kind ? KIND_META[n.kind] || KIND_META.general : null;
                  const Icon = meta ? meta.Icon : Inbox;
                  const iconCls = meta ? meta.cls : "bg-brand/10 text-brand";

                  return (
                    <motion.div
                      key={n.source + "-" + n.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 60 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="flex gap-3 rounded-2xl border border-ink/8 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                    >
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                        <Icon size={17} />
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-ink">{n.title}</div>
                          {meta ? (
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${meta.cls}`}>
                              {meta.label}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs leading-6 text-muted">{n.body}</div>
                        <div className="mt-1.5 text-[10px] font-semibold text-slate-400">
                          {relativeTime(n.time)}
                          {n.source === "bc" ? " · من الإدارة" : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => removeOne(n)}
                        className="self-start text-slate-300 transition hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default Notifications;