import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, CheckCircle2, AlertCircle, UserPlus, Mail, Phone, Lock, User, CreditCard, Shield } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

function Reseller({ onBack }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirmPassword: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.name || !form.phone || !form.email || !form.password) {
      setError("أكمل كل الحقول المطلوبة");
      return;
    }
    if (form.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("البريد الإلكتروني غير صالح");
      return;
    }

    setSending(true);
    setError("");

    try {
      await addDoc(collection(db, "clientRequests"), {
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
        status: "pending",
        balance: 0,
        createdAt: Date.now(),
      });
      setDone(true);
    } catch (err) {
      setError("تعذر إرسال الطلب، حاول مجددًا");
    }
    setSending(false);
  };

  if (done) {
    return (
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-ink/8 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.97]">
            <ArrowRight size={15} /> رجوع
          </button>
          <div className="text-base font-extrabold text-ink">حساب موزع</div>
          <span className="w-16" />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 rounded-3xl border border-green-500/20 bg-gradient-to-b from-white to-green-50 py-12 text-center">
          <CheckCircle2 size={56} className="text-green-500" />
          <div className="text-lg font-extrabold text-ink">تم إرسال طلبك بنجاح</div>
          <div className="text-xs leading-6 text-muted px-6">طلبك وصل للإدارة وسيتم مراجعته قريبًا. بعد الموافقة سيتم تفعيل حسابك وتصلك بيانات الدخول.</div>
          <button onClick={onBack} className="mt-2 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white transition active:scale-[0.97]">العودة للرئيسية</button>
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
        <div className="text-base font-extrabold text-ink">حساب موزع</div>
        <span className="w-16" />
      </div>

      {/* بانر تعريفي */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-2xl border border-brand/15 bg-gradient-to-l from-brand/5 to-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
            <Shield size={20} className="text-brand" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-ink">كن موزعًا معتمدًا</div>
            <div className="text-[10px] text-muted mt-0.5">سجّل الآن وانتظر موافقة الإدارة لتبدأ بالبيع والربح</div>
          </div>
        </div>
      </motion.div>

      <section className="rounded-2xl border border-brand/15 bg-gradient-to-b from-white to-brand/5 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
        <div className="text-sm font-extrabold text-ink">بيانات التسجيل</div>
        <div className="mt-1 text-[10px] leading-5 text-muted">كل الحقول مطلوبة — البيانات تُرسل للإدارة للمراجعة</div>

        <div className="mt-4 flex flex-col gap-2.5">
          <div className="relative">
            <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="text" placeholder="الاسم الثلاثي" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-brand/15 bg-brand/5 pr-10 pl-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand/40 focus:bg-white" />
          </div>

          <div className="relative">
            <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="tel" placeholder="رقم الجوال" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-brand/15 bg-brand/5 pr-10 pl-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand/40 focus:bg-white" dir="ltr" />
          </div>

          <div className="relative">
            <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-brand/15 bg-brand/5 pr-10 pl-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand/40 focus:bg-white" dir="ltr" />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="password" placeholder="كلمة المرور (6 أحرف على الأقل)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-brand/15 bg-brand/5 pr-10 pl-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand/40 focus:bg-white" />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="password" placeholder="تأكيد كلمة المرور" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full rounded-xl border border-brand/15 bg-brand/5 pr-10 pl-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand/40 focus:bg-white" />
          </div>
        </div>

        {error ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-500">
            <AlertCircle size={14} /> {error}
          </div>
        ) : null}

        <button onClick={submit} disabled={sending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-brand to-brand-2 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(8,145,178,0.3)] transition active:scale-[0.97] disabled:opacity-40">
          <UserPlus size={16} />
          {sending ? "جارٍ الإرسال…" : "إرسال طلب التسجيل"}
        </button>
      </section>

      {/* معلومات */}
      <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-50/50 p-4">
        <div className="text-xs font-bold text-amber-700 mb-2">كيف يعمل النظام؟</div>
        <div className="flex flex-col gap-2 text-[11px] leading-5 text-amber-600">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-700">1</span>
            <span>أرسل طلب التسجيل بالبيانات أعلاه</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-700">2</span>
            <span>الإدارة تراجع طلبك وتوافق عليه</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-700">3</span>
            <span>يتم تفعيل حسابك وشحن رصيدك الأولي</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-700">4</span>
            <span>ابدأ بسحب الكروت وبيعها لعملائك</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Reseller;