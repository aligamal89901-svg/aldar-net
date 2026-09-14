// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// الحساب الرسمي اللي لازم يكون المستلم
const OFFICIAL_ACCOUNT = "254187788";

// إنشاء عميل Google Vision
const client = new vision.ImageAnnotatorClient({
  keyFilename: "./google-vision-key.json",
});

/**
 * استخراج البيانات من نص السند
 */
function extractReceiptData(text) {
  const data = {
    notificationNumber: null,
    amount: null,
    date: null,
    toAccount: null,
    fromAccount: null,
    rawText: text,
  };

  // رقم الإشعار — نمط: 8-361685608
  const notifMatch = text.match(/(\d{1,2}-\d{6,12})/);
  if (notifMatch) data.notificationNumber = notifMatch[1];

  // المبلغ — نمط: [ 118000] أو 118,000 أو 118000
  const amountMatch = text.match(/\[\s*([\d,]+)\s*\]/) || text.match(/([\d,]{4,})/);
  if (amountMatch) {
    data.amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  }

  // التاريخ — نمط: 07-08-2026 أو 2026/08/07
  const dateMatch = text.match(/(\d{2}-\d{2}-\d{4})/) || text.match(/(\d{4}\/\d{2}\/\d{2})/);
  if (dateMatch) data.date = dateMatch[1];

  // الحساب المستلم — نبحث عن الرقم الرسمي
  if (text.includes(OFFICIAL_ACCOUNT)) {
    data.toAccount = OFFICIAL_ACCOUNT;
  }

  // الحساب المرسل — نمط: 254211548 أو 254xxxxxx
  const fromMatch = text.match(/(254\d{6,9})/g);
  if (fromMatch) {
    // نأخذ الرقم اللي مو الرسمي
    data.fromAccount = fromMatch.find((n) => n !== OFFICIAL_ACCOUNT) || fromMatch[0];
  }

  return data;
}

/**
 * التحقق من صحة البيانات
 */
