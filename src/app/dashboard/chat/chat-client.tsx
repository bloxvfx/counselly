"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Square,
  Search,
  User,
  Edit3,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusStep = {
  icon: string;
  text: string;
  done: boolean;
};

type ActionCard = {
  text: string;
  success: boolean;
};

type MCQQuestion = {
  question: string;
  options: string[];
};

type SSEEvent =
  | { type: "status"; icon: string; text: string }
  | { type: "text"; delta: string }
  | { type: "action"; text: string; success: boolean }
  | { type: "question"; question: string; options: string[] }
  | { type: "done" };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  statusSteps: StatusStep[];
  actions: ActionCard[];
  question?: MCQQuestion;
  isStreaming?: boolean;
};

// ── Quick prompts ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: "Review my college list", icon: "📋" },
  { label: "What should I do this month?", icon: "📅" },
  { label: "Help brainstorm my Common App essay", icon: "✍️" },
  { label: "Search for scholarships I qualify for", icon: "🔍" },
  { label: "Am I competitive for my target schools?", icon: "🎯" },
  { label: "What extracurriculars should I add?", icon: "🏆" },
];

// ── Status icon map ───────────────────────────────────────────────────────────

function StatusIcon({ icon, animate }: { icon: string; animate?: boolean }) {
  if (icon === "search") return <Search className={cn("h-3 w-3", animate && "animate-pulse")} />;
  if (icon === "profile") return <User className={cn("h-3 w-3", animate && "animate-pulse")} />;
  if (icon === "edit") return <Edit3 className={cn("h-3 w-3", animate && "animate-pulse")} />;
  return <Sparkles className={cn("h-3 w-3", animate && "animate-pulse")} />;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LiveStatusPill({ step }: { step: StatusStep }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-primary/8 border border-primary/15 text-primary w-fit">
      <StatusIcon icon={step.icon} animate={!step.done} />
      <span className="font-mono text-[0.68rem] leading-none">{step.text}</span>
      {!step.done && (
        <span className="flex gap-[2px] items-center ml-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-[3px] w-[3px] rounded-full bg-primary/60 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

function ToolLog({ steps }: { steps: StatusStep[] }) {
  const [expanded, setExpanded] = useState(false);
  if (steps.length === 0) return null;

  return (
    <div className="mt-2 mb-1">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1.5 text-muted hover:text-body transition-colors group"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 group-hover:text-body transition-colors" />
        ) : (
          <ChevronRight className="h-3 w-3 group-hover:text-body transition-colors" />
        )}
        <span className="font-mono text-[0.65rem]">
          {steps.length} tool call{steps.length > 1 ? "s" : ""}
        </span>
      </button>
      {expanded && (
        <div className="mt-1.5 pl-4 flex flex-col gap-1 border-l border-hairline ml-1.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1.5 text-muted">
              <StatusIcon icon={step.icon} />
              <span className="font-mono text-[0.65rem]">{step.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionCard({ action }: { action: ActionCard }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs mt-1",
        action.success
          ? "bg-success/8 border-success/20 text-success"
          : "bg-error/8 border-error/20 text-error"
      )}
    >
      {action.success ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="font-mono text-[0.68rem]">{action.text}</span>
    </div>
  );
}

function MCQCard({
  question,
  onAnswer,
  disabled,
}: {
  question: MCQQuestion;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (opt: string) => {
    if (disabled || selected) return;
    setSelected(opt);
    onAnswer(opt);
  };

  return (
    <div className="mt-3 p-3.5 rounded-lg border border-primary/20 bg-primary/4">
      <p className="type-body-sm text-ink mb-2.5 font-medium">{question.question}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={disabled || !!selected}
            className={cn(
              "px-3 py-1.5 rounded-pill text-xs border transition-all",
              selected === opt
                ? "bg-primary text-on-primary border-primary"
                : "bg-canvas border-hairline text-body hover:border-primary/40 hover:text-ink hover:bg-primary/5",
              (disabled || !!selected) && selected !== opt && "opacity-40 cursor-not-allowed"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function AssistantMessage({
  msg,
  isLast,
  onAnswer,
  streaming,
}: {
  msg: Message;
  isLast: boolean;
  onAnswer: (answer: string) => void;
  streaming: boolean;
}) {
  const activeStep = msg.isStreaming
    ? msg.statusSteps.find((s) => !s.done)
    : null;

  return (
    <div className="flex flex-col gap-1 max-w-[88%]">
      {/* Live status pill — shown only while the active step is running */}
      {activeStep && <LiveStatusPill step={activeStep} />}

      {/* Tool log — collapsed summary after response completes */}
      {!msg.isStreaming && msg.statusSteps.length > 0 && (
        <ToolLog steps={msg.statusSteps} />
      )}

      {/* Main text bubble */}
      {msg.content && (
        <div className="rounded-lg rounded-tl-sm px-4 py-3 bg-surface-card border border-hairline text-ink">
          <div className="prose prose-sm max-w-none text-ink [&_p]:text-body [&_p]:leading-relaxed [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:text-body [&_strong]:text-ink [&_strong]:font-semibold [&_code]:bg-surface-cream-strong [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_h3]:text-ink [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h2]:text-ink [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted [&_a]:text-primary [&_a]:underline [&_hr]:border-hairline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
          {msg.isStreaming && !activeStep && (
            <span className="inline-block w-1.5 h-3.5 bg-primary/60 rounded-sm animate-pulse ml-0.5 translate-y-0.5" />
          )}
        </div>
      )}

      {/* Action confirmations */}
      {msg.actions.map((action, i) => (
        <ActionCard key={i} action={action} />
      ))}

      {/* MCQ follow-up */}
      {msg.question && (
        <MCQCard
          question={msg.question}
          onAnswer={onAnswer}
          disabled={!isLast || streaming}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChatClient({
  userName,
}: {
  userName: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = inputRef;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input, textareaRef]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      setInput("");

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        statusSteps: [],
        actions: [],
      };

      setMessages((prev) => [...prev, userMsg]);
      setStreaming(true);

      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        statusSteps: [],
        actions: [],
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const controller = new AbortController();
      abortRef.current = controller;

      // Build messages array for API (user/assistant alternating)
      const apiMessages = [...messages, userMsg]
        .filter((m) => m.role === "user" || (m.role === "assistant" && m.content))
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Something went wrong. Please try again.", isStreaming: false }
                : m
            )
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let event: SSEEvent;
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId) return m;

                switch (event.type) {
                  case "status": {
                    // Mark previous steps as done, add new active step
                    const updatedSteps = m.statusSteps.map((s) => ({ ...s, done: true }));
                    return {
                      ...m,
                      statusSteps: [
                        ...updatedSteps,
                        { icon: event.icon, text: event.text, done: false },
                      ],
                    };
                  }
                  case "text":
                    return { ...m, content: m.content + event.delta };
                  case "action":
                    return {
                      ...m,
                      actions: [...m.actions, { text: event.text, success: event.success }],
                    };
                  case "question":
                    return {
                      ...m,
                      question: { question: event.question, options: event.options },
                    };
                  case "done": {
                    const finalSteps = m.statusSteps.map((s) => ({ ...s, done: true }));
                    return { ...m, isStreaming: false, statusSteps: finalSteps };
                  }
                  default:
                    return m;
                }
              })
            );
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Connection error. Please try again.", isStreaming: false }
                : m
            )
          );
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
        // Mark streaming done in case done event wasn't received
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.isStreaming
              ? { ...m, isStreaming: false, statusSteps: m.statusSteps.map((s) => ({ ...s, done: true })) }
              : m
          )
        );
        inputRef.current?.focus();
      }
    },
    [messages, streaming]
  );

  const handleAnswer = useCallback(
    (answer: string) => {
      send(answer);
    },
    [send]
  );

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming
          ? { ...m, isStreaming: false, statusSteps: m.statusSteps.map((s) => ({ ...s, done: true })) }
          : m
      )
    );
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        {isEmpty ? (
          <EmptyState userName={userName} onPrompt={send} streaming={streaming} />
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "user" ? (
                <div className="max-w-[80%] px-4 py-3 rounded-lg rounded-br-sm bg-primary text-on-primary type-body-sm leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <AssistantMessage
                  msg={msg}
                  isLast={i === messages.length - 1}
                  onAnswer={handleAnswer}
                  streaming={streaming}
                />
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-hairline bg-canvas px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2.5 rounded-xl border border-hairline bg-surface-card px-3 py-2.5 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={`Ask your counsellor, ${userName}…`}
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none bg-transparent text-ink placeholder:text-muted type-body-sm focus:outline-none min-h-[24px] max-h-32 leading-relaxed disabled:opacity-60"
            />
            {streaming ? (
              <button
                onClick={handleStop}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg bg-ink/10 text-ink hover:bg-ink/15 transition-colors"
                title="Stop generating"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg bg-primary text-on-primary hover:bg-primary-active disabled:opacity-30 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-center mt-1.5 text-muted" style={{ fontSize: "0.6rem" }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  userName,
  onPrompt,
  streaming,
}: {
  userName: string;
  onPrompt: (text: string) => void;
  streaming: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center py-12 px-6">
      <div className="mb-6 relative">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-success flex items-center justify-center">
          <span className="text-white" style={{ fontSize: "0.55rem" }}>●</span>
        </div>
      </div>

      <h2 className="type-body-md font-semibold text-ink mb-1">
        Hi {userName}, I&apos;m your AI counsellor
      </h2>
      <p className="type-body-sm text-muted max-w-sm mb-8 leading-relaxed">
        I know your full profile, can search for the latest college data, and can update your profile directly. Ask me anything.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onPrompt(p.label)}
            disabled={streaming}
            className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-hairline bg-surface-card text-left hover:border-primary/30 hover:bg-surface-soft transition-all group disabled:opacity-50"
          >
            <span className="text-base shrink-0">{p.icon}</span>
            <span className="type-body-sm text-body group-hover:text-ink transition-colors leading-snug">
              {p.label}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-6 type-caption text-muted/60">
        Searches the web · Reads your profile · Updates your data
      </p>
    </div>
  );
}
