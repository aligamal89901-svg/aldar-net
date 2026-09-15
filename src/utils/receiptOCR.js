// src/utils/receiptOCR.js — قراءة السند عبر سيرفر Vercel + تدقيق آلي
const RECEIPT_API = "https://aldar-ai-proxy.vercel.app/api/receipt";
const OFFICIAL_ACCOUNT = "254187788";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// كشف النص المعكوس (مشكلة استخراج PDF) وتصحيحه
function isGarbled(t) {
  return /ﺏﺎﺴﺣ|ﺦﻳﺭﺎﺘﻟﺍ|ﻠﺒﻤﻟﺍ|ﺭﺎﻌﺷ/.test(t || "");
}
function normalizeArabic(t) {
  return (t || "")
    .split(/\s+/)
    .map((tok) => (/[\u0600-\u06FF]/.test(tok) ? [...tok].reverse().join("") : tok))
    .join(" ");
}
function normalizeDate(d) {
  if (!d) return null;
  if (d.includes("/")) return d;
  const p = d.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
}

/**
 * قراءة النص من PDF عبر السيرفر (مع التدقيق الآلي)
 */
export async function extractTextFromFile(file, expectedAmount) {
  if (file.type !== "application/pdf") {
    return { ok: false, reason: "not_pdf" };
  }
  const base64 = await fileToBase64(file);
  try {
    const res = await fetch(RECEIPT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64,
        type: file.type,
        expectedAmount: expectedAmount || 0,
        officialAccount: OFFICIAL_ACCOUNT,
      }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, reason: "network_error", message: err.message };
  }
}

/**
 * استخراج البيانات من النص (فحص موضعي ضد الدس والتزوير)
 */
export function extractReceiptData(text) {
  const src = isGarbled(text) ? normalizeArabic(text) : text;
  const cleanText = (src || "").replace(/\s+/g, " ");

  const data = {
    notificationNumber: null,
    amount: null,
    date: null,
    dates: [],
    toAccount: null,
    fromAccount: null,
    rawText: cleanText,
  };

  // رقم الإشعار
  const notifMatch = cleanText.match(/(\d{1,2}-\d{6,12})/);
  if (notifMatch) data.notificationNumber = notifMatch[1];

  // المبلغ
  const amountMatch = cleanText.match(/\[\s*(\d+)\s*\]/) || cleanText.match(/([\d,]{4,})/);
  if (amountMatch) data.amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);

  // كل التواريخ (لكشف التعارض)
  data.dates = cleanText.match(/\d{2}-\d{2}-\d{4}|\d{4}\/\d{2}\/\d{2}/g) || [];
  data.date = data.dates[0] || null;

  // المستلم الفعلي = أول رقم بعد عبارة (حساب الى) — فحص موضعي لا ينخدع بالدس
  const toMatch =
    cleanText.match(/حساب الى[^\d]{0,40}(\d{6,})/) ||
    cleanText.match(/الى\s*حساب[^\d]{0,40}(\d{6,})/);
  data.toAccount = toMatch ? toMatch[1] : null;

  // الحساب المرسل
  const allAccounts = cleanText.match(/(254\d{6,9})/g);
  if (allAccounts) {
    data.fromAccount = allAccounts.find((a) => a !== OFFICIAL_ACCOUNT) || allAccounts[0];
  }

  return data;
}

/**
 * التحقق الصارم من صحة البيانات
 */
export function validateReceipt(data, expectedAmount) {
  const errors = [];
  const warnings = [];

  // 1) المبلغ
  if (!data.amount) {
    errors.push("لم يتم العثور على المبلغ في السند");
  } else if (expectedAmount && data.amount !== expectedAmount) {
    errors.push(`المبلغ (${data.amount}) لا يطابق سعر الفئة (${expectedAmount})`);
  }

  // 2) المستلم الفعلي = الحساب الرسمي بالضبط (فحص موضعي)
  if (data.toAccount !== OFFICIAL_ACCOUNT) {
    errors.push(`حقل (حساب الى) في السند (${data.toAccount || "غير موجود"}) ليس الحساب الرسمي ${OFFICIAL_ACCOUNT}`);
  }

  // 3) تواريخ متضاربة = تزوير
  const uniqueDays = new Set((data.dates || []).map(normalizeDate));
  if (uniqueDays.size > 1) {
    errors.push("السند يحتوي على تواريخ متضاربة — تزوير محتمل");
  }

  // 4) رقم الإشعار
  if (!data.notificationNumber) {
    warnings.push("لم يتم العثور على رقم إشعار واضح");
  }

  // 5) الطزاجة (48 ساعة)
  if (!data.date) {
    warnings.push("لم يتم العثور على تاريخ واضح");
  } else {
    const receiptDate = new Date(normalizeDate(data.date));
    const hoursDiff = (Date.now() - receiptDate.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 48 && hoursDiff < 8760) {
      errors.push(`السند قديم (${Math.round(hoursDiff)} ساعة)`);
    }
  }

  return { errors, warnings, isValid: errors.length === 0 };
}