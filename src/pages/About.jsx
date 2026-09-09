import { motion } from "motion/react";
import SectionTitle from "../components/SectionTitle";
import LottieIcon from "../components/LottieIcon";
import aboutHeroAnim from "../assets/lottie/about-hero.json";
import aboutVisionAnim from "../assets/lottie/about-vision.json";
import speedAnim from "../assets/lottie/value-speed.json";
import securityAnim from "../assets/lottie/value-security.json";
import supportAnim from "../assets/lottie/value-support.json";

function About() {
  const values = [
    { anim: speedAnim, title: "سرعة", desc: "خدمة إنترنت مستمرة بأداء ثابت" },
    { anim: securityAnim, title: "أمان", desc: "شبكة محمية واتصال موثوق" },
    { anim: supportAnim, title: "دعم", desc: "متواجدون لخدمتك في أي وقت" },
  ];

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <SectionTitle title="من نحن" subtitle="تعرف على شبكة الدار نت عن قرب" />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-center gap-4 rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
      >
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand/10">
          <LottieIcon data={aboutHeroAnim} className="h-20 w-20" />
        </div>
        <div>
          <div className="text-base font-extrabold text-ink">شبكة الدار نت</div>
          <p className="mt-1 text-xs leading-6 text-muted">
            شبكة إنترنت محلية تهدف إلى تقديم خدمة سهلة وواضحة لكل العملاء،
            بكرات محددة الفئات وأسعار ثابتة وخدمة تسعى للتطور باستمرار.
          </p>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
        className="mt-3 flex items-center gap-4 rounded-2xl border border-ink/8 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
      >
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand/10">
          <LottieIcon data={aboutVisionAnim} className="h-20 w-20" />
        </div>
        <div>
          <div className="text-base font-extrabold text-ink">هدفنا</div>
          <p className="mt-1 text-xs leading-6 text-muted">
            أن يصل كل عميل إلى خدمته بأسرع طريق: تطبيق واحد يجمع الفئات،
            الكروت، الإشعارات، ووسائل التواصل في مكان واحد.
          </p>
        </div>
      </motion.section>

      <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {values.map((v, i) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 + i * 0.07, duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-ink/8 bg-white p-4 text-center shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
          >
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-brand/10">
              <LottieIcon data={v.anim} className="h-14 w-14" />
            </div>
            <div className="text-sm font-extrabold text-ink">{v.title}</div>
            <div className="text-[11px] leading-5 text-muted">{v.desc}</div>
          </motion.div>
        ))}
      </section>
    </main>
  );
}

export default About;