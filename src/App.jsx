import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { House, Phone, CreditCard, Package, Gift, BellRing, X, ShoppingCart, History, UserPlus } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import CardExpiry from "./pages/CardExpiry";
import Plans from "./pages/Plans";
import Offers from "./pages/Offers";
import Notifications from "./pages/Notifications";
import AdminPanel from "./pages/AdminPanel";
import AdminCards from "./pages/AdminCards";
import AdminOrders from "./pages/AdminOrders";
import AdminClients from "./pages/AdminClients";
import AIChat from "./pages/AIChat";
import Purchase from "./pages/Purchase";
import PurchaseHistory from "./pages/PurchaseHistory";
import Reseller from "./pages/Reseller";
import AuthGuard from "./components/AuthGuard";
import LottieIcon from "./components/LottieIcon";
import aiFabAnim from "./assets/lottie/ai-fab.json";
import aiSplashAnim from "./assets/lottie/ai-splash.json";
import { startReminderScheduler } from "./utils/reminder";
import { startBroadcastListener } from "./utils/broadcasts";
import { db } from "./firebase";
import Onboarding, { shouldShowOnboarding } from "./pages/Onboarding";
import Landing, { shouldShowLanding } from "./pages/Landing";

const PERM_ASKED_KEY = "aldar-notify-perm-asked";

