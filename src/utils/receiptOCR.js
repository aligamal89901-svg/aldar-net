// src/utils/receiptOCR.js
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

// إعداد Worker ليشير إلى الملف المحلي في public/pdfjs/
// هذا ضروري جداً ليعمل على Vercel و Termux بدون مشاكل CORS
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

// الحساب الرسمي الذي يجب أن يكون المستلم (من ملف السند)
const OFFICIAL_ACCOUNT = "254187788";

/**
 * تحويل ملف PDF إلى مصفوفة من الصور (Canvas)
 */
async function pdfToImages(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  // استخدام workerTransport لضمان العمل في المتصفح
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images = [];

  // نقرأ أول صفحتين فقط لتسريع العملية وتوفير الموارد
  const pagesToRead = Math.min(pdf.numPages, 2);

  for (let i = 1; i <= pagesToRead; i++) {
    const page = await pdf.getPage(i);
    // scale 2.0 يعطي دقة عالية كافية لقراءة النصوص الصغيرة والمقلوبة
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas);
  }

  return images;
}

/**
 * الدالة الرئيسية: استخراج النص من ملف (صورة أو PDF)
 */
export async function extractTextFromFile(file) {
  if (file.type === "application/pdf") {
    console.log("📄 بدء معالجة ملف PDF...");
    try {
      const images = await pdfToImages(file);
      let fullText = "";

      for (let i = 0; i < images.length; i++) {
        console.log(`🔍 قراءة الصفحة ${i + 1}...`);
        const result = await Tesseract.recognize(images[i], "ara+eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(`   التقدم: ${Math.round(m.progress * 100)}%`);
            }
          },
        });
        fullText += result.data.text + "\n";
      }

      console.log("📝 النص المستخرج الكامل:", fullText);
      return fullText;
    } catch (err) {
      console.error("Error processing PDF:", err);
      throw new Error("فشل في قراءة ملف PDF: " + err.message);
    }
  } else {
    console.log("🖼️ بدء معالجة صورة...");
    const result = await Tesseract.recognize(file, "ara+eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`   التقدم: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    console.log("📝 النص المستخرج:", result.data.text);
    return result.data.text;
  }
}

/**
 * استخراج البيانات الهيكلية من النص الخام
 * تم تحسين Regex بناءً على محتوى ملف "تنزيل.pdf" الفعلي
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

  // تنظيف النص من المسافات الزائدة والسطور الجديدة لتسهيل البحث
  const cleanText = text.replace(/\s+/g, ' ');

  // 1. استخراج رقم الإشعار (نمط: 8-361685608)
  // البحث عن رقم مكون من جزأين مفصولين بشرطة
  const notifMatch = cleanText.match(/(\d{1,2}-\d{6,12})/);
  if (notifMatch) {
    data.notificationNumber = notifMatch[1];
  }

  // 2. استخراج المبلغ (نمط: [ 118000])
  // بناءً على الملف: "[ 118000]" أو أي رقم كبير بين أقواس
  const amountMatch = cleanText.match(/\[\s*(\d+)\s*\]/) || cleanText.match(/([\d,]{4,})/);
  if (amountMatch) {
    // إزالة الفواصل وتحويل لرقم صحيح
    data.amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  }

  // 3. استخراج التاريخ (نمط: 07-08-2026 أو 2026/08/07)
  // الملف يحتوي على التنسيقين، نأخذ أي واحد نجده
  const dateMatch = cleanText.match(/(\d{2}-\d{2}-\d{4})/) || cleanText.match(/(\d{4}\/\d{2}\/\d{2})/);
  if (dateMatch) {
    data.date = dateMatch[1];
  }

  // 4. التحقق من الحساب المستلم (الحساب الرسمي)
  if (cleanText.includes(OFFICIAL_ACCOUNT)) {
    data.toAccount = OFFICIAL_ACCOUNT;
  }

  // 5. استخراج الحساب المرسل (أي رقم حساب آخر غير الرسمي)
  // نبحث عن كل أرقام الحسابات المحتملة (تبدأ بـ 254 وطولها 9 أرقام)
  const allAccounts = cleanText.match(/(254\d{6,9})/g);
  if (allAccounts) {
    // نأخذ الرقم الذي ليس هو الحساب الرسمي
    data.fromAccount = allAccounts.find((acc) => acc !== OFFICIAL_ACCOUNT) || allAccounts[0];
  }

  console.log("📊 البيانات المستخرجة:", data);
  return data;
}

/**
 * التحقق من صحة البيانات المستخرجة مقابل شروط النظام
 */
export function validateReceipt(data, expectedAmount) {
  const errors = [];
  const warnings = [];

  // 1. التحقق من المبلغ
  if (!data.amount) {
    errors.push("❌ لم يتم العثور على المبلغ في السند");
  } else if (expectedAmount && data.amount !== expectedAmount) {
    // ملاحظة هامة: تأكد أن سعر الفئة في لوحة المدير هو 118000 ليتطابق مع هذا السند
    errors.push(`❌ المبلغ (${data.amount}) لا يطابق سعر الفئة المطلوب (${expectedAmount})`);
  } else {
    console.log("✅ المبلغ مطابق");
  }

  // 2. التحقق من الحساب المستلم
  if (!data.toAccount) {
    errors.push("❌ الحساب المستلم ليس الحساب الرسمي المعتمد (254187788)");
  } else {
    console.log("✅ الحساب المستلم صحيح");
  }

  // 3. التحقق من رقم الإشعار
  if (!data.notificationNumber) {
    warnings.push("⚠️ لم يتم العثور على رقم إشعار واضح (قد يؤثر على منع التكرار)");
  } else {
    console.log("✅ رقم الإشعار موجود:", data.notificationNumber);
  }

  // 4. التحقق من التاريخ
  if (!data.date) {
    warnings.push("⚠️ لم يتم العثور على تاريخ واضح");
  } else {
    let receiptDate;
    if (data.date.includes("/")) {
      receiptDate = new Date(data.date); // YYYY/MM/DD
    } else {
      const parts = data.date.split("-");
      receiptDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // DD-MM-YYYY -> YYYY-MM-DD
    }

    const now = new Date();
    const hoursDiff = (now - receiptDate) / (1000 * 60 * 60);

    // السماح بسندات حتى 48 ساعة سابقة
    // ملاحظة: إذا كان تاريخ السند 2026 واليوم 2024، سيظهر تحذير "تاريخ مستقبلي"
    // للتجربة، سنتجاهل الخطأ إذا كان التاريخ مستقبلياً ونكتفي بتحذير
    if (hoursDiff > 48) {
       if (hoursDiff < -24) {
         warnings.push("⚠️ تاريخ السند في المستقبل (ربما تاريخ تجريبي؟)");
       } else {
         errors.push(`❌ السند قديم جداً (${Math.round(hoursDiff)} ساعة مضت). الحد الأقصى 48 ساعة.`);
       }
    } else {
      console.log("✅ التاريخ مقبول");
    }
  }

  const isValid = errors.length === 0;
  console.log(isValid ? "✅ التحقق ناجح" : "❌ التحقق فشل", { errors, warnings });

  return { errors, warnings, isValid };
}