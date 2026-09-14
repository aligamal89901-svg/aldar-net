import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Upload, FileText, Image as ImageIcon, Type, CheckCircle2, AlertCircle, Trash2, Plus, Eye, Package, ChevronDown, X, FileUp, Filter } from "lucide-react";
import { collection, addDoc, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

function extractCodes(text) {
  const matches = text.match(/\b\d{4,}\b/g) || [];
  const filtered = matches.filter((code) => {
    if (/^(19|20)\d{2}$/.test(code)) return false;
    if (/^(0[1-9]|1[0-2])$/.test(code)) return false;
    if (/^(0[1-9]|[12]\d|3[01])$/.test(code)) return false;
    return true;
  });
  return [...new Set(filtered)];
}

function AdminCards({ onBack }) {
  const [mode, setMode] = useState("text");
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [extracted, setExtracted] = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [stockFilter, setStockFilter] = useState("all");

  useEffect(() => {
    return onSnapshot(collection(db, "availableCards"), (snap) => {
      setCards(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "plans"), (snap) => {
      setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.price - b.price));
    });
  }, []);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
    setExtracted([]);
  };

  const extractFromText = () => {
    if (!textInput.trim()) {
      setError("اكتب أو الصق النص الذي يحتوي على أكواد الكروت");
      return;
    }
    const codes = extractCodes(textInput);
    if (codes.length === 0) {
      setError("ما لقيت أكواد كروت صالحة (4 أرقام فأكثر)");
      return;
    }
    setExtracted(codes);
    setError("");
  };

  const extractFromFile = async () => {
    if (!file) {
      setError("ارفع ملف أولًا");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let text = "";
      if (file.type.startsWith("image/")) {
        text = await mockOCR(file);
      } else if (file.type === "application/pdf") {
        text = await mockPDFExtract(file);
      } else {
        text = await file.text();
      }
      const codes = extractCodes(text);
      if (codes.length === 0) {
        setError("ما لقيت أكواد كروت صالحة في الملف");
        setSaving(false);
        return;
      }
      setExtracted(codes);
      setSaving(false);
    } catch (err) {
      setError("تعذر قراءة الملف");
      setSaving(false);
    }
  };

  const mockOCR = async (file) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve("1234 5678 9012 3456 7890 2026 09 12"), 1500);
    });
  };

  const mockPDFExtract = async (file) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve("1234 5678 9012 3456 7890 2026 09 12"), 1500);
    });
  };

  const saveCards = async () => {
    if (extracted.length === 0) return;
    if (!selectedPlanId) {
      setError("اختر الفئة أولًا قبل الحفظ");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const plan = plans.find((p) => p.id === selectedPlanId);
      for (const code of extracted) {
        await addDoc(collection(db, "availableCards"), {
          code,
          planId: selectedPlanId,
          planPrice: plan ? plan.price : 0,
          status: "available",
          createdAt: Date.now(),
        });
      }
      setDone(true);
      setSaving(false);
      setExtracted([]);
      setTextInput("");
      setFile(null);
      setPreview("");
      setSelectedPlanId("");
    } catch (err) {
      setError("تعذر حفظ الكروت");
      setSaving(false);
    }
  };

  const removeCard = async (id) => {
    try {
      await deleteDoc(doc(db, "availableCards", id));
    } catch {}
  };

  const getPlanLabel = (planId) => {
    const p = plans.find((x) => x.id === planId);
    return p ? `${p.price} ريال — ${p.gb} قيقا` : "فئة غير معروفة";
  };

  // حساب المخزون حسب الفئة
  const stockByPlan = {};
  cards.forEach((card) => {
    if (card.status === "available" && card.planId) {
      stockByPlan[card.planId] = (stockByPlan[card.planId] || 0) + 1;
    }
  });

  const totalStock = Object.values(stockByPlan).reduce((a, b) => a + b, 0);

  const filteredPlans = plans.filter((p) => {
    const count = stockByPlan[p.id] || 0;
    if (stockFilter === "all") return true;
    if (stockFilter === "available") return count > 0;
    if (stockFilter === "empty") return count === 0;
    return true;
  });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  if (done) {
    return (
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-ink/8 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.97]">
            <ArrowRight size={15} /> رجوع
          </button>
          <div className="text-base font-extrabold text-ink">إضافة كروت</div>
          <span className="w-16" />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 rounded-3xl border border-green-500/20 bg-gradient-to-b from-white to-green-50 py-12 text-center">
          <CheckCircle2 size={56} className="text-green-500" />
          <div className="text-lg font-extrabold text-ink">تم حفظ الكروت بنجاح</div>
          <div className="text-xs leading-6 text-muted px-6">تم إضافة الكروت إلى المخزون وجاهزة للسحب.</div>
          <button onClick={() => setDone(false)} className="mt-2 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white transition active:scale-[0.97]">إضافة المزيد</button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-ink/8 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.97]">
          <ArrowRight size={15} /> رجوع
        </button>
        <div className="text-base font-extrabold text-ink">إضافة كروت للمخزون</div>
        <span className="w-16" />
      </div>

      {/* ملخص المخزون */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-2xl border border-brand/15 bg-gradient-to-l from-brand/5 to-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-brand" />
            <span className="text-sm font-extrabold text-ink">المخزون الحالي</span>
          </div>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{totalStock} كرت</span>
        </div>

        <div className="flex gap-2 mb-3">
          {[
            { key: "all", label: "الكل" },
            { key: "available", label: "متوفر" },
            { key: "empty", label: "فاضي" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStockFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${
                stockFilter === f.key ? "bg-brand text-white" : "bg-white border border-ink/10 text-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredPlans.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted">لا توجد فئات تطابق الفلتر</div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredPlans.map((p) => {
              const count = stockByPlan[p.id] || 0;
              return (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-ink/8 bg-white p-3">
                  <div>
                    <div className="text-sm font-extrabold text-ink">{p.price} ريال</div>
                    <div className="text-[10px] text-muted">{p.gb} قيقا — {p.days}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    count > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                  }`}>
                    {count > 0 ? `${count} كرت` : "فاضي"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* إضافة كروت */}
      <section className="rounded-2xl border border-brand/15 bg-gradient-to-b from-white to-brand/5 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
        <div className="text-sm font-extrabold text-ink">الفئة</div>
        <div className="mt-1 text-[10px] leading-5 text-muted">اختر الفئة اللي تنتمي لها هذه الكروت</div>

        <button
          onClick={() => setShowPlanPicker(true)}
          className={`mt-3 flex w-full items-center justify-between rounded-xl border-2 p-4 transition ${
            selectedPlanId ? "border-brand bg-brand/5" : "border-dashed border-ink/20 bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <Package size={20} className={selectedPlan ? "text-brand" : "text-muted"} />
            <span className={`text-sm font-bold ${selectedPlan ? "text-brand" : "text-muted"}`}>
              {selectedPlan ? `${selectedPlan.price} ريال — ${selectedPlan.gb} قيقا` : "اضغط لاختيار الفئة"}
            </span>
          </div>
          <ChevronDown size={18} className={selectedPlan ? "text-brand" : "text-muted"} />
        </button>

        <div className="mt-4 text-sm font-extrabold text-ink">طريقة الإدخال</div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <button onClick={() => { setMode("text"); setExtracted([]); setError(""); }} className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-[10px] font-bold transition ${mode === "text" ? "border-brand bg-brand/5 text-brand" : "border-ink/10 bg-white text-muted"}`}>
            <Type size={18} /> نص
          </button>
          <button onClick={() => { setMode("image"); setExtracted([]); setError(""); }} className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-[10px] font-bold transition ${mode === "image" ? "border-brand bg-brand/5 text-brand" : "border-ink/10 bg-white text-muted"}`}>
            <ImageIcon size={18} /> صورة
          </button>
          <button onClick={() => { setMode("pdf"); setExtracted([]); setError(""); }} className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-[10px] font-bold transition ${mode === "pdf" ? "border-brand bg-brand/5 text-brand" : "border-ink/10 bg-white text-muted"}`}>
            <FileText size={18} /> PDF
          </button>
          <button onClick={() => { setMode("auto"); setExtracted([]); setError(""); }} className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-[10px] font-bold transition ${mode === "auto" ? "border-brand bg-brand/5 text-brand" : "border-ink/10 bg-white text-muted"}`}>
            <FileUp size={18} /> شامل
          </button>
        </div>

        {mode === "text" ? (
          <div className="mt-4">
            <textarea placeholder="الصق أو اكتب النص الذي يحتوي على أكواد الكروت..." value={textInput} onChange={(e) => setTextInput(e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-brand/15 bg-brand/5 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand/40 focus:bg-white" />
            <button onClick={extractFromText} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-[0_6px_16px_rgba(8,145,178,0.3)] transition active:scale-[0.97]">
              <Eye size={16} /> استخراج الأكواد
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand/25 bg-white p-6 transition hover:border-brand/40">
              <Upload size={24} className="text-brand" />
              <span className="text-xs font-bold text-brand">{file ? file.name : mode === "auto" ? "اضغط لرفع أي ملف" : `اضغط لرفع ${mode === "image" ? "صورة" : "ملف PDF"}`}</span>
              <input type="file" accept={mode === "auto" ? "image/*,application/pdf,.txt" : mode === "image" ? "image/*" : "application/pdf"} onChange={handleFile} className="hidden" />
            </label>
            {preview && (mode === "image" || mode === "auto") && file?.type.startsWith("image/") ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-brand/15">
                <img src={preview} alt="" className="max-h-40 w-full object-contain bg-white" />
              </div>
            ) : null}
            {file ? (
              <button onClick={extractFromFile} disabled={saving} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-[0_6px_16px_rgba(8,145,178,0.3)] transition active:scale-[0.97] disabled:opacity-40">
                {saving ? "جارٍ الاستخراج…" : <><Eye size={16} /> استخراج الأكواد</>}
              </button>
            ) : null}
          </div>
        )}

        {error ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-500">
            <AlertCircle size={14} /> {error}
          </div>
        ) : null}

        {extracted.length > 0 ? (
          <div className="mt-4">
            <div className="text-sm font-extrabold text-ink">الأكواد المستخرجة ({extracted.length})</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {extracted.map((code, i) => (
                <span key={i} dir="ltr" className="rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-bold text-brand">{code}</span>
              ))}
            </div>
            <button onClick={saveCards} disabled={saving || !selectedPlanId} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-brand to-brand-2 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(8,145,178,0.3)] transition active:scale-[0.97] disabled:opacity-40">
              <Plus size={16} /> حفظ في المخزون ({extracted.length})
            </button>
          </div>
        ) : null}
      </section>

      {/* اختيار الفئة */}
      <AnimatePresence>
        {showPlanPicker ? (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPlanPicker(false)} className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-brand/20 bg-white px-5 pt-5 pb-8 shadow-[0_-16px_50px_rgba(15,23,42,0.2)]"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/10" />
              <div className="flex items-center justify-between mb-4">
                <div className="text-base font-extrabold text-ink">اختر الفئة</div>
                <button onClick={() => setShowPlanPicker(false)} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted transition active:scale-[0.95]">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {plans.map((p) => {
                  const count = stockByPlan[p.id] || 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPlanId(p.id); setShowPlanPicker(false); }}
                      className={`flex items-center justify-between rounded-xl border-2 p-4 text-right transition ${
                        selectedPlanId === p.id ? "border-brand bg-brand/5" : "border-ink/10 bg-white"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="text-base font-extrabold text-ink">{p.price} ريال</div>
                        <div className="mt-1 text-xs text-muted">{p.gb} قيقا — {p.days}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${count > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                          {count > 0 ? `${count} في المخزون` : "فاضي"}
                        </span>
                        {selectedPlanId === p.id ? <CheckCircle2 size={20} className="text-brand" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

export default AdminCards;