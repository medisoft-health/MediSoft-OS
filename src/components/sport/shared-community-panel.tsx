"use client";

/**
 * SharedCommunityPanel — DB-backed Feed & Challenges
 *
 * Single source of truth for the MediSport community experience.
 * Reused by BOTH the standalone (sport) route group and the integrated
 * /medisport module so the two stay mirrored automatically. Talks to
 * /api/sport/social which is backed by PostgreSQL (sport_posts, sport_challenges,
 * sport_challenge_participants, sport_post_likes).
 */

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Flame,
  Heart,
  MessageCircle,
  Plus,
  Send,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type Challenge = {
  id: string;
  titleAr: string;
  titleEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  challengeType: string;
  targetValue: string;
  unit: string;
  startDate: string;
  endDate: string;
  joined: boolean;
  myProgress: string | null;
  myCompleted: boolean;
};

export type Post = {
  id: string;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  authorName: string | null;
  authorImage: string | null;
  likedByMe: boolean;
};

export function SharedCommunityPanel({ defaultTab = "feed" }: { defaultTab?: "feed" | "challenges" }) {
  const t = useTranslations("SportCommunity");
  const locale = useLocale() as "ar" | "en";
  const isAr = locale === "ar";

  const [tab, setTab] = React.useState<"feed" | "challenges">(defaultTab);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [challenges, setChallenges] = React.useState<Challenge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newPost, setNewPost] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [feedRes, chRes] = await Promise.all([
        fetch("/api/sport/social?action=feed"),
        fetch("/api/sport/social?action=challenges"),
      ]);
      const feed = await feedRes.json();
      const ch = await chRes.json();
      if (feed.success) setPosts(feed.data);
      if (ch.success) setChallenges(ch.data);
    } catch {
      /* keep empty */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/sport/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-post", content: newPost.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewPost("");
        await loadData();
      }
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: !p.likedByMe, likesCount: p.likesCount + (p.likedByMe ? -1 : 1) }
          : p
      )
    );
    await fetch("/api/sport/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-like", postId }),
    });
  };

  const joinChallenge = async (challengeId: string) => {
    setChallenges((prev) => prev.map((c) => (c.id === challengeId ? { ...c, joined: true } : c)));
    await fetch("/api/sport/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join-challenge", challengeId }),
    });
    await loadData();
  };

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-2 rounded-2xl bg-slate-100 p-1.5">
        <button
          onClick={() => setTab("feed")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === "feed" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"
          }`}
        >
          <MessageCircle className="h-4 w-4" /> {t("tabFeed")}
        </button>
        <button
          onClick={() => setTab("challenges")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === "challenges" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"
          }`}
        >
          <Trophy className="h-4 w-4" /> {t("tabChallenges")}
        </button>
      </div>

      {tab === "feed" && (
        <div className="space-y-5">
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Input
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder={t("composerPlaceholder")}
                  onKeyDown={(e) => e.key === "Enter" && handlePost()}
                />
                <Button onClick={handlePost} disabled={posting || !newPost.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading && <p className="py-8 text-center text-slate-400">{t("loading")}</p>}
          {!loading && posts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
              {t("emptyFeed")}
            </div>
          )}

          {posts.map((p) => (
            <Card key={p.id} className="border-slate-100">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white">
                    {(p.authorName || "?").charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{p.authorName || t("athlete")}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString(isAr ? "ar" : "en")}
                    </p>
                  </div>
                </div>
                <p className="mb-3 whitespace-pre-wrap text-slate-700">{p.content}</p>
                <div className="flex items-center gap-5 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => toggleLike(p.id)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition ${
                      p.likedByMe ? "text-rose-600" : "text-slate-400 hover:text-rose-500"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${p.likedByMe ? "fill-rose-600" : ""}`} /> {p.likesCount}
                  </button>
                  <span className="flex items-center gap-1.5 text-sm text-slate-400">
                    <MessageCircle className="h-4 w-4" /> {p.commentsCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "challenges" && (
        <div className="space-y-5">
          {loading && <p className="py-8 text-center text-slate-400">{t("loading")}</p>}
          {!loading && challenges.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
              {t("emptyChallenges")}
            </div>
          )}

          {challenges.map((c) => {
            const title = isAr ? c.titleAr : c.titleEn || c.titleAr;
            const desc = isAr ? c.descriptionAr : c.descriptionEn || c.descriptionAr;
            const progress = c.myProgress ? Math.min(100, (Number(c.myProgress) / Number(c.targetValue)) * 100) : 0;
            return (
              <Card key={c.id} className="border-emerald-100">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Flame className="h-5 w-5 text-orange-500" /> {title}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                      {c.targetValue} {c.unit}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {desc && <p className="mb-3 text-sm text-slate-600">{desc}</p>}
                  {c.joined ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" /> {c.myProgress || 0} / {c.targetValue} {c.unit}
                        </span>
                        {c.myCompleted && <Badge className="bg-emerald-600">{t("completed")}</Badge>}
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => joinChallenge(c.id)} className="w-full bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="me-1 h-4 w-4" /> {t("joinChallenge")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Compact header used by the standalone community page. */
export function CommunityHeader() {
  const t = useTranslations("SportCommunity");
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <Users className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </div>
    </div>
  );
}
