import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Crown, Flame, PackageX } from "lucide-react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import SectionTitle from "../components/SectionTitle";
import LottieIcon from "../components/LottieIcon";
import plansHeroAnim from "../assets/lottie/plans-hero.json";
import plansDataAnim from "../assets/lottie/plans-data.json";

const CACHE_KEY = "aldar-plans-cache";

function orderLink(plan) {
  const msg = `مرحبًا الدار نت 👋 أريد طلب كرت فئة ${plan.price} (${plan.gb} قيقا - ${plan.days})`;
  return `https://wa.me/967772238975?text=${encodeURIComponent(msg)}`;
}

function Plans() {
  const [plans, setPlans] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "plans"), orderBy("price", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPlans(list);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(list));
        } catch {}
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <SectionTitle title="الفئات والأسعار" subtitle="اختر الباقة المناسبة لك واطلبها بضغطة واحدة" />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-5 flex items-center gap-4 rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand/10">
          <LottieIcon data={plansHeroAnim} className="h-14 w-14" />
        </div>
        <div>
          <div className="text-base font-extrabold text-ink">كرات الدار نت</div>
          <div className="mt-1 text-xs leading-6 text-muted">
            فئات واضحة وأسعار ثابتة، وكل كرت يصلك جاهزًا للتفعيل من صفحة تسجيل الدخول.
          </div>
        </div>
      </motion.section>

      {loading && plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 py-12 text-center text-xs font-bold text-muted">
          جاري تحميل الفئات...
        </div>
      ) : plans.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 py-12 text-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <PackageX size={24} />
          </span>
          <div className="text-sm font-bold text-ink">لا توجد فئات حاليًا</div>
          <div className="text-xs text-muted">ستظهر الفئات هنا فور إضافتها من لوحة المدير</div>
        </motion.div>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i + 0.05, duration: 0.35, ease: "easeOut" }}
              className={`relative flex flex-col rounded-3xl border p-5 ${
                plan.tag
                  ? "border-brand/30 bg-brand/5"
                  : "border-ink/8 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
              }`}
            >
              {plan.tag ? (
                <span className="absolute -top-3 right-5 flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-[10px] font-bold text-white">
                  {plan.tag === "الأكثر طلبًا" ? <Flame size={11} /> : <Crown size={11} />}
                  {plan.tag}
                </span>
              ) : null}

              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-ink">{plan.gb}</span>
                  <span className="text-[11px] font-bold text-muted">قيقا</span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-brand/10">
                  <LottieIcon data={plansDataAnim} className="h-9 w-9" />
                </div>
              </div>

              <div className="mt-4 flex items-end gap-1.5 border-t border-ink/5 pt-3">
                <span className="text-2xl font-extrabold text-ink">{plan.price}</span>
                <span className="pb-0.5 text-[11px] font-bold text-muted">ريال</span>
                <span className="ms-auto rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold text-brand">
                  {plan.days}
                </span>
              </div>

              <ul className="mt-4 flex flex-col gap-2">
                {[`${plan.gb} قيقا نت`, `صلاحية ${plan.days}`, "تفعيل فوري من صفحة تسجيل الدخول"].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2 text-[11px] font-semibold text-muted">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10">
                        <Check size={10} className="text-brand" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  )
                )}
              </ul>

              <a
                href={orderLink(plan)}
                target="_blank"
                rel="noreferrer"
                className="mt-5 w-full rounded-xl bg-brand py-2.5 text-center text-xs font-bold text-white transition active:scale-[0.97]"
              >
                اطلب عبر واتساب
              </a>
            </motion.div>
          ))}
        </section>
      )}
    </main>
  );
}

export default Plans;