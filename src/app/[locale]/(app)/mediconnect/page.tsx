"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Bell,
  Watch,
  Send,
  Users,
  Activity,
  Smartphone,
  Wifi,
  FileText,
  Pill,
  Stethoscope,
  Heart,
} from "lucide-react";
import { MediConnectInbox } from "@/components/mediconnect/mediconnect-inbox";
import { NotificationsPanel } from "@/components/mediconnect/notifications-panel";
import { DeviceConnections } from "@/components/mediconnect/device-connections";
import { usePatientContext } from "@/components/patient-context/patient-context-provider";

export default function MediConnectPage() {
  const [activeTab, setActiveTab] = useState("inbox");
  const { patient: selectedPatient } = usePatientContext();

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">MediConnect</h1>
            <p className="text-sm text-gray-500">التواصل الذكي بين المريض والفريق الطبي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Wifi className="h-3 w-3 ml-1 text-green-500" />
            متصل
          </Badge>
        </div>
      </div>

      {/* Feature Cards - when no patient selected */}
      {!selectedPatient ? (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
              <CardContent className="p-4 flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">0</p>
                  <p className="text-xs text-blue-600">رسائل جديدة</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Bell className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">0</p>
                  <p className="text-xs text-amber-600">تنبيهات نشطة</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Watch className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">0</p>
                  <p className="text-xs text-green-600">أجهزة متصلة</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Pill className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">0</p>
                  <p className="text-xs text-purple-600">روشتات عن بُعد</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Description */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">المراسلة الآمنة</h3>
                <p className="text-sm text-gray-500">
                  تواصل مباشر بين المريض والطبيب — رسائل نصية، صوتية، صور، وملفات طبية. كل شيء مشفر وآمن.
                </p>
                <div className="flex flex-wrap gap-1 mt-3 justify-center">
                  <Badge variant="outline" className="text-[10px]">نصية</Badge>
                  <Badge variant="outline" className="text-[10px]">صوتية</Badge>
                  <Badge variant="outline" className="text-[10px]">صور</Badge>
                  <Badge variant="outline" className="text-[10px]">ملفات</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">التنبيهات الذكية</h3>
                <p className="text-sm text-gray-500">
                  إشعارات فورية عبر التطبيق، البريد، SMS، وWhatsApp. تنبيهات تلقائية عند أي قراءة خارج النطاق.
                </p>
                <div className="flex flex-wrap gap-1 mt-3 justify-center">
                  <Badge variant="outline" className="text-[10px]">Push</Badge>
                  <Badge variant="outline" className="text-[10px]">Email</Badge>
                  <Badge variant="outline" className="text-[10px]">SMS</Badge>
                  <Badge variant="outline" className="text-[10px]">WhatsApp</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                  <Watch className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">ربط الأجهزة</h3>
                <p className="text-sm text-gray-500">
                  اربط ساعتك الذكية وأجهزة القياس. مزامنة تلقائية مع Apple Health، Google Health Connect، Fitbit، وأكثر.
                </p>
                <div className="flex flex-wrap gap-1 mt-3 justify-center">
                  <Badge variant="outline" className="text-[10px]">Apple Health</Badge>
                  <Badge variant="outline" className="text-[10px]">Google Fit</Badge>
                  <Badge variant="outline" className="text-[10px]">Fitbit</Badge>
                  <Badge variant="outline" className="text-[10px]">Bluetooth</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                كيف يعمل MediConnect
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: 1, icon: <Smartphone className="h-6 w-6" />, title: "المريض يسجل", desc: "قراءة من جهازه أو يدوياً" },
                  { step: 2, icon: <Activity className="h-6 w-6" />, title: "الذكاء يحلل", desc: "Medical Intelligence يقيّم القراءة" },
                  { step: 3, icon: <Bell className="h-6 w-6" />, title: "تنبيه فوري", desc: "إشعار للمريض والطبيب إذا لزم" },
                  { step: 4, icon: <Stethoscope className="h-6 w-6" />, title: "الطبيب يتصرف", desc: "يراسل المريض أو يكتب روشتة" },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 mb-2">
                      {item.icon}
                    </div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Remote Prescription Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-5 w-5 text-purple-500" />
                الروشتة عن بُعد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-gradient-to-l from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border border-purple-100 dark:border-purple-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                    <p className="font-semibold text-sm">التحاليل تصل</p>
                    <p className="text-xs text-gray-500">المعمل يرفع النتيجة → AI يحللها</p>
                  </div>
                  <div>
                    <Stethoscope className="h-8 w-8 mx-auto text-green-500 mb-2" />
                    <p className="font-semibold text-sm">الطبيب يراجع</p>
                    <p className="text-xs text-gray-500">يشوف النتائج ويكتب روشتة جديدة</p>
                  </div>
                  <div>
                    <Send className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                    <p className="font-semibold text-sm">المريض يستلم</p>
                    <p className="text-xs text-gray-500">إشعار + روشتة رقمية جاهزة للصرف</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center py-4">
            <p className="text-sm text-gray-400">اختر مريض من صفحة المرضى لبدء التواصل</p>
          </div>
        </div>
      ) : (
        /* Patient Selected - Show full MediConnect interface */
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="inbox" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              المحادثات
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1">
              <Bell className="h-4 w-4" />
              الإشعارات
            </TabsTrigger>
            <TabsTrigger value="devices" className="gap-1">
              <Watch className="h-4 w-4" />
              الأجهزة
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-1">
              <Pill className="h-4 w-4" />
              الروشتات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox">
            <MediConnectInbox />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsPanel patientId={selectedPatient.id} />
          </TabsContent>

          <TabsContent value="devices">
            <DeviceConnections patientId={selectedPatient.id} />
          </TabsContent>

          <TabsContent value="prescriptions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-purple-500" />
                  الروشتات عن بُعد
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Pill className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">لا توجد روشتات عن بُعد</p>
                <p className="text-sm text-gray-400 mt-1">
                  عندما يكتب الطبيب روشتة للمريض عن بُعد ستظهر هنا
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
