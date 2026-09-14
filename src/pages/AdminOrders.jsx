import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, CheckCircle2, XCircle, Clock, Package, AlertCircle, RefreshCw, Trash2, X, Maximize2 } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc, runTransaction, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

const STATUS_META = {
  pending: { label: "قيد المراجعة", Icon: Clock, cls: "text-amber-500 bg-amber-50 border-amber-200" },
  approved: { label: "تمت الموافقة", Icon: CheckCircle2, cls: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: "مرفوض", Icon: XCircle, cls: "text-red-500 bg-red-50 border-red-200" },
};

function AdminOrders({ onBack }) {
  const [requests, setRequests] = useState([]);
  const [plans, setPlans] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState("");
  const [viewReceipt, setViewReceipt] = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db, "purchaseRequests"), (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "plans"), (snap) => {
      setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const getPlan = (planId) => plans.find((p) => p.id === planId);

  const approveRequest = async (req) => {
    setProcessing(req.id);
    setError("");
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

        transaction.delete(cardRef);

        transaction.update(reqRef, {
          status: "approved",
          cardCode: cardDoc.code,
          cardId: cardDoc.id,
          approvedAt: Date.now(),
        });
      });
    } catch (err) {
      setError(err.message || "تعذر الموافقة على الطلب");
    }
    setProcessing(null);
  };

  const rejectRequest = async (req) => {
    setProcessing(req.id);
    setError("");
    try {
      await updateDoc(doc(db, "purchaseRequests", req.id), {
        status: "rejected",
        rejectedAt: Date.now(),
      });
    } catch (err) {
      setError("تعذر رفض الطلب");
    }
    setProcessing(null);
  };

  const deleteRequest = async (req) => {
    if (!confirm(`حذف طلب "${req.name}" نهائيًا؟`)) return;
    setProcessing(req.id);
    setError("");
    try {
      await deleteDoc(doc(db, "purchaseRequests", req.id));
    } catch (err) {
      setError("تعذر حذف الطلب");
    }
    setProcessing(null);
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-ink/8 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.97]">
          <ArrowRight size={15} /> رجوع
        </button>
        <div className="text-base font-extrabold text-ink">طلبات الشراء</div>
        <span className="w-16" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center justify-between rounded-2xl border border-brand/15 bg-gradient-to-l from-brand/5 to-white p-4">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-brand" />
          <div>
            <div className="text-sm font-extrabold text-ink">{pendingCount} طلب قيد المراجعة</div>
            <div className="text-[10px] text-muted">من أصل {requests.length} طلب إجمالي</div>
          </div>
        </div>
        <button onClick={() => window.location.reload()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition active:scale-[0.95]">
          <RefreshCw size={16} />
        </button>
      </motion.div>

      {error ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-500">
          <AlertCircle size={14} /> {error}
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
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              const StatusIcon = meta.Icon;
              const isProcessing = processing === r.id;
              const canDelete = r.status === "approved" || r.status === "rejected";
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
                      {canDelete ? (
                        <button onClick={() => deleteRequest(r)} disabled={isProcessing} className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 transition active:scale-[0.95] disabled:opacity-40">
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
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                          <span>👤 {r.name}</span>
                          <span dir="ltr">📱 {r.phone}</span>
                        </div>
                        {r.note ? <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[10px] leading-5 text-muted">ملاحظة: {r.note}</div> : null}
                      </div>
                    </div>

                    {/* سند الدفع — قابل للضغط */}
                    {r.receipt ? (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-[10px] font-bold text-muted">سند الدفع</div>
                          <button
                            onClick={() => setViewReceipt(r)}
                            className="flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-1 text-[10px] font-bold text-brand transition active:scale-[0.95]"
                          >
                            <Maximize2 size={10} />
                            عرض بالحجم الكامل
                          </button>
                        </div>
                        <button
                          onClick={() => setViewReceipt(r)}
                          className="w-full overflow-hidden rounded-xl border border-ink/10 transition active:scale-[0.98]"
                        >
                          {r.receiptType === "application/pdf" ? (
                            <div className="flex items-center gap-3 bg-red-50 p-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-red-600">{r.receiptName || "ملف PDF"}</div>
                                <div className="text-[10px] text-red-400">اضغط للعرض بالحجم الكامل</div>
                              </div>
                            </div>
                          ) : (
                            <img src={`data:${r.receiptType || "image/jpeg"};base64,${r.receipt}`} alt="سند" className="max-h-32 w-full object-contain bg-white" />
                          )}
                        </button>
                      </div>
                    ) : null}

                    {r.status === "approved" && r.cardCode ? (
                      <div className="mt-3 rounded-xl bg-green-50 p-3">
                        <div className="text-[10px] font-bold text-green-700">الكرت المسحوب</div>
                        <div dir="ltr" className="mt-1 text-lg font-extrabold tracking-wider text-ink">{r.cardCode}</div>
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

      {/* شاشة عرض السند بالحجم الكامل */}
      <AnimatePresence>
        {viewReceipt ? (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewReceipt(null)} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-ink/8 px-4 py-3">
                <div className="text-sm font-extrabold text-ink">سند الدفع — {viewReceipt.name}</div>
                <button onClick={() => setViewReceipt(null)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 transition active:scale-[0.95]">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50">
                {viewReceipt.receiptType === "application/pdf" ? (
                  <iframe
                    src={`data:application/pdf;base64,${viewReceipt.receipt}`}
                    className="w-full h-full rounded-xl border border-ink/10"
                    title="سند PDF"
                  />
                ) : (
                  <img
                    src={`data:${viewReceipt.receiptType || "image/jpeg"};base64,${viewReceipt.receipt}`}
                    alt="سند الدفع"
                    className="max-w-full max-h-full object-contain rounded-xl"
                  />
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

export default AdminOrders;