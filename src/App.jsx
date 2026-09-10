import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { House, Info, Phone, CreditCard, Package, Gift } from "lucide-react";
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
import AIChat from "./pages/AIChat";
import AuthGuard from "./components/AuthGuard";
import LottieIcon from "./components/LottieIcon";
import aiFabAnim from "./assets/lottie/ai-fab.json";
import aiSplashAnim from "./assets/lottie/ai-splash.json";
import { startReminderScheduler } from "./utils/reminder";

function App() {
  const [page, setPage] = useState(() => {
    const hash = window.location.hash.slice(1);
    if (hash === "notifications") return "notifications";
    if (hash === "admin") return "admin";
    if (hash === "ai") return "ai";
    return "home";
  });
  const [returnTo, setReturnTo] = useState("home");
  const [aiSplash, setAiSplash] = useState(false);

  const pageRef = useRef(page);
  pageRef.current = page;

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash === "notifications" && pageRef.current !== "notifications") {
        setReturnTo(pageRef.current);
        setPage("notifications");
      } else if (hash === "admin" && pageRef.current !== "admin") {
        setReturnTo(pageRef.current);
        setPage("admin");
      } else if (hash === "ai" && pageRef.current !== "ai") {
        setReturnTo(pageRef.current);
        setPage("ai");
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    startReminderScheduler();
  }, []);

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

  const leftTabs = [
    { id: "home", label: "الرئيسية", icon: House, component: Home },
    { id: "plans", label: "الفئات", icon: Package, component: Plans },
    { id: "offers", label: "العروض", icon: Gift, component: Offers },
  ];

  const rightTabs = [
    { id: "card", label: "كرتي", icon: CreditCard, component: CardExpiry },
    { id: "about", label: "من نحن", icon: Info, component: About },
    { id: "contact", label: "تواصل", icon: Phone, component: Contact },
  ];

  const findTab = (id) =>
    leftTabs.find((t) => t.id === id) || rightTabs.find((t) => t.id === id);
  const currentTab = findTab(page);
  const CurrentComponent = currentTab ? currentTab.component : null;

  const renderTabBtn = (tab) => (
    <button
      key={tab.id}
      onClick={() => {
        window.location.hash = "";
        setPage(tab.id);
      }}
      className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold"
    >
      {page === tab.id ? (
        <motion.span
          layoutId="nav-pill"
          transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
          className="absolute inset-0 rounded-2xl bg-brand/10"
        />
      ) : null}

      <span className={`relative flex ${page === tab.id ? "text-brand" : "text-muted"}`}>
        <tab.icon size={19} strokeWidth={2.2} />
      </span>
      <span className={`relative ${page === tab.id ? "text-brand" : "text-muted"}`}>
        {tab.label}
      </span>
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <Header onBellClick={openNotifications} onSettingsClick={openAdmin} />

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
              <AdminPanel onBack={backFromAdmin} />
            </AuthGuard>
          ) : page === "ai" ? (
            <AIChat onBack={backFromAI} />
          ) : (
            <CurrentComponent onNavigate={setPage} />
          )}
        </motion.div>
      </AnimatePresence>

      <Footer />

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

      <AnimatePresence>
        {page !== "ai" ? (
          <motion.nav
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.7, delay: 0.1 }}
            className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4"
          >
            <div className="flex w-full max-w-md items-end justify-around rounded-[26px] border border-ink/8 bg-white/85 px-1.5 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl">
              {leftTabs.map(renderTabBtn)}

              <button
                onClick={openAI}
                className="relative -mt-7 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-brand to-brand-2 shadow-[0_12px_30px_rgba(8,145,178,0.5)] transition active:scale-[0.95]"
              >
                <motion.span
                  animate={{ scale: [1, 1.4, 1], opacity: [0.55, 0, 0.55] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-white/40"
                />
                <span className="relative flex h-11 w-11 items-center justify-center">
                  <LottieIcon data={aiFabAnim} className="h-11 w-11" />
                </span>
              </button>

              {rightTabs.map(renderTabBtn)}
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default App;