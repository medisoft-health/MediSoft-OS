"use client";

import * as React from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  MessageSquare,
  Settings,
  Maximize2,
  Minimize2,
  Camera,
  RotateCcw,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  Pill,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────
interface VideoCallRoomProps {
  sessionId: string;
  roomId: string;
  role: "physician" | "patient";
  patientName?: string;
  physicianName?: string;
  onEndCall?: () => void;
  onAddNotes?: (notes: string) => void;
}

interface CallState {
  status: "connecting" | "waiting" | "active" | "ended" | "error";
  duration: number;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isFullscreen: boolean;
  isChatOpen: boolean;
  isNotesOpen: boolean;
  remoteVideoEnabled: boolean;
  remoteAudioEnabled: boolean;
  connectionQuality: "excellent" | "good" | "poor" | "disconnected";
}

// ─────────────────────────────────────────────────────────────────
//  Video Call Room Component
// ─────────────────────────────────────────────────────────────────
export function VideoCallRoom({
  sessionId,
  roomId,
  role,
  patientName = "المريض",
  physicianName = "الطبيب",
  onEndCall,
  onAddNotes,
}: VideoCallRoomProps) {
  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);

  const [state, setState] = React.useState<CallState>({
    status: "connecting",
    duration: 0,
    isVideoEnabled: true,
    isAudioEnabled: true,
    isScreenSharing: false,
    isFullscreen: false,
    isChatOpen: false,
    isNotesOpen: false,
    remoteVideoEnabled: true,
    remoteAudioEnabled: true,
    connectionQuality: "good",
  });

  const [notes, setNotes] = React.useState("");
  const [chatMessages, setChatMessages] = React.useState<Array<{ from: string; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = React.useState("");
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // ─── Initialize WebRTC ───────────────────────────────────────
  React.useEffect(() => {
    initializeCall();
    return () => {
      cleanup();
    };
  }, []);

  // ─── Duration Timer ──────────────────────────────────────────
  React.useEffect(() => {
    if (state.status === "active") {
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status]);

  async function initializeCall() {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Get ICE servers from API
      const tokenRes = await fetch("/api/telemedicine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_token", sessionId }),
      });
      const { token } = await tokenRes.json();

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: token?.iceServers || [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setState(prev => ({ ...prev, status: "active" }));
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // In production: send to signaling server
          console.log("[WebRTC] ICE candidate:", event.candidate.candidate?.slice(0, 50));
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case "connected":
            setState(prev => ({ ...prev, status: "active", connectionQuality: "excellent" }));
            break;
          case "disconnected":
            setState(prev => ({ ...prev, connectionQuality: "disconnected" }));
            break;
          case "failed":
            setState(prev => ({ ...prev, status: "error" }));
            break;
        }
      };

      // Notify server we're ready
      if (role === "patient") {
        await fetch("/api/telemedicine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start_waiting", sessionId }),
        });
        setState(prev => ({ ...prev, status: "waiting" }));
      } else {
        setState(prev => ({ ...prev, status: "waiting" }));
      }

    } catch (error) {
      console.error("[VideoCall] Init error:", error);
      setState(prev => ({ ...prev, status: "error" }));
    }
  }

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnectionRef.current?.close();
  }

  // ─── Controls ────────────────────────────────────────────────
  function toggleVideo() {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
    }
  }

  function toggleAudio() {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setState(prev => ({ ...prev, isAudioEnabled: audioTrack.enabled }));
    }
  }

  async function toggleScreenShare() {
    if (state.isScreenSharing) {
      // Stop screen share
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack && peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "video");
        sender?.replaceTrack(videoTrack);
      }
      setState(prev => ({ ...prev, isScreenSharing: false }));
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "video");
          sender?.replaceTrack(screenTrack);
        }
        screenTrack.onended = () => {
          toggleScreenShare();
        };
        setState(prev => ({ ...prev, isScreenSharing: true }));
      } catch (err) {
        console.error("[ScreenShare] Error:", err);
      }
    }
  }

  async function endCall() {
    await fetch("/api/telemedicine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end_call", sessionId }),
    });
    cleanup();
    setState(prev => ({ ...prev, status: "ended" }));
    onEndCall?.();
  }

  async function startCall() {
    await fetch("/api/telemedicine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start_call", sessionId }),
    });
    setState(prev => ({ ...prev, status: "active" }));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setState(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setState(prev => ({ ...prev, isFullscreen: false }));
    }
  }

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function sendChatMessage() {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, {
      from: role === "physician" ? physicianName : patientName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
    }]);
    setChatInput("");
  }

  async function saveNotes() {
    if (!notes.trim()) return;
    await fetch("/api/telemedicine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_notes", sessionId, notes }),
    });
    onAddNotes?.(notes);
  }

  // ─── Connection Quality Indicator ────────────────────────────
  const qualityColors = {
    excellent: "bg-green-500",
    good: "bg-yellow-500",
    poor: "bg-red-500",
    disconnected: "bg-gray-500",
  };

  // ─── Render ──────────────────────────────────────────────────
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">خطأ في الاتصال</h2>
        <p className="text-gray-400 text-center mb-4">
          تعذر الاتصال بالمكالمة. تأكد من إعدادات الكاميرا والميكروفون.
        </p>
        <button
          onClick={initializeCall}
          className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (state.status === "ended") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">انتهت المكالمة</h2>
        <p className="text-gray-400 mb-2">مدة المكالمة: {formatDuration(state.duration)}</p>
        {role === "physician" && (
          <div className="w-full max-w-md mt-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات سريرية عن المكالمة..."
              className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white resize-none"
            />
            <button
              onClick={saveNotes}
              className="mt-2 px-4 py-2 bg-teal-600 rounded-lg hover:bg-teal-700 w-full"
            >
              حفظ الملاحظات
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-gray-900 overflow-hidden">
      {/* ─── Top Bar ─────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <div className={cn("w-3 h-3 rounded-full animate-pulse", qualityColors[state.connectionQuality])} />
          <span className="text-white text-sm font-medium">
            {state.status === "waiting" ? "في انتظار الطرف الآخر..." :
             state.status === "connecting" ? "جاري الاتصال..." :
             `مكالمة نشطة — ${formatDuration(state.duration)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-xs bg-white/10 px-2 py-1 rounded">
            {roomId}
          </span>
          <button onClick={toggleFullscreen} className="text-white/70 hover:text-white p-1">
            {state.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── Video Area ──────────────────────────────────────── */}
      <div className="flex-1 relative">
        {/* Remote Video (Full Screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Waiting State Overlay */}
        {(state.status === "waiting" || state.status === "connecting") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-3" />
            <p className="text-white text-lg">
              {state.status === "connecting" ? "جاري الاتصال..." : "في انتظار انضمام الطرف الآخر..."}
            </p>
            {role === "physician" && state.status === "waiting" && (
              <button
                onClick={startCall}
                className="mt-6 px-8 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 flex items-center gap-2 text-lg"
              >
                <Phone className="w-5 h-5" />
                بدء المكالمة
              </button>
            )}
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-24 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn("w-full h-full object-cover", !state.isVideoEnabled && "hidden")}
          />
          {!state.isVideoEnabled && (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-500" />
            </div>
          )}
        </div>

        {/* Screen Share Indicator */}
        {state.isScreenSharing && (
          <div className="absolute top-16 left-4 bg-red-600/90 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            مشاركة الشاشة نشطة
          </div>
        )}
      </div>

      {/* ─── Chat Panel (Slide-in) ───────────────────────────── */}
      {state.isChatOpen && (
        <div className="absolute top-14 left-4 bottom-20 w-80 bg-gray-800/95 backdrop-blur-sm rounded-xl border border-gray-700 flex flex-col z-10">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium text-sm">المحادثة النصية</h3>
            <button onClick={() => setState(prev => ({ ...prev, isChatOpen: false }))} className="text-gray-400 hover:text-white">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn("max-w-[80%] p-2 rounded-lg text-sm",
                msg.from === (role === "physician" ? physicianName : patientName)
                  ? "bg-teal-600 text-white mr-auto" : "bg-gray-700 text-white ml-auto"
              )}>
                <p>{msg.text}</p>
                <span className="text-[10px] opacity-60">{msg.time}</span>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-gray-700 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border-none outline-none"
            />
            <button onClick={sendChatMessage} className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700">
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Clinical Notes Panel (Physician Only) ───────────── */}
      {state.isNotesOpen && role === "physician" && (
        <div className="absolute top-14 right-56 bottom-20 w-80 bg-gray-800/95 backdrop-blur-sm rounded-xl border border-gray-700 flex flex-col z-10">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium text-sm">ملاحظات سريرية</h3>
            <button onClick={() => setState(prev => ({ ...prev, isNotesOpen: false }))} className="text-gray-400 hover:text-white">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="سجل ملاحظاتك أثناء المكالمة..."
            className="flex-1 bg-transparent text-white text-sm p-3 resize-none outline-none"
          />
          <div className="p-2 border-t border-gray-700 flex gap-2">
            <button onClick={saveNotes} className="flex-1 bg-teal-600 text-white text-sm py-2 rounded-lg hover:bg-teal-700">
              حفظ
            </button>
          </div>
        </div>
      )}

      {/* ─── Bottom Controls ─────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-3 py-4 bg-gradient-to-t from-black/70 to-transparent">
        {/* Audio Toggle */}
        <button
          onClick={toggleAudio}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            state.isAudioEnabled ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-600 hover:bg-red-700 text-white"
          )}
        >
          {state.isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            state.isVideoEnabled ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-600 hover:bg-red-700 text-white"
          )}
        >
          {state.isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            state.isScreenSharing ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"
          )}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Chat Toggle */}
        <button
          onClick={() => setState(prev => ({ ...prev, isChatOpen: !prev.isChatOpen }))}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            state.isChatOpen ? "bg-teal-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"
          )}
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Clinical Notes (Physician Only) */}
        {role === "physician" && (
          <button
            onClick={() => setState(prev => ({ ...prev, isNotesOpen: !prev.isNotesOpen }))}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              state.isNotesOpen ? "bg-purple-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"
            )}
          >
            <FileText className="w-5 h-5" />
          </button>
        )}

        {/* End Call */}
        <button
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-all shadow-lg"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
