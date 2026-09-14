import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, CheckCircle2, XCircle, Clock, Users, AlertCircle, RefreshCw, Trash2, CreditCard, Plus, Minus } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";

const STATUS_META = {
  pending: { label: "قيد المراجعة", Icon: Clock, cls: "text-amber-500 bg-amber-50 border-amber-200" },
  approved: { label: "مفعّل", Icon: CheckCircle2, cls: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: "مرفوض", Icon: XCircle, cls: "text-red-500 bg-red-50 border-red-200" },
};

function AdminClients({ onBack }) {
  const [requests, setRequests] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("pending");
  const [showTopUp, setShowTopUp] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpPrice, setTopUpPrice] = useState("");

  useEffect(() => {
    return onSnapshot(collection(db, "clientRequests"), (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
  }, []);

  const approveClient = async (req) => {
    setProcessing(req.id);
    setError("");
    try {
      // إنشاء حساب Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, req.email, req.password);
      const uid = userCredential.user.uid;

      // تحديث الطلب في Firestore
      await updateDoc(doc(db, "clientRequests", req.id), {
        status: "approved",
        uid: uid,
        approvedAt: Date.now(),
        balance: 0,
      });

      // تسجيل الخروج من حساب العميل والرجوع لحساب المدير
      await auth.signOut();
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("البريد الإلكتروني مستخدم مسبقًا");
      } else {
        setError(err.message || "تعذر إنشاء الحساب");
      }
    }
    setProcessing(null);
  };

  const rejectClient = async (req) => {
    setProcessing(req.id);
    setError("");
    try {
      await updateDoc(doc(db, "clientRequests", req.id), {
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
    try {
      await deleteDoc(doc(db, "clientRequests", req.id));
    } catch {}
    setProcessing(null);
  };

  const topUpClient = async (req) => {
    const amount = Number(topUpAmount);
    const price = Number(topUpPrice);
    if (!amount || amount <= 0) {
      setError("أدخل مبلغ صالح");
      return;
    }
    setProcessing(req.id);
    setError("");
    try {
      const newBalance = (req.balance || 0) + amount;
      await updateDoc(doc(db, "clientRequests", req.id), {
        balance: newBalance,
        lastTopUp: Date.now(),
        lastTopUpAmount: amount,
        lastTopUpPrice: price || 0,
      });
      setShowTopUp(null);
      setTopUpAmount("");
      setTopUpPrice("");
    } catch (err) {
      setError("تعذر شحن الرصيد");
    }
    setProcessing(null);
  };

  const deductBalance = async (req) => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) {
      setError("أدخل مبلغ صالح");
      return;
    }
    if (amount > (req.balance || 0)) {
      setError("المبلغ أكبر من الرصيد المتوفر");
      return;
    }
    setProcessing(req.id);
    setError("");
    try {
      const newBalance = (req.balance || 0) - amount;
      await updateDoc(doc(db, "clientRequests", req.id), {
        balance: newBalance,
        lastDeduct: Date.now(),
        lastDeductAmount: amount,
      });
      setShowTopUp(null);
      setTopUpAmount("");
      setTopUpPrice("");
    } catch (err) {
      setError("تعذر خصم الرصيد");
    }
    setProcessing(null);
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  const filteredRequests = requests.filter((r) => r.status === tab);

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-ink/8 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.97]">
          <ArrowRight size={15} /> رجوع
        </button>
        <div className="text-base font-extrabold text-ink">إدارة العملاء</div>
        <span className="w-16" />
      </div>

      {/* إحصائيات */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 p-4 text-center">
          <div className="text-2xl font-extrabold text-amber-600">{pendingCount}</div>
          <div className="text-[10px] text-muted mt-1">قيد المراجعة</div>
        </div>
        <div className="rounded-2xl border border-green-500/20 bg-green-50/50 p-4 text-center">
          <div className="text-2xl font-extrabold text-green-600">{approvedCount}</div>
          <div className="text-[10px] text-muted mt-1">عميل مفعّل</div>
        </div>
      </motion.div>

      {/* تبويبات */}
      <div className="mb-4 flex gap-2 rounded-2xl border border-brand/15 bg-gradient-to-l from-brand/5 to-white p-1.5">
        {[
          { key: "pending", label: "قيد المراجعة", count: pendingCount },
          { key: "approved", label: "المفعّلين", count: approvedCount },
          { key: "rejected", label: "المرفوضين", count: requests.filter((r) => r.status === "rejected").length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold transition active:scale-[0.97] ${
              tab === t.key
                ? "bg-gradient-to-l from-brand to-brand-2 text-white shadow-[0_6px_16px_rgba(8,145,178,0.3)]"
                : "border border-brand/15 bg-white text-muted"
            }`}
          >
            {t.label}
            {t.count > 0 ? (
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                tab === t.key ? "bg-white/20 text-white" : "bg-brand/10 text-brand"
              }`}>
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-500">
          <AlertCircle size={14} /> {error}
        </motion.div>
      ) : null}

      {filteredRequests.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 py-12 text-center">
          <Users size={40} className="text-brand" />
          <div className="text-sm font-bold text-ink">لا توجد طلبات في هذا القسم</div>
        </motion.div>
      ) : (
        <section className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {filteredRequests.map((r) => {
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              const StatusIcon = meta.Icon;
              const isProcessing = processing === r.id;
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
                        <div className="text-base font-extrabold text-ink">{r.name}</div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                          <span dir="ltr">📱 {r.phone}</span>
                          <span dir="ltr">📧 {r.email}</span>
                        </div>
                        {r.status === "approved" ? (
                          <div className="mt-2 flex items-center gap-2">
                            <CreditCard size={14} className="text-brand" />
                            <span className="text-sm font-extrabold text-brand">{r.balance || 0} ريال</span>
                            <span className="text-[10px] text-muted">رصيد متاح</span>
                          </div>
                        ) : null}
                      </div>
                      {(r.status === "approved" || r.status === "rejected") ? (
                        <button onClick={() => deleteRequest(r)} disabled={isProcessing} className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 transition active:scale-[0.95] disabled:opacity-40">
                          <Trash2 size={13} />
                        </button>
                      ) : null}
                    </div>

                    {/* أزرار الشحن للمفعّلين */}
                    {r.status === "approved" && showTopUp === r.id ? (
                      <div className="mt-3 rounded-xl border border-brand/15 bg-brand/5 p-3">
                        <div className="text-[10px] font-bold text-brand mb-2">شحن / خصم رصيد</div>
                        <div className="flex gap-2 mb-2">
                          <input type="number" placeholder="المبلغ" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="flex-1 rounded-lg border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none" />
                          <input type="number" placeholder="سعر الشراء" value={topUpPrice} onChange={(e) => setTopUpPrice(e.target.value)} className="flex-1 rounded-lg border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => topUpClient(r)} disabled={isProcessing} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-500 py-2 text-xs font-bold text-white transition active:scale-[0.97] disabled:opacity-40">
                            <Plus size={12} /> شحن
                          </button>
                          <button onClick={() => deductBalance(r)} disabled={isProcessing} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-500 py-2 text-xs font-bold text-white transition active:scale-[0.97] disabled:opacity-40">
                            <Minus size={12} /> خصم
                          </button>
                          <button onClick={() => { setShowTopUp(null); setTopUpAmount(""); setTopUpPrice(""); }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-ink/10 text-muted transition active:scale-[0.95]">
                            <XCircle size={14} />
                          </button>
                        </div>
                      </div>
                    ) : r.status === "approved" ? (
                      <div className="mt-3">
                        <button onClick={() => { setShowTopUp(r.id); setTopUpAmount(""); setTopUpPrice(""); }} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand/20 bg-brand/5 py-2.5 text-xs font-bold text-brand transition active:scale-[0.97]">
                          <CreditCard size={14} /> شحن / خصم رصيد
                        </button>
                      </div>
                    ) : null}

                    {/* أزرار الموافقة/الرفض */}
                    {r.status === "pending" ? (
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => rejectClient(r)} disabled={isProcessing} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-500 transition active:scale-[0.97] disabled:opacity-40">
                          <XCircle size={14} />
                          {isProcessing ? "جارٍ..." : "رفض"}
                        </button>
                        <button onClick={() => approveClient(r)} disabled={isProcessing} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-green-500 to-green-600 py-2.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(34,197,94,0.3)] transition active:scale-[0.97] disabled:opacity-40">
                          <CheckCircle2 size={14} />
                          {isProcessing ? "جارٍ التفعيل..." : "موافقة وتفعيل"}
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
    </main>
  );
}

export default AdminClients;