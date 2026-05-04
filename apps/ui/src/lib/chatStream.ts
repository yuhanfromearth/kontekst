import type { TokenUsage } from "@kontekst/dtos";
import { StreamEventSchema } from "@kontekst/dtos";
import { createParser } from "eventsource-parser";

export interface ChatStreamPayload {
  message: string;
  conversationId?: string;
  kontekstName?: string;
  model?: string;
}

export type StreamPiece =
  | { type: "piece"; text: string }
  | { type: "meta"; conversationId: string }
  | { type: "title" }
  | { type: "usage"; usage: TokenUsage }
  | { type: "error"; message: string }
  | { type: "done" };

export async function* streamChat(
  payload: ChatStreamPayload,
  signal: AbortSignal,
): AsyncGenerator<StreamPiece> {
  const queue: StreamPiece[] = [];
  let waker: (() => void) | null = null;
  let pending = false;

  const wake = () => {
    if (waker) {
      const w = waker;
      waker = null;
      w();
    } else {
      pending = true;
    }
  };

  const waitForEvent = () => {
    if (pending) {
      pending = false;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      waker = resolve;
    });
  };

  let buffer = "";
  let animatorTimer: ReturnType<typeof setTimeout> | null = null;
  let networkDone = false;
  let drained = false;

  const tick = () => {
    animatorTimer = null;
    if (buffer.length === 0) {
      if (networkDone) drained = true;
      wake();
      return;
    }
    const match = buffer.match(/^\s*\S+\s*/);
    const piece = match ? match[0] : buffer;
    buffer = buffer.slice(piece.length);
    queue.push({ type: "piece", text: piece });
    if (buffer.length === 0 && networkDone) drained = true;
    wake();
    if (buffer.length > 0) {
      // Adaptive cadence: target ~400ms drain regardless of backlog.
      const remainingWords = buffer.split(/\s+/).filter(Boolean).length || 1;
      const delay = Math.max(10, Math.min(45, 400 / remainingWords));
      animatorTimer = setTimeout(tick, delay);
    }
  };

  const enqueueDelta = (delta: string) => {
    buffer += delta;
    if (animatorTimer === null) animatorTimer = setTimeout(tick, 0);
  };

  const stopAnimator = () => {
    if (animatorTimer !== null) {
      clearTimeout(animatorTimer);
      animatorTimer = null;
    }
  };

  const onAbort = () => wake();
  signal.addEventListener("abort", onAbort);

  const network = (async () => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok || !response.body) {
        queue.push({
          type: "error",
          message: `Request failed (${response.status})`,
        });
        return;
      }

      const parser = createParser({
        onEvent: (e) => {
          let parsed;
          try {
            parsed = StreamEventSchema.parse(JSON.parse(e.data));
          } catch {
            return;
          }
          switch (parsed.type) {
            case "delta":
              enqueueDelta(parsed.content);
              return;
            case "meta":
              queue.push({
                type: "meta",
                conversationId: parsed.conversationId,
              });
              break;
            case "title":
              queue.push({ type: "title" });
              break;
            case "usage":
              queue.push({ type: "usage", usage: parsed.usage });
              break;
            case "error":
              queue.push({ type: "error", message: parsed.message });
              break;
            case "done":
              return;
          }
          wake();
        },
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if (signal.aborted) return;
      queue.push({
        type: "error",
        message: err instanceof Error ? err.message : "Stream failed",
      });
    } finally {
      networkDone = true;
      if (buffer.length === 0 && animatorTimer === null) drained = true;
      wake();
    }
  })();

  try {
    while (true) {
      if (signal.aborted) return;
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }
      if (drained) {
        yield { type: "done" };
        return;
      }
      await waitForEvent();
    }
  } finally {
    stopAnimator();
    signal.removeEventListener("abort", onAbort);
    await network.catch(() => {});
  }
}
