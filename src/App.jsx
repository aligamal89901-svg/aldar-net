import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { House, Info, Phone, CreditCard, Package } from "lucide-react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import CardExpiry from "./pages/CardExpiry";
import Plans from "./pages/Plans";
import Notifications from "./pages/Notifications";
import { startReminderScheduler } from "./utils/reminder";

function App() {
  const [page, setPage] = useState(() =>
    window.location.hash === "#notifications" ? "notifications" : "home"
  );
  const [returnTo, setReturnTo] = useState("home");

  const pageRef = useRef(page);
  pageRef.current = page;

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#notifications" && pageRef.current !== "notifications") {
        setReturnTo(pageRef.current);
        setPage("notifications");
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

  const tabs = [
    { id: "home", label: "الرئيسية", icon: House, component: Home },
    { id: "plans", label: "الفئات", icon: Package, component: Plans },
    { id: "card", label: "كرتي", icon: CreditCard, component: CardExpiry },
    { id: "about", label: "من نحن", icon: Info, component: About },
    { id: "contact", label: "تواصل", icon: Phone, component: Contact },
  ];

  const currentPage = tabs.find((t) => t.id === page);
  const CurrentComponent = currentPage ? currentPage.component : null;

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <Header onBellClick={openNotifications} />

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
          ) : (
            <CurrentComponent onNavigate={setPage} />
          )}
        </motion.div>
      </AnimatePresence>

      <Footer />

      <motion.nav
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.7, delay: 0.1 }}
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4"
      >
        <div className="flex w-full max-w-md items-center justify-around rounded-[26px] border border-ink/8 bg-white/85 px-2 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                window.location.hash = "";
                setPage(tab.id);
              }}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold"
            >
              {page === tab.id ? (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                  className="absolute inset-0 rounded-2xl bg-brand/10"
                />
              ) : null}

              <span className={`relative flex ${page === tab.id ? "text-brand" : "text-muted"}`}>
                <tab.icon size={20} strokeWidth={2.2} />
              </span>
              <span className={`relative ${page === tab.id ? "text-brand" : "text-muted"}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </motion.nav>
    </div>
  );
}

export default App;