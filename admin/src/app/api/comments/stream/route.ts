import { subscribeComments, type LiveComment } from "@/lib/comments-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: {"status":"connected"}\n\n`)
      );

      // Heartbeat ping every 20 seconds to prevent timeout
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat!);
        }
      }, 20000);

      // Subscribe to bus events
      unsubscribe = subscribeComments(
        (event: { type: string; comment: LiveComment }) => {
          try {
            const payload = JSON.stringify({
              type: event.type,
              comment: event.comment,
            });
            controller.enqueue(
              encoder.encode(`event: ${event.type}\ndata: ${payload}\n\n`)
            );
          } catch {
            // Stream closed
          }
        }
      );
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  // Handle client disconnect via AbortSignal
  req.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat);
    if (unsubscribe) unsubscribe();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
