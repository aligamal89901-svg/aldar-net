import { useEffect, useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { Plus, Trash2, Edit3, LogOut, PackageX } from "lucide-react";

function AdminPanel({ onBack }) {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ price: "", gb: "", days: "", tag: "" });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "plans"), orderBy("price", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const save = async () => {
    const data = {
      price: Number(form.price),
      gb: Number(form.gb),
      days: form.days,
      tag: form.tag,
    };
    if (editId) {
      await updateDoc(doc(db, "plans", editId), data);
      setEditId(null);
    } else {
      await addDoc(collection(db, "plans"), data);
    }
    setForm({ price: "", gb: "", days: "", tag: "" });
  };

  const edit = (p) => {
    setEditId(p.id);
    setForm({ price: p.price, gb: p.gb, days: p.days, tag: p.tag || "" });
  };

  const remove = async (id) => {
    if (confirm("حذف هذه الفئة؟")) {
      await deleteDoc(doc(db, "plans", id));
    }
  };

  const logout = async () => {
    await signOut(auth);
    onBack();
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

      <section className="rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
        <div className="text-sm font-bold text-ink">
          {editId ? "تعديل فئة" : "إضافة فئة جديدة"}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="السعر"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="rounded-xl border border-ink/10 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand/40"
          />
          <input
            type="number"
            placeholder="القيقا"
            value={form.gb}
            onChange={(e) => setForm({ ...form, gb: e.target.value })}
            className="rounded-xl border border-ink/10 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand/40"
          />
          <input
            type="text"
            placeholder="المدة (مثل: شهر)"
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
            className="rounded-xl border border-ink/10 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand/40"
          />
          <input
            type="text"
            placeholder="الشارة (اختياري)"
            value={form.tag}
            onChange={(e) => setForm({ ...form, tag: e.target.value })}
            className="rounded-xl border border-ink/10 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand/40"
          />
        </div>
        <button
          onClick={save}
          disabled={!form.price || !form.gb || !form.days}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-40"
        >
          <Plus size={16} />
          {editId ? "حفظ التعديل" : "إضافة"}
        </button>
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
                  onClick={() => edit(p)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition active:scale-[0.95]"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition active:scale-[0.95]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminPanel;