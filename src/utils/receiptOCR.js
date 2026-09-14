// src/utils/receiptOCR.js — يستدعي سيرفر Vercel بدل OCR الجوال
const RECEIPT_API = "https://aldar-ai-proxy.vercel.app/api/receipt";
const OFFICIAL_ACCOUNT = "254187788";

/**
 * قراءة النص من PDF عبر السيرفر
 * يعيد: { ok, text } أو { ok: false, reason }
 */
export async function extractTextFromFile(file) {
  // نقبل PDF فقط — الصور تروح مراجعة يدوية
  if (file.type !== "application/pdf") {
    return { ok: false, reason: "not_pdf" };
  }

  const base64 = await fileToBase64(file);

  try {
    const res = await fetch(RECEIPT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, type: file.type }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { ok: false, reason: "network_error", message: err.message };
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result.split(",")[1];
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * استخراج البيانات من النص
 */
export function extractReceiptData(text) {
  const data = {
    notificationNumber: null,
    amount: null,
    date: null,
    toAccount: null,
    fromAccount: null,
    rawText: text,
  };

  const cleanText = (text || "").replace(/\s+/g, " ");

  // رقم الإشعار
  const notifMatch = cleanText.match(/(\d{1,2}-\d{6,12})/);
  if (notifMatch) data.notificationNumber = notifMatch[1];

  // المبلغ
  const amountMatch = cleanText.match(/\[\s*(\d+)\s*\]/) || cleanText.match(/([\d,]{4,})/);
  if (amountMatch) {
    data.amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  }

  // التاريخ
  const dateMatch = cleanText.match(/(\d{2}-\d{2}-\d{4})/) || cleanText.match(/(\d{4}\/\d{2}\/\d{2})/);
  if (dateMatch) data.date = dateMatch[1];

  // الحساب المستلم (الرسمي)
  if (cleanText.includes(OFFICIAL_ACCOUNT)) {
    data.toAccount = OFFICIAL_ACCOUNT;
  }

  // الحساب المرسل
  const allAccounts = cleanText.match(/(254\d{6,9})/g);
  if (allAccounts) {
    data.fromAccount = allAccounts.find((acc) => acc !== OFFICIAL_ACCOUNT) || allAccounts[0];
  }

  return data;
}

/**
 * التحقق من صحة البيانات
 */
export function validateReceipt(data, expectedAmount) {
  const errors = [];
  const warnings = [];

  if (!data.amount) {
    errors.push("لم يتم العثور على المبلغ في السند");
  } else if (expectedAmount && data.amount !== expectedAmount) {
    errors.push(`المبلغ (${data.amount}) لا يطابق سعر الفئة (${expectedAmount})`);
  }

  if (!data.toAccount) {
    errors.push("الحساب المستلم ليس الحساب الرسمي");
  }

  if (!data.notificationNumber) {
    warnings.push("لم يتم العثور على رقم إشعار واضح");
  }

  if (!data.date) {
    warnings.push("لم يتم العثور على تاريخ واضح");
  } else {
    let receiptDate;
    if (data.date.includes("/")) {
      receiptDate = new Date(data.date);
    } else {
      const parts = data.date.split("-");
      receiptDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    const hoursDiff = (Date.now() - receiptDate.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 48 && hoursDiff < 8760) {
      errors.push(`السند قديم (${Math.round(hoursDiff)} ساعة)`);
    }
  }

  return { errors, warnings, isValid: errors.length === 0 };
}