function validateReceipt(data, expectedAmount) {
  const errors = [];
  const warnings = [];

  // 1) التحقق من المبلغ
  if (!data.amount) {
    errors.push("لم يتم العثور على المبلغ في السند");
  } else if (expectedAmount && data.amount !== expectedAmount) {
    errors.push(`المبلغ في السند (${data.amount}) لا يطابق سعر الفئة (${expectedAmount})`);
  }

  // 2) التحقق من الحساب المستلم
  if (!data.toAccount) {
    errors.push(`الحساب المستلم ليس الحساب الرسمي (${OFFICIAL_ACCOUNT})`);
  }

  // 3) التحقق من رقم الإشعار
  if (!data.notificationNumber) {
    warnings.push("لم يتم العثور على رقم إشعار واضح");
  }

  // 4) التحقق من التاريخ
  if (!data.date) {
    warnings.push("لم يتم العثور على تاريخ واضح");
  } else {
    // تحقق إن التاريخ خلال آخر 48 ساعة
    let receiptDate;
    if (data.date.includes("/")) {
      receiptDate = new Date(data.date);
    } else {
      const parts = data.date.split("-");
      receiptDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    const now = new Date();
    const hoursDiff = (now - receiptDate) / (1000 * 60 * 60);
    if (hoursDiff > 48) {
      errors.push(`السند قديم (${Math.round(hoursDiff)} ساعة) — الحد الأقصى 48 ساعة`);
    }
  }

  return { errors, warnings, isValid: errors.length === 0 };
}

/**
 * Firebase Function الرئيسية
 */
exports.processReceipt = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { receiptBase64, planId, planPrice, customerName, customerPhone, requestId } = req.body;

      if (!receiptBase64 || !planId) {
        return res.status(400).json({ error: "بيانات ناقصة" });
      }

      // 1) قراءة النص من الصورة عبر Google Vision
      const imageBuffer = Buffer.from(receiptBase64, "base64");
      const [result] = await client.textDetection(imageBuffer);
      const fullText = result.fullTextAnnotation?.text || "";

      if (!fullText.trim()) {
        return res.json({
          status: "manual_review",
          reason: "لم يتم التعرف على نص في السند",
          extractedData: null,
        });
      }

      // 2) استخراج البيانات
      const extracted = extractReceiptData(fullText);

      // 3) التحقق
      const validation = validateReceipt(extracted, planPrice ? Number(planPrice) : null);

      // 4) التحقق من تكرار رقم الإشعار
      if (extracted.notificationNumber) {
        const usedSnap = await db
          .collection("usedNotifications")
          .where("notificationNumber", "==", extracted.notificationNumber)
          .limit(1)
          .get();

        if (!usedSnap.empty) {
          return res.json({
            status: "rejected",
            reason: "رقم الإشعار هذا تم استخدامه مسبقًا",
            extractedData: extracted,
            validation,
          });
        }
      }

      // 5) القرار
      if (validation.isValid) {
        // ✅ مقبول تلقائيًا — نسحب كرت
        const cardsSnap = await db
          .collection("availableCards")
          .where("status", "==", "available")
          .where("planId", "==", planId)
          .orderBy("createdAt", "asc")
          .limit(1)
          .get();

        if (cardsSnap.empty) {
          return res.json({
            status: "manual_review",
            reason: "لا توجد كروت متوفرة لهذه الفئة",
            extractedData: extracted,
            validation,
          });
        }

        const cardDoc = cardsSnap.docs[0];
        const cardData = cardDoc.data();

        // سحب الكرت + تحديث الطلب + تسجيل رقم الإشعار — في transaction
        await db.runTransaction(async (tx) => {
          // حذف الكرت
          tx.delete(cardDoc.ref);

          // تحديث الطلب
          if (requestId) {
            tx.update(db.collection("purchaseRequests").doc(requestId), {
              status: "approved",
              cardCode: cardData.code,
              cardId: cardDoc.id,
              approvedAt: admin.firestore.FieldValue.serverTimestamp(),
              autoApproved: true,
              extractedData: extracted,
              validation,
            });
          }

          // تسجيل رقم الإشعار لمنع التكرار
          if (extracted.notificationNumber) {
            tx.set(db.collection("usedNotifications").doc(extracted.notificationNumber.replace(/-/g, "_")), {
              notificationNumber: extracted.notificationNumber,
              usedAt: admin.firestore.FieldValue.serverTimestamp(),
              customerName: customerName || "",
              customerPhone: customerPhone || "",
              planId,
              amount: extracted.amount,
            });
          }
        });

        return res.json({
          status: "approved",
          cardCode: cardData.code,
          reason: "تم التحقق تلقائيًا بنجاح",
          extractedData: extracted,
          validation,
        });
      } else if (validation.errors.length <= 1 && validation.warnings.length > 0) {
        // ⚠️ شك بسيط — مراجعة يدوية
        if (requestId) {
          await db.collection("purchaseRequests").doc(requestId).update({
            status: "pending",
            autoReviewResult: "manual_review",
            extractedData: extracted,
            validation,
          });
        }
        return res.json({
          status: "manual_review",
          reason: validation.errors.join(" | ") || "يحتاج مراجعة يدوية",
          extractedData: extracted,
          validation,
        });
      } else {
        // ❌ مرفوض
        if (requestId) {
          await db.collection("purchaseRequests").doc(requestId).update({
            status: "rejected",
            autoReviewResult: "rejected",
            rejectedReason: validation.errors.join(" | "),
            extractedData: extracted,
            validation,
          });
        }
        return res.json({
          status: "rejected",
          reason: validation.errors.join(" | "),
          extractedData: extracted,
          validation,
        });
      }
    } catch (err) {
      console.error("Error processing receipt:", err);
      return res.status(500).json({ error: "تعذر معالجة السند", details: err.message });
    }
  });
});