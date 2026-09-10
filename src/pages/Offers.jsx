import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Gift, Percent } from "lucide-react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import SectionTitle from "../components/SectionTitle";
import LottieIcon from "../components/LottieIcon";
import offersEmptyAnim from "../assets/lottie/offers-empty.json";
import offersLiveAnim from "../assets/lottie/offers-live.json";

const CACHE_KEY = "aldar-offers-cache";

function Offers() {
  const [offers, setOffers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "offers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOffers(list);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(list));
        } catch {}
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const hasOffers = offers.length > 0;

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <SectionTitle title="العروض" subtitle="عروض وخصومات الشبكة أولًا بأول" />

      {loading && !hasOffers ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 py-12 text-center text-xs font-bold text-muted">
          جاري تحميل العروض...
        </div>
      ) : !hasOffers ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink/15 bg-white/60 py-12 text-center"
        >
          <LottieIcon data={offersEmptyAnim} className="h-32 w-32" />
          <div className="text-sm font-bold text-ink">لا توجد عروض حاليًا</div>
          <div className="text-xs text-muted">أي عرض جديد سيظهر هنا فور إضافته</div>
        </motion.div>
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative mb-4 overflow-hidden rounded-3xl border border-brand/25 bg-gradient-to-b from-brand/10 to-white p-5 text-center"
          >
            <div className="mx-auto flex h-28 w-28 items-center justify-center">
              <LottieIcon data={offersLiveAnim} className="h-28 w-28" />
            </div>
            <div className="mt-2 text-base font-extrabold text-ink">عروض متاحة الآن</div>
            <div className="mt-1 text-[11px] text-muted">اغتنم العرض قبل انتهائه</div>
          </motion.section>

          <section className="flex flex-col gap-3">
            {offers.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07 * i + 0.05, duration: 0.35, ease: "easeOut" }}
                className="relative rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
              >
                {o.tag ? (
                  <span className="absolute -top-3 right-5 flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-[10px] font-bold text-white">
                    <Percent size={11} />
                    {o.tag}
                  </span>
                ) : null}

                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Gift size={17} />
                  </span>
                  <div className="text-sm font-extrabold text-ink">{o.title}</div>
                </div>

                <div className="mt-3 border-t border-ink/5 pt-3 text-xs leading-6 text-muted">
                  {o.body}
                </div>
              </motion.div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

export default Offers;