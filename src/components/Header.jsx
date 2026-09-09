import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import LottieIcon from "./LottieIcon";
import logoAnim from "../assets/lottie/logo.json";
import { unreadCount } from "../utils/notifyStore";

function Header({ onBellClick }) {
  const [unread, setUnread] = useState(unreadCount());

  useEffect(() => {
    const handler = () => setUnread(unreadCount());
    window.addEventListener("aldar-notifications-changed", handler);
    return () => window.removeEventListener("aldar-notifications-changed", handler);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-white/80 px-4 py-3.5 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[900px] items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/15 to-brand-2/15 shadow-lg shadow-brand/20">
          <LottieIcon data={logoAnim} className="h-12 w-12" />
        </div>

        <div className="flex-1">
          <h1 className="text-[22px] font-extrabold text-ink">الدار نت</h1>
          <p className="mt-0.5 text-xs text-muted">خدمات الشبكة بسهولة وسرعة</p>
        </div>

        <button
          onClick={onBellClick}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink/8 bg-white text-muted shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.95]"
        >
          <Bell size={18} />
          {unread > 0 ? (
            <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}

export default Header;