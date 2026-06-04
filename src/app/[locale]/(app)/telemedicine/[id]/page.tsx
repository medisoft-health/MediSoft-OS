"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoCallRoom } from "@/components/telemedicine";
import { Loader2 } from "lucide-react";

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/telemedicine?action=get&sessionId=${sessionId}`);
        const data = await res.json();
        if (data.session) {
          setSession(data.session);
        } else {
          setError("جلسة المكالمة غير موجودة");
        }
      } catch (err) {
        setError("خطأ في تحميل بيانات المكالمة");
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) fetchSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl mb-4">{error || "خطأ"}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <VideoCallRoom
        sessionId={session.id}
        roomId={session.roomId}
        role="physician"
        patientName={`مريض #${session.patientId}`}
        physicianName="الطبيب"
        onEndCall={() => router.push("/telemedicine")}
      />
    </div>
  );
}
