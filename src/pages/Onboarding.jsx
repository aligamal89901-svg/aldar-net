import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import LottieIcon from "../components/LottieIcon";
import globeAnim from "../assets/lottie/onboarding-globe.json";
import speedAnim from "../assets/lottie/onboarding-speed.json";
import appAnim from "../assets/lottie/onboarding-app.json";
import cardAnim from "../assets/lottie/onboarding-card.json";
import bellAnim from "../assets/lottie/onboarding-bell.json";
import usersAnim from "../assets/lottie/onboarding-users.json";
import lockAnim from "../assets/lottie/onboarding-lock.json";

const STORAGE_KEY = "aldar-onboarding-done";

const slides = [
  {
    anim: globeAnim,
    title: "الدار نت",
    subtitle: "شبكة الإنترنت المحلية الأولى",
    body: "ليست مجرد شبكة — بل تجربة متكاملة. سرعة فائقة، استقرار دائم، وخدمة عملاء تفهم احتياجاتك قبل أن تقولها.",
  },
  {
    anim: speedAnim,
    title: "سرعة بلا حدود",
    subtitle: "أداء يتفوق على التوقعات",
    body: "بنية تحتية متطورة تضمن لك أسرع اتصال ممكن. لا تقطيع، لا بطء، لا انتظار. فقط إنترنت يعمل كما يجب.",
  },
  {
    anim: appAnim,
    title: "تطبيق واحد لكل شيء",
    subtitle: "كل خدماتك في مكان واحد",
    body: "الفئات، العروض، الكروت، الإشعارات، الدعم الفني — كل ما تحتاجه في تطبيق واحد أنيق وسهل الاستخدام.",
  },
  {
    anim: cardAnim,
    title: "شراء ذكي وآمن",
    subtitle: "عملية واضحة من الألف إلى الياء",
    body: "اختر الفئة، حوّل المبلغ، وأرفق السند. النظام يسحب الكرت تلقائيًا ويوصلك إياه فور الموافقة. بدون تعقيد، بدون غموض.",
  },
  {
    anim: bellAnim,
    title: "لا يفوتك شيء",
    subtitle: "إشعارات لحظية ذكية",
    body: "تنبيهات انتهاء الكرت، عروض حصرية، وصيانة الشبكة — تصلك فورًا أعلى الشاشة. أنت دائمًا أول من يعرف.",
  },
  {
    anim: usersAnim,
    title: "كن موزعًا واربح",
    subtitle: "فرصة دخل إضافية بين يديك",
    body: "سجّل كموزع، اشحن رصيدك بسعر تكلفة، وبِع بالسعر الرسمي. الفرق ربحك الصافي في كل كرت. عمل بسيط، عائد مضمون.",
  },
  {
    anim: lockAnim,
    title: "أمان ومسؤولية",
    subtitle: "بياناتك في أيدٍ أمينة",
    body: "بدخولك هذا التطبيق، أنت شريك في حماية بياناتك. نحن نلتزم بأعلى معايير الأمان، ونتوقع منك نفس الالتزام. معًا نبني شبكة موثوقة.",
  },
];

function Onboarding({ onFinish }) {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
      onFinish();
    }
  };

  const prev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">
      <div className="relative flex items-center justify-end px-6 pt-6">
        <span className="text-xs font-bold text-muted">{current + 1} / {slides.length}</span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 100, rotateY: -15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -100, rotateY: 15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex w-full max-w-sm flex-col items-center text-center"
            style={{ perspective: "1000px" }}
          >
            <motion.div
              className="mb-6 flex h-44 w-44 items-center justify-center"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            >
              <motion.div
                animate={{ rotate: [0, 3, -3, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              >
                <LottieIcon data={slide.anim} className="h-40 w-40" />
              </motion.div>
            </motion.div>

            <motion.div
              className="mb-6 h-1 w-16 rounded-full bg-brand"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            />

            <motion.h1
              className="text-3xl font-extrabold text-ink tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {slide.title}
            </motion.h1>

            <motion.p
              className="mt-2 text-sm font-bold text-brand"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {slide.subtitle}
            </motion.p>

            <motion.p
              className="mt-5 text-[15px] leading-8 text-muted"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              {slide.body}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-2 pb-5">
        {slides.map((_, i) => (
          <motion.span
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-8 bg-brand" : "w-2 bg-ink/10"
            }`}
            layout
          />
        ))}
      </div>

      <div className="flex gap-3 px-6 pb-10">
        {current > 0 ? (
          <motion.button
            onClick={prev}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-white py-4 text-sm font-bold text-muted shadow-sm transition active:scale-[0.97]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ChevronLeft size={18} />
            السابق
          </motion.button>
        ) : (
          <div className="flex-1" />
        )}
        <motion.button
          onClick={next}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(8,145,178,0.3)] transition active:scale-[0.97]"
          whileHover={{ scale: 1.02, boxShadow: "0 12px 32px rgba(8,145,178,0.4)" }}
          whileTap={{ scale: 0.98 }}
        >
          {isLast ? (
            <>
              <CheckCircle2 size={18} />
              ابدأ الآن
            </>
          ) : (
            "التالي"
          )}
        </motion.button>
      </div>
    </div>
  );
}

export function shouldShowOnboarding() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export default Onboarding;