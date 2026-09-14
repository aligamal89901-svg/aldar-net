import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import LottieIcon from "../components/LottieIcon";
import heroAnim from "../assets/lottie/landing-hero.json";

const PRIVACY_KEY = "aldar-privacy-accepted";

function Landing({ onStart }) {
  const [accepted, setAccepted] = useState(false);

  const handleStart = () => {
    if (!accepted) return;
    try { localStorage.setItem(PRIVACY_KEY, "1"); } catch {}
    onStart();
  };

  // إعدادات حركة أكثر نعومة وفخامة (Luxurious Spring)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 90, damping: 20, mass: 1 },
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FCFCFD] overflow-hidden" dir="rtl">
      {/* إضاءات محيطية ناعمة جداً في الخلفية (Ambient Glassmorphism) */}
      <div className="absolute -top-[15%] -left-[10%] h-[55vh] w-[55vw] rounded-full bg-brand/5 blur-[100px]" />
      <div className="absolute top-[25%] -right-[15%] h-[45vh] w-[45vw] rounded-full bg-cyan-500/5 blur-[100px]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex h-full flex-col justify-between"
      >
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-2 pt-8">
          
          {/* الأنيميشن مع الحجم المكبر والإضاءة المتناسبة */}
          <motion.div variants={itemVariants} className="relative mb-8 flex items-center justify-center">
            {/* هالة مضيئة خلف الأنيميشن بحجم يتناسب مع التكبير */}
            <div className="absolute inset-0 scale-110 rounded-full bg-gradient-to-tr from-brand/20 via-cyan-400/15 to-transparent blur-[50px] animate-pulse" />
            
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="relative z-10"
            >
              {/* تم تكبير المقاس هنا بشكل مدروس (280px للموبايل، 320px للشاشات الأكبر) */}
              <LottieIcon 
                data={heroAnim} 
                className="h-[280px] w-[280px] sm:h-[320px] sm:w-[320px] drop-shadow-2xl" 
              />
            </motion.div>
          </motion.div>

          {/* النصوص بتنسيق بصري مريح وبارز */}
          <motion.div variants={itemVariants} className="text-center relative z-10">
            <h1 className="text-[30px] font-extrabold text-ink leading-tight tracking-tight">
              مرحبًا بك في
            </h1>
            <h1 className="mt-1 text-[38px] font-black leading-tight tracking-tighter">
              <span className="bg-gradient-to-r from-brand via-cyan-400 to-brand bg-clip-text text-transparent drop-shadow-sm">
                شبكة الدار نت
              </span>
            </h1>
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="mt-5 text-center text-[16px] leading-[1.8] text-muted/80 max-w-[310px] font-medium"
          >
            تجربة إنترنت متكاملة — سرعة فائقة، أمان تام، وخدمة عملاء تفهمك قبل أن تتكلم.
          </motion.p>
        </div>

        {/* منطقة الموافقة والزر */}
        <motion.div variants={itemVariants} className="px-6 pb-10 w-full max-w-[420px] mx-auto relative z-10">
          
          {/* بطاقة الشروط المحسنة مع تأثير Glass Effect خفيف */}
          <motion.label
            whileTap={{ scale: 0.985 }}
            className={`relative flex items-start gap-4 rounded-[22px] border p-4 cursor-pointer backdrop-blur-md transition-all duration-400 ease-out ${
              accepted
                ? "border-brand/30 bg-brand/[0.04] shadow-[0_8px_30px_rgba(8,145,178,0.08)]"
                : "border-ink/10 bg-white/60 hover:bg-white/90 shadow-sm"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="hidden"
              />
              <div
                className={`relative flex h-7 w-7 items-center justify-center rounded-xl border-[2.5px] transition-all duration-300 ${
                  accepted
                    ? "border-brand bg-brand shadow-[0_0_15px_rgba(8,145,178,0.4)]"
                    : "border-ink/20 bg-white"
                }`}
              >
                <AnimatePresence>
                  {accepted && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0, rotate: -45 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0, opacity: 0, rotate: 45 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <CheckCircle2 size={18} className="text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <span className="text-[13px] leading-[1.7] text-muted/85 pt-[2px]">
              أوافق على{" "}
              <span className="font-bold text-brand hover:text-cyan-500 transition-colors underline decoration-brand/30 underline-offset-4">سياسة الخصوصية</span>{" "}
              و<span className="font-bold text-brand hover:text-cyan-500 transition-colors underline decoration-brand/30 underline-offset-4">شروط الاستخدام</span>.
              بدخولي هذا التطبيق، أتحمل مسؤولية استخدامي وألتزم بحماية بياناتي.
            </span>
          </motion.label>

          {/* الزر الاحترافي */}
          <motion.button
            onClick={handleStart}
            disabled={!accepted}
            className={`group relative mt-6 flex w-full items-center justify-center gap-3 overflow-hidden rounded-[22px] py-[18px] text-[17px] font-bold transition-all duration-400 ease-out ${
              accepted
                ? "bg-gradient-to-r from-brand to-cyan-500 text-white shadow-[0_12px_30px_rgba(8,145,178,0.3)] hover:shadow-[0_20px_40px_rgba(8,145,178,0.45)]"
                : "bg-ink/5 text-muted/40 cursor-not-allowed"
            }`}
            whileHover={accepted ? { scale: 1.015, y: -2 } : {}}
            whileTap={accepted ? { scale: 0.98 } : {}}
          >
            {/* لمعان سينمائي للزر */}
            {accepted && (
              <motion.div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                animate={{ translateX: ["250%", "-250%"] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "linear", delay: 0.5 }}
              />
            )}
            
            <span className="relative z-10 tracking-wide">ابدأ الآن</span>
            
            <motion.div
              className="relative z-10"
              animate={accepted ? { x: [0, -6, 0] } : {}}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              <ArrowLeft size={24} strokeWidth={2.5} className={accepted ? "text-white" : "text-muted/40"} />
            </motion.div>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function shouldShowLanding() {
  try {
    return localStorage.getItem(PRIVACY_KEY) !== "1";
  } catch {
    return true;
  }
}

export default Landing;
