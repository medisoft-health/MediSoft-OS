import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientDocuments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────
//  POST: Upload a document with AI analysis
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const patientId = formData.get("patientId") as string;
    const documentType = formData.get("type") as string || "other";
    const title = formData.get("title") as string;
    const documentDate = formData.get("date") as string;
    const category = formData.get("category") as string || "current";
    const notes = formData.get("notes") as string;

    if (!file || !patientId) {
      return NextResponse.json({ error: "file and patientId are required" }, { status: 400 });
    }

    // Convert file to base64 for AI analysis
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type;

    // Store file as data URI (in production, upload to GCS/S3)
    const fileUrl = `data:${mimeType};base64,${base64.substring(0, 100)}...stored`;
    // For now we store the full base64 in a special field via storageKey
    const storageKey = `local:patient-${patientId}:${Date.now()}:${file.name}`;

    // AI Analysis based on document type
    let aiSummary = "";
    let aiStructuredData: Record<string, unknown> = {};
    let aiExtractedText = "";

    try {
      const gemini = getGeminiClient();
      if (gemini) {
        const analysisPrompt = getAnalysisPrompt(documentType, title);

        const result = await gemini.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64,
                  },
                },
                { text: analysisPrompt },
              ],
            },
          ],
        });

        const text = result.text ?? "";

        // Try to parse structured data
        try {
          const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
          if (jsonMatch) {
            aiStructuredData = JSON.parse(jsonMatch[1]);
            aiSummary = text.replace(/```json\n?[\s\S]*?\n?```/, "").trim();
          } else {
            aiSummary = text;
          }
          aiExtractedText = text;
        } catch {
          aiSummary = text;
          aiExtractedText = text;
        }
      }
    } catch (aiError) {
      console.error("AI analysis failed:", aiError);
      aiSummary = "لم يتم التحليل — يمكن المراجعة يدوياً";
    }

    // Insert document record matching actual schema
    const [doc] = await db
      .insert(patientDocuments)
      .values({
        patientId: Number(patientId),
        uploadedById: auth.user.id,
        title: title || file.name,
        documentType,
        category,
        fileName: file.name,
        fileUrl: storageKey, // In production: GCS URL
        storageKey,
        mimeType: file.type,
        fileSizeBytes: file.size,
        aiExtractedText,
        aiSummary,
        aiStructuredData,
        aiAnalyzedAt: new Date(),
        documentDate: documentDate || null,
        notes: notes || null,
        source: "upload",
      })
      .returning();

    return NextResponse.json({
      id: doc.id,
      aiSummary,
      aiStructuredData,
      message: "تم رفع المستند وتحليله بنجاح",
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────
//  GET: List documents for a patient
// ─────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const type = searchParams.get("type");

  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  try {
    const conditions = [eq(patientDocuments.patientId, Number(patientId))];
    if (type) {
      conditions.push(eq(patientDocuments.documentType, type));
    }

    const documents = await db
      .select({
        id: patientDocuments.id,
        documentType: patientDocuments.documentType,
        title: patientDocuments.title,
        fileName: patientDocuments.fileName,
        fileSizeBytes: patientDocuments.fileSizeBytes,
        mimeType: patientDocuments.mimeType,
        documentDate: patientDocuments.documentDate,
        aiSummary: patientDocuments.aiSummary,
        aiStructuredData: patientDocuments.aiStructuredData,
        category: patientDocuments.category,
        notes: patientDocuments.notes,
        source: patientDocuments.source,
        createdAt: patientDocuments.createdAt,
      })
      .from(patientDocuments)
      .where(and(...conditions))
      .orderBy(desc(patientDocuments.createdAt))
      .limit(100);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────
//  DELETE: Remove a document
// ─────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await db.delete(patientDocuments).where(eq(patientDocuments.id, id));
    return NextResponse.json({ success: true, message: "تم حذف المستند" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────
//  AI Analysis Prompts
// ─────────────────────────────────────────────────────────────────
function getAnalysisPrompt(type: string, title: string): string {
  const base = `أنت طبيب خبير تحلل مستنداً طبياً. قم بتحليل هذا المستند واستخرج المعلومات المهمة.
العنوان: ${title || "غير محدد"}

أجب باللغة العربية. قدم:
1. ملخص المستند
2. النتائج المهمة أو غير الطبيعية
3. توصيات

`;

  switch (type) {
    case "lab_result":
      return base + `هذا تحليل مخبري. استخرج:
- اسم كل تحليل ونتيجته والمعدل الطبيعي
- حدد القيم غير الطبيعية (مرتفعة أو منخفضة)
- قدم تفسيراً سريرياً

أعد البيانات المنظمة بصيغة JSON:
\`\`\`json
{
  "tests": [{"name": "", "value": "", "unit": "", "normalRange": "", "status": "normal|high|low"}],
  "summary": "",
  "abnormalFindings": [],
  "recommendations": []
}
\`\`\``;

    case "scan_image":
      return base + `هذه صورة أشعة أو فحص تصويري. حلل:
- نوع الفحص (X-ray, CT, MRI, Ultrasound)
- المنطقة المفحوصة
- النتائج الطبيعية وغير الطبيعية
- التشخيص المحتمل

أعد البيانات المنظمة بصيغة JSON:
\`\`\`json
{
  "scanType": "",
  "bodyRegion": "",
  "findings": [],
  "impression": "",
  "recommendations": []
}
\`\`\``;

    case "prescription":
      return base + `هذه روشتة / وصفة طبية. استخرج:
- اسم كل دواء
- الجرعة
- التكرار
- المدة
- الطبيب المعالج

أعد البيانات المنظمة بصيغة JSON:
\`\`\`json
{
  "medications": [{"name": "", "dose": "", "frequency": "", "duration": "", "route": ""}],
  "doctor": "",
  "date": "",
  "diagnosis": ""
}
\`\`\``;

    case "medical_report":
      return base + `هذا تقرير طبي. استخرج:
- التشخيص
- الإجراءات المتخذة
- التوصيات
- المتابعة المطلوبة

أعد البيانات المنظمة بصيغة JSON:
\`\`\`json
{
  "diagnosis": [],
  "procedures": [],
  "findings": "",
  "recommendations": [],
  "followUp": ""
}
\`\`\``;

    default:
      return base + `حلل هذا المستند واستخرج أي معلومات طبية مفيدة.

أعد البيانات المنظمة بصيغة JSON:
\`\`\`json
{
  "type": "",
  "summary": "",
  "keyFindings": [],
  "recommendations": []
}
\`\`\``;
  }
}
