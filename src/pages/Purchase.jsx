import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowRight, CheckCircle2, AlertCircle, ChevronDown, X, Package, 
  AlertTriangle, FileText, Loader2, ShieldCheck, Clock, Brain, Zap 
} from "lucide-react";
import { 
  collection, addDoc, onSnapshot, getDocs, doc, 
  runTransaction, setDoc 
} from "firebase/firestore";
import { db } from "../firebase";
import { extractTextFromFile, extractReceiptData, validateReceipt } from "../utils/receiptOCR";

function Purchase({ onBack, plans }) {
  const [form, setForm] = useState({ name: "", phone: "", planId: "", note: "" });
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [stock, setStock] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [processResult, setProcessResult] = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db, "availableCards"), (snap) => {
      const counts = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === "available" && data.planId) {
          counts[data.planId] = (counts[data.planId] || 0) + 1;
        }
      });
      setStock(counts);
    });
  }, []);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");
    setProcessResult(null);
  };

  const selectedPlan = plans.find((p) => p.id === form.planId);
  const selectedStock = form.planId ? (stock[form.planId] || 0) : 0;

  const submit = async () => {
    if (!form.name || !form.phone || !form.planId || !file) {
      setError("أكمل كل الحقول وأرفق سند الدفع");
      return;
    }

    setError("");
    setIsProcessing(true);
    setProcessResult(null);
    setProcessStep("reading");

    try {
      // 1) فحص المخزون
      const cardsSnap = await getDocs(collection(db, "availableCards"));
      const available = cardsSnap.docs.filter((d) => {
        const data = d.data();
        return data.status === "available" && data.planId === form.planId;
      });

      if (available.length === 0) {
        setError("عذرًا، نفد مخزون هذه الفئة حاليًا.");
        setIsProcessing(false);
        return;
      }

      // 2) قراءة السند عبر السيرفر
      const serverResult = await extractTextFromFile(file);

      // 3) إذا لم يكن PDF نصي → مراجعة يدوية
      if (!serverResult.ok) {
        setProcessStep("manual_review");
        const base64 = await fileToBase64(file);
        const reason = 
          serverResult.reason === "not_pdf" ? "الصور تحتاج مراجعة يدوية — ارفع PDF من تطبيق البنك" :
          serverResult.reason === "scanned_pdf" ? "الـ PDF ممسوح ضوئياً — يحتاج مراجعة يدوية" :
          "تعذر قراءة الملف — تم إرساله للمدير";
        
        await addDoc(collection(db, "purchaseRequests"), {
          name: form.name, phone: form.phone, planId: form.planId, note: form.note,
          receipt: base64, receiptName: file.name, receiptType: file.type,
          status: "pending", createdAt: Date.now(),
          needsManualReview: true, reviewReason: reason,
        });
        
        setProcessResult({ status: "manual_review", reason, extracted: null, validation: null });
        setDone(true);
        setIsProcessing(false);
        return;
      }

      // 4) استخراج + تحقق
      setProcessStep("extracting");
      const extracted = extractReceiptData(serverResult.text);
      
      setProcessStep("validating");
      const validation = validateReceipt(extracted, selectedPlan ? Number(selectedPlan.price) : null);

      // 5) منع تكرار رقم الإشعار
      if (extracted.notificationNumber) {
        const usedSnap = await getDocs(collection(db, "usedNotifications"));
        const isUsed = usedSnap.docs.some((d) => d.data().notificationNumber === extracted.notificationNumber);
        if (isUsed) {
          setProcessResult({
            status: "rejected",
            reason: "رقم الإشعار هذا تم استخدامه مسبقًا",
            extracted, validation
          });
          setDone(true);
          setIsProcessing(false);
          return;
        }
      }

      // 6) اتخاذ القرار
      if (validation.isValid) {
        setProcessStep("approving");
        const sortedAvailable = available.sort((a, b) => (a.data().createdAt || 0) - (b.data().createdAt || 0));
        const cardDoc = sortedAvailable[0];
        const cardData = cardDoc.data();

        const base64 = await fileToBase64(file);
        const reqRef = await addDoc(collection(db, "purchaseRequests"), {
          name: form.name, phone: form.phone, planId: form.planId, note: form.note,
          receipt: base64, receiptName: file.name, receiptType: file.type,
          status: "pending", createdAt: Date.now(),
        });

        await runTransaction(db, async (tx) => {
          tx.delete(doc(db, "availableCards", cardDoc.id));
          tx.update(reqRef, {
            status: "approved", cardCode: cardData.code, cardId: cardDoc.id,
            approvedAt: Date.now(), autoApproved: true, extractedData: extracted,
          });
          if (extracted.notificationNumber) {
            tx.set(doc(db, "usedNotifications", extracted.notificationNumber.replace(/-/g, "_")), {
              notificationNumber: extracted.notificationNumber,
              usedAt: Date.now(), customerName: form.name, customerPhone: form.phone,
              amount: extracted.amount,
            });
          }
        });

        setProcessResult({
          status: "approved", cardCode: cardData.code,
          reason: "تم التحقق من السند وسحب الكرت بنجاح",
          extracted, validation
        });
        setDone(true);
      } else {
        setProcessStep("manual_review");
        const base64 = await fileToBase64(file);
        await addDoc(collection(db, "purchaseRequests"), {
          name: form.name, phone: form.phone, planId: form.planId, note: form.note,
          receipt: base64, receiptName: file.name, receiptType: file.type,
          status: "pending", createdAt: Date.now(),
          needsManualReview: true, extractedData: extracted,
          validationErrors: validation.errors,
        });
        setProcessResult({
          status: "manual_review",
          reason: validation.errors.join(" - ") || "تعذر التحقق التلقائي",
          extracted, validation
        });
        setDone(true);
      }

      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء المعالجة: " + err.message);
      setIsProcessing(false);
    }
  };

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // --- شاشة النتائج ---
  if (done) {
    const isApproved = processResult?.status === "approved";
    const isManual = processResult?.status === "manual_review";
    const isRejected = processResult?.status === "rejected";

    return (
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-ink/8 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-sm transition active:scale-95">
            <ArrowRight size={15} /> رجوع
          </button>
          <div className="text-base font-extrabold text-ink">نتيجة الطلب</div>
          <span className="w-16" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          {isApproved ? (
            <div className="w-full rounded-3xl border border-green-500/20 bg-gradient-to-b from-green-50 to-white p-6 text-center shadow-lg">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
                <ShieldCheck size={40} />
              </div>
              <h2 className="text-xl font-black text-green-700">تمت الموافقة الفورية! ✅</h2>
              <p className="mt-2 text-sm text-muted">تم التحقق من سند الدفع وسحب الكرت تلقائيًا.</p>
              
              <div className="mt-6 rounded-2xl border-2 border-dashed border-green-300 bg-white p-4">
                <div className="text-xs font-bold text-muted uppercase tracking-wider">كود التفعيل الخاص بك</div>
                <div dir="ltr" className="mt-2 select-all text-2xl font-mono font-bold text-ink">{processResult.cardCode}</div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-right text-xs">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-slate-400">رقم الإشعار</div>
                  <div className="font-bold text-ink">{processResult.extracted?.notificationNumber || '-'}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-slate-400">المبلغ المدفوع</div>
                  <div className="font-bold text-ink">{processResult.extracted?.amount || '-'} ريال</div>
                </div>
              </div>

              <button onClick={onBack} className="mt-8 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-lg shadow-brand/20 transition active:scale-95">
                العودة للرئيسية
              </button>
            </div>
          ) : isManual ? (
            <div className="w-full rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-50 to-white p-6 text-center shadow-lg">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Clock size={40} />
              </div>
              <h2 className="text-xl font-black text-amber-700">قيد المراجعة اليدوية</h2>
              <p className="mt-2 text-sm text-muted">تم إرسال طلبك للمدير للمراجعة.</p>
              
              <div className="mt-4 rounded-xl bg-amber-100/50 p-3 text-xs text-amber-800 text-right leading-relaxed">
                <strong>السبب:</strong> {processResult.reason}
              </div>

              <button onClick={onBack} className="mt-8 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-lg shadow-brand/20 transition active:scale-95">
                العودة للرئيسية
              </button>
            </div>
          ) : (
            <div className="w-full rounded-3xl border border-red-500/20 bg-gradient-to-b from-red-50 to-white p-6 text-center shadow-lg">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle size={40} />
              </div>
              <h2 className="text-xl font-black text-red-700">تم رفض الطلب</h2>
              <p className="mt-2 text-sm text-muted">{processResult.reason}</p>
              
              <button onClick={() => { setDone(false); setProcessResult(null); setFile(null); }} className="mt-8 w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white transition active:scale-95">
                حاول مرة أخرى
              </button>
            </div>
          )}
        </motion.div>
      </main>
    );
  }

  // --- الشاشة الرئيسية ---
  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-ink/8 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-sm transition active:scale-95">
          <ArrowRight size={15} /> رجوع
        </button>
        <div className="text-base font-extrabold text-ink">شراء كرت</div>
        <span className="w-16" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-brand to-brand-2 p-[1px] shadow-lg">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Zap size={20} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">شراء ذكي وفوري ⚡</h3>
            <p className="text-[10px] text-muted leading-tight">ارفع ملف PDF من تطبيق البنك وسيتم التحقق منه وتسليمك الكرت فورًا.</p>
          </div>
        </div>
      </motion.div>

      <section className="rounded-2xl border border-ink/5 bg-white p-5 shadow-sm">
        <div className="mb-4 text-sm font-bold text-ink">1. بيانات العميل</div>
        <div className="space-y-3">
          <input type="text" placeholder="الاسم الثلاثي" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand focus:bg-white transition" />
          <input type="tel" placeholder="رقم الجوال" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand focus:bg-white transition" dir="ltr" />
        </div>

        <div className="mb-4 mt-6 text-sm font-bold text-ink">2. اختر الباقة</div>
        <button
          onClick={() => setShowPlanPicker(true)}
          className={`flex w-full items-center justify-between rounded-xl border-2 p-4 transition ${
            form.planId ? "border-brand bg-brand/5" : "border-dashed border-slate-300 bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <Package size={20} className={selectedPlan ? "text-brand" : "text-slate-400"} />
            <span className={`text-sm font-bold ${selectedPlan ? "text-brand" : "text-slate-400"}`}>
              {selectedPlan ? `${selectedPlan.price} ريال — ${selectedPlan.gb} قيقا` : "اضغط لاختيار الباقة"}
            </span>
          </div>
          {selectedPlan && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              selectedStock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
            }`}>
              {selectedStock > 0 ? `متوفر: ${selectedStock}` : "نفذت الكمية"}
            </span>
          )}
        </button>

        <div className="mb-4 mt-6 text-sm font-bold text-ink">3. سند الدفع (PDF فقط)</div>
        {!file ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition hover:border-brand hover:bg-brand/5 active:scale-[0.98]">
            <FileText size={32} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-600">اضغط لإرفاق السند</span>
            <span className="text-[10px] text-slate-400">ملفات PDF الأصلية من تطبيق البنك فقط</span>
            <input type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
          </label>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-ink">{file.name}</div>
                  <div className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <button onClick={() => setFile(null)} disabled={isProcessing} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="mt-6 rounded-xl bg-brand/5 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-brand">
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                جاري المعالجة...
              </span>
              <span>
                {processStep === 'reading' ? 'قراءة السند' : 
                 processStep === 'extracting' ? 'استخراج البيانات' : 
                 processStep === 'validating' ? 'التحقق' : 
                 processStep === 'approving' ? 'إصدار الكرت' : 
                 'مراجعة'}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand/10">
              <motion.div 
                className="h-full bg-brand"
                initial={{ width: "0%" }}
                animate={{ 
                  width: processStep === 'reading' ? "30%" : 
                         processStep === 'extracting' ? "60%" : 
                         processStep === 'validating' ? "85%" : "100%" 
                }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button 
          onClick={submit} 
          disabled={isProcessing || !form.planId || !file || (selectedPlan && selectedStock === 0)} 
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-brand to-brand-2 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          {isProcessing ? "جاري التحقق..." : <><Brain size={18} /> شراء وتحقق فوري</>}
        </button>
      </section>

      <AnimatePresence>
        {showPlanPicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPlanPicker(false)} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h3 className="text-lg font-bold text-ink">اختر الباقة</h3>
                <button onClick={() => setShowPlanPicker(false)} className="rounded-full bg-slate-100 p-2 text-slate-500"><X size={20} /></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                {plans.map((p) => {
                  const count = stock[p.id] || 0;
                  const isSelected = form.planId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setForm({ ...form, planId: p.id }); setShowPlanPicker(false); }}
                      className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-right transition ${
                        isSelected ? "border-brand bg-brand/5" : "border-slate-100 bg-white hover:border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="text-lg font-bold text-ink">{p.price} <span className="text-xs font-normal text-muted">ريال</span></div>
                        <div className="text-xs text-muted">{p.gb} قيقا • {p.days}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          count > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>
                          {count > 0 ? `متوفر: ${count}` : "غير متوفر"}
                        </span>
                        {isSelected && <CheckCircle2 size={20} className="text-brand" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

export default Purchase;