function App() {
  const [page, setPage] = useState(() => {
    const hash = window.location.hash.slice(1);
    if (hash === "notifications") return "notifications";
    if (hash === "admin") return "admin";
    if (hash === "admin-cards") return "admin-cards";
    if (hash === "admin-orders") return "admin-orders";
    if (hash === "admin-clients") return "admin-clients";
    if (hash === "ai") return "ai";
    if (hash === "purchase") return "purchase";
    if (hash === "purchase-history") return "purchase-history";
    if (hash === "reseller") return "reseller";
    return "home";
  });
  const [returnTo, setReturnTo] = useState("home");
  const [aiSplash, setAiSplash] = useState(false);
  const [showPermCard, setShowPermCard] = useState(false);
  const [plans, setPlans] = useState([]);
  const [landingDone, setLandingDone] = useState(() => !shouldShowLanding());
  const [onboardingDone, setOnboardingDone] = useState(() => !shouldShowOnboarding());

  const pageRef = useRef(page);
  pageRef.current = page;
  const navScrollRef = useRef(null);

  useEffect(() => {
    return onSnapshot(collection(db, "plans"), (snap) =>
      setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash === "notifications" && pageRef.current !== "notifications") {
        setReturnTo(pageRef.current);
        setPage("notifications");
      } else if (hash === "admin" && pageRef.current !== "admin") {
        setReturnTo(pageRef.current);
        setPage("admin");
      } else if (hash === "admin-cards" && pageRef.current !== "admin-cards") {
        setReturnTo(pageRef.current);
        setPage("admin-cards");
      } else if (hash === "admin-orders" && pageRef.current !== "admin-orders") {
        setReturnTo(pageRef.current);
        setPage("admin-orders");
      } else if (hash === "admin-clients" && pageRef.current !== "admin-clients") {
        setReturnTo(pageRef.current);
        setPage("admin-clients");
      } else if (hash === "ai" && pageRef.current !== "ai") {
        setReturnTo(pageRef.current);
        setPage("ai");
      } else if (hash === "purchase" && pageRef.current !== "purchase") {
        setReturnTo(pageRef.current);
        setPage("purchase");
      } else if (hash === "purchase-history" && pageRef.current !== "purchase-history") {
        setReturnTo(pageRef.current);
        setPage("purchase-history");
      } else if (hash === "reseller" && pageRef.current !== "reseller") {
        setReturnTo(pageRef.current);
        setPage("reseller");
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    startReminderScheduler();
    const stopBroadcasts = startBroadcastListener();
    return () => {
      if (stopBroadcasts) stopBroadcasts();
    };
  }, []);

  useEffect(() => {
    let timer = null;
    try {
      const asked = localStorage.getItem(PERM_ASKED_KEY);
      if (!asked && "Notification" in window && Notification.permission === "default") {
        timer = setTimeout(() => setShowPermCard(true), 2500);
      }
    } catch {}
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (navScrollRef.current) {
      const activeBtn = navScrollRef.current.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [page]);

  const allowNotifications = async () => {
    try {
      localStorage.setItem(PERM_ASKED_KEY, "1");
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {}
    setShowPermCard(false);
  };

  const laterNotifications = () => {
    try {
      localStorage.setItem(PERM_ASKED_KEY, "1");
    } catch {}
    setShowPermCard(false);
  };

  const openNotifications = () => {
    if (pageRef.current !== "notifications") setReturnTo(pageRef.current);
    setPage("notifications");
  };

  const backFromNotifications = () => {
    window.location.hash = "";
    setPage(returnTo);
  };

  const openAdmin = () => {
    if (pageRef.current !== "admin") setReturnTo(pageRef.current);
    setPage("admin");
  };

  const backFromAdmin = () => {
    window.location.hash = "";
    setPage(returnTo);
  };

  const openAI = () => {
    if (pageRef.current === "ai" || aiSplash) return;
    setReturnTo(pageRef.current);
    setAiSplash(true);
    setTimeout(() => {
      window.location.hash = "";
      setPage("ai");
      setAiSplash(false);
    }, 1400);
  };

  const backFromAI = () => {
    window.location.hash = "";
    setPage(returnTo);
  };

  const handleLandingDone = () => {
    setLandingDone(true);
  };

  const handleOnboardingDone = () => {
    setOnboardingDone(true);
  };

  const allTabs = [
    { id: "home", label: "الرئيسية", icon: House },
    { id: "plans", label: "الفئات", icon: Package },
    { id: "offers", label: "العروض", icon: Gift },
    { id: "purchase", label: "شراء", icon: ShoppingCart },
    { id: "reseller", label: "موزع", icon: UserPlus },
    { id: "purchase-history", label: "طلباتي", icon: History },
    { id: "card", label: "كرتي", icon: CreditCard },
    { id: "contact", label: "تواصل", icon: Phone },
  ];

  const findTab = (id) => allTabs.find((t) => t.id === id);
  const currentTab = findTab(page);
  const CurrentComponent = currentTab ? (() => {
    const components = {
      home: Home, plans: Plans, offers: Offers, purchase: Purchase,
      "purchase-history": PurchaseHistory, reseller: Reseller, card: CardExpiry, contact: Contact,
    };
    return components[currentTab.id] || null;
  })() : null;

  if (!landingDone) {
    return <Landing onStart={handleLandingDone} />;
  }

  if (!onboardingDone) {
    return <Onboarding onFinish={handleOnboardingDone} />;
  }

  return (
    <div className="flex min-h-screen flex-col pb-28">
      <Header onBellClick={openNotifications} onAdminClick={openAdmin} />

      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-1 flex-col"
        >
          {page === "notifications" ? (
            <Notifications onBack={backFromNotifications} />
          ) : page === "admin" ? (
            <AuthGuard>
              <AdminPanel onBack={backFromAdmin} onNavigate={setPage} />
            </AuthGuard>
          ) : page === "admin-cards" ? (
            <AuthGuard>
              <AdminCards onBack={backFromAdmin} />
            </AuthGuard>
          ) : page === "admin-orders" ? (
            <AuthGuard>
              <AdminOrders onBack={backFromAdmin} />
            </AuthGuard>
          ) : page === "admin-clients" ? (
            <AuthGuard>
              <AdminClients onBack={backFromAdmin} />
            </AuthGuard>
          ) : page === "ai" ? (
            <AIChat onBack={backFromAI} onNavigate={setPage} />
          ) : (
            <CurrentComponent onNavigate={setPage} plans={plans} />
          )}
        </motion.div>
      </AnimatePresence>

      <Footer />

      <AnimatePresence>
        {showPermCard ? (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
            className="fixed inset-x-0 bottom-32 z-40 flex justify-center px-4"
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-brand/25 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.2)]">
              <div className="flex items-start gap-3 p-4">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-[0_8px_20px_rgba(8,145,178,0.35)]">
                  <motion.span
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut" }}
                    className="absolute inset-0 rounded-2xl bg-white/40"
                  />
                  <BellRing size={20} className="relative" />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-ink">لا يفوتك شيء يا غالي</div>
                  <div className="mt-1 text-[11px] leading-5 text-muted">
                    فعّل الإشعارات عشان نوصلك تنبيهات انتهاء كرتك وعروض الشبكة وصيانة الشبكة أول بأول.
                  </div>
                </div>
                <button
                  onClick={laterNotifications}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted transition active:scale-[0.95]"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={laterNotifications}
                  className="flex-1 rounded-xl border border-ink/10 bg-white py-2.5 text-[11px] font-bold text-muted transition active:scale-[0.97]"
                >
                  لاحقًا
                </button>
                <button
                  onClick={allowNotifications}
                  className="flex-1 rounded-xl bg-gradient-to-l from-brand to-brand-2 py-2.5 text-[11px] font-bold text-white shadow-[0_8px_20px_rgba(8,145,178,0.35)] transition active:scale-[0.97]"
                >
                  تفعيل الإشعارات
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {aiSplash ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.12),transparent_60%)]" />
            <div className="relative flex items-center justify-center">
              <motion.span
                animate={{ scale: [0.6, 1.6], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                className="absolute inset-0 m-auto h-56 w-56 rounded-full border-2 border-brand/30"
              />
              <motion.span
                animate={{ scale: [0.6, 1.6], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut", delay: 0.4 }}
                className="absolute inset-0 m-auto h-56 w-56 rounded-full border-2 border-brand/20"
              />
              <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.45, duration: 0.9 }}
                className="relative flex h-64 w-64 items-center justify-center"
              >
                <LottieIcon data={aiSplashAnim} className="h-64 w-64" />
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* زر AI العائم */}
      <AnimatePresence>
        {page !== "ai" ? (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6, delay: 0.2 }}
            onClick={openAI}
            className="fixed bottom-28 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-brand to-brand-2 shadow-[0_8px_24px_rgba(8,145,178,0.5)] transition active:scale-[0.9]"
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-white/40"
            />
            <span className="relative flex h-10 w-10 items-center justify-center">
              <LottieIcon data={aiFabAnim} className="h-10 w-10" />
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      {/* الشريط السفلي القابل للتمرير */}
      <AnimatePresence>
        {page !== "ai" ? (
          <motion.nav
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.7, delay: 0.1 }}
            className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4"
          >
            <div className="relative overflow-hidden rounded-[28px] border border-ink/8 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl">
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/95 to-transparent z-10 rounded-l-[28px]" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/95 to-transparent z-10 rounded-r-[28px]" />
              <div
                ref={navScrollRef}
                className="scrollbar-hide flex items-center gap-2 overflow-x-auto px-5 py-3"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {allTabs.map((tab) => {
                  const isActive = page === tab.id;
                  return (
                    <button
                      key={tab.id}
                      data-active={isActive ? "true" : "false"}
                      onClick={() => {
                        window.location.hash = "";
                        setPage(tab.id);
                      }}
                      className="relative flex shrink-0 flex-col items-center gap-1 rounded-2xl px-5 py-2 text-[10px] font-bold transition-all duration-200"
                    >
                      {isActive ? (
                        <motion.span
                          layoutId="nav-pill"
                          transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                          className="absolute inset-0 rounded-2xl bg-brand/10"
                        />
                      ) : null}
                      <span className={`relative flex ${isActive ? "text-brand" : "text-muted"}`}>
                        <tab.icon size={20} strokeWidth={2.2} />
                      </span>
                      <span className={`relative whitespace-nowrap ${isActive ? "text-brand" : "text-muted"}`}>
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default App;