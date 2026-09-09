import { ChevronLeft } from "lucide-react";
import LottieIcon from "./LottieIcon";

function LinkCard({ title, desc, href, icon: Icon, anim, custom, onClick }) {
  const isExternal = href.startsWith("http");

  return (
    <a
      href={href}
      onClick={onClick}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className="group block rounded-2xl border border-ink/8 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_12px_30px_rgba(8,145,178,0.12)]"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-brand/25 bg-brand/10 text-brand">
          {custom ? (
            custom
          ) : anim ? (
            <LottieIcon data={anim} className="h-11 w-11" />
          ) : Icon ? (
            <Icon size={20} strokeWidth={2.2} />
          ) : null}
        </div>

        <span className="flex text-muted transition duration-300 group-hover:-translate-x-1 group-hover:text-brand">
          <ChevronLeft size={18} strokeWidth={2.2} />
        </span>
      </div>

      <div className="text-base font-bold text-ink">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-muted">{desc}</div>
    </a>
  );
}

export default LinkCard;