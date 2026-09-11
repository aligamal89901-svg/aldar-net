import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight, Send, Sparkles, Copy, Check, Phone, MessageCircle, Square, Bot,
  AlertTriangle, CheckCircle2, CalendarDays, BellRing, MessageSquare, CreditCard,
  Package, Gift, Users, KeyRound, Shield, Zap, Headphones, Eye,
} from "lucide-react";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { saveLead, getLead, checkReminder } from "../utils/reminder";
import LottieIcon from "../components/LottieIcon";
import aiHeroAnim from "../assets/lottie/ai-hero.json";
import { askAI } from "../utils/ai";

const PRESETS = [
  "كيف أفعّل كرت جديد؟",
  "وش الفئات وأسعارها؟",
  "النت بطيء عندي، وش الحل؟",
  "كيف أتواصل مع الإدارة؟",
];

const AGENT_PRESETS = [
  "سجّل كرت جديد يبدأ اليوم وينتهي بعد 30 يومًا",
  "ورني كرتي الحالي",
  "عدّل كرتي بحيث ينتهي بعد 10 أيام",
  "نبهني قبل انتهاء كرتي بيومين",
];

const CARD_STORAGE_KEY = "aldar-card-expiry";

function escapeHtml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatReply(text) {
  const esc = escapeHtml(text);
  const bold = esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const clean = bold.replace(/\*/g, "");
  return clean.replace(/\n/g, "<br/>");
}

function extractNumbers(text) {
  const nums = (text || "").match(/\+?\d[\d\s-]{7,}\d/g) || [];
  return nums.map((n) => n.replace(/[\s-]/g, ""));
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - today) / 86400000);
}

