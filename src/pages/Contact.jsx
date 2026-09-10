import { motion } from "motion/react";
import SectionTitle from "../components/SectionTitle";
import LottieIcon from "../components/LottieIcon";
import contactHeroAnim from "../assets/lottie/contact-hero.json";
import whatsappAnim from "../assets/lottie/whatsapp.json";
import callAnim from "../assets/lottie/call.json";

function Contact() {
  const channels = [
    {
      anim: whatsappAnim,
      title: "واتساب",
      desc: "تواصل مباشر عبر واتساب",
      href: "https://wa.me/967772238975",
      external: true,
    },
    {
      anim: callAnim,
      title: "اتصال مباشر",
      desc: "772238975",
      href: "tel:772238975",
      external: false,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <SectionTitle title="تواصل معنا" subtitle="يسعدنا خدمتك في أي وقت" />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative mb-4 overflow-hidden rounded-3xl border border-brand/25 bg-gradient-to-b from-brand/10 to-white p-5 text-center"
      >
        <div className="mx-auto flex h-28 w-28 items-center justify-center">
          <LottieIcon data={contactHeroAnim} className="h-28 w-28" />
        </div>
        <div className="mt-2 text-base font-extrabold text-ink">نحن بخدمتك</div>
        <div className="mt-1 text-[11px] text-muted">اختر طريقة التواصل المناسبة لك</div>
      </motion.section>

      <section className="grid grid-cols-2 gap-3">
        {channels.map((c, i) => (
          <motion.a
            key={c.title}
            href={c.href}
            target={c.external ? "_blank" : undefined}
            rel={c.external ? "noreferrer" : undefined}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.07, duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center gap-1.5 rounded-3xl border border-ink/8 bg-white p-5 text-center shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.97]"
          >
            <div className="flex h-20 w-20 items-center justify-center">
              <LottieIcon data={c.anim} className="h-20 w-20" />
            </div>
            <div className="text-sm font-extrabold text-ink">{c.title}</div>
            <div className="text-[10px] leading-5 text-muted">{c.desc}</div>
          </motion.a>
        ))}
      </section>
    </main>
  );
}

export default Contact;