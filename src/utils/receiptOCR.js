// src/utils/receiptOCR.js — قراءة السند عبر سيرفر Vercel + تدقيق آلي
const RECEIPT_API = "https://aldar-ai-proxy.vercel.app/api/receipt";
const OFFICIAL_ACCOUNT = "254219775";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// كشف النص المقلوب (خلل استخراج RTL)
function isGarbled(t) {
  return /ﺭﺎﻌﺷ|ﺦﻳﺭﺎﺘ|ﻎﻠﺒﻤ|ﺎﺴﺣ/.test(t || "");
}
// القلب الكامل للسلسلة يعيد كل سطر لأصله حرفيًا
function fixReversed(t) {
  return [...(t || "")].reverse().join("");
}
// توحيد التاريخ بصيغة ISO (يميز 2026-09-15 عن 15-09-2026)
function normalizeDate(d) {
  if (!d) return null;
  if (d.includes("/")) return d;
  const p = d.split("-");
  if (p.length !== 3) return d;
  if (p[0].length === 4) return d;              // ISO بالفعل
  if (p[2].length === 4) return `${p[2]}-${p[1]}-${p[0]}`;
  return d;
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
  const src = isGarbled(text) ? fixReversed(text) : text;
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
  const notifMatch =
    cleanText.match(/رقم الإشعار\s*(\d{1,2}-\d{6,12})/) ||
    cleanText.match(/(\d{1,2}-\d{6,12})/);
  if (notifMatch) data.notificationNumber = notifMatch[1];

  // المبلغ
  const amountMatch =
    cleanText.match(/\[\s*(\d+)\s*\]/) ||
    cleanText.match(/المبلغ\s*(\d[\d,]*)/);
  if (amountMatch) data.amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);

  // كل التواريخ (لكشف التعارض)
  data.dates = cleanText.match(/\d{2}-\d{2}-\d{4}|\d{4}\/\d{2}\/\d{2}/g) || [];
  data.date = data.dates[0] || null;

  // حساب المستلم (خانة الرسمي في قالب البنك): "-رقم X" بعد اسم المستلم
  const toMatch =
    cleanText.match(/حساب الى[^\d]{0,40}(\d{6,})/) ||
    cleanText.match(/الى حساب[^\d]{0,40}(\d{6,})/) ||
    cleanText.match(/-رقم (\d{6,})/);
  data.toAccount = toMatch ? toMatch[1] : null;

  // حساب المرسل
  const fromMatch =
    cleanText.match(/خاص\/?\s*رقم\s*(\d{6,})/) ||
    cleanText.match(/من حساب[^\d]{0,60}?(\d{6,})/);
  const allAccounts = cleanText.match(/(254\d{6,9})/g);
  data.fromAccount = fromMatch
    ? fromMatch[1]
    : allAccounts
      ? allAccounts.find((a) => a !== OFFICIAL_ACCOUNT) || allAccounts[0]
      : null;

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
    errors.push(`حقل الحساب المستلم في السند (${data.toAccount || "غير موجود"}) ليس الحساب الرسمي ${OFFICIAL_ACCOUNT}`);
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