function ContactCard({ phone, whatsapp }) {
  const waNum = (whatsapp || phone || "").replace(/\D/g, "");
  if (!phone && !waNum) return null;

  const call = () => { window.location.href = "tel:" + phone; };
  const wa = () => {
    window.open(
      "https://wa.me/" + waNum + "?text=" + encodeURIComponent("السلام عليكم، أحتاج مساعدة بخصوص الشبكة"),
      "_blank"
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="mt-2 w-full overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-white to-brand/5 shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center gap-2 border-b border-brand/10 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15">
          <MessageCircle size={12} className="text-brand" />
        </div>
        <div className="text-[11px] font-extrabold text-ink">تواصل مباشر مع الإدارة</div>
      </div>
      <div className="flex gap-2 p-2">
        {phone ? (
          <button onClick={call} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-[11px] font-bold text-white transition active:scale-[0.97]">
            <Phone size={12} />
            اتصال
          </button>
        ) : null}
        {waNum ? (
          <button onClick={wa} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink/10 bg-white py-2 text-[11px] font-bold text-ink transition active:scale-[0.97]">
            <MessageCircle size={12} className="text-green-600" />
            واتساب
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

function PlansCard({ plans }) {
  if (!plans || plans.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="mt-2 w-full overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-white to-brand/5 shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center gap-2 border-b border-brand/10 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15">
          <Package size={12} className="text-brand" />
        </div>
        <div className="text-[11px] font-extrabold text-ink">فئاتنا الحالية</div>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {plans.map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-brand/10 bg-white p-3">
            <div className="flex-1">
              <div className="text-sm font-extrabold text-ink">{p.price} ريال</div>
              <div className="mt-0.5 text-[10px] text-muted">{p.gb} قيقا — {p.days}</div>
            </div>
            {p.tag ? (
              <span className="rounded-full bg-brand/10 px-2 py-1 text-[9px] font-extrabold text-brand">
                {p.tag}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function OffersCard({ offers }) {
  if (!offers || offers.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="mt-2 w-full overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-white to-amber-50 shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center gap-2 border-b border-amber-500/15 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15">
          <Gift size={12} className="text-amber-500" />
        </div>
        <div className="text-[11px] font-extrabold text-ink">عروضنا الحالية</div>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {offers.map((o, i) => (
          <div key={i} className="rounded-xl border border-amber-500/10 bg-white p-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-extrabold text-ink">{o.title}</div>
              {o.tag ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-extrabold text-amber-600">
                  {o.tag}
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-[10px] leading-5 text-muted">{o.body}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AboutCard() {
  const values = [
    { Icon: Zap, title: "سرعة", desc: "خدمة مستمرة بأداء ثابت" },
    { Icon: Shield, title: "أمان", desc: "شبكة محمية واتصال موثوق" },
    { Icon: Headphones, title: "دعم", desc: "متواجدون لخدمتك في أي وقت" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="mt-2 w-full overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-white to-brand/5 shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center gap-2 border-b border-brand/10 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15">
          <Users size={12} className="text-brand" />
        </div>
        <div className="text-[11px] font-extrabold text-ink">من نحن</div>
      </div>
      <div className="p-3">
        <div className="text-sm font-extrabold text-ink">شبكة الدار نت</div>
        <div className="mt-1 text-[10px] leading-5 text-muted">
          شبكة إنترنت محلية تهدف إلى تقديم خدمة سهلة وواضحة لكل العملاء، بكرات محددة الفئات وأسعار ثابتة وخدمة تسعى للتطور باستمرار.
        </div>
        <div className="mt-3 text-[11px] font-extrabold text-brand">هدفنا</div>
        <div className="mt-1 text-[10px] leading-5 text-muted">
          أن يصل كل عميل إلى خدمته بأسرع طريق: تطبيق واحد يجمع الفئات، الكروت، الإشعارات، ووسائل التواصل في مكان واحد.
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {values.map((v) => {
            const Icon = v.Icon;
            return (
              <div key={v.title} className="flex flex-col items-center gap-1 rounded-xl bg-white p-2 text-center">
                <Icon size={14} className="text-brand" />
                <div className="text-[10px] font-extrabold text-ink">{v.title}</div>
                <div className="text-[8px] leading-3 text-muted">{v.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function LoginHelpCard({ onNavigate }) {
  const goCard = () => {
    window.location.hash = "";
    if (onNavigate) onNavigate("card");
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="mt-2 w-full overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-white to-brand/5 shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center gap-2 border-b border-brand/10 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15">
          <KeyRound size={12} className="text-brand" />
        </div>
        <div className="text-[11px] font-extrabold text-ink">رمز الدخول / تسجيل الدخول</div>
      </div>
      <div className="p-3">
        <div className="text-[10px] leading-5 text-muted">
          الشبكة لا تعتمد على رمز دخول أو تسجيل حساب — بوابتك هي <span className="font-extrabold text-ink">كرتك الشخصي</span>.
          فقط أدخل بيانات الكرت في صفحة <span className="font-extrabold text-brand">كرتي</span> ليحفظ تاريخ الانتهاء وتصلك التذكيرات.
        </div>
        <button
          onClick={goCard}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-[11px] font-bold text-white transition active:scale-[0.97]"
        >
          <Eye size={12} />
          فتح صفحة كرتي
        </button>
      </div>
    </motion.div>
  );
}

function CardViewCard({ end, lead }) {
  const left = daysLeft(end);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="mt-2 w-full overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-white to-brand/5 shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center gap-2 border-b border-brand/10 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15">
          <CreditCard size={12} className="text-brand" />
        </div>
        <div className="text-[11px] font-extrabold text-ink">كرتك الحالي</div>
      </div>
      {end ? (
        <div className="flex flex-col gap-1.5 p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted">
            <CalendarDays size={12} className="text-brand" />
            تاريخ الانتهاء: <span className="text-ink">{end}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted">
            <CheckCircle2 size={12} className={left !== null && left <= 3 ? "text-amber-500" : "text-emerald-500"} />
            {left === null ? "—" : left > 0 ? `متبقٍ ${left} يوم` : left === 0 ? "ينتهي اليوم" : "انتهت صلاحيته"}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted">
            <BellRing size={12} className="text-amber-500" />
            التذكير قبل: {lead.value} {lead.unit === "days" ? "يوم" : "ساعة"}
          </div>
        </div>
      ) : (
        <div className="p-3 text-[10px] font-bold text-muted">
          لا يوجد كرت محفوظ حاليًا — سجّل كرتًا أولًا عبر الوكيل أو صفحة كرتي.
        </div>
      )}
    </motion.div>
  );
}

function TaskCard({ task }) {
  const ok = task.status === "ok";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className={`mt-2 w-full overflow-hidden rounded-2xl border shadow-[0_4px_14px_rgba(15,23,42,0.06)] ${
        ok ? "border-green-500/20 bg-gradient-to-br from-white to-green-50" : "border-red-500/20 bg-gradient-to-br from-white to-red-50"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-ink/6 px-3 py-2">
        <div className={`flex h-6 w-6 items-center justify-center rounded-full ${ok ? "bg-green-500/15" : "bg-red-500/15"}`}>
          {ok ? <CheckCircle2 size={12} className="text-green-600" /> : <AlertTriangle size={12} className="text-red-500" />}
        </div>
        <div className="text-[11px] font-extrabold text-ink">
          {ok ? "تم تنفيذ المهمة بنجاح" : "تعذر تنفيذ المهمة"}
        </div>
      </div>
      {ok ? (
        <div className="flex flex-col gap-1.5 p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted">
            <CalendarDays size={12} className="text-brand" />
            الانتهاء المحفوظ: <span className="text-ink">{task.end}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted">
            <BellRing size={12} className="text-amber-500" />
            تذكير تلقائي قبل الانتهاء بـ {task.remindDays || 2} يوم — محفوظ في صفحة كرتي
          </div>
        </div>
      ) : (
        <div className="p-3 text-[10px] font-bold text-red-500">
          حاول مجددًا، أو تحقق من اتصالك بالشبكة.
        </div>
      )}
    </motion.div>
  );
}

function AgentSheet({ open, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-brand/20 bg-white px-5 pt-5 pb-8 shadow-[0_-16px_50px_rgba(15,23,42,0.2)]"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/10" />
            <div className="flex items-center gap-3">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-[0_8px_20px_rgba(8,145,178,0.35)]">
                <Bot size={22} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-extrabold text-ink">دخول وضع الوكيل</div>
                <div className="mt-0.5 text-[10px] text-muted">جلسة مهام منفصلة عن المحادثة</div>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-[10px] leading-5 text-amber-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              سيتم مسح المحادثة الحالية والبدء بجلسة مهام منفصلة تمامًا. هل أنت متأكد؟
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={onCancel} className="flex-1 rounded-xl border border-ink/10 bg-white py-3 text-[11px] font-bold text-muted transition active:scale-[0.97]">
                إلغاء
              </button>
              <button onClick={onConfirm} className="flex-1 rounded-xl bg-gradient-to-l from-brand to-brand-2 py-3 text-[11px] font-bold text-white shadow-[0_8px_20px_rgba(8,145,178,0.35)] transition active:scale-[0.97]">
                دخول الوكيل
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function AIChat({ onBack, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [taskDone, setTaskDone] = useState(false);
  const [knowledge, setKnowledge] = useState([]);
  const [plans, setPlans] = useState([]);
  const [offers, setOffers] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const endRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    return onSnapshot(collection(db, "knowledge"), (snap) =>
      setKnowledge(snap.docs.map((d) => ({ ...d.data() })))
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "plans"), (snap) =>
      setPlans(snap.docs.map((d) => ({ ...d.data() })))
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "offers"), (snap) =>
      setOffers(snap.docs.map((d) => ({ ...d.data() })))
    );
  }, []);

  const fallbackContact = useMemo(() => {
    const entry =
      knowledge.find((k) => (k.title || "").includes("تواصل")) ||
      knowledge.find((k) => /واتساب|هاتف|اتصال|جوال/.test(k.body || ""));
    const nums = extractNumbers((entry ? entry.title + " " : "") + (entry ? entry.body : ""));
    return { phone: nums[0] || "", whatsapp: (nums[1] || nums[0] || "").replace(/^\+/, "") };
  }, [knowledge]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const copyText = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const stop = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  const toggleAgent = () => {
    if (agentMode) {
      setAgentMode(false);
      setMessages([]);
      setTaskDone(false);
      return;
    }
    if (messages.length > 0) {
      setShowAgentModal(true);
    } else {
      setAgentMode(true);
      setTaskDone(false);
    }
  };

  const confirmAgent = () => {
    setShowAgentModal(false);
    setMessages([]);
    setTaskDone(false);
    setAgentMode(true);
  };

  const executeAction = (action) => {
    if (!action) return null;

    if (action.type === "add_card") {
      try {
        localStorage.setItem(CARD_STORAGE_KEY, action.end);
        saveLead({ value: String(action.remindDays || 2), unit: "days" });
        checkReminder();
        return { ...action, status: "ok" };
      } catch (err) {
        return { ...action, status: "fail" };
      }
    }

    if (action.type === "update_card") {
      try {
        const current = localStorage.getItem(CARD_STORAGE_KEY) || "";
        if (!current) return { ...action, status: "empty" };
        localStorage.setItem(CARD_STORAGE_KEY, action.end);
        checkReminder();
        return { ...action, status: "ok" };
      } catch (err) {
        return { ...action, status: "fail" };
      }
    }

    if (action.type === "show_card") {
      const end = localStorage.getItem(CARD_STORAGE_KEY) || "";
      return { ...action, status: end ? "ok" : "empty", end };
    }

    return action;
  };

  const send = async (text) => {
    const clean = (text || "").trim();
    if (!clean || typing) return;

    setInput("");
    const history = messages.slice(-4).map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: clean }]);
    setTyping(true);

    let livePlans = plans;
    let liveOffers = offers;
    try {
      const [pSnap, oSnap] = await Promise.all([
        getDocs(collection(db, "plans")),
        getDocs(collection(db, "offers")),
      ]);
      livePlans = pSnap.docs.map((d) => d.data());
      liveOffers = oSnap.docs.map((d) => d.data());
      setPlans(livePlans);
      setOffers(liveOffers);
    } catch (err) {}

    const controller = new AbortController();
    abortRef.current = controller;

    let result = await askAI({
      question: clean,
      history,
      knowledge,
      live: { plans: livePlans, offers: liveOffers },
      signal: controller.signal,
    });

    if (!result.ok && !result.aborted && result.code === 0) {
      const controller2 = new AbortController();
      abortRef.current = controller2;
      result = await askAI({
        question: clean,
        history,
        knowledge,
        live: { plans: livePlans, offers: liveOffers },
        signal: controller2.signal,
      });
    }

    abortRef.current = null;
    setTyping(false);

    if (result.aborted) return;

    let task = null;
    let finalReply = result.reply;
    const act = result.action;

    if (act) {
      if (act.type === "add_card") {
        if (agentMode) {
          task = executeAction(act);
          if (task.status === "ok") {
            finalReply = "تم حفظ الكرت بنجاح ✅\nراجع صفحة كرتي لعرض الحالة وموعد التذكير.";
            setTaskDone(true);
          } else {
            finalReply = "تعذر حفظ الكرت الآن، أعد المحاولة.";
          }
        } else {
          finalReply = result.reply + "\n(لتنفيذ هذه المهمة فعليًا، فعّل وضع الوكيل من زر الروبوت بالأسفل.)";
        }
      } else if (act.type === "update_card") {
        if (agentMode) {
          task = executeAction(act);
          if (task.status === "ok") {
            finalReply = "تم تعديل الكرت بنجاح ✅\nالتاريخ الجديد: " + task.end + " — محفوظ في صفحة كرتي.";
            setTaskDone(true);
          } else if (task.status === "empty") {
            finalReply = "لا يوجد كرت محفوظ حاليًا لتعديله — سجّل كرتًا أولًا.";
          } else {
            finalReply = "تعذر تعديل الكرت الآن، أعد المحاولة.";
          }
        } else {
          finalReply = result.reply + "\n(لتنفيذ هذه المهمة فعليًا، فعّل وضع الوكيل من زر الروبوت بالأسفل.)";
        }
      } else if (act.type === "show_card") {
        task = executeAction(act);
        finalReply = result.reply;
      }
    }

    setMessages((prev) => [
      ...prev,
      { role: "ai", text: finalReply, action: act || null, task: task },
    ]);
  };

  const presets = agentMode ? AGENT_PRESETS : PRESETS;
  const thinkPhrase = agentMode ? "ينفّذ المهمة…" : "يفكر بعمق…";
  const showDonePanel = agentMode && taskDone && !typing;
  const lead = getLead();

  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-4 pt-5 pb-32">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-ink/8 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.97]"
        >
          <ArrowRight size={15} />
          رجوع
        </button>
        <div className="text-base font-extrabold text-ink">
          {agentMode ? "وكيل الدار نت" : "مساعد الدار نت"}
        </div>
        <span className="w-16" />
      </div>

      <AnimatePresence>
        {agentMode ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-3 flex items-center gap-2.5 rounded-2xl border border-brand/25 bg-gradient-to-l from-brand/10 via-white to-white px-3 py-2.5 shadow-[0_4px_14px_rgba(8,145,178,0.08)]"
          >
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <motion.span
                animate={{ scale: [1, 1.45, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut" }}
                className="absolute inset-0 rounded-xl bg-brand/50"
              />
              <Bot size={15} className="relative" />
            </span>
            <div className="text-[10px] leading-5 text-ink">
              <span className="font-extrabold text-brand">وضع الوكيل مفعّل. </span>
              أستطيع الآن تنفيذ مهام فعلية داخل التطبيق: تسجيل الكروت، تعديلها، عرضها، وضبط التذكيرات — أعطني المهمة وسأنفذها.
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex h-36 w-36 items-center justify-center"
          >
            <LottieIcon data={aiHeroAnim} className="h-36 w-36" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
            className="mt-2 text-base font-extrabold text-ink"
          >
            {agentMode ? "أهلًا، أنا وكيل الدار نت" : "أهلًا، أنا مساعد الدار نت"}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35, ease: "easeOut" }}
            className="mt-1 text-[11px] leading-6 text-muted"
          >
            {agentMode
              ? "أعطني مهمة وسأنفذها داخل التطبيق فورًا"
              : "اسألني عن أي شيء يخص شبكة الدار نت وخدماتها"}
          </motion.div>
        </div>
      ) : null}

      {messages.length === 0 ? (
        <section className="grid grid-cols-2 gap-2">
          {presets.map((q, i) => (
            <motion.button
              key={q}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 + i * 0.06, duration: 0.3, ease: "easeOut" }}
              onClick={() => send(q)}
              className={`flex items-center gap-2 rounded-2xl border p-3 text-right text-[11px] font-bold text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.97] ${
                agentMode ? "border-brand/30 bg-brand/5" : "border-brand/20 bg-white"
              }`}
            >
              <Sparkles size={14} className="shrink-0 text-brand" />
              {q}
            </motion.button>
          ))}
        </section>
      ) : null}

      <section className="mt-4 flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div className={`flex max-w-[85%] flex-col ${m.role === "user" ? "items-start" : "items-end"}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs leading-6 ${
                    m.role === "user"
                      ? "rounded-bl-md bg-brand text-white"
                      : "rounded-br-md border border-ink/8 bg-white text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                  }`}
                  {...(m.role === "ai"
                    ? { dangerouslySetInnerHTML: { __html: formatReply(m.text) } }
                    : {})}
                >
                  {m.role === "user" ? m.text : null}
                </div>

                {m.role === "ai" && m.action && m.action.type === "contact" ? (
                  <ContactCard
                    phone={m.action.phone || fallbackContact.phone}
                    whatsapp={(m.action.whatsapp || fallbackContact.whatsapp || "").replace(/\D/g, "")}
                  />
                ) : null}

                {m.role === "ai" && m.action && m.action.type === "show_plans" ? (
                  <PlansCard plans={plans} />
                ) : null}

                {m.role === "ai" && m.action && m.action.type === "show_offers" ? (
                  <OffersCard offers={offers} />
                ) : null}

                {m.role === "ai" && m.action && m.action.type === "show_about" ? (
                  <AboutCard />
                ) : null}

                {m.role === "ai" && m.action && m.action.type === "show_login_help" ? (
                  <LoginHelpCard onNavigate={onNavigate} />
                ) : null}

                {m.role === "ai" && m.task && m.task.type === "show_card" ? (
                  <CardViewCard end={m.task.end || ""} lead={lead} />
                ) : null}

                {m.role === "ai" && m.task && (m.task.type === "add_card" || m.task.type === "update_card") ? (
                  <TaskCard task={m.task} />
                ) : null}

                {m.role === "ai" ? (
                  <button
                    onClick={() => copyText(m.text, i)}
                    className="mt-1 flex items-center gap-1 rounded-lg border border-ink/8 bg-white/70 px-2 py-1 text-[10px] font-bold text-muted transition active:scale-[0.95]"
                  >
                    {copiedId === i ? (
                      <>
                        <Check size={11} className="text-green-600" />
                        <span className="text-green-600">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {typing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
            <div className="flex items-center gap-2 rounded-2xl rounded-br-md border border-ink/8 bg-white px-4 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
                className="h-3 w-3 rounded-full border-2 border-brand/25 border-t-brand"
              />
              <span className="text-[11px] font-bold text-brand">{thinkPhrase}</span>
            </div>
          </motion.div>
        ) : null}
        <div ref={endRef} />
      </section>

      <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        <AnimatePresence mode="wait">
          {showDonePanel ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="w-full max-w-[900px] rounded-2xl border border-green-500/25 bg-white p-3 shadow-[0_16px_40px_rgba(16,185,129,0.15)]"
            >
              <div className="flex items-center gap-2 px-1 pb-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-500/15">
                  <CheckCircle2 size={15} className="text-green-600" />
                </span>
                <div className="flex-1 text-[11px] font-extrabold text-ink">
                  انتهت المهمة بنجاح — يمكنك مراجعة صفحة كرتي الآن.
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTaskDone(false)}
                  className="flex-1 rounded-xl border border-brand/30 bg-brand/5 py-2.5 text-[11px] font-bold text-brand transition active:scale-[0.97]"
                >
                  مهمة جديدة
                </button>
                <button
                  onClick={toggleAgent}
                  className="flex-1 rounded-xl bg-brand py-2.5 text-[11px] font-bold text-white shadow-[0_8px_20px_rgba(8,145,178,0.35)] transition active:scale-[0.97]"
                >
                  الخروج من وضع الوكيل
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`flex w-full max-w-[900px] items-center gap-2 rounded-2xl border bg-white p-2 transition ${
                agentMode
                  ? "border-brand/40 shadow-[0_16px_40px_rgba(8,145,178,0.2)]"
                  : "border-ink/8 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
              }`}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder={
                  typing && agentMode
                    ? "انتظر حتى اكتمال المهمة الحالية…"
                    : agentMode
                      ? "أعطني مهمة لتنفيذها..."
                      : "اكتب سؤالك هنا..."
                }
                className="flex-1 bg-transparent px-3 py-2 text-xs text-ink outline-none"
              />

              {agentMode ? (
                <button
                  onClick={toggleAgent}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-white text-brand transition active:scale-[0.95]"
                >
                  <MessageSquare size={16} />
                </button>
              ) : (
                <button
                  onClick={toggleAgent}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink/10 bg-white text-muted transition active:scale-[0.95]"
                >
                  <Bot size={16} />
                </button>
              )}

              {typing ? (
                <button
                  onClick={stop}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white transition active:scale-[0.95]"
                >
                  <Square size={13} className="fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition active:scale-[0.95] disabled:opacity-40"
                >
                  <Send size={16} className="-scale-x-100" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AgentSheet
        open={showAgentModal}
        onConfirm={confirmAgent}
        onCancel={() => setShowAgentModal(false)}
      />
    </main>
  );
}

export default AIChat;