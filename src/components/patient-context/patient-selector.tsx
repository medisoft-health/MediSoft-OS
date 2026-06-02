"use client";

import * as React from "react";
import {
  Search,
  User,
  UserPlus,
  X,
  Loader2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { usePatientContext, type SelectedPatient } from "./patient-context-provider";

/**
 * Patient Selector — A slide-out panel that allows searching and selecting a patient.
 * Used globally across all modules to set the active patient context.
 */
export function PatientSelector() {
  const { mode, patient, selectPatient, clearPatient, setSelfTracking } = usePatientContext();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<SelectedPatient[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Search patients via API
  const searchPatients = React.useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.patients ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchPatients(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchPatients]);

  const handleSelect = (p: SelectedPatient) => {
    selectPatient(p);
    setOpen(false);
    setSearchQuery("");
    setResults([]);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${
            mode === "patient"
              ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
              : mode === "self"
              ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
          }`}
        >
          {mode === "patient" ? (
            <UserCheck className="w-4 h-4" />
          ) : mode === "self" ? (
            <User className="w-4 h-4" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          <span className="hidden sm:inline max-w-[120px] truncate">
            {mode === "patient" && patient
              ? `${patient.firstNameAr || patient.firstName} ${patient.lastNameAr || patient.lastName}`
              : mode === "self"
              ? "تتبع شخصي"
              : "اختر مريض"}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${
              mode === "patient"
                ? "border-green-400 text-green-700"
                : mode === "self"
                ? "border-blue-400 text-blue-700"
                : "border-orange-400 text-orange-700"
            }`}
          >
            {mode === "patient" ? "مريض" : mode === "self" ? "شخصي" : "تجريبي"}
          </Badge>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md" dir="rtl">
        <SheetHeader>
          <SheetTitle>اختيار المريض</SheetTitle>
          <SheetDescription>
            اختر مريض لتسجيل البيانات عليه، أو استخدم التتبع الشخصي
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Current Selection */}
          {mode === "patient" && patient && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    المريض الحالي: {patient.firstNameAr || patient.firstName} {patient.lastNameAr || patient.lastName}
                  </p>
                  {patient.mrn && (
                    <p className="text-xs text-green-600">رقم الملف: {patient.mrn}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearPatient}
                  className="text-green-700 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Mode Buttons */}
          <div className="flex gap-2">
            <Button
              variant={mode === "self" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                setSelfTracking();
                setOpen(false);
              }}
            >
              <User className="w-4 h-4 ml-1" />
              تتبع شخصي
            </Button>
            <Button
              variant={mode === "guest" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                clearPatient();
                setOpen(false);
              }}
            >
              تجريبي (بدون حفظ)
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو رقم الملف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
              dir="rtl"
            />
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">جاري البحث...</span>
              </div>
            )}

            {!loading && searchQuery.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                لا توجد نتائج لـ &quot;{searchQuery}&quot;
              </div>
            )}

            {!loading && results.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className="w-full rounded-lg border p-3 text-right hover:bg-accent hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {p.firstNameAr || p.firstName} {p.lastNameAr || p.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.mrn && (
                        <span className="text-xs text-muted-foreground">#{p.mrn}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {p.age} سنة • {p.sex === "male" ? "ذكر" : "أنثى"}
                      </span>
                    </div>
                  </div>
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}

            {!loading && searchQuery.length < 2 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                اكتب اسم المريض أو رقم الملف للبحث
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
