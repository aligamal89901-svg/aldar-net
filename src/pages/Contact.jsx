import SectionTitle from "../components/SectionTitle";
import LottieIcon from "../components/LottieIcon";
import whatsappAnim from "../assets/lottie/whatsapp.json";
import callAnim from "../assets/lottie/call.json";

function Contact() {
  const contacts = [
    {
      anim: whatsappAnim,
      name: "واتساب",
      value: "تواصل مباشر عبر واتساب",
      href: "https://wa.me/967772238975",
      iconClass: "h-16 w-16",
    },
    {
      anim: callAnim,
      name: "اتصال مباشر",
      value: "772238975",
      href: "tel:+967772238975",
      iconClass: "h-11 w-11",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pt-5 pb-7">
      <SectionTitle title="تواصل معنا" subtitle="يسعدنا خدمتك في أي وقت" />

      <section className="flex flex-col gap-3">
        {contacts.map((c) => (
          <a
            key={c.name}
            href={c.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-ink/8 bg-white px-4 py-3.5 shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-brand/40"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand/25 bg-brand/10">
              <LottieIcon data={c.anim} className={c.iconClass} />
            </span>
            <div>
              <div className="text-sm font-bold text-ink">{c.name}</div>
              <div className="mt-0.5 text-xs text-muted">{c.value}</div>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}

export default Contact;