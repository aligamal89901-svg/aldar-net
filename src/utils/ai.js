const AI_PROXY_URL = "https://aldar-ai.mhndbarbwed.workers.dev";

export async function askAI({ question, history, knowledge, signal }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  const onAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort);
  }

  try {
    const res = await fetch(AI_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question,
        today: new Date().toISOString().slice(0, 10),
        history: (history || []).slice(-4),
        knowledge: knowledge || [],
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    return {
      reply: data.reply || "عذرًا، حدث خطأ مؤقت، حاول مجددًا.",
      action: data.action || null,
      code: data.code || 200,
      aborted: false,
      ok: data.code === 200 || !data.code,
    };
  } catch (err) {
    if (signal && signal.aborted) {
      return { reply: "", action: null, code: 0, aborted: true, ok: false };
    }
    if (err.name === "AbortError") {
      return { reply: "طال الانتظار قليلًا، أعد المحاولة.", action: null, code: 0, aborted: false, ok: false };
    }
    return { reply: "تعذر الوصول للخادم، تحقق من الاتصال وحاول مجددًا.", action: null, code: 0, aborted: false, ok: false };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}