import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Lock, Mail } from "lucide-react";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError("بيانات الدخول غير صحيحة");
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink/8 bg-white p-6 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
        <div className="mb-5 text-center">
          <div className="text-lg font-extrabold text-ink">لوحة المدير</div>
          <div className="mt-1 text-xs text-muted">سجّل دخولك لإدارة الفئات</div>
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <Mail size={16} className="text-brand" />
          البريد الإلكتروني
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xl border border-ink/10 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand/40 focus:bg-white"
          placeholder="admin@aldar.net"
        />

        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-ink">
          <Lock size={16} className="text-brand" />
          كلمة السر
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-ink/10 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand/40 focus:bg-white"
        />

        {error ? (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500">
            {error}
          </div>
        ) : null}

        <button
          onClick={submit}
          disabled={loading || !email || !password}
          className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-40"
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </div>
    </main>
  );
}

export default AdminLogin;