import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import lottie from "lottie-web";
import SectionTitle from "../components/SectionTitle";
import LinkCard from "../components/LinkCard";
import heroAnim from "../assets/lottie/hero.json";
import loginAnim from "../assets/lottie/login.json";
import cardAnim from "../assets/lottie/card.json";
import supportAnim from "../assets/lottie/support.json";

function HeroAnimation() {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!boxRef.current) return;

    const player = lottie.loadAnimation({
      container: boxRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: heroAnim,
    });

    return () => player.destroy();
  }, []);

  return <div ref={boxRef} className="h-28 w-28 shrink-0 sm:h-36 sm:w-36" />;
}

function Home({ onNavigate }) {
  const links = [
    {
      title: "تسجيل الدخول / رمز الدخول",
      desc: "الدخول السريع إلى صفحة تسجيل الدخول الخاصة بالشبكة.",
      href: "http://d.net/login",
      anim: loginAnim,
    },
    {
      title: "معلومات الكرت",
      desc: "عرض تفاصيل الكرت والاشتراك بسهولة.",
      href: "http://d.net/status",
      anim: cardAnim,
    },
    {
      title: "التواصل والدعم",
      desc: "للتواصل مع إدارة الشبكة أو طلب المساعدة.",
      href: "#",
      anim: supportAnim,
      onClick: (e) => {
        e.preventDefault();
        if (onNavigate) onNavigate("contact");
      },
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <section className="relative overflow-hidden rounded-3xl border border-ink/8 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-brand-2/8" />

        <div className="relative flex items-center gap-4">
          <div className="flex-1">
            <h2 className="text-[22px] font-extrabold text-ink">مرحبًا بكم في الدار نت</h2>
            <p className="mt-2 text-sm leading-8 text-muted">
              من هنا تقدر تصل بسرعة إلى الصفحات المهمة مثل تسجيل الدخول، رمز الدخول،
              ومعلومات الكرت.
            </p>
          </div>

          <HeroAnimation />
        </div>
      </section>

      <SectionTitle title="الوصول السريع" subtitle="اضغط على أي بطاقة للانتقال مباشرة" />

      <section className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {links.map((link, i) => (
          <motion.div
            key={link.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.35, ease: "easeOut" }}
          >
            <LinkCard
              title={link.title}
              desc={link.desc}
              href={link.href}
              anim={link.anim}
              onClick={link.onClick}
            />
          </motion.div>
        ))}
      </section>
    </main>
  );
}

export default Home;