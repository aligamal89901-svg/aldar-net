import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Package, CheckCircle2, XCircle, Clock, Trash2, Eye, EyeOff, Copy, Check, RefreshCw } from "lucide-react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

const CACHE_KEY = "aldar-purchase-history-cache";
const STATUS_META = {
  pending: { label: "قيد المراجعة", Icon: Clock, cls: "text-amber-500 bg-amber-50 border-amber-200" },
  approved: { label: "تمت الموافقة", Icon: CheckCircle2, cls: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: "مرفوض", Icon: XCircle, cls: "text-red-500 bg-red-50 border-red-200" },
};

function getCache() {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function PurchaseHistory({ onBack, plans }) {
  const [requests, setRequests] = useState(getCache);
  const [hiddenCodes, setHiddenCodes] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db, "purchaseRequests"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRequests(data);
      setCache(data);
    });
  }, []);

  const getPlan = (planId) => plans.find((p) => p.id === planId);

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

  const removeRequest = async (id) => {
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "purchaseRequests", id));
      const updated = requests.filter((r) => r.id !== id);
      setRequests(updated);
      setCache(updated);
    } catch {}
    setDeleting(null);
  };

  const canDelete = (status) => status === "approved" || status === "rejected";

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-ink/8 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.97]">
          <ArrowRight size={15} /> رجوع
        </button>
        <div className="text-base font-extrabold text-ink">طلباتي</div>
        <button onClick={() => window.location.reload()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition active:scale-[0.95]">
          <RefreshCw size={16} />
        </button>
      </div>

      {requests.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 py-12 text-center">
          <Package size={40} className="text-brand" />
          <div className="text-sm font-bold text-ink">لا توجد طلبات شراء بعد</div>
          <div className="text-xs text-muted">طلباتك ستظهر هنا أولًا بأول</div>
        </motion.div>
      ) : (
        <section className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {requests.map((r) => {
              const plan = getPlan(r.planId);
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              const StatusIcon = meta.Icon;
              const isHidden = hiddenCodes[r.id];
              const isDeleting = deleting === r.id;
              return (
                <motion.div key={r.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`overflow-hidden rounded-2xl border-2 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)] ${meta.cls.split(" ").find((c) => c.startsWith("border-"))}`}>
                  <div className={`flex items-center justify-between border-b px-4 py-3 ${meta.cls.split(" ").slice(1).join(" ")}`}>
                    <div className="flex items-center gap-2">
                      <StatusIcon size={16} />
                      <span className="text-xs font-extrabold">{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(r.createdAt || 0).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                      {canDelete(r.status) ? (
                        <button onClick={() => removeRequest(r.id)} disabled={isDeleting} className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 transition active:scale-[0.95] disabled:opacity-40">
                          <Trash2 size={13} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-base font-extrabold text-ink">
                          {plan
                            ? `${plan.price} ريال — ${plan.gb} قيقا — ${plan.days || ""}`
                            : r.planPrice
                              ? `${r.planPrice} ريال`
                              : "فئة غير محددة"}
                        </div>
                        {r.note ? <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[10px] leading-5 text-muted">ملاحظة: {r.note}</div> : null}
                      </div>
                    </div>

                    {r.status === "approved" && r.cardCode ? (
                      <div className="mt-3 rounded-xl bg-green-50 p-3">
                        <div className="flex items-center justify-between mb-2">
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
                        <div dir="ltr" className="relative mt-1 text-lg font-extrabold tracking-wider text-ink select-all">
                          <span className={isHidden ? "blur-[6px] select-none" : ""}>
                            {r.cardCode}
                          </span>
                          {isHidden ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm font-bold text-green-600/60">اضغط العين للإظهار</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {r.status === "rejected" ? (
                      <div className="mt-3 rounded-xl bg-red-50 p-3 text-[11px] leading-5 text-red-600">
                        تم رفض طلبك. إذا كنت تعتقد أن هذا خطأ، تواصل مع الإدارة عبر صفحة التواصل.
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </section>
      )}
    </main>
  );
}

export default PurchaseHistory;