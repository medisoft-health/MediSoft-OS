"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Award,
  Crown,
  Flame,
  Heart,
  Medal,
  MessageCircle,
  Plus,
  Share2,
  Star,
  ThumbsUp,
  Trophy,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface FeedPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: "workout" | "achievement" | "streak" | "challenge" | "weight" | "personal_best";
  content: string;
  stats?: { label: string; value: string }[];
  timestamp: string;
  kudos: number;
  comments: number;
  hasKudos: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string;
  score: number;
  metric: string;
  isCurrentUser: boolean;
}

interface Club {
  id: string;
  name: string;
  members: number;
  category: string;
  icon: string;
  isJoined: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sample Data (Simulated community)
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_AVATARS = ["🧑‍💪", "👨‍🦱", "👩‍🦰", "🧔", "👱‍♀️", "👨‍🦳", "🧑‍🦲", "👩‍🦱"];

const SAMPLE_FEED: FeedPost[] = [
  {
    id: "1",
    userId: "u1",
    userName: "أحمد محمد",
    userAvatar: "🧑‍💪",
    type: "workout",
    content: "خلصت تمرين صدر وتراي — أقوى pump من زمان! 💪",
    stats: [
      { label: "مدة", value: "55 دقيقة" },
      { label: "سعرات", value: "420 سعرة" },
    ],
    timestamp: "منذ 30 دقيقة",
    kudos: 12,
    comments: 3,
    hasKudos: false,
  },
  {
    id: "2",
    userId: "u2",
    userName: "سارة أحمد",
    userAvatar: "👩‍🦰",
    type: "streak",
    content: "🔥 30 يوم متتالي بدون انقطاع! الالتزام هو المفتاح",
    stats: [{ label: "Streak", value: "30 يوم 🔥" }],
    timestamp: "منذ ساعة",
    kudos: 24,
    comments: 8,
    hasKudos: false,
  },
  {
    id: "3",
    userId: "u3",
    userName: "محمد علي",
    userAvatar: "🧔",
    type: "personal_best",
    content: "رقم شخصي جديد في الـ Deadlift — 180 كيلو! 🎉",
    stats: [
      { label: "التمرين", value: "Deadlift" },
      { label: "الوزن", value: "180 kg" },
      { label: "السابق", value: "170 kg" },
    ],
    timestamp: "منذ 2 ساعة",
    kudos: 45,
    comments: 15,
    hasKudos: false,
  },
  {
    id: "4",
    userId: "u4",
    userName: "نورا خالد",
    userAvatar: "👱‍♀️",
    type: "weight",
    content: "نزلت 5 كيلو في شهر! النظام الغذائي + التمرين = نتائج حقيقية ✨",
    stats: [
      { label: "من", value: "75 kg" },
      { label: "إلى", value: "70 kg" },
      { label: "المدة", value: "30 يوم" },
    ],
    timestamp: "منذ 3 ساعات",
    kudos: 67,
    comments: 22,
    hasKudos: false,
  },
  {
    id: "5",
    userId: "u5",
    userName: "خالد عمر",
    userAvatar: "👨‍🦱",
    type: "achievement",
    content: "🏆 حصلت على شارة 'محارب الفجر' — 10 تمارين قبل الساعة 6 صباحاً!",
    stats: [],
    timestamp: "منذ 5 ساعات",
    kudos: 31,
    comments: 7,
    hasKudos: false,
  },
  {
    id: "6",
    userId: "u6",
    userName: "ليلى حسن",
    userAvatar: "👩‍🦱",
    type: "challenge",
    content: "أكملت تحدي '10,000 خطوة يومياً لمدة أسبوع' 🚶‍♀️",
    stats: [
      { label: "المجموع", value: "78,500 خطوة" },
      { label: "المعدل", value: "11,214/يوم" },
    ],
    timestamp: "منذ 6 ساعات",
    kudos: 19,
    comments: 4,
    hasKudos: false,
  },
  {
    id: "7",
    userId: "u7",
    userName: "عمر فاروق",
    userAvatar: "🧑‍🦲",
    type: "workout",
    content: "جري 10 كيلو في 48 دقيقة — أفضل وقت ليا! 🏃‍♂️",
    stats: [
      { label: "المسافة", value: "10 km" },
      { label: "الوقت", value: "48:22" },
      { label: "Pace", value: "4:50/km" },
    ],
    timestamp: "أمس",
    kudos: 38,
    comments: 11,
    hasKudos: false,
  },
];

const LEADERBOARDS = {
  streak: [
    { rank: 1, userId: "u2", userName: "سارة أحمد", userAvatar: "👩‍🦰", score: 30, metric: "يوم", isCurrentUser: false },
    { rank: 2, userId: "u5", userName: "خالد عمر", userAvatar: "👨‍🦱", score: 25, metric: "يوم", isCurrentUser: false },
    { rank: 3, userId: "u1", userName: "أحمد محمد", userAvatar: "🧑‍💪", score: 21, metric: "يوم", isCurrentUser: false },
    { rank: 4, userId: "u3", userName: "محمد علي", userAvatar: "🧔", score: 18, metric: "يوم", isCurrentUser: false },
    { rank: 5, userId: "me", userName: "أنت", userAvatar: "⭐", score: 14, metric: "يوم", isCurrentUser: true },
    { rank: 6, userId: "u4", userName: "نورا خالد", userAvatar: "👱‍♀️", score: 12, metric: "يوم", isCurrentUser: false },
    { rank: 7, userId: "u6", userName: "ليلى حسن", userAvatar: "👩‍🦱", score: 10, metric: "يوم", isCurrentUser: false },
  ],
  workouts: [
    { rank: 1, userId: "u1", userName: "أحمد محمد", userAvatar: "🧑‍💪", score: 24, metric: "تمرين", isCurrentUser: false },
    { rank: 2, userId: "u3", userName: "محمد علي", userAvatar: "🧔", score: 22, metric: "تمرين", isCurrentUser: false },
    { rank: 3, userId: "u5", userName: "خالد عمر", userAvatar: "👨‍🦱", score: 20, metric: "تمرين", isCurrentUser: false },
    { rank: 4, userId: "me", userName: "أنت", userAvatar: "⭐", score: 18, metric: "تمرين", isCurrentUser: true },
    { rank: 5, userId: "u2", userName: "سارة أحمد", userAvatar: "👩‍🦰", score: 16, metric: "تمرين", isCurrentUser: false },
    { rank: 6, userId: "u7", userName: "عمر فاروق", userAvatar: "🧑‍🦲", score: 15, metric: "تمرين", isCurrentUser: false },
    { rank: 7, userId: "u4", userName: "نورا خالد", userAvatar: "👱‍♀️", score: 12, metric: "تمرين", isCurrentUser: false },
  ],
  calories: [
    { rank: 1, userId: "u7", userName: "عمر فاروق", userAvatar: "🧑‍🦲", score: 18500, metric: "سعرة", isCurrentUser: false },
    { rank: 2, userId: "u1", userName: "أحمد محمد", userAvatar: "🧑‍💪", score: 16200, metric: "سعرة", isCurrentUser: false },
    { rank: 3, userId: "u3", userName: "محمد علي", userAvatar: "🧔", score: 15800, metric: "سعرة", isCurrentUser: false },
    { rank: 4, userId: "u5", userName: "خالد عمر", userAvatar: "👨‍🦱", score: 14100, metric: "سعرة", isCurrentUser: false },
    { rank: 5, userId: "me", userName: "أنت", userAvatar: "⭐", score: 12500, metric: "سعرة", isCurrentUser: true },
    { rank: 6, userId: "u2", userName: "سارة أحمد", userAvatar: "👩‍🦰", score: 11200, metric: "سعرة", isCurrentUser: false },
    { rank: 7, userId: "u6", userName: "ليلى حسن", userAvatar: "👩‍🦱", score: 9800, metric: "سعرة", isCurrentUser: false },
  ],
};

const CLUBS: Club[] = [
  { id: "c1", name: "نادي الجري الصباحي", members: 156, category: "جري", icon: "🏃", isJoined: true },
  { id: "c2", name: "أبطال الحديد", members: 234, category: "كمال أجسام", icon: "🏋️", isJoined: false },
  { id: "c3", name: "يوجا وتأمل", members: 89, category: "استرخاء", icon: "🧘", isJoined: false },
  { id: "c4", name: "تحدي الـ 10K", members: 312, category: "تحدي", icon: "🎯", isJoined: true },
  { id: "c5", name: "أكل صحي", members: 445, category: "تغذية", icon: "🥗", isJoined: false },
  { id: "c6", name: "سباحة", members: 67, category: "سباحة", icon: "🏊", isJoined: false },
  { id: "c7", name: "دراجات", members: 128, category: "دراجات", icon: "🚴", isJoined: false },
  { id: "c8", name: "خسارة الوزن معاً", members: 567, category: "وزن", icon: "⚖️", isJoined: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Social Feed Button (Entry Point)
// ═══════════════════════════════════════════════════════════════════════════════

export function SocialFeedButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Card className="cursor-pointer border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 hover:shadow-lg transition-all hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">المجتمع</h3>
                <p className="text-xs text-muted-foreground">أصدقاء وتحديات ومنافسة</p>
              </div>
              <Badge variant="outline" className="bg-cyan-100 text-cyan-700 border-cyan-300">
                <TrendingUp className="w-3 h-3 mr-1" />
                اجتماعي
              </Badge>
            </div>
          </CardContent>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-600" />
            مجتمع MediSport
          </SheetTitle>
          <SheetDescription className="text-right">
            تابع أصدقاءك، نافس في الترتيب، وانضم لنوادي
          </SheetDescription>
        </SheetHeader>
        <SocialContent />
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Social Content
// ═══════════════════════════════════════════════════════════════════════════════

function SocialContent() {
  const [activeTab, setActiveTab] = React.useState<"feed" | "leaderboard" | "clubs">("feed");
  const [feed, setFeed] = React.useState(SAMPLE_FEED);
  const [leaderboardType, setLeaderboardType] = React.useState<"streak" | "workouts" | "calories">("streak");
  const [clubs, setClubs] = React.useState(CLUBS);

  const handleKudos = (postId: string) => {
    setFeed((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, kudos: post.hasKudos ? post.kudos - 1 : post.kudos + 1, hasKudos: !post.hasKudos }
          : post
      )
    );
    toast.success("👏 Kudos!");
  };

  const handleJoinClub = (clubId: string) => {
    setClubs((prev) =>
      prev.map((club) =>
        club.id === clubId
          ? { ...club, isJoined: !club.isJoined, members: club.isJoined ? club.members - 1 : club.members + 1 }
          : club
      )
    );
    toast.success("تم الانضمام!");
  };

  const getPostTypeIcon = (type: FeedPost["type"]) => {
    switch (type) {
      case "workout": return "💪";
      case "achievement": return "🏆";
      case "streak": return "🔥";
      case "challenge": return "🎯";
      case "weight": return "⚖️";
      case "personal_best": return "🥇";
    }
  };

  const getPostTypeBg = (type: FeedPost["type"]) => {
    switch (type) {
      case "workout": return "bg-blue-50 border-blue-200";
      case "achievement": return "bg-amber-50 border-amber-200";
      case "streak": return "bg-orange-50 border-orange-200";
      case "challenge": return "bg-green-50 border-green-200";
      case "weight": return "bg-purple-50 border-purple-200";
      case "personal_best": return "bg-rose-50 border-rose-200";
    }
  };

  return (
    <div className="mt-4 space-y-4" dir="rtl">
      {/* Tab Navigation */}
      <div className="flex gap-2">
        {[
          { id: "feed" as const, label: "آخر الأخبار", icon: Zap },
          { id: "leaderboard" as const, label: "الترتيب", icon: Trophy },
          { id: "clubs" as const, label: "النوادي", icon: Users },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="flex-1"
          >
            <tab.icon className="w-4 h-4 mr-1" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ═══ Feed Tab ═══ */}
      {activeTab === "feed" && (
        <div className="space-y-3">
          {/* Share Button */}
          <Card className="border-dashed border-2 border-cyan-300 bg-cyan-50/50">
            <CardContent className="p-3">
              <Button variant="outline" className="w-full" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                شارك إنجازك مع المجتمع
              </Button>
            </CardContent>
          </Card>

          {/* Feed Posts */}
          {feed.map((post) => (
            <Card key={post.id} className={`${getPostTypeBg(post.type)} transition-all`}>
              <CardContent className="p-3">
                {/* Post Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-full bg-white border flex items-center justify-center text-lg">
                    {post.userAvatar}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{post.userName}</div>
                    <div className="text-[10px] text-muted-foreground">{post.timestamp}</div>
                  </div>
                  <span className="text-xl">{getPostTypeIcon(post.type)}</span>
                </div>

                {/* Post Content */}
                <p className="text-sm mb-2">{post.content}</p>

                {/* Stats */}
                {post.stats && post.stats.length > 0 && (
                  <div className="flex gap-3 mb-2 bg-white/60 rounded-lg p-2">
                    {post.stats.map((stat, i) => (
                      <div key={i} className="text-center">
                        <div className="text-xs font-bold">{stat.value}</div>
                        <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1 border-t border-gray-200/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-2 text-xs ${post.hasKudos ? "text-red-500" : ""}`}
                    onClick={() => handleKudos(post.id)}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 mr-1 ${post.hasKudos ? "fill-red-500" : ""}`} />
                    {post.kudos} 👏
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    {post.comments}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs mr-auto">
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══ Leaderboard Tab ═══ */}
      {activeTab === "leaderboard" && (
        <div className="space-y-3">
          {/* Leaderboard Type Selector */}
          <div className="flex gap-2">
            {[
              { id: "streak" as const, label: "الـ Streak", icon: Flame },
              { id: "workouts" as const, label: "التمارين", icon: Zap },
              { id: "calories" as const, label: "السعرات", icon: Flame },
            ].map((type) => (
              <Button
                key={type.id}
                variant={leaderboardType === type.id ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setLeaderboardType(type.id)}
              >
                <type.icon className="w-3 h-3 mr-1" />
                {type.label}
              </Button>
            ))}
          </div>

          {/* Top 3 Podium */}
          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-end justify-center gap-3 mb-2">
                {/* 2nd Place */}
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-xl mx-auto mb-1">
                    {LEADERBOARDS[leaderboardType][1]?.userAvatar}
                  </div>
                  <div className="text-xs font-medium truncate w-16">{LEADERBOARDS[leaderboardType][1]?.userName}</div>
                  <Badge variant="outline" className="text-[10px] bg-gray-100">🥈 2</Badge>
                  <div className="text-xs font-bold mt-0.5">{LEADERBOARDS[leaderboardType][1]?.score}</div>
                </div>
                {/* 1st Place */}
                <div className="text-center -mt-4">
                  <Crown className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center text-2xl mx-auto mb-1 ring-2 ring-amber-200">
                    {LEADERBOARDS[leaderboardType][0]?.userAvatar}
                  </div>
                  <div className="text-xs font-bold truncate w-16">{LEADERBOARDS[leaderboardType][0]?.userName}</div>
                  <Badge className="bg-amber-500 text-[10px]">🥇 1</Badge>
                  <div className="text-sm font-bold mt-0.5">{LEADERBOARDS[leaderboardType][0]?.score}</div>
                </div>
                {/* 3rd Place */}
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-amber-600 flex items-center justify-center text-xl mx-auto mb-1">
                    {LEADERBOARDS[leaderboardType][2]?.userAvatar}
                  </div>
                  <div className="text-xs font-medium truncate w-16">{LEADERBOARDS[leaderboardType][2]?.userName}</div>
                  <Badge variant="outline" className="text-[10px] bg-amber-50">🥉 3</Badge>
                  <div className="text-xs font-bold mt-0.5">{LEADERBOARDS[leaderboardType][2]?.score}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Full Leaderboard */}
          <Card>
            <CardContent className="p-3 space-y-1.5">
              {LEADERBOARDS[leaderboardType].map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    entry.isCurrentUser ? "bg-cyan-50 border border-cyan-200" : "bg-gray-50"
                  }`}
                >
                  <span className="w-6 text-center font-bold text-sm text-muted-foreground">
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center">
                    {entry.userAvatar}
                  </div>
                  <span className={`flex-1 text-sm ${entry.isCurrentUser ? "font-bold text-cyan-700" : ""}`}>
                    {entry.userName}
                    {entry.isCurrentUser && <Badge className="mr-2 text-[9px] bg-cyan-500">أنت</Badge>}
                  </span>
                  <span className="font-bold text-sm">
                    {entry.score.toLocaleString()} <span className="text-[10px] text-muted-foreground">{entry.metric}</span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Motivation */}
          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
            <CardContent className="p-3 text-center">
              <p className="text-sm">
                أنت في المركز <strong className="text-cyan-700">#5</strong> — كمان شوية وتوصل للـ Top 3! 🚀
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ Clubs Tab ═══ */}
      {activeTab === "clubs" && (
        <div className="space-y-3">
          {/* My Clubs */}
          <div>
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              نواديي
            </h4>
            <div className="space-y-2">
              {clubs
                .filter((c) => c.isJoined)
                .map((club) => (
                  <Card key={club.id} className="bg-cyan-50 border-cyan-200">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{club.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{club.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {club.members} عضو • {club.category}
                          </div>
                        </div>
                        <Badge className="bg-cyan-600 text-[10px]">عضو</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* Discover Clubs */}
          <div>
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-500" />
              اكتشف نوادي جديدة
            </h4>
            <div className="space-y-2">
              {clubs
                .filter((c) => !c.isJoined)
                .map((club) => (
                  <Card key={club.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{club.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{club.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {club.members} عضو • {club.category}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleJoinClub(club.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          انضم
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* Create Club */}
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-muted-foreground mb-2">أنشئ نادي خاص بيك</p>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                إنشاء نادي
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2">🔜 قريباً</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
