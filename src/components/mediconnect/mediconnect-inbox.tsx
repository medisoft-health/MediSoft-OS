"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle,
  Send,
  Paperclip,
  Phone,
  Video,
  Search,
  Plus,
  Pill,
  FileText,
  Bell,
  Clock,
  CheckCheck,
  AlertTriangle,
  User,
  Stethoscope,
  Mic,
  Image as ImageIcon,
  MoreVertical,
  Archive,
  X,
} from "lucide-react";

interface Conversation {
  id: string;
  patientId: number;
  title: string | null;
  type: string;
  status: string;
  priority: string;
  lastMessageAt: string;
  patient: { id: number; firstName: string; lastName: string; phone?: string } | null;
  unreadCount: number;
  lastMessage: { body: string; senderType: string; contentType: string; createdAt: string } | null;
}

interface Message {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  senderPatientId: number | null;
  senderType: string;
  contentType: string;
  body: string | null;
  attachments: Array<{ name: string; url: string; type: string; size?: number }>;
  metadata: Record<string, unknown>;
  replyToId: string | null;
  isEdited: boolean;
  createdAt: string;
}

export function MediConnectInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [newConvPatientId, setNewConvPatientId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/mediconnect?action=conversations");
      const data = await res.json();
      if (data.success) setConversations(data.data);
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/mediconnect?action=messages&conversationId=${convId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    // Poll for new messages every 10s
    pollRef.current = setInterval(fetchConversations, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
      const msgPoll = setInterval(() => fetchMessages(selectedConv.id), 5000);
      return () => clearInterval(msgPoll);
    }
  }, [selectedConv, fetchMessages]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await fetch("/api/mediconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          conversationId: selectedConv.id,
          messageBody: newMessage,
          contentType: "text",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage("");
        fetchMessages(selectedConv.id);
        fetchConversations();
      }
    } catch (e) {
      console.error("Failed to send:", e);
    } finally {
      setSending(false);
    }
  };

  // Create new conversation
  const handleNewConversation = async () => {
    if (!newConvPatientId) return;
    try {
      const res = await fetch("/api/mediconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_conversation",
          patientId: parseInt(newConvPatientId),
          type: "direct",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewConv(false);
        setNewConvPatientId("");
        fetchConversations();
      }
    } catch (e) {
      console.error("Failed to create conversation:", e);
    }
  };

  // Send prescription
  const handleSendPrescription = async () => {
    if (!selectedConv?.patientId) return;
    // This would open a prescription dialog — for now, placeholder
    try {
      const res = await fetch("/api/mediconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_prescription",
          patientId: selectedConv.patientId,
          conversationId: selectedConv.id,
          medications: [{ name: "Sample", dose: "500mg", frequency: "مرتين يومياً", duration: "7 أيام" }],
          diagnosis: "تشخيص مبدئي",
        }),
      });
      const data = await res.json();
      if (data.success) fetchMessages(selectedConv.id);
    } catch (e) {
      console.error("Failed to send prescription:", e);
    }
  };

  const filteredConvs = conversations.filter((c) => {
    if (!searchQuery) return true;
    const patientName = c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "";
    return patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "prescription": return <Pill className="h-4 w-4 text-green-500" />;
      case "lab_result": return <FileText className="h-4 w-4 text-blue-500" />;
      case "alert": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "الآن";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} د`;
    if (diff < 86400000) return date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[600px] rounded-xl border bg-white dark:bg-gray-900 overflow-hidden" dir="rtl">
      {/* Sidebar - Conversations List */}
      <div className={`w-full md:w-96 border-l flex flex-col ${selectedConv ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-l from-blue-50 to-white dark:from-blue-950 dark:to-gray-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-lg">MediConnect</h2>
              {totalUnread > 0 && (
                <Badge variant="destructive" className="text-xs">{totalUnread}</Badge>
              )}
            </div>
            <Button size="sm" onClick={() => setShowNewConv(true)}>
              <Plus className="h-4 w-4 ml-1" />
              محادثة جديدة
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث عن مريض أو محادثة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>

        {/* New Conversation Dialog */}
        {showNewConv && (
          <div className="p-3 border-b bg-blue-50 dark:bg-blue-950">
            <div className="flex items-center gap-2">
              <Input
                placeholder="رقم المريض (Patient ID)"
                value={newConvPatientId}
                onChange={(e) => setNewConvPatientId(e.target.value)}
                type="number"
              />
              <Button size="sm" onClick={handleNewConversation}>إنشاء</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewConv(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">جاري التحميل...</div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد محادثات</p>
              <p className="text-sm mt-1">ابدأ محادثة جديدة مع مريض</p>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  selectedConv?.id === conv.id ? "bg-blue-50 dark:bg-blue-950 border-r-4 border-r-blue-500" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {conv.patient ? conv.patient.firstName.charAt(0) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">
                        {conv.patient ? `${conv.patient.firstName} ${conv.patient.lastName}` : conv.title || "محادثة"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {conv.lastMessageAt ? formatTime(conv.lastMessageAt) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                        {conv.lastMessage && (
                          <>
                            {getMessageIcon(conv.lastMessage.contentType)}
                            <span className="truncate">
                              {conv.lastMessage.senderType === "physician" && <CheckCheck className="h-3 w-3 inline ml-1 text-blue-500" />}
                              {conv.lastMessage.body?.substring(0, 50) || conv.lastMessage.contentType}
                            </span>
                          </>
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-blue-600 text-white text-xs h-5 w-5 flex items-center justify-center rounded-full p-0">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {conv.type === "prescription" && <Badge variant="outline" className="text-[10px] px-1">وصفة</Badge>}
                      {conv.type === "lab_result" && <Badge variant="outline" className="text-[10px] px-1">تحاليل</Badge>}
                      {conv.priority === "urgent" && <Badge variant="destructive" className="text-[10px] px-1">عاجل</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedConv ? "hidden md:flex" : "flex"}`}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b bg-white dark:bg-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelectedConv(null)}>
                  ←
                </Button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {selectedConv.patient?.firstName.charAt(0) || "?"}
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {selectedConv.patient ? `${selectedConv.patient.firstName} ${selectedConv.patient.lastName}` : "محادثة"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedConv.patient?.phone || `Patient #${selectedConv.patientId}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" title="مكالمة صوتية">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" title="مكالمة فيديو">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSendPrescription} title="إرسال وصفة طبية">
                  <Pill className="h-4 w-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="sm" title="المزيد">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950">
              {messages.map((msg) => {
                const isMe = msg.senderType === "physician";
                const isPrescription = msg.contentType === "prescription";
                const isLabResult = msg.contentType === "lab_result";
                const isSystem = msg.senderType === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center">
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-gray-500">
                        {msg.body}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[70%] ${
                      isPrescription ? "bg-green-50 border border-green-200 dark:bg-green-950" :
                      isLabResult ? "bg-blue-50 border border-blue-200 dark:bg-blue-950" :
                      isMe ? "bg-white dark:bg-gray-800 border" :
                      "bg-blue-600 text-white"
                    } rounded-2xl px-4 py-2.5 shadow-sm`}>
                      {isPrescription && (
                        <div className="flex items-center gap-1 mb-1">
                          <Pill className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs font-semibold text-green-700">وصفة طبية</span>
                        </div>
                      )}
                      {isLabResult && (
                        <div className="flex items-center gap-1 mb-1">
                          <FileText className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700">نتائج تحاليل</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((att, i) => (
                            <a key={i} href={att.url} target="_blank" className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                              <Paperclip className="h-3 w-3" />
                              {att.name}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className={`text-[10px] mt-1 ${isMe ? "text-gray-400" : "text-white/70"}`}>
                        {formatTime(msg.createdAt)}
                        {isMe && <CheckCheck className="h-3 w-3 inline mr-1" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t bg-white dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Mic className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="اكتب رسالة..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                <MessageCircle className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">MediConnect</h3>
              <p className="text-sm text-gray-500 mt-1">نظام التواصل الطبي الذكي</p>
              <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">
                تواصل مع مرضاك، أرسل روشتات، شارك نتائج التحاليل، وأجرِ استشارات عن بُعد
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Badge variant="outline" className="text-xs"><MessageCircle className="h-3 w-3 ml-1" />رسائل</Badge>
                <Badge variant="outline" className="text-xs"><Pill className="h-3 w-3 ml-1" />روشتات</Badge>
                <Badge variant="outline" className="text-xs"><FileText className="h-3 w-3 ml-1" />تحاليل</Badge>
                <Badge variant="outline" className="text-xs"><Video className="h-3 w-3 ml-1" />فيديو</Badge>
                <Badge variant="outline" className="text-xs"><Bell className="h-3 w-3 ml-1" />إشعارات</Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
