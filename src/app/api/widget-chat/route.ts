import { createClient } from "@/lib/supabase/server";
import { buildWidgetSystemPrompt } from "@/lib/widget-profile-context";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

const MODEL = "gemini-2.5-flash";

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const apiKey = process.env.VERTEX_AI_API_KEY;
  const project = process.env.GCP_PROJECT_ID;
  const region = process.env.GCP_REGION ?? "us-central1";

  if (!apiKey || !project) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { messages: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  const { messages } = body;
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "No messages provided" }), { status: 400 });
  }

  const systemPrompt = await buildWidgetSystemPrompt(user.id, supabase);

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Vertex AI Express endpoint — accepts x-goog-api-key header
  const endpoint =
    `https://${region}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${region}/publishers/google/models/${MODEL}:streamGenerateContent?alt=sse`;

  const abortController = new AbortController();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let upstream: Response;
      try {
        upstream = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generation_config: {
              temperature: 0.7,
              max_output_tokens: 1024,
            },
          }),
          signal: abortController.signal,
        });
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          console.error("[widget-chat] fetch error:", err);
          controller.enqueue(encoder.encode("Connection error. Please try again."));
        }
        controller.close();
        return;
      }

      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        console.error("[widget-chat] upstream error:", upstream.status, text);
        const msg =
          upstream.status === 429
            ? "Rate limit reached. Please wait a moment and try again."
            : upstream.status === 403
              ? "API access denied. Check your Vertex AI credentials."
              : "I'm having trouble connecting right now. Please try again.";
        controller.enqueue(encoder.encode(msg));
        controller.close();
        return;
      }

      // Parse SSE: each `data: {...}` line is a full JSON chunk
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (abortController.signal.aborted) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const text: string =
                parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // malformed chunk — skip
            }
          }
        }
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          console.error("[widget-chat] stream error:", err);
          controller.enqueue(encoder.encode("Stream interrupted. Please try again."));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
