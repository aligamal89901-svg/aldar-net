import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { Plus, Trash2, Edit3, LogOut, PackageX, Gift, Package, BookOpen } from "lucide-react";

function AdminPanel({ onBack }) {
  const [tab, setTab] = useState("plans");

  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState({ price: "", gb: "", days: "", tag: "" });
  const [planEditId, setPlanEditId] = useState(null);

  const [offers, setOffers] = useState([]);
  const [offerForm, setOfferForm] = useState({ title: "", body: "", tag: "" });
  const [offerEditId, setOfferEditId] = useState(null);

  const [knowledge, setKnowledge] = useState([]);
  const [knowForm, setKnowForm] = useState({ title: "", body: "" });
  const [knowEditId, setKnowEditId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "plans"), orderBy("price", "asc"));
    return onSnapshot(q, (snap) =>
      setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, "offers"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) =>
      setOffers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "knowledge"), (snap) =>
      setKnowledge(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const savePlan = async () => {
    const data = {
      price: Number(planForm.price),
      gb: Number(planForm.gb),
      days: planForm.days,
      tag: planForm.tag,
    };
    if (planEditId) {
      await updateDoc(doc(db, "plans", planEditId), data);
      setPlanEditId(null);
    } else {
      await addDoc(collection(db, "plans"), data);
    }
    setPlanForm({ price: "", gb: "", days: "", tag: "" });
  };

  const editPlan = (p) => {
    setPlanEditId(p.id);
    setPlanForm({ price: p.price, gb: p.gb, days: p.days, tag: p.tag || "" });
    setTab("plans");
  };

  const removePlan = async (id) => {
    if (confirm("حذف هذه الفئة؟")) {
      await deleteDoc(doc(db, "plans", id));
    }
  };

  const saveOffer = async () => {
    const data = { title: offerForm.title, body: offerForm.body, tag: offerForm.tag };
    if (offerEditId) {
      await updateDoc(doc(db, "offers", offerEditId), data);
      setOfferEditId(null);
    } else {
      await addDoc(collection(db, "offers"), { ...data, createdAt: Date.now() });
    }
    setOfferForm({ title: "", body: "", tag: "" });
  };

  const editOffer = (o) => {
    setOfferEditId(o.id);
    setOfferForm({ title: o.title, body: o.body, tag: o.tag || "" });
    setTab("offers");
  };

  const removeOffer = async (id) => {
    if (confirm("حذف هذا العرض؟")) {
      await deleteDoc(doc(db, "offers", id));
    }
  };

  const saveKnow = async () => {
    const data = { title: knowForm.title, body: knowForm.body };
    if (knowEditId) {
      await updateDoc(doc(db, "knowledge", knowEditId), data);
      setKnowEditId(null);
    } else {
      await addDoc(collection(db, "knowledge"), data);
    }
    setKnowForm({ title: "", body: "" });
  };

  const editKnow = (k) => {
    setKnowEditId(k.id);
    setKnowForm({ title: k.title, body: k.body });
    setTab("knowledge");
  };

  const removeKnow = async (id) => {
    if (confirm("حذف هذه المعرفة؟")) {
      await deleteDoc(doc(db, "knowledge", id));
    }
  };

  const logout = async () => {
    await signOut(auth);
    onBack();
  };

  const inputCls =
    "rounded-xl border border-ink/10 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand/40 focus:bg-white";

  const tabBtn = (id, icon, label) => {
    const Icon = icon;
    return (
      <button
        onClick={() => setTab(id)}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold transition active:scale-[0.97] ${
          tab === id ? "bg-brand text-white" : "border border-ink/8 bg-white text-muted"
        }`}
      >
        <Icon size={14} />
        {label}
      </button>
    );
  };

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-base font-extrabold text-ink">لوحة المدير</div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-500 transition active:scale-[0.97]"
        >
          <LogOut size={14} />
          خروج
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {tabBtn("plans", Package, "الفئات")}
        {tabBtn("offers", Gift, "العروض")}
        {tabBtn("knowledge", BookOpen, "المعرفة")}
      </div>

      {tab === "plans" ? (
        <>
          <section className="rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            <div className="text-sm font-bold text-ink">
              {planEditId ? "تعديل فئة" : "إضافة فئة جديدة"}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="السعر"
                value={planForm.price}
                onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                className={inputCls}
              />
              <input
                type="number"
                placeholder="القيقا"
                value={planForm.gb}
                onChange={(e) => setPlanForm({ ...planForm, gb: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="المدة (مثل: شهر)"
                value={planForm.days}
                onChange={(e) => setPlanForm({ ...planForm, days: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="الشارة (اختياري)"
                value={planForm.tag}
                onChange={(e) => setPlanForm({ ...planForm, tag: e.target.value })}
                className={inputCls}
              />
            </div>
            <button
              onClick={savePlan}
              disabled={!planForm.price || !planForm.gb || !planForm.days}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-40"
            >
              <Plus size={16} />
              {planEditId ? "حفظ التعديل" : "إضافة"}
            </button>
            {planEditId ? (
              <button
                onClick={() => {
                  setPlanEditId(null);
                  setPlanForm({ price: "", gb: "", days: "", tag: "" });
                }}
                className="mt-2 w-full rounded-xl border border-ink/10 bg-slate-50 py-2 text-xs font-bold text-muted transition active:scale-[0.97]"
              >
                إلغاء التعديل
              </button>
            ) : null}
          </section>

          <section className="mt-4">
            <div className="mb-2 text-sm font-bold text-ink">الفئات الحالية ({plans.length})</div>
            {plans.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink/15 bg-white/60 py-10 text-center">
                <PackageX size={24} className="text-muted" />
                <div className="text-xs text-muted">لا توجد فئات بعد</div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl border border-ink/8 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-bold text-ink">
                        {p.price} ريال — {p.gb} قيقا — {p.days}
                      </div>
                      {p.tag ? (
                        <div className="mt-1 text-[10px] font-bold text-brand">{p.tag}</div>
                      ) : null}
                    </div>
                    <button
                      onClick={() => editPlan(p)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition active:scale-[0.95]"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => removePlan(p.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition active:scale-[0.95]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : tab === "offers" ? (
        <>
          <section className="rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            <div className="text-sm font-bold text-ink">
              {offerEditId ? "تعديل عرض" : "إضافة عرض جديد"}
            </div>
            <input
              type="text"
              placeholder="عنوان العرض"
              value={offerForm.title}
              onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
              className={`mt-3 w-full ${inputCls}`}
            />
            <textarea
              placeholder="تفاصيل العرض"
              value={offerForm.body}
              onChange={(e) => setOfferForm({ ...offerForm, body: e.target.value })}
              rows={3}
              className={`mt-2 w-full resize-none ${inputCls}`}
            />
            <input
              type="text"
              placeholder="الشارة (اختياري، مثل: محدود)"
              value={offerForm.tag}
              onChange={(e) => setOfferForm({ ...offerForm, tag: e.target.value })}
              className={`mt-2 w-full ${inputCls}`}
            />
            <button
              onClick={saveOffer}
              disabled={!offerForm.title || !offerForm.body}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-40"
            >
              <Plus size={16} />
              {offerEditId ? "حفظ التعديل" : "إضافة"}
            </button>
            {offerEditId ? (
              <button
                onClick={() => {
                  setOfferEditId(null);
                  setOfferForm({ title: "", body: "", tag: "" });
                }}
                className="mt-2 w-full rounded-xl border border-ink/10 bg-slate-50 py-2 text-xs font-bold text-muted transition active:scale-[0.97]"
              >
                إلغاء التعديل
              </button>
            ) : null}
          </section>

          <section className="mt-4">
            <div className="mb-2 text-sm font-bold text-ink">العروض الحالية ({offers.length})</div>
            {offers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink/15 bg-white/60 py-10 text-center">
                <Gift size={24} className="text-muted" />
                <div className="text-xs text-muted">لا توجد عروض بعد</div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {offers.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 rounded-2xl border border-ink/8 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-bold text-ink">{o.title}</div>
                      <div className="mt-1 text-[11px] leading-5 text-muted">{o.body}</div>
                      {o.tag ? (
                        <div className="mt-1 text-[10px] font-bold text-brand">{o.tag}</div>
                      ) : null}
                    </div>
                    <button
                      onClick={() => editOffer(o)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition active:scale-[0.95]"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => removeOffer(o.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition active:scale-[0.95]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            <div className="text-sm font-bold text-ink">
              {knowEditId ? "تعديل معرفة" : "إضافة معرفة جديدة"}
            </div>
            <div className="mt-1 text-[10px] leading-5 text-muted">
              كل معرفة تضيفها هنا يتعلمها المساعد الذكي فورًا ويجيب منها بدقة.
            </div>
            <input
              type="text"
              placeholder="عنوان المعرفة (مثل: تفعيل الكرت)"
              value={knowForm.title}
              onChange={(e) => setKnowForm({ ...knowForm, title: e.target.value })}
              className={`mt-3 w-full ${inputCls}`}
            />
            <textarea
              placeholder="نص المعرفة (الإجابة الكاملة التي يعتمد عليها المساعد)"
              value={knowForm.body}
              onChange={(e) => setKnowForm({ ...knowForm, body: e.target.value })}
              rows={4}
              className={`mt-2 w-full resize-none ${inputCls}`}
            />
            <button
              onClick={saveKnow}
              disabled={!knowForm.title || !knowForm.body}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-40"
            >
              <Plus size={16} />
              {knowEditId ? "حفظ التعديل" : "إضافة"}
            </button>
            {knowEditId ? (
              <button
                onClick={() => {
                  setKnowEditId(null);
                  setKnowForm({ title: "", body: "" });
                }}
                className="mt-2 w-full rounded-xl border border-ink/10 bg-slate-50 py-2 text-xs font-bold text-muted transition active:scale-[0.97]"
              >
                إلغاء التعديل
              </button>
            ) : null}
          </section>

          <section className="mt-4">
            <div className="mb-2 text-sm font-bold text-ink">
              المعارف الحالية ({knowledge.length})
            </div>
            {knowledge.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink/15 bg-white/60 py-10 text-center">
                <BookOpen size={24} className="text-muted" />
                <div className="text-xs text-muted">لا توجد معارف بعد</div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {knowledge.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center gap-3 rounded-2xl border border-ink/8 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-bold text-ink">{k.title}</div>
                      <div className="mt-1 text-[11px] leading-5 text-muted">{k.body}</div>
                    </div>
                    <button
                      onClick={() => editKnow(k)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition active:scale-[0.95]"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => removeKnow(k.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition active:scale-[0.95]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default AdminPanel;