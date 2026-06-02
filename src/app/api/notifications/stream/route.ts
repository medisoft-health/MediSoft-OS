import { requireSessionApi } from "@/lib/auth-helpers";
import { getNotifications, getUnreadCount } from "@/lib/notifications/notification-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE endpoint for real-time notification push.
 *
 * The client opens a persistent connection and receives events:
 *   - `count`        — unread count (sent immediately and on every poll)
 *   - `notification`  — new notification objects since last check
 *
 * Polls every 10 seconds. The connection closes when the client disconnects
 * or the AbortSignal fires.
 */
export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const physicianId = auth.user.id;
  let lastCheckedAt = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: unknown) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Controller may be closed if the client disconnected
        }
      }

      // Send initial unread count
      try {
        const count = await getUnreadCount(physicianId);
        send("count", { count });
      } catch {
        // Non-fatal — stream continues
      }

      // Poll loop
      const interval = setInterval(async () => {
        try {
          // Fetch unread count
          const count = await getUnreadCount(physicianId);
          send("count", { count });

          // Fetch notifications created since last check
          const recent = await getNotifications(physicianId, {
            unreadOnly: true,
            limit: 10,
          });

          const newNotifications = recent.filter(
            (n) => new Date(n.createdAt) > lastCheckedAt,
          );

          for (const notification of newNotifications) {
            send("notification", notification);
          }

          lastCheckedAt = new Date();
        } catch {
          // Non-fatal — skip this poll cycle
        }
      }, 10_000);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
