import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight, Send, Sparkles, Copy, Check, Phone, MessageCircle, Square, Bot,
  AlertTriangle, CheckCircle2, CalendarDays, BellRing, MessageSquare, CreditCard,
  Package, Gift, Users, KeyRound, Shield, Zap, Headphones, Eye, EyeOff, History, Mic,
  ShoppingCart, Banknote, Wallet, UserPlus, Clock, XCircle,
} from "lucide-react";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { saveLead, getLead, checkReminder } from "../utils/reminder";
import LottieIcon from "../components/LottieIcon";
import aiHeroAnim from "../assets/lottie/ai-hero.json";
import { askAI } from "../utils/ai";
import { formatRemaining, addDaysToNow, addHoursToNow } from "../utils/cardTime";

const PRESETS = [
  "كيف أفعّل كرت جديد؟",
  "وش الفئات وأسعارها؟",
  "النت بطيء عندي، وش الحل؟",
  "كيف أتواصل مع الإدارة؟",
];

const AGENT_PRESETS = [
  "سجّل كرت جديد يبدأ اليوم وينتهي بعد 30 يومًا",
  "نبهني قبل خمسة أيام من الانتهاء",
  "ودني على صفحة العروض",
  "وش المهام اللي سويتها لي؟",
];

const CARD_STORAGE_KEY = "aldar-card-expiry";
const AGENT_LOG_KEY = "aldar-agent-log";
const PAY_NUMBER = "254219775";
const PURCHASE_CACHE_KEY = "aldar-purchase-history-cache";
const PLANS_CACHE_KEY = "aldar-plans-cache";
const STOCK_CACHE_KEY = "aldar-stock-cache";

const PAGE_LABELS = {
  home: "الرئيسية",
  plans: "الفئات",
  offers: "العروض",
  card: "كرتي",
  about: "من نحن",
  contact: "تواصل",
  purchase: "شراء كرت",
  "purchase-history": "عمليات الشراء",
  reseller: "حساب موزع",
};

