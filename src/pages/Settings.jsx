import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Moon,
  Sun,
  Bell,
  BellOff,
  Globe,
  Trash2,
  Info,
  LogOut,
  Shield,
  Volume2,
  VolumeX,
  ChevronLeft,
  Smartphone,
  Wifi,
  Eye,
  EyeOff,
  RotateCcw,
  Palette,
  Zap,
  RefreshCw,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { requestNotificationPermission } from "../utils/notify";

const SETTINGS_KEY = "aldar-user-settings";

const DEFAULT_SETTINGS = {
  theme: "light",
  notifications: true,
  sound: true,
  vibration: true,
  language: "ar",
  fontSize: "medium",
  autoRefresh: true,
  showCardCode: true,
  compactMode: false,
};

function getSettings() {
  try {
    const data = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...data };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

function Settings({ onBack }) {
  const [settings, setSettings] = useState(getSettings);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAdmin(!!user);
    });
    return unsubscribe;
  }, []);

  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  const toggleNotifications = async () => {
    if (!settings.notifications) {
      if (notifPermission === "default" || notifPermission === "denied") {
        const ok = await requestNotificationPermission();
        setNotifPermission(ok ? "granted" : "denied");
        if (!ok) return;
      }
      updateSetting("notifications", true);
    } else {
      updateSetting("notifications", false);
    }
  };

  const clearAllData = () => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("aldar-"));
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {}
    onBack();
  };

  // زر التشغيل والإيقاف القياسي (بدون أيقونات داخلية وبألوان واضحة)
  const ToggleSwitch = ({ enabled, onToggle, color = "brand" }) => {
    const activeColors = {
      brand: "bg-cyan-600",
      green: "bg-emerald-500",
      red: "bg-rose-500",
      amber: "bg-amber-500",
    };

    return (
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? activeColors[color] : "bg-slate-200"
        }`}
      >
        <motion.span
          animate={{ x: enabled ? -20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0"
        />
      </button>
    );
  };

  const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-3 mt-6 mb-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        {children}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );

  const SettingRow = ({ icon: Icon, title, subtitle, children, danger }) => (
    <div
      className={`flex items-center justify-between rounded-2xl p-3.5 border transition-colors ${
        danger
          ? "border-rose-100 bg-rose-50/60"
          : "border-slate-100 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            danger ? "bg-rose-100 text-rose-600" : "bg-cyan-50 text-cyan-600"
          }`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-bold truncate ${danger ? "text-rose-600" : "text-slate-800"}`}>
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</div>
          )}
        </div>
      </div>
      <div className="shrink-0 mr-3">{children}</div>
    </div>
  );

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto w-full max-w-[850px] flex-1 px-4 pt-4 pb-10 text-right dir-rtl"
    >
      {/* شريط العنوان */}
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm active:scale-95 transition"
        >
          <ArrowRight size={15} />
          <span>رجوع</span>
        </button>
        <div className="text-base font-extrabold text-slate-800">الإعدادات</div>
        <div className="w-16" />
      </div>

      <div className="flex flex-col gap-2.5">
        {/* المظهر */}
        <SectionTitle>المظهر</SectionTitle>

        <SettingRow
          icon={Palette}
          title="السمة"
          subtitle={settings.theme === "dark" ? "داكن" : "فاتح"}
        >
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => updateSetting("theme", "light")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                settings.theme === "light"
                  ? "bg-white text-cyan-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <Sun size={15} />
              <span>فاتح</span>
            </button>
            <button
              onClick={() => updateSetting("theme", "dark")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                settings.theme === "dark"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <Moon size={15} />
              <span>داكن</span>
            </button>
          </div>
        </SettingRow>

        <SettingRow
          icon={Smartphone}
          title="حجم الخط"
          subtitle={
            settings.fontSize === "small"
              ? "صغير"
              : settings.fontSize === "large"
              ? "كبير"
              : "متوسط"
          }
        >
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { key: "small", label: "صغير" },
              { key: "medium", label: "متوسط" },
              { key: "large", label: "كبير" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => updateSetting("fontSize", s.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  settings.fontSize === s.key
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-500"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow icon={Eye} title="الوضع المضغوط" subtitle="تقليل المسافات بين العناصر">
          <ToggleSwitch
            enabled={settings.compactMode}
            onToggle={() => updateSetting("compactMode", !settings.compactMode)}
          />
        </SettingRow>

        {/* الإشعارات */}
        <SectionTitle>الإشعارات</SectionTitle>

        <SettingRow
          icon={settings.notifications ? Bell : BellOff}
          title="الإشعارات"
          subtitle={
            settings.notifications
              ? "مفعّلة — ستصلك التنبيهات"
              : notifPermission === "denied"
              ? "معطّلة من إعدادات المتصفح"
              : "معطّلة"
          }
        >
          <ToggleSwitch
            enabled={settings.notifications && notifPermission === "granted"}
            onToggle={toggleNotifications}
            color="green"
          />
        </SettingRow>

        <SettingRow
          icon={settings.sound ? Volume2 : VolumeX}
          title="صوت الإشعارات"
          subtitle={settings.sound ? "مفعّل" : "معطّل"}
        >
          <ToggleSwitch
            enabled={settings.sound}
            onToggle={() => updateSetting("sound", !settings.sound)}
            color="amber"
          />
        </SettingRow>

        <SettingRow
          icon={Zap}
          title="الاهتزاز"
          subtitle={settings.vibration ? "مفعّل" : "معطّل"}
        >
          <ToggleSwitch
            enabled={settings.vibration}
            onToggle={() => updateSetting("vibration", !settings.vibration)}
          />
        </SettingRow>

        {/* الخصوصية والأداء */}
        <SectionTitle>الخصوصية والأداء</SectionTitle>

        <SettingRow
          icon={settings.showCardCode ? Eye : EyeOff}
          title="إظهار رمز الكرت"
          subtitle={settings.showCardCode ? "مرئي افتراضيًا" : "مخفي افتراضيًا"}
        >
          <ToggleSwitch
            enabled={settings.showCardCode}
            onToggle={() => updateSetting("showCardCode", !settings.showCardCode)}
          />
        </SettingRow>

        <SettingRow
          icon={settings.autoRefresh ? RefreshCw : Wifi}
          title="التحديث التلقائي"
          subtitle={settings.autoRefresh ? "تحديث تلقائي مستمر" : "يدوي فقط"}
        >
          <ToggleSwitch
            enabled={settings.autoRefresh}
            onToggle={() => updateSetting("autoRefresh", !settings.autoRefresh)}
            color="green"
          />
        </SettingRow>

        {/* اللغة والنظام */}
        <SectionTitle>اللغة والنظام</SectionTitle>

        <SettingRow icon={Globe} title="اللغة" subtitle="تتطلب ملفات ترجمة مستقلة">
          <span className="rounded-lg bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-600 border border-cyan-100">
            العربية
          </span>
        </SettingRow>

        <SettingRow icon={Info} title="الإصدار" subtitle="الدار نت v1.0.0">
          <span className="text-xs text-slate-400">2026</span>
        </SettingRow>

        <SettingRow icon={Shield} title="سياسة الخصوصية" subtitle="شروط الاستخدام والأمان">
          <ChevronLeft size={16} className="text-slate-400" />
        </SettingRow>

        {/* منطقة الخطر */}
        <SectionTitle>منطقة الخطر</SectionTitle>

        <SettingRow
          icon={RotateCcw}
          title="إعادة ضبط الإعدادات"
          subtitle="استعادة الخيارات الافتراضية"
          danger
        >
          <button
            onClick={() => {
              setSettings(DEFAULT_SETTINGS);
              saveSettings(DEFAULT_SETTINGS);
            }}
            className="rounded-xl border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-600 active:scale-95 transition"
          >
            إعادة ضبط
          </button>
        </SettingRow>

        <SettingRow
          icon={Trash2}
          title="مسح جميع البيانات"
          subtitle="يحذف التخزين المحلي للجهة الحالية"
          danger
        >
          <button
            onClick={() => setShowClearConfirm(true)}
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm active:scale-95 transition"
          >
            مسح الكل
          </button>
        </SettingRow>

        {isAdmin && (
          <SettingRow icon={LogOut} title="تسجيل الخروج" subtitle="الخروج من حساب المدير" danger>
            <button
              onClick={handleLogout}
              className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm active:scale-95 transition"
            >
              خروج
            </button>
          </SettingRow>
        )}
      </div>

      {/* نافذة تأكيد المسح */}
      <AnimatePresence>
        {showClearConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-x-4 top-1/3 z-50 mx-auto max-w-sm rounded-3xl bg-white p-6 shadow-xl border border-slate-100 text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">مسح جميع البيانات؟</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                سيتم حذف كافة الإعدادات والبيانات المخزنة محلياً بالكامل.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={clearAllData}
                  className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white shadow-sm"
                >
                  تأكيد المسح
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

export default Settings;
