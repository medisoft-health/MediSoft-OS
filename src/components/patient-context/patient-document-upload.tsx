"use client";

import * as React from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Brain,
  Eye,
  Download,
  Trash2,
  Plus,
  Calendar,
  Tag,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────
export interface PatientDocument {
  id?: number;
  type: "lab_result" | "scan" | "prescription" | "report" | "insurance" | "id_document" | "other";
  title: string;
  description?: string;
  fileUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  date?: string;
  aiAnalysis?: string;
  extractedData?: Record<string, unknown>;
  status: "uploading" | "processing" | "ready" | "error";
  error?: string;
}

interface PatientDocumentUploadProps {
  patientId: number;
  documents: PatientDocument[];
  onDocumentUploaded: (doc: PatientDocument) => void;
  onDocumentRemoved?: (docId: number) => void;
}

const DOC_TYPES = [
  { value: "lab_result", label: "تحليل مخبري", icon: "🧪" },
  { value: "scan", label: "أشعة / صورة طبية", icon: "🩻" },
  { value: "prescription", label: "روشتة / وصفة طبية", icon: "💊" },
  { value: "report", label: "تقرير طبي", icon: "📋" },
  { value: "insurance", label: "مستند تأمين", icon: "🛡️" },
  { value: "id_document", label: "هوية / إقامة", icon: "🪪" },
  { value: "other", label: "أخرى", icon: "📎" },
];

// ─────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────
export function PatientDocumentUpload({
  patientId,
  documents,
  onDocumentUploaded,
  onDocumentRemoved,
}: PatientDocumentUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<string>("lab_result");
  const [docDate, setDocDate] = React.useState<string>("");
  const [docTitle, setDocTitle] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await uploadFile(file);
    }
  };

  // Upload single file
  const uploadFile = async (file: File) => {
    setUploading(true);

    const doc: PatientDocument = {
      type: selectedType as PatientDocument["type"],
      title: docTitle || file.name.replace(/\.[^.]+$/, ""),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      date: docDate || new Date().toISOString().split("T")[0],
      status: "uploading",
    };

    // Notify parent about the uploading state
    onDocumentUploaded({ ...doc });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", patientId.toString());
      formData.append("type", selectedType);
      formData.append("title", doc.title);
      formData.append("date", doc.date || "");

      const res = await fetch("/api/patient-360/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("فشل في رفع الملف");

      const result = await res.json();

      // Update document with server response
      const uploadedDoc: PatientDocument = {
        ...doc,
        id: result.id,
        fileUrl: result.fileUrl,
        aiAnalysis: result.aiAnalysis,
        extractedData: result.extractedData,
        status: "ready",
      };

      onDocumentUploaded(uploadedDoc);
    } catch (err) {
      onDocumentUploaded({
        ...doc,
        status: "error",
        error: err instanceof Error ? err.message : "حدث خطأ",
      });
    } finally {
      setUploading(false);
      setDocTitle("");
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          <h3 className="font-bold text-gray-900 text-sm">رفع المستندات الطبية</h3>
          <Badge variant="outline" className="text-[10px] mr-auto">
            {documents.filter((d) => d.status === "ready").length} مستند
          </Badge>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          ارفع التحاليل، الأشعة، الروشتات، التقارير — سيتم تحليلها تلقائياً بالذكاء الطبي
        </p>
      </div>

      {/* Upload Controls */}
      <div className="p-4 space-y-3">
        {/* Type + Date selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-[150px]"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            className="w-40"
            dir="ltr"
          />
          <Input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="عنوان المستند (اختياري)"
            className="flex-1 min-w-[150px]"
          />
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
            dragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.dicom"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-gray-600">جاري الرفع والتحليل...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-gray-400" />
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-700 font-medium">اسحب الملفات هنا أو اضغط للاختيار</p>
              <p className="text-xs text-gray-500">
                PDF, صور, DICOM — حتى 20MB لكل ملف
              </p>
            </div>
          )}
        </div>

        {/* Camera button for mobile */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.capture = "environment";
              input.onchange = (e) => handleFiles((e.target as HTMLInputElement).files);
              input.click();
            }}
          >
            <ImageIcon className="h-4 w-4" />
            التقاط صورة
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            اختيار ملف
          </Button>
        </div>
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">المستندات المرفوعة</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {documents.map((doc, idx) => (
              <DocumentCard key={doc.id || idx} document={doc} onRemove={onDocumentRemoved} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Document Card
// ─────────────────────────────────────────────────────────────────
function DocumentCard({
  document: doc,
  onRemove,
}: {
  document: PatientDocument;
  onRemove?: (id: number) => void;
}) {
  const [showAnalysis, setShowAnalysis] = React.useState(false);
  const typeInfo = DOC_TYPES.find((t) => t.value === doc.type) || DOC_TYPES[DOC_TYPES.length - 1];

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center gap-2">
        <span className="text-lg">{typeInfo.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span>{typeInfo.label}</span>
            {doc.date && (
              <>
                <span>•</span>
                <span>{doc.date}</span>
              </>
            )}
            <span>•</span>
            <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
          </div>
        </div>

        {/* Status */}
        {doc.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        {doc.status === "processing" && <Brain className="h-4 w-4 animate-pulse text-purple-500" />}
        {doc.status === "ready" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {doc.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}

        {/* Actions */}
        {doc.status === "ready" && (
          <div className="flex items-center gap-1">
            {doc.aiAnalysis && (
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="p-1 text-purple-500 hover:text-purple-700"
                title="عرض التحليل"
              >
                <Brain className="h-4 w-4" />
              </button>
            )}
            {doc.fileUrl && (
              <a href={doc.fileUrl} target="_blank" className="p-1 text-blue-500 hover:text-blue-700">
                <Eye className="h-4 w-4" />
              </a>
            )}
            {onRemove && doc.id && (
              <button
                onClick={() => onRemove(doc.id!)}
                className="p-1 text-red-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* AI Analysis */}
      {showAnalysis && doc.aiAnalysis && (
        <div className="mt-2 bg-purple-50 border border-purple-200 rounded-md p-2">
          <div className="flex items-center gap-1 mb-1">
            <Brain className="h-3 w-3 text-purple-600" />
            <span className="text-[10px] font-semibold text-purple-800">تحليل الذكاء الطبي</span>
          </div>
          <p className="text-xs text-purple-900 leading-relaxed whitespace-pre-wrap">{doc.aiAnalysis}</p>
        </div>
      )}

      {/* Error */}
      {doc.status === "error" && doc.error && (
        <p className="mt-1 text-xs text-red-600">{doc.error}</p>
      )}
    </div>
  );
}