function readLog() {
  try {
    const list = JSON.parse(localStorage.getItem(AGENT_LOG_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLog(list) {
  try {
    localStorage.setItem(AGENT_LOG_KEY, JSON.stringify(list.slice(-20)));
  } catch {}
}

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

function extractJSON(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}

function getLastRequestFromCache() {
  try {
    const data = JSON.parse(localStorage.getItem(PURCHASE_CACHE_KEY) || "[]");
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

function getStockFromCache() {
  try {
    const data = JSON.parse(localStorage.getItem(STOCK_CACHE_KEY) || "{}");
    return data || {};
  } catch {
    return {};
  }
}

function getPlansFromCache() {
  try {
    const data = JSON.parse(localStorage.getItem(PLANS_CACHE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const ORDER_STATUS_META = {
  pending: { label: "قيد المراجعة", Icon: Clock, cls: "text-amber-500 bg-amber-50 border-amber-200" },
  approved: { label: "تمت الموافقة", Icon: CheckCircle2, cls: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: "مرفوض", Icon: XCircle, cls: "text-red-500 bg-red-50 border-red-200" },
};

function localActionFor(question) {
  const q = (question || "").toLowerCase();
  const wantsSteps = /طريق|كيف|خطوات|اشتري|أشتري|شراء|شرا|سند|احول|أحول|ادفع|أدفع/.test(q);
  const wantsNumber = /رقمكم|رقم العمقي|وين احول|وين أحول|وش الرقم|الرقم الرسمي/.test(q);
  if (/فئ|باق|اسعار|أسعار|بكم|كم سعر/.test(q)) return { type: "show_plans", mode: "all" };
  if (/عرض|عروض|تخفيض|خصم/.test(q)) return { type: "show_offers" };
  if (/من انتم|من أنت|من المالك|من المدير|عن الشبكة|هدف/.test(q)) return { type: "show_about" };
  if (/تواصل|واتساب|اتصال|رقم.*ادارة|الإدارة/.test(q)) return { type: "contact", channel: "both" };
  if (/بيع|موزع|رصيد|اربح|أربح|ربح/.test(q)) return { type: "show_reseller" };
  if (/حساب موزع|تسجيل موزع|وثيق|بطاقه|بطاقة|اصير موزع/.test(q)) return { type: "show_account" };
  if (/رمز دخول|باسورد|كلمة سر|كيف ادخل|وين اسجل/.test(q)) return { type: "show_login_help" };
  if (/اخر طلب|آخر طلب|طلبي الاخير|طلبي الأخير|وش طلبي|طلبتي/.test(q)) return { type: "show_last_order" };
  if (/المخزون|متوفر|في كروت|كم كرت|كم عندكم/.test(q)) return { type: "show_stock" };
  if (wantsSteps) return { type: "show_buy" };
  if (wantsNumber) return { type: "show_payment" };
  return null;
}

function forceCorrectAction(question, act) {
  const q = (question || "").toLowerCase();
  if (/اخر طلب|آخر طلب|طلبي الاخير|طلبي الأخير|وش طلبي|طلبتي/.test(q)) {
    return { type: "show_last_order" };
  }
  if (/المخزون|متوفر|في كروت|كم كرت|كم عندكم/.test(q)) {
    return { type: "show_stock" };
  }
  return act;
}

function findPlanByIdOrPrice(plans, planId, planPrice) {
  if (!plans || plans.length === 0) return null;
  let matched = plans.find((p) => p.id === planId);
  if (matched) return matched;
  if (planPrice) {
    matched = plans.find((p) => Number(p.price) === Number(planPrice));
  }
  return matched || null;
}

function CardShell({ icon: Icon, tone, title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className={`mt-3 w-full overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${tone.bg} ${tone.border}`}
    >
      <div className={`flex items-center gap-2.5 border-b px-4 py-3 ${tone.headerBg}`}>
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${tone.chip}`}>
          <Icon size={14} className={tone.text} />
        </div>
        <div className="text-xs font-extrabold text-ink">{title}</div>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

function StepRows({ steps, tone }) {
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white ${tone.dot}`}>
            {i + 1}
          </span>
          <div className="flex-1 text-[11px] leading-6 text-muted">{s}</div>
        </div>
      ))}
    </div>
  );
}

function PaymentCard() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PAY_NUMBER);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <CardShell icon={Banknote} tone={{ bg: "to-green-50/80", border: "border-green-500/30", headerBg: "bg-green-500/10", chip: "bg-green-500/20", text: "text-green-600" }} title="رقم الدفع الرسمي — عمقي">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div dir="ltr" className="text-lg font-extrabold tracking-wider text-ink">{PAY_NUMBER}</div>
        <button
          onClick={copy}
          className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(34,197,94,0.3)] transition active:scale-[0.95]"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "تم النسخ" : "نسخ الرقم"}
        </button>
      </div>
      <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-amber-50 p-3 text-[11px] leading-6 text-amber-700">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        حوّل لهذا الرقم فقط الظاهر داخل التطبيق، ولا تعتمد أي رقم يصلك من جهات خارجية.
      </div>
    </CardShell>
  );
}

function BuyCard() {
  const steps = [
    "اختر فئة الكرت اللي تبغاها من التطبيق.",
    "حوّل المبلغ لرقم العمقي الرسمي الظاهر في بطاقة الدفع.",
    "أرسل طلب الشراء باسمك ورقمك وأرفق السند PDF أو صورة واضحة.",
    "انتظر مراجعة الإدارة واعتماد طلبك.",
    "كرتك يُسحب تلقائيًا ويظهر لك في صفحة عمليات الشراء.",
  ];
  return (
    <CardShell icon={ShoppingCart} tone={{ bg: "to-brand/5", border: "border-brand/25", headerBg: "bg-brand/10", chip: "bg-brand/20", text: "text-brand" }} title="شراء كرت مباشر">
      <StepRows steps={steps} tone={{ dot: "bg-brand" }} />
      <div className="mt-3 rounded-xl bg-brand/5 p-3 text-[11px] leading-6 text-muted">
        السند الواضح اللي يبين المبلغ والتاريخ يسرّع اعتماد طلبك بشكل كبير.
      </div>
    </CardShell>
  );
}

function ResellerCard() {
  const steps = [
    "أنشئ حساب موزع وانتظر موافقة المدير.",
    "المدير يشحن رصيدك بعد الاتفاق والتحقق من الدفع.",
    "اسحب الكروت من رصيدك بسعر تكلفة مخفض وقت ما تحب.",
    "بيع لعملائك بالسعر الرسمي.",
    "الفرق بين التكلفة وسعر البيع ربحك في كل كرت.",
  ];
  return (
    <CardShell icon={Wallet} tone={{ bg: "to-amber-50/80", border: "border-amber-500/30", headerBg: "bg-amber-500/10", chip: "bg-amber-500/20", text: "text-amber-600" }} title="نظام الموزعين — بيع واربح">
      <StepRows steps={steps} tone={{ dot: "bg-amber-500" }} />
      <div className="mt-3 rounded-xl bg-white p-3 text-[11px] leading-6 text-muted shadow-sm">
        مثال: فئة 2000 ريال تكلفتها عليك 1800 ← ربحك 200 ريال في كل كرت تبيعه.
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] leading-6 text-amber-700">
        الرصيد يشحنه المدير فقط — ما في شحن تلقائي من سند أو رسالة.
      </div>
    </CardShell>
  );
}

function AccountCard() {
  const rows = [
    "الاسم الثلاثي واضحًا.",
    "رقم جوال فعال.",
    "بريد إلكتروني وكلمة مرور للحساب.",
    "صورة وثيقة أو بطاقة، أو أي صورة عند الإدارة إذا كنت معروفًا.",
  ];
  return (
    <CardShell icon={UserPlus} tone={{ bg: "to-brand/5", border: "border-brand/25", headerBg: "bg-brand/10", chip: "bg-brand/20", text: "text-brand" }} title="إنشاء حساب معتمد">
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-sm">
            <CheckCircle2 size={14} className="shrink-0 text-brand" />
            <span className="text-[11px] font-bold text-muted">{r}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-brand/5 p-3 text-[11px] leading-6 text-muted">
        الحساب ما يتفعل إلا بعد موافقة المدير على طلبك — المعروف تكفيه أي صورة عند الإدارة، والجديد تُطلب منه وثيقة واضحة.
      </div>
    </CardShell>
  );
}

function ContactCard({ phone, whatsapp, channel }) {
  const waNum = (whatsapp || phone || "").replace(/\D/g, "");
  const ch = channel || "both";
  const showCall = (ch === "both" || ch === "call") && phone;
  const showWa = (ch === "both" || ch === "whatsapp") && waNum;
  if (!showCall && !showWa) return null;

  const call = () => { window.location.href = "tel:" + phone; };
  const wa = () => {
    window.open(
      "https://wa.me/" + waNum + "?text=" + encodeURIComponent("السلام عليكم، أحتاج مساعدة بخصوص الشبكة"),
      "_blank"
    );
  };

  const headerTitle =
    ch === "whatsapp" ? "تواصل عبر واتساب" : ch === "call" ? "اتصال مباشر بالإدارة" : "تواصل مباشر مع الإدارة";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-3 w-full overflow-hidden rounded-2xl border-2 border-brand/25 bg-gradient-to-br from-white to-brand/5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-2.5 border-b border-brand/10 bg-brand/10 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20">
          <MessageCircle size={14} className="text-brand" />
        </div>
        <div className="text-xs font-extrabold text-ink">{headerTitle}</div>
      </div>
      <div className="flex gap-3 p-4">
        {showCall ? (
          <button onClick={call} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-3 text-xs font-bold text-white shadow-[0_4px_12px_rgba(8,145,178,0.3)] transition active:scale-[0.97]">
            <Phone size={14} />
            اتصال
          </button>
        ) : null}
        {showWa ? (
          <button onClick={wa} className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-ink/10 bg-white py-3 text-xs font-bold text-ink shadow-sm transition active:scale-[0.97]">
            <MessageCircle size={14} className="text-green-600" />
            واتساب
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

function PlansCard({ plans, title }) {
  if (!plans || plans.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-3 w-full overflow-hidden rounded-2xl border-2 border-brand/25 bg-gradient-to-br from-white to-brand/5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-2.5 border-b border-brand/10 bg-brand/10 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20">
          <Package size={14} className="text-brand" />
        </div>
        <div className="text-xs font-extrabold text-ink">{title || "فئاتنا الحالية"}</div>
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        {plans.map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-brand/10 bg-white p-4 shadow-sm">
            <div className="flex-1">
              <div className="text-base font-extrabold text-ink">{p.price} ريال</div>
              <div className="mt-1 text-[11px] text-muted">{p.gb} قيقا — {p.days}</div>
            </div>
            {p.tag ? (
              <span className="rounded-full bg-brand/10 px-3 py-1.5 text-[10px] font-extrabold text-brand">
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-3 w-full overflow-hidden rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-white to-amber-50/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-2.5 border-b border-amber-500/15 bg-amber-500/10 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20">
          <Gift size={14} className="text-amber-500" />
        </div>
        <div className="text-xs font-extrabold text-ink">عروضنا الحالية</div>
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        {offers.map((o, i) => (
          <div key={i} className="rounded-xl border border-amber-500/10 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="text-base font-extrabold text-ink">{o.title}</div>
              {o.tag ? (
                <span className="rounded-full bg-amber-500/15 px-3 py-1.5 text-[10px] font-extrabold text-amber-600">
                  {o.tag}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 text-[11px] leading-6 text-muted">{o.body}</div>
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-3 w-full overflow-hidden rounded-2xl border-2 border-brand/25 bg-gradient-to-br from-white to-brand/5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-2.5 border-b border-brand/10 bg-brand/10 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20">
          <Users size={14} className="text-brand" />
        </div>
        <div className="text-xs font-extrabold text-ink">من نحن</div>
      </div>
      <div className="p-4">
        <div className="text-base font-extrabold text-ink">شبكة الدار نت</div>
        <div className="mt-1.5 text-[11px] leading-6 text-muted">
          شبكة إنترنت محلية تهدف إلى تقديم خدمة سهلة وواضحة لكل العملاء، بكرات محددة الفئات وأسعار ثابتة وخدمة تسعى للتطور باستمرار.
        </div>
        <div className="mt-4 text-xs font-extrabold text-brand">هدفنا</div>
        <div className="mt-1.5 text-[11px] leading-6 text-muted">
          أن يصل كل عميل إلى خدمته بأسرع طريق: تطبيق واحد يجمع الفئات، الكروت، الإشعارات، ووسائل التواصل في مكان واحد.
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {values.map((v) => {
            const Icon = v.Icon;
            return (
              <div key={v.title} className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 text-center shadow-sm">
                <Icon size={16} className="text-brand" />
                <div className="text-[11px] font-extrabold text-ink">{v.title}</div>
                <div className="text-[9px] leading-4 text-muted">{v.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function LoginHelpCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-3 w-full overflow-hidden rounded-2xl border-2 border-brand/25 bg-gradient-to-br from-white to-brand/5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-2.5 border-b border-brand/10 bg-brand/10 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20">
          <KeyRound size={14} className="text-brand" />
        </div>
        <div className="text-xs font-extrabold text-ink">رمز الدخول / تسجيل الدخول</div>
      </div>
      <div className="p-4">
        <div className="text-[11px] leading-6 text-muted">
          الشبكة لا تعتمد على رمز دخول أو تسجيل حساب — بوابتك هي <span className="font-extrabold text-ink">كرتك الشخصي</span>.
          فقط أدخل بيانات الكرت في صفحة <span className="font-extrabold text-brand">كرتي</span> ليحفظ تاريخ الانتهاء وتصلك التذكيرات.
        </div>
      </div>
    </motion.div>
  );
}

function LastOrderCard({ request, plan, hiddenCodes, setHiddenCodes, copiedId, setCopiedId }) {
  if (!request) return null;
  const meta = ORDER_STATUS_META[request.status] || ORDER_STATUS_META.pending;
  const StatusIcon = meta.Icon;
  const isHidden = hiddenCodes[request.id];
  const toggleVisibility = () => setHiddenCodes((prev) => ({ ...prev, [request.id]: !prev[request.id] }));
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(request.cardCode); } catch {}
    setCopiedId(request.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const displayPlan = plan || (request.planPrice ? { price: request.planPrice, gb: "?", days: "" } : null);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className={`mt-3 w-full overflow-hidden rounded-2xl border-2 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${meta.cls.split(" ").find((c) => c.startsWith("border-"))}`}>
      <div className={`flex items-center justify-between border-b px-4 py-3 ${meta.cls.split(" ").slice(1).join(" ")}`}>
        <div className="flex items-center gap-2">
          <StatusIcon size={16} />
          <span className="text-xs font-extrabold">{meta.label}</span>
        </div>
        <span className="text-[10px] font-semibold text-slate-400">{new Date(request.createdAt || 0).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}</span>
      </div>
      <div className="p-4">
        <div className="text-base font-extrabold text-ink">
          {displayPlan
            ? `${displayPlan.price} ريال${displayPlan.gb && displayPlan.gb !== "?" ? ` — ${displayPlan.gb} قيقا` : ""}${displayPlan.days ? ` — ${displayPlan.days}` : ""}`
            : "فئة غير محددة"}
        </div>
        {request.status === "approved" && request.cardCode ? (
          <div className="mt-3 rounded-xl bg-green-50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-green-700">الكرت المسحوب</div>
              <div className="flex gap-1.5">
                <button onClick={toggleVisibility} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-green-600 transition active:scale-[0.95]">
                  {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={copyCode} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-green-600 transition active:scale-[0.95]">
                  {copiedId === request.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div dir="ltr" className={`mt-1 text-lg font-extrabold tracking-wider ${isHidden ? "text-transparent select-none" : "text-ink"}`}>{isHidden ? "••••••••" : request.cardCode}</div>
          </div>
        ) : null}
        {request.status === "rejected" ? (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-[11px] leading-5 text-red-600">تم رفض طلبك. إذا كنت تعتقد أن هذا خطأ، تواصل مع الإدارة عبر صفحة التواصل.</div>
        ) : null}
      </div>
    </motion.div>
  );
}

function StockCard({ stock, plans }) {
  const entries = Object.entries(stock).filter(([_, count]) => count > 0);
  if (entries.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className="mt-3 w-full overflow-hidden rounded-2xl border-2 border-brand/25 bg-gradient-to-br from-white to-brand/5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-2.5 border-b border-brand/10 bg-brand/10 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20"><Package size={14} className="text-brand" /></div>
        <div className="text-xs font-extrabold text-ink">المخزون المتوفر</div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {entries.map(([planId, count]) => {
          const p = plans.find((x) => x.id === planId);
          const label = p
            ? `${p.price} ريال — ${p.gb} قيقا — ${p.days || ""}`
            : `فئة ${planId}`;
          return (
            <motion.div
              key={planId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * entries.findIndex(([id]) => id === planId) }}
              className="flex items-center justify-between rounded-xl border border-brand/10 bg-white p-3 shadow-sm"
            >
              <div className="text-sm font-extrabold text-ink">{label}</div>
              <div className="rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold text-brand">{count} كرت</div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function CardViewCard({ end, lead }) {
  const rem = formatRemaining(end);
  const tone = !rem ? "text-muted" : rem.expired ? "text-red-500" : (rem.days === 0 ? "text-amber-500" : "text-emerald-500");
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-3 w-full overflow-hidden rounded-2xl border-2 border-brand/25 bg-gradient-to-br from-white to-brand/5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-2.5 border-b border-brand/10 bg-brand/10 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20">
          <CreditCard size={14} className="text-brand" />
        </div>
        <div className="text-xs font-extrabold text-ink">كرتك الحالي</div>
      </div>
      {end ? (
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted">
            <CalendarDays size={14} className="text-brand" />
            ينتهي في: <span className="text-ink">{new Date(end).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}</span>
          </div>
          <div className={`flex items-center gap-2.5 text-[11px] font-bold ${tone}`}>
            <CheckCircle2 size={14} />
            {rem ? rem.text : "—"}
          </div>
          <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted">
            <BellRing size={14} className="text-amber-500" />
            التذكير قبل: {lead.value} {lead.unit === "days" ? "يوم" : "ساعة"}
          </div>
        </div>
      ) : (
        <div className="p-4 text-[11px] font-bold text-muted">
          لا يوجد كرت محفوظ حاليًا — سجّل كرتًا أولًا عبر الوكيل أو صفحة كرتي.
        </div>
      )}
    </motion.div>
  );
}

function TaskCard({ task }) {
  const ok = task.status === "ok";

  const rows = [];
  if (task.end) {
    const rem = formatRemaining(task.end);
    rows.push({ Icon: CalendarDays, tone: "text-brand", text: "ينتهي في: " + new Date(task.end).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" }) });
    if (rem) rows.push({ Icon: CheckCircle2, tone: rem.expired ? "text-red-500" : (rem.days === 0 ? "text-amber-500" : "text-emerald-500"), text: rem.text });
  }
  if (task.type === "set_reminder") {
    rows.push({ Icon: BellRing, tone: "text-amber-500", text: "التذكير قبل " + task.value + (task.unit === "hours" ? " ساعة" : " يوم") });
  }
  if (task.type === "clear_card") {
    rows.push({ Icon: BellRing, tone: "text-amber-500", text: "تم تصفير الكرت وإعدادات التذكير — الصفحة جاهزة من جديد" });
  }
  if ((task.type === "add_card" || task.type === "update_card") && task.remindDays) {
    rows.push({ Icon: BellRing, tone: "text-amber-500", text: "تذكير تلقائي قبل الانتهاء بـ " + task.remindDays + " يوم — محفوظ في صفحة كرتي" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className={`mt-3 w-full overflow-hidden rounded-2xl border-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${
        ok ? "border-green-500/30 bg-gradient-to-br from-white to-green-50/80" : "border-red-500/30 bg-gradient-to-br from-white to-red-50/80"
      }`}
    >
      <div className={`flex items-center gap-2.5 border-b px-4 py-3 ${ok ? "bg-green-500/10" : "bg-red-500/10"}`}>
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${ok ? "bg-green-500/20" : "bg-red-500/20"}`}>
          {ok ? <CheckCircle2 size={14} className="text-green-600" /> : <AlertTriangle size={14} className="text-red-500" />}
        </div>
        <div className="text-xs font-extrabold text-ink">
          {ok ? "تم تنفيذ المهمة بنجاح" : "تعذر تنفيذ المهمة"}
        </div>
      </div>
      {ok ? (
        <div className="flex flex-col gap-2 p-4">
          {rows.map((r, i) => {
            const Icon = r.Icon;
            return (
              <div key={i} className="flex items-center gap-2.5 text-[11px] font-bold text-muted">
                <Icon size={14} className={r.tone} />
                {r.text}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 text-[11px] font-bold text-red-500">
          حاول مجددًا، أو تحقق من اتصالك بالشبكة.
        </div>
      )}
    </motion.div>
  );
}

function TaskLogCard({ entries }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-3 w-full overflow-hidden rounded-2xl border-2 border-brand/25 bg-gradient-to-br from-white to-brand/5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-2.5 border-b border-brand/10 bg-brand/10 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20">
          <History size={14} className="text-brand" />
        </div>
        <div className="text-xs font-extrabold text-ink">سجل مهام الوكيل</div>
      </div>
      {entries && entries.length > 0 ? (
        <div className="flex flex-col gap-2 p-4">
          {entries.map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
              <div className="flex-1 text-[11px] font-bold text-ink">{e.label}</div>
              <div className="shrink-0 text-[10px] font-bold text-muted">
                {new Date(e.at).toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 text-[11px] font-bold text-muted">
          ما نفذت لك مهام بعد — أعطني أول مهمة وسأسجلها هنا.
        </div>
      )}
    </motion.div>
  );
}

function WaReportCard({ url, preview }) {
  if (!url) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="mt-3 w-full overflow-hidden rounded-2xl border-2 border-green-500/30 bg-gradient-to-br from-white to-green-50/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-2.5 border-b border-green-500/15 bg-green-500/10 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20">
          <MessageCircle size={14} className="text-green-600" />
        </div>
        <div className="text-xs font-extrabold text-ink">رسالة واتساب جاهزة للإدارة</div>
      </div>
      <div className="p-4">
        <div className="whitespace-pre-line rounded-xl border border-green-500/15 bg-white p-4 text-[11px] leading-6 text-muted shadow-sm">
          {preview}
        </div>
        <button
          onClick={() => window.open(url, "_blank", "noopener")}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-xs font-bold text-white shadow-[0_6px_16px_rgba(34,197,94,0.3)] transition active:scale-[0.97]"
        >
          <Send size={14} className="-scale-x-100" />
          افتح واتساب والرسالة جاهزة
        </button>
      </div>
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

function pickPlans(plans, mode) {
  if (!plans || plans.length === 0) return { list: [], title: "فئاتنا الحالية" };
  if (mode === "cheapest") {
    const p = plans.reduce((a, b) => (Number(b.price) < Number(a.price) ? b : a));
    return { list: [p], title: "أقل فئة عندنا" };
  }
  if (mode === "expensive") {
    const p = plans.reduce((a, b) => (Number(b.price) > Number(a.price) ? b : a));
    return { list: [p], title: "أعلى فئة عندنا" };
  }
  if (mode === "biggest_gb") {
    const p = plans.reduce((a, b) => (Number(b.gb) > Number(a.gb) ? b : a));
    return { list: [p], title: "أكبر فئة من حيث القيقا" };
  }
  return { list: plans, title: "فئاتنا الحالية" };
}

const TASK_ACTIONS = ["add_card", "update_card", "set_reminder", "clear_card", "navigate", "open_purchase", "open_purchase_history", "open_reseller", "whatsapp_report", "show_task_log", "show_last_order", "show_stock"];

function AIChat({ onBack, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [taskDone, setTaskDone] = useState(false);
  const [knowledge, setKnowledge] = useState([]);
  const [plans, setPlans] = useState(getPlansFromCache);
  const [offers, setOffers] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [hiddenCodes, setHiddenCodes] = useState({});
  const [lastRequest, setLastRequest] = useState(getLastRequestFromCache);
  const [stock, setStock] = useState(getStockFromCache);
  const endRef = useRef(null);
  const abortRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    return onSnapshot(collection(db, "knowledge"), (snap) =>
      setKnowledge(snap.docs.map((d) => ({ ...d.data() })))
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "plans"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPlans(data);
      try { localStorage.setItem(PLANS_CACHE_KEY, JSON.stringify(data)); } catch {}
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "offers"), (snap) =>
      setOffers(snap.docs.map((d) => ({ ...d.data() })))
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "purchaseRequests"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (data.length > 0) setLastRequest(data[0]);
      try { localStorage.setItem(PURCHASE_CACHE_KEY, JSON.stringify(data)); } catch {}
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "availableCards"), (snap) => {
      const counts = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === "available" && data.planId) {
          counts[data.planId] = (counts[data.planId] || 0) + 1;
        }
      });
      setStock(counts);
      try { localStorage.setItem(STOCK_CACHE_KEY, JSON.stringify(counts)); } catch {}
    });
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (recognitionRef.current) recognitionRef.current.abort();
      } catch {}
    };
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

  const pushAppNote = (text) => {
    setMessages((prev) => [...prev, { role: "app", text }]);
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

  const logTask = (label) => {
    const list = readLog();
    list.push({ label, at: Date.now() });
    writeLog(list);
  };

  const executeAction = (action) => {
    if (!action) return null;

    if (action.type === "add_card") {
      try {
        const unit = action.unit === "hours" ? "hours" : "days";
        const amount = Number(action.value ?? (unit === "hours" ? action.hours : action.days) ?? 0);
        const endISO = unit === "hours" ? addHoursToNow(amount) : addDaysToNow(amount);
        localStorage.setItem(CARD_STORAGE_KEY, endISO);
        saveLead({ value: String(action.remindDays || 2), unit: "days" });
        checkReminder();
        logTask("تسجيل كرت حتى " + new Date(endISO).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" }));
        return { ...action, end: endISO, status: "ok" };
      } catch (err) {
        return { ...action, status: "fail" };
      }
    }

    if (action.type === "update_card") {
      try {
        const current = localStorage.getItem(CARD_STORAGE_KEY) || "";
        if (!current) return { ...action, status: "empty" };
        const unit = action.unit === "hours" ? "hours" : "days";
        const amount = Number(action.value ?? (unit === "hours" ? action.hours : action.days) ?? 0);
        const endISO = unit === "hours" ? addHoursToNow(amount) : addDaysToNow(amount);
        localStorage.setItem(CARD_STORAGE_KEY, endISO);
        checkReminder();
        logTask("تعديل انتهاء الكرت إلى " + new Date(endISO).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" }));
        return { ...action, end: endISO, status: "ok" };
      } catch (err) {
        return { ...action, status: "fail" };
      }
    }

    if (action.type === "set_reminder") {
      try {
        const value = Math.max(1, parseInt(action.value, 10) || 1);
        const unit = action.unit === "hours" ? "hours" : "days";
        saveLead({ value: String(value), unit });
        checkReminder();
        logTask("ضبط التذكير قبل " + value + (unit === "hours" ? " ساعة" : " يوم"));
        return { ...action, value, unit, status: "ok" };
      } catch (err) {
        return { ...action, status: "fail" };
      }
    }

    if (action.type === "clear_card") {
      try {
        localStorage.removeItem(CARD_STORAGE_KEY);
        saveLead({ value: "3", unit: "days" });
        checkReminder();
        logTask("مسح الكرت وبدء صفحة جديدة");
        return { ...action, status: "ok" };
      } catch (err) {
        return { ...action, status: "fail" };
      }
    }

    if (action.type === "navigate") {
      const label = PAGE_LABELS[action.page];
      if (!label) return { ...action, status: "fail" };
      logTask("الانتقال إلى صفحة " + label);
      return { ...action, status: "ok", label };
    }

    if (action.type === "whatsapp_report") {
      const waNum = (fallbackContact.whatsapp || fallbackContact.phone || "").replace(/\D/g, "");
      if (!waNum) return { ...action, status: "fail" };
      const topic = action.topic || "استفسار عام";
      const detail = action.detail || "";
      const preview =
        "السلام عليكم، رسالة من تطبيق الدار نت:\nالموضوع: " + topic +
        (detail ? "\nالتفاصيل: " + detail : "") +
        "\n— أُرسلت عبر مساعد الدار نت";
      const url = "https://wa.me/" + waNum + "?text=" + encodeURIComponent(preview);
      logTask("تجهيز رسالة واتساب: " + topic);
      return { ...action, status: "ok", url, preview };
    }

    if (action.type === "show_task_log") {
      return { ...action, status: "ok", entries: readLog().slice().reverse() };
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
      livePlans = pSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      mode: agentMode ? "agent" : "chat",
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
        mode: agentMode ? "agent" : "chat",
        signal: controller2.signal,
      });
    }

    abortRef.current = null;
    setTyping(false);

    if (result.aborted) return;

    let task = null;
    let finalReply = result.reply || "";
    let plansCard = null;

    let act = result.action;
    if (!act || typeof act !== "object") {
      const parsed = extractJSON(result.reply);
      if (parsed && parsed.action) {
        act = parsed.action;
        if (parsed.reply) finalReply = parsed.reply;
      }
    }

    act = forceCorrectAction(clean, act);

    if (!agentMode) {
      if (act && TASK_ACTIONS.includes(act.type)) {
        finalReply = "هذي المهمة تحتاج تنفيذ — اضغط على زر الوكيل بالأسفل وسأنفذها لك فورًا 🤖";
        act = null;
      } else if (!act || typeof act !== "object") {
        act = localActionFor(clean);
      }
      if (act && (act.type === "show_payment" || act.type === "show_buy")) {
        const q = clean.toLowerCase();
        const wantsSteps = /طريق|كيف|خطوات|اشتري|أشتري|شراء|شرا|سند|احول|أحول|ادفع|أدفع/.test(q);
        act = { type: wantsSteps ? "show_buy" : "show_payment" };
      }
      if (act && act.type === "show_plans" && (!livePlans || livePlans.length === 0)) {
        act = localActionFor(clean);
        if (!act || act.type === "show_plans") act = null;
      }
    } else {
      if (!act || typeof act !== "object") {
        act = localActionFor(clean);
      }
      if (act && (act.type === "show_payment" || act.type === "show_buy")) {
        const q = clean.toLowerCase();
        const wantsSteps = /طريق|كيف|خطوات|اشتري|أشتري|شراء|شرا|سند|احول|أحول|ادفع|أدفع/.test(q);
        act = { type: wantsSteps ? "show_buy" : "show_payment" };
      }
      if (act && act.type === "show_plans" && (!livePlans || livePlans.length === 0)) {
        act = localActionFor(clean);
        if (!act || act.type === "show_plans") act = null;
      }
    }

    const MODIFY_TASKS = ["add_card", "update_card", "set_reminder", "clear_card"];

    if (act) {
      if (act.type === "show_plans") {
        plansCard = pickPlans(livePlans, act.mode || "all");
      } else if (MODIFY_TASKS.includes(act.type)) {
        if (agentMode) {
          task = executeAction(act);
          if (task.status === "ok") {
            const rem = formatRemaining(task.end);
            const remText = rem ? rem.text : "";
            if (act.type === "add_card") finalReply = "تم حفظ الكرت بنجاح ✅\n" + remText + " — راجع صفحة كرتي للتفاصيل.";
            if (act.type === "update_card") finalReply = "تم تعديل الكرت بنجاح ✅\n" + remText + " — محفوظ في صفحة كرتي.";
            if (act.type === "set_reminder") finalReply = "تم ضبط التذكير ✅\nبنبهك قبل " + task.value + (task.unit === "hours" ? " ساعة" : " يوم") + " من الانتهاء.";
            if (act.type === "clear_card") finalReply = "تم مسح الكرت وبدء صفحة جديدة ✅\nصفحة كرتي جاهزة لتسجيل كرت جديد.";
            setTaskDone(true);
          } else if (task.status === "empty") {
            finalReply = "لا يوجد كرت محفوظ حاليًا لتعديله — سجّل كرتًا أولًا.";
          } else {
            finalReply = "تعذر تنفيذ المهمة الآن، أعد المحاولة.";
          }
        }
      } else if (act.type === "navigate") {
        if (agentMode) {
          task = executeAction(act);
          if (task.status === "ok" && onNavigate) {
            const target = act.page;
            setTimeout(() => {
              window.location.hash = "";
              onNavigate(target);
            }, 1200);
          }
        }
      } else if (act.type === "open_purchase") {
        if (agentMode && onNavigate) {
          setTimeout(() => {
            window.location.hash = "";
            onNavigate("purchase");
          }, 800);
        }
      } else if (act.type === "open_purchase_history") {
        if (agentMode && onNavigate) {
          setTimeout(() => {
            window.location.hash = "";
            onNavigate("purchase-history");
          }, 800);
        }
      } else if (act.type === "open_reseller") {
        if (agentMode && onNavigate) {
          setTimeout(() => {
            window.location.hash = "";
            onNavigate("reseller");
          }, 800);
        }
      } else if (act.type === "whatsapp_report") {
        if (agentMode) {
          task = executeAction(act);
          if (task.status !== "ok") {
            finalReply = "ما لقيت رقم واتساب الإدارة — أضفه في معرفة (تواصل) من لوحة المدير.";
          }
        }
      } else if (act.type === "show_task_log") {
        if (agentMode) {
          task = executeAction(act);
        }
      } else if (act.type === "show_card") {
        if (agentMode) {
          task = executeAction(act);
        }
      } else if (act.type === "show_last_order") {
        const cached = getLastRequestFromCache();
        if (cached) setLastRequest(cached);
        const currentReq = lastRequest || cached;
        if (!currentReq) {
          finalReply = "ما عندك طلبات شراء مسجلة حاليًا.";
          act = null;
        } else {
          finalReply = "هذا آخر طلب لك 👇";
        }
      } else if (act.type === "show_stock") {
        const currentStock = getStockFromCache();
        const hasStock = Object.values(currentStock).some((c) => c > 0);
        if (!hasStock) {
          finalReply = "حاليًا ما في كروت متوفرة في المخزون — تواصل مع الإدارة للاستفسار.";
          act = null;
        } else {
          finalReply = "هذا المخزون المتوفر حاليًا 👇";
        }
      } else if (act.type === "contact") {
        if (!act.phone && !act.whatsapp) {
          act = { ...act, phone: fallbackContact.phone, whatsapp: fallbackContact.whatsapp };
        }
      }
    }

    if (!finalReply.trim()) {
      finalReply = "أبشر يا غالي، تفضل 👇";
    }

    setMessages((prev) => [
      ...prev,
      { role: "ai", text: finalReply, action: act || null, task: task, plansCard: plansCard },
    ]);
  };

  const startListening = () => {
    if (typing || listening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      pushAppNote("متصفحك ما يدعم الإدخال الصوتي — اكتب سؤالك بالنص يا غالي.");
      return;
    }

    const rec = new SR();
    rec.lang = "ar-SA";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    transcriptRef.current = "";

    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      transcriptRef.current = t;
      setInput(t);
    };

    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        pushAppNote("ما وصلت لإذن المايك — فعّل إذن الميكروفون من إعدادات المتصفح.");
      } else if (e.error === "no-speech") {
        pushAppNote("ما سمعت شيء — اضغط المايك وتكلم بوضوح.");
      }
    };

    rec.onend = () => {
      setListening(false);
      const t = (transcriptRef.current || "").trim();
      if (t) send(t);
    };

    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
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
              أنفّذ المهام بدقة، وأجاوب أسئلة الشبكة بالبطاقات الحية — كلمني كتابة أو بزر المايك.
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
          {messages.map((m, i) => {
            if (m.role === "app") {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex justify-center"
                >
                  <div className="max-w-[90%] rounded-2xl bg-ink/5 px-4 py-2 text-center text-[10px] font-bold leading-5 text-muted">
                    {m.text}
                  </div>
                </motion.div>
              );
            }

            return (
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
                      channel={m.action.channel || "both"}
                    />
                  ) : null}

                  {m.role === "ai" && m.plansCard ? (
                    <PlansCard plans={m.plansCard.list} title={m.plansCard.title} />
                  ) : null}

                  {m.role === "ai" && m.action && m.action.type === "show_offers" ? (
                    <OffersCard offers={offers} />
                  ) : null}

                  {m.role === "ai" && m.action && m.action.type === "show_buy" ? (
                    <BuyCard />
                  ) : null}

                  {m.role === "ai" && m.action && m.action.type === "show_payment" ? (
                    <PaymentCard />
                  ) : null}

                  {m.role === "ai" && m.action && m.action.type === "show_reseller" ? (
                    <ResellerCard />
                  ) : null}

                  {m.role === "ai" && m.action && m.action.type === "show_account" ? (
                    <AccountCard />
                  ) : null}

                  {m.role === "ai" && m.action && m.action.type === "show_about" ? (
                    <AboutCard />
                  ) : null}

                  {m.role === "ai" && m.action && m.action.type === "show_login_help" ? (
                    <LoginHelpCard />
                  ) : null}

                  {m.role === "ai" && m.action && m.action.type === "show_last_order" ? (() => {
                    const req = lastRequest;
                    if (!req) return null;
                    const matchedPlan = findPlanByIdOrPrice(plans, req.planId, req.planPrice);
                    return <LastOrderCard request={req} plan={matchedPlan} hiddenCodes={hiddenCodes} setHiddenCodes={setHiddenCodes} copiedId={copiedId} setCopiedId={setCopiedId} />;
                  })() : null}

                  {m.role === "ai" && m.action && m.action.type === "show_stock" ? (
                    <StockCard stock={stock} plans={plans} />
                  ) : null}

                  {m.role === "ai" && m.task && m.task.type === "show_card" ? (
                    <CardViewCard end={m.task.end || ""} lead={lead} />
                  ) : null}

                  {m.role === "ai" && m.task && m.task.type === "show_task_log" ? (
                    <TaskLogCard entries={m.task.entries || []} />
                  ) : null}

                  {m.role === "ai" && m.task && m.task.type === "whatsapp_report" ? (
                    <WaReportCard url={m.task.url || ""} preview={m.task.preview || ""} />
                  ) : null}

                  {m.role === "ai" && m.task && ["add_card", "update_card", "set_reminder", "clear_card"].includes(m.task.type) ? (
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
            );
          })}
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
                  listening
                    ? "أسمعك… تكلم الآن"
                    : typing && agentMode
                      ? "انتظر حتى اكتمال المهمة الحالية…"
                      : agentMode
                        ? "اكتب مهمتك أو اضغط المايك..."
                        : "اكتب سؤالك أو اضغط المايك..."
                }
                className="flex-1 bg-transparent px-3 py-2 text-xs text-ink outline-none"
              />

              <button
                onClick={listening ? stopListening : startListening}
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition active:scale-[0.95] ${
                  listening
                    ? "bg-red-500 text-white shadow-[0_8px_20px_rgba(239,68,68,0.4)]"
                    : "border border-ink/10 bg-white text-muted"
                }`}
              >
                {listening ? (
                  <motion.span
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                    className="absolute inset-0 rounded-xl bg-red-400/50"
                  />
                ) : null}
                <Mic size={16} className="relative" />
              </button>

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