import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  sportChallenges,
  sportChallengeParticipants,
  sportPosts,
  sportPostLikes,
  users,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireSessionApi } from "@/lib/auth-helpers";

/**
 * MediSport Social API — Challenges & Feed (Phase 4)
 *
 * GET:
 *   ?action=challenges            — list active challenges (+ my participation)
 *   ?action=feed                  — recent social posts
 * POST:
 *   action: "create-challenge"    — create a challenge
 *   action: "join-challenge"      — join a challenge
 *   action: "update-progress"     — update my progress in a challenge
 *   action: "create-post"         — create a feed post
 *   action: "toggle-like"         — like/unlike a post
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    const auth = await requireSessionApi();
    if ("response" in auth) return auth.response;
    const userId = auth.user.id;

    switch (action) {
      case "challenges": {
        const challenges = await db
          .select()
          .from(sportChallenges)
          .where(eq(sportChallenges.status, "active"))
          .orderBy(desc(sportChallenges.createdAt))
          .limit(50);

        const myParts = await db
          .select()
          .from(sportChallengeParticipants)
          .where(eq(sportChallengeParticipants.userId, userId));

        const partMap = new Map(myParts.map((p) => [p.challengeId, p]));

        const data = challenges.map((c) => ({
          ...c,
          joined: partMap.has(c.id),
          myProgress: partMap.get(c.id)?.progressValue ?? null,
          myCompleted: partMap.get(c.id)?.completed ?? false,
        }));

        return NextResponse.json({ success: true, data, count: data.length });
      }

      case "feed": {
        const rows = await db
          .select({
            id: sportPosts.id,
            content: sportPosts.content,
            imageUrl: sportPosts.imageUrl,
            likesCount: sportPosts.likesCount,
            commentsCount: sportPosts.commentsCount,
            createdAt: sportPosts.createdAt,
            userId: sportPosts.userId,
            authorName: users.name,
            authorImage: users.image,
          })
          .from(sportPosts)
          .leftJoin(users, eq(sportPosts.userId, users.id))
          .orderBy(desc(sportPosts.createdAt))
          .limit(50);

        // Which posts the current user liked
        const liked = await db
          .select({ postId: sportPostLikes.postId })
          .from(sportPostLikes)
          .where(eq(sportPostLikes.userId, userId));
        const likedSet = new Set(liked.map((l) => l.postId));

        const data = rows.map((r) => ({ ...r, likedByMe: likedSet.has(r.id) }));
        return NextResponse.json({ success: true, data, count: data.length });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action. Available GET: challenges, feed" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[MediSport Social API] GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionApi();
    if ("response" in auth) return auth.response;
    const userId = auth.user.id;

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create-challenge": {
        const { titleAr, titleEn, descriptionAr, descriptionEn, challengeType, targetValue, unit, startDate, endDate } = body;
        if (!titleAr || !challengeType || !targetValue || !unit || !startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: "Missing required fields: titleAr, challengeType, targetValue, unit, startDate, endDate" },
            { status: 400 }
          );
        }
        const [saved] = await db
          .insert(sportChallenges)
          .values({
            creatorId: userId,
            titleAr,
            titleEn: titleEn || null,
            descriptionAr: descriptionAr || null,
            descriptionEn: descriptionEn || null,
            challengeType,
            targetValue: String(targetValue),
            unit,
            startDate,
            endDate,
            status: "active",
          })
          .returning();

        // Creator auto-joins
        await db
          .insert(sportChallengeParticipants)
          .values({ challengeId: saved.id, userId })
          .onConflictDoNothing();

        return NextResponse.json({ success: true, data: saved, persisted: true });
      }

      case "join-challenge": {
        const { challengeId } = body;
        if (!challengeId) {
          return NextResponse.json({ success: false, error: "Missing challengeId" }, { status: 400 });
        }
        const [saved] = await db
          .insert(sportChallengeParticipants)
          .values({ challengeId, userId })
          .onConflictDoNothing()
          .returning();
        return NextResponse.json({ success: true, data: saved || { challengeId, userId, alreadyJoined: true }, persisted: true });
      }

      case "update-progress": {
        const { challengeId, progressValue } = body;
        if (!challengeId || progressValue == null) {
          return NextResponse.json({ success: false, error: "Missing challengeId or progressValue" }, { status: 400 });
        }
        // Fetch challenge target to compute completion
        const [ch] = await db.select().from(sportChallenges).where(eq(sportChallenges.id, challengeId)).limit(1);
        const completed = ch ? Number(progressValue) >= Number(ch.targetValue) : false;

        const [saved] = await db
          .update(sportChallengeParticipants)
          .set({ progressValue: String(progressValue), completed })
          .where(and(eq(sportChallengeParticipants.challengeId, challengeId), eq(sportChallengeParticipants.userId, userId)))
          .returning();
        return NextResponse.json({ success: true, data: saved || null, persisted: !!saved });
      }

      case "create-post": {
        const { content, imageUrl, activityId, challengeId } = body;
        if (!content || !content.trim()) {
          return NextResponse.json({ success: false, error: "Missing content" }, { status: 400 });
        }
        const [saved] = await db
          .insert(sportPosts)
          .values({
            userId,
            content: content.trim(),
            imageUrl: imageUrl || null,
            activityId: activityId || null,
            challengeId: challengeId || null,
          })
          .returning();
        return NextResponse.json({ success: true, data: saved, persisted: true });
      }

      case "toggle-like": {
        const { postId } = body;
        if (!postId) {
          return NextResponse.json({ success: false, error: "Missing postId" }, { status: 400 });
        }
        const existing = await db
          .select()
          .from(sportPostLikes)
          .where(and(eq(sportPostLikes.postId, postId), eq(sportPostLikes.userId, userId)))
          .limit(1);

        if (existing.length > 0) {
          await db.delete(sportPostLikes).where(and(eq(sportPostLikes.postId, postId), eq(sportPostLikes.userId, userId)));
          await db
            .update(sportPosts)
            .set({ likesCount: sql`GREATEST(${sportPosts.likesCount} - 1, 0)` })
            .where(eq(sportPosts.id, postId));
          return NextResponse.json({ success: true, data: { liked: false }, persisted: true });
        } else {
          await db.insert(sportPostLikes).values({ postId, userId }).onConflictDoNothing();
          await db
            .update(sportPosts)
            .set({ likesCount: sql`${sportPosts.likesCount} + 1` })
            .where(eq(sportPosts.id, postId));
          return NextResponse.json({ success: true, data: { liked: true }, persisted: true });
        }
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Unknown action. Available POST: create-challenge, join-challenge, update-progress, create-post, toggle-like",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[MediSport Social API] POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
