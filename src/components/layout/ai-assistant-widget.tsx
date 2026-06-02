"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Square,
  X,
  CornerDownLeft,
  GripHorizontal,
  AlertCircle,
  Search,
  User,
  Edit3,
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Globe,
  ArrowUp,
  Send,
} from "lucide-react";
import Image from "next/image";
import { CounsellyMark } from "@/components/brand/counselly-mark";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import {
  type SearchActivity,
  type MessageBlock,
  initialStreamBlocks,
  applyStatusBlock,
  applySearchStart,
  applySearchComplete,
  applyTextDelta,
  finalizeStreamBlocks,
  CollapsibleSearchCard,
  ThinkingIndicator,
} from "@/app/dashboard/college-list/college-list-chat-ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageChunk = { id: string; text: string };
type StatusStep = { icon: string; text: string; done: boolean };
type ActionItem = { text: string; success: boolean };

type SSEEvent =
  | { type: "status"; icon: string; text: string }
  | { type: "search_start"; id: string; source: "web" | "database"; query: string }
  | {
      type: "search";
      id: string;
      source: "web" | "database";
      query: string;
      total: number;
      results: Array<{ title: string; url: string; snippet?: string }>;
    }
  | { type: "text"; delta: string }
  | { type: "action"; text: string; success: boolean }
  | { type: "question"; questions: Array<{ question: string; options: string[] }> }
  | { type: "done" };

type WidgetMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  chunks: MessageChunk[];
  settled: boolean;
  statusSteps: StatusStep[];
  searchSteps?: SearchActivity[];
  blocks?: MessageBlock[];
  actions: ActionItem[];
};

type ActiveQuiz = {
  questions: Array<{ question: string; options: string[] }>;
  currentIndex: number;
  answers: string[];
};

// ── Quick prompts ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "Review my college list",
  "Essay brainstorm",
  "What to focus on now",
  "Scholarship ideas",
  "Am I on track?",
  "Strengthen my profile",
];

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ icon, animate }: { icon: string; animate?: boolean }) {
  const cls = cn("h-3.5 w-3.5", animate && "animate-pulse");
  if (icon === "search") return <Search className={cls} strokeWidth={2} />;
  if (icon === "profile") return <User className={cls} strokeWidth={2} />;
  if (icon === "edit") return <Edit3 className={cls} strokeWidth={2} />;
  return <Sparkles className={cls} strokeWidth={2} />;
}

// ── Status pill (live) ────────────────────────────────────────────────────────

function WidgetStatusPill({ step }: { step: StatusStep }) {
  const isSearch = step.icon === "search";

  if (isSearch) {
    return (
      <div className="flex flex-col gap-2 p-3.5 mb-3 rounded-xl border border-hairline bg-surface-card/45 animate-guide-in w-full max-w-full">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Globe className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "3.5s" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-sans font-medium text-muted uppercase tracking-wider">
              AI Search
            </p>
            <p className="text-[12.5px] font-mono text-ink truncate mt-0.5">
              {step.text.replace(/^Searching:\s*["']?|["']?$/g, "")}
            </p>
          </div>
          {!step.done && (
            <span className="flex gap-[2.5px] items-center shrink-0">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1 w-1 rounded-full bg-primary/60 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-soft border border-hairline text-ink w-fit mb-3 animate-guide-in">
      <StatusIcon icon={step.icon} animate={!step.done} />
      <span className="text-[11.5px] font-sans text-body leading-none truncate max-w-[240px]">
        {step.text}
      </span>
      {!step.done && (
        <span className="flex gap-[2.5px] items-center ml-0.5 shrink-0">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full bg-muted animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

// ── Tool log (collapsed) ──────────────────────────────────────────────────────

function WidgetToolLog({ steps }: { steps: StatusStep[] }) {
  const [expanded, setExpanded] = useState(false);
  if (steps.length === 0) return null;

  return (
    <div className="mb-2.5 animate-guide-in">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1.5 text-muted hover:text-ink transition-colors text-[11px] font-sans font-medium bg-surface-soft/60 hover:bg-surface-soft px-2.5 py-1 rounded-full border border-hairline/60"
      >
        <ChevronRight className={cn("h-3 w-3 transition-transform duration-200", expanded && "rotate-90")} />
        <span>
          {steps.length} tool call{steps.length > 1 ? "s" : ""} completed
        </span>
      </button>
      {expanded && (
        <div className="mt-1.5 pl-3.5 flex flex-col gap-1.5 border-l border-hairline/65 ml-2.5 animate-guide-in">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-muted text-[11.5px] font-sans">
              <StatusIcon icon={s.icon} />
              <span className="truncate">{s.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Action card ───────────────────────────────────────────────────────────────

function WidgetActionCard({ action }: { action: ActionItem }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[0.65rem] mt-1",
        action.success
          ? "bg-success/8 border-success/20 text-success"
          : "bg-error/8 border-error/20 text-error"
      )}
    >
      {action.success ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" />
      ) : (
        <XCircle className="h-3 w-3 shrink-0" />
      )}
      <span className="font-mono leading-tight">{action.text}</span>
    </div>
  );
}

// ── Widget Message Flow (Search Blocks + Tailored Markdown) ───────────────────

function WidgetMessageFlow({
  blocks,
  isStreaming,
}: {
  blocks: MessageBlock[];
  isStreaming: boolean;
}) {
  const searchBlocks = blocks.filter((b): b is Extract<MessageBlock, { type: "search" }> => b.type === "search");
  const pendingSearch = searchBlocks.some((b) => !b.search.done);
  const searchesComplete =
    searchBlocks.length > 0 && searchBlocks.every((b) => b.search.done) && !pendingSearch;

  return (
    <div className="flex flex-col gap-3 w-full">
      {blocks.map((block, index) => {
        if (block.type === "thinking") {
          return (
            <ThinkingIndicator
              key={`thinking-${index}`}
              isActive={isStreaming}
              label="Thinking about your request…"
            />
          );
        }

        if (block.type === "status" && isStreaming && !block.done) {
          return (
            <div
              key={`status-${index}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-soft border border-hairline text-ink w-fit mb-1.5 animate-guide-in"
            >
              <StatusIcon icon={block.icon} animate={true} />
              <span className="text-[11.5px] font-sans text-body leading-none truncate max-w-[240px]">
                {block.text}
              </span>
              <span className="flex gap-[2.5px] items-center ml-0.5 shrink-0">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1 w-1 rounded-full bg-muted animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          );
        }

        if (block.type === "search") {
          return (
            <div key={block.search.id} className="w-full my-1 animate-guide-in">
              <CollapsibleSearchCard
                search={block.search}
                defaultCollapsed={block.search.source === "database" && block.search.done}
              />
            </div>
          );
        }

        if (block.type === "text" && block.content.trim()) {
          return (
            <motion.div
              key={`text-${index}`}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="prose-widget w-full"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-[13px] leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5 text-[13px]">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5 text-[13px]">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  h1: ({ children }) => <h1 className="text-[15px] font-semibold mb-1.5 mt-3 first:mt-0 text-ink">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-[14px] font-semibold mb-1 mt-2.5 first:mt-0 text-ink">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-[13px] font-medium mb-1 mt-2 first:mt-0 text-ink">{children}</h3>,
                  code: ({ className, children }) => {
                    const isBlock = !!className;
                    return isBlock ? (
                      <code className={cn("font-mono text-[11px]", className)}>{children}</code>
                    ) : (
                      <code className="bg-surface-cream-strong px-1.5 py-0.5 rounded text-[11px] font-mono text-ink">{children}</code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-surface-card border border-hairline rounded-lg p-3 overflow-x-auto text-[11px] font-mono my-2 leading-relaxed">{children}</pre>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2 text-[12px]">
                      <table className="w-full text-[12px] border-collapse">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="border border-hairline bg-surface-soft px-2.5 py-1.5 text-left text-[11px] font-semibold text-ink">{children}</th>,
                  td: ({ children }) => <td className="border border-hairline px-2.5 py-1.5 text-[12px]">{children}</td>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/40 pl-3 text-muted italic my-2 text-[13px]">{children}</blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-primary underline underline-offset-2 hover:text-primary-active" target="_blank" rel="noopener noreferrer">{children}</a>
                  ),
                  hr: () => <hr className="border-hairline my-3" />,
                }}
              >
                {block.content}
              </ReactMarkdown>
            </motion.div>
          );
        }

        return null;
      })}

      {isStreaming && searchesComplete && !blocks.some((b) => b.type === "text" && b.content.trim().length > 0) && (
        <p className="type-body-sm text-muted animate-guide-in py-1">
          Synthesizing search results…
        </p>
      )}
    </div>
  );
}

// ── Quiz panel — replaces input bar ───────────────────────────────────────────

// QuizPanelInner is keyed by quiz.currentIndex so all state resets between questions
function QuizPanelInner({
  current,
  total,
  index,
  onAnswer,
}: {
  current: { question: string; options: string[] };
  total: number;
  index: number;
  onAnswer: (answer: string) => void;
}) {
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const customTrimmed = customText.trim();
  const answered = !!selectedOpt || (showCustom && !!customTrimmed && selectedOpt !== null);

  function pick(opt: string) {
    if (selectedOpt) return;
    // If the option is "Something else" / "Other", open the custom text field
    if (/^(something else|other)[\s.…]*$/i.test(opt.trim())) {
      setShowCustom(true);
      return;
    }
    setSelectedOpt(opt);
    setTimeout(() => onAnswer(opt), 220);
  }

  function handleCustomSubmit() {
    if (!customTrimmed) return;
    onAnswer(customTrimmed);
  }

  return (
    <div className="px-4 pt-3.5 pb-4">
      {/* Progress */}
      {total > 1 && (
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex-1 h-1 rounded-full bg-surface-card overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-muted font-sans tabular-nums shrink-0">
            {index + 1}/{total}
          </span>
        </div>
      )}

      {/* Question */}
      <p className="text-[13.5px] font-medium text-ink leading-snug mb-3">
        {current.question}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-1.5">
        {current.options.map((opt) => {
          const isSelected = selectedOpt === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => pick(opt)}
              disabled={!!selectedOpt}
              className={cn(
                "w-full text-left rounded-xl px-4 py-2.5 transition-all duration-150",
                "text-[12.5px] font-sans leading-snug",
                isSelected
                  ? "bg-primary/12 text-ink ring-1 ring-primary/30"
                  : selectedOpt
                  ? "bg-surface-card text-muted-soft opacity-40 cursor-not-allowed"
                  : "bg-surface-card text-body hover:bg-surface-cream-strong cursor-pointer active:scale-[0.99]"
              )}
            >
              {opt}
            </button>
          );
        })}

        {/* Something else — only shown if AI didn't already include such an option */}
        {!selectedOpt && !current.options.some((o) => /something else|other|custom|own answer/i.test(o)) && (
          showCustom ? (
            <div className="flex gap-2 mt-0.5">
              <input
                autoFocus
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customTrimmed) { e.preventDefault(); handleCustomSubmit(); }
                  if (e.key === "Escape") { setShowCustom(false); setCustomText(""); }
                }}
                placeholder="Type your answer…"
                className={cn(
                  "flex-1 rounded-xl border border-hairline bg-surface-card px-4 py-2.5",
                  "text-[12.5px] text-ink placeholder:text-muted font-sans",
                  "focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                )}
              />
              <button
                type="button"
                onClick={handleCustomSubmit}
                disabled={!customTrimmed}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-primary text-on-primary hover:bg-primary-active disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="w-full text-left rounded-xl px-4 py-2.5 bg-surface-card text-muted hover:bg-surface-cream-strong hover:text-body transition-all duration-150 text-[12.5px] font-sans cursor-pointer"
            >
              Something else…
            </button>
          )
        )}
      </div>

      {/* Continue button — only shown when an option is selected (handles the brief flash) */}
      <div className="mt-3 flex items-center justify-between text-[9px] text-muted select-none">
        <span>⌘J to close</span>
        <span>{answered ? "sending…" : "tap to answer"}</span>
      </div>
    </div>
  );
}

function QuizPanel({
  quiz,
  onAnswer,
}: {
  quiz: ActiveQuiz;
  onAnswer: (answer: string) => void;
}) {
  const current = quiz.questions[quiz.currentIndex];
  const total = quiz.questions.length;

  return (
    <div className="shrink-0 border-t border-hairline bg-canvas">
      {/* Keyed so all state (selected option + custom text) resets between questions */}
      <QuizPanelInner
        key={quiz.currentIndex}
        current={current}
        total={total}
        index={quiz.currentIndex}
        onAnswer={onAnswer}
      />
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function CounsellyAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mascotCenter, setMascotCenter] = useState({ x: 0, y: 0 });
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);

  const [dimensions, setDimensions] = useState({ width: 380, height: 560 });
  const [isMobile, setIsMobile] = useState(false);
  const [isResizing, setIsResizing] = useState<"left" | "top" | "top-left" | null>(null);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController>(null);

  // Monitor window size for mobile mode
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle panel resizing
  const handleResizeStart = (
    e: React.MouseEvent<HTMLDivElement>,
    direction: "left" | "top" | "top-left"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(direction);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction === "left" || direction === "top-left") {
        newWidth = startWidth - deltaX;
      }

      if (direction === "top" || direction === "top-left") {
        newHeight = startHeight - deltaY;
      }

      // Constraints to keep widget size friendly and within viewport bounds
      const minWidth = 320;
      const maxWidth = window.innerWidth - 32;
      const minHeight = 400;
      const maxHeight = window.innerHeight - 100;

      setDimensions({
        width: Math.max(minWidth, Math.min(maxWidth, newWidth)),
        height: Math.max(minHeight, Math.min(maxHeight, newHeight)),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };


  // Cmd+J / Ctrl+J toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => {
          if (prev && isStreaming) abortRef.current?.abort();
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStreaming]);

  // Global mouse tracking for hat animation
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Track button centre
  useEffect(() => {
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setMascotCenter({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
  }, [isOpen]);

  // Hat tilt
  const getHatTransform = () => {
    if (typeof window === "undefined" || isOpen) return { x: 0, y: 0, rotate: 0 };
    const dx = mousePos.x - mascotCenter.x;
    const dy = mousePos.y - mascotCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: (dx / dist) * 0.8, y: (dy / dist) * 0.8, rotate: (dx / dist) * 3.5 };
  };
  const hatTransform = getHatTransform();

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeQuiz]);

  // Focus textarea on open
  useEffect(() => {
    if (isOpen && !activeQuiz) setTimeout(() => textareaRef.current?.focus(), 150);
  }, [isOpen, activeQuiz]);

  // Click outside to close
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("[data-widget-trigger]")
      ) {
        if (isStreaming) abortRef.current?.abort();
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen, isStreaming]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setError(null);
    setInput("");
    setActiveQuiz(null);

    const userMsg: WidgetMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      chunks: [],
      settled: true,
      statusSteps: [],
      actions: [],
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: WidgetMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      chunks: [],
      settled: false,
      statusSteps: [],
      searchSteps: [],
      blocks: initialStreamBlocks(),
      actions: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

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
        const errMsg =
          res.status === 401
            ? "Please sign in to continue."
            : res.status === 429
              ? "Too many messages. Wait a moment."
              : "Something went wrong. Please try again.";
        setError(errMsg);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
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

          if (event.type === "question") {
            // Normalize to array format
            const qs = event.questions ?? [];
            if (qs.length > 0) {
              setActiveQuiz({ questions: qs, currentIndex: 0, answers: [] });
            }
            // Mark message as settled (no more text coming after question)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      settled: true,
                      statusSteps: m.statusSteps.map((s) => ({ ...s, done: true })),
                      searchSteps: (m.searchSteps ?? []).map((s) => ({ ...s, done: true })),
                      blocks: finalizeStreamBlocks(m.blocks ?? []),
                    }
                  : m
              )
            );
            continue;
          }

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              switch (event.type) {
                case "status": {
                  const updated = m.statusSteps.map((s) => ({ ...s, done: true }));
                  const step = { icon: event.icon, text: event.text, done: false };
                  return {
                    ...m,
                    statusSteps: [...updated, step],
                    blocks: applyStatusBlock(m.blocks ?? [], step),
                  };
                }
                case "search_start": {
                  const step: SearchActivity = {
                    id: event.id,
                    source: event.source,
                    query: event.query,
                    results: [],
                    totalResults: 0,
                    done: false,
                  };
                  return {
                    ...m,
                    searchSteps: [...(m.searchSteps ?? []), step],
                    blocks: applySearchStart(m.blocks ?? [], {
                      id: event.id,
                      source: event.source,
                      query: event.query,
                    }),
                  };
                }
                case "search": {
                  const completed: SearchActivity = {
                    id: event.id,
                    source: event.source,
                    query: event.query,
                    results: event.results,
                    totalResults: event.total,
                    done: true,
                  };
                  const steps = [...(m.searchSteps ?? [])];
                  const idx = steps.findIndex((s) => s.id === event.id);
                  if (idx >= 0) steps[idx] = completed;
                  else steps.push(completed);
                  return {
                    ...m,
                    searchSteps: steps,
                    blocks: applySearchComplete(m.blocks ?? [], completed),
                  };
                }
                case "text": {
                  const newContent = m.content + event.delta;
                  const newChunk: MessageChunk = { id: crypto.randomUUID(), text: event.delta };
                  return {
                    ...m,
                    content: newContent,
                    chunks: [...m.chunks, newChunk],
                    blocks: applyTextDelta(m.blocks ?? [], event.delta),
                  };
                }
                case "action":
                  return { ...m, actions: [...m.actions, { text: event.text, success: event.success }] };
                case "done": {
                  const finalSteps = m.statusSteps.map((s) => ({ ...s, done: true }));
                  const finalSearches = (m.searchSteps ?? []).map((s) => ({ ...s, done: true }));
                  return {
                    ...m,
                    settled: true,
                    statusSteps: finalSteps,
                    searchSteps: finalSearches,
                    blocks: finalizeStreamBlocks(m.blocks ?? []),
                  };
                }
                default:
                  return m;
              }
            })
          );
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return;
      setError("Connection lost. Check your internet and try again.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                settled: true,
                statusSteps: m.statusSteps.map((s) => ({ ...s, done: true })),
                searchSteps: (m.searchSteps ?? []).map((s) => ({ ...s, done: true })),
                blocks: finalizeStreamBlocks(m.blocks ?? []),
              }
            : m
        )
      );
      setIsStreaming(false);
      if (!activeQuiz) textareaRef.current?.focus();
    }
  }

  function handleQuizAnswer(answer: string) {
    if (!activeQuiz) return;
    const newAnswers = [...activeQuiz.answers, answer];

    if (activeQuiz.currentIndex < activeQuiz.questions.length - 1) {
      // More questions — advance
      setActiveQuiz({
        ...activeQuiz,
        currentIndex: activeQuiz.currentIndex + 1,
        answers: newAnswers,
      });
    } else {
      // All answered — build and send combined message
      setActiveQuiz(null);
      let combined: string;
      if (activeQuiz.questions.length === 1) {
        combined = answer;
      } else {
        combined = activeQuiz.questions
          .map((q, i) => `${q.question}: ${newAnswers[i]}`)
          .join("\n");
      }
      handleSend(combined);
    }
  }


  function handleStop() {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) =>
        !m.settled
          ? {
              ...m,
              settled: true,
              statusSteps: m.statusSteps.map((s) => ({ ...s, done: true })),
              searchSteps: (m.searchSteps ?? []).map((s) => ({ ...s, done: true })),
              blocks: finalizeStreamBlocks(m.blocks ?? []),
            }
          : m
      )
    );
  }

  function handleClose() {
    if (isStreaming) abortRef.current?.abort();
    setIsOpen(false);
  }

  const isEmpty = messages.length === 0;
  const showQuiz = !!activeQuiz && !isStreaming;

  return (
    <>
      {/* Full-viewport drag boundary */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 48 }} />

      {/* Trigger button */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 flex-row-reverse pointer-events-none">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              ref={buttonRef}
              data-widget-trigger
              onClick={() => setIsOpen((prev) => !prev)}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              aria-label="Toggle Counselly AI"
              aria-expanded={isOpen}
              className="mascot-trigger-btn pointer-events-auto flex items-center justify-center rounded-full bg-canvas border border-hairline shadow-lg hover:shadow-xl focus:outline-none focus:ring-1 focus:ring-hairline/25 cursor-pointer"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative rounded-full bg-surface-soft p-2.5 flex items-center justify-center w-12 h-12">
                <motion.div
                  animate={{
                    x: hatTransform.x,
                    y: hatTransform.y,
                    rotate: isHovered ? 360 : hatTransform.rotate,
                  }}
                  transition={{
                    x: { type: "spring", stiffness: 220, damping: 22, mass: 0.5 },
                    y: { type: "spring", stiffness: 220, damping: 22, mass: 0.5 },
                    rotate: isHovered
                      ? { ease: "easeInOut", duration: 0.5 }
                      : { type: "spring", stiffness: 220, damping: 22, mass: 0.5 },
                  }}
                  className="relative flex items-center justify-center w-8 h-8"
                >
                  <Image
                    src="/college-hat.webp"
                    alt="Counselly AI"
                    width={32}
                    height={32}
                    className="object-contain select-none"
                    priority
                  />
                </motion.div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Tooltip capsule */}
        <AnimatePresence>
          {isHovered && !isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, x: 12 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 8 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="pointer-events-none bg-canvas border border-hairline rounded-full px-3.5 py-1.5 shadow-md hidden sm:flex items-center gap-2 whitespace-nowrap select-none"
            >
              <span className="text-[12px] font-sans font-medium text-ink">Counselly AI</span>
              <kbd className="bg-surface-soft border border-hairline/60 px-1.5 py-0.5 rounded text-[10px] text-muted font-sans font-medium">
                ⌘J
              </kbd>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat panel — draggable */}
      <div className="fixed pointer-events-none" style={{ inset: 0, zIndex: 49 }}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={panelRef}
              drag
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={constraintsRef}
              dragElastic={0}
              dragMomentum={false}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 340, damping: 28, mass: 0.8 }}
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                width: isMobile ? undefined : dimensions.width,
                height: isMobile ? undefined : dimensions.height,
              }}
              className={cn(
                "pointer-events-auto flex flex-col relative",
                "w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-100px)]",
                "bg-canvas border border-hairline rounded-2xl shadow-2xl overflow-hidden"
              )}
            >
              {/* Left Resize Handle */}
              {!isMobile && (
                <div
                  className="absolute left-0 top-2 bottom-2 w-2 cursor-w-resize z-50 group/resize-left flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, "left")}
                >
                  <div
                    className={cn(
                      "w-0.5 h-full bg-primary/0 transition-colors duration-200 rounded-full",
                      isResizing === "left" || isResizing === "top-left"
                        ? "bg-primary/60"
                        : "group-hover/resize-left:bg-primary/30"
                    )}
                  />
                </div>
              )}

              {/* Top Resize Handle */}
              {!isMobile && (
                <div
                  className="absolute left-2 right-2 top-0 h-2 cursor-n-resize z-50 group/resize-top flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, "top")}
                >
                  <div
                    className={cn(
                      "h-0.5 w-full bg-primary/0 transition-colors duration-200 rounded-full",
                      isResizing === "top" || isResizing === "top-left"
                        ? "bg-primary/60"
                        : "group-hover/resize-top:bg-primary/30"
                    )}
                  />
                </div>
              )}

              {/* Top-Left Resize Handle */}
              {!isMobile && (
                <div
                  className="absolute left-0 top-0 w-4 h-4 cursor-nw-resize z-50 group/resize-tl flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, "top-left")}
                >
                  <div
                    className={cn(
                      "w-2.5 h-2.5 border-t-2 border-l-2 border-primary/0 transition-all duration-200 rounded-tl-[4px]",
                      isResizing === "top-left"
                        ? "border-primary/70"
                        : "group-hover/resize-tl:border-primary/40"
                    )}
                  />
                </div>
              )}
              {/* Header */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex items-center gap-2 px-4 py-3.5 border-b border-hairline cursor-grab active:cursor-grabbing select-none shrink-0 bg-surface-soft"
              >
                <GripHorizontal className="h-3.5 w-3.5 text-muted-soft shrink-0" />
                <span className="font-semibold text-[13px] text-ink font-sans tracking-tight">Counselly</span>
                <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-1.5 py-px text-[9.5px] leading-tight font-medium uppercase tracking-wider">
                  AI
                </span>
                <div className="flex-1" />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={handleClose}
                  className="rounded-lg p-1.5 text-muted hover:text-ink hover:bg-surface-card transition-colors duration-200"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                {isEmpty ? (
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-10">
                      <div className="relative mb-5 flex items-center justify-center">
                        <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl w-14 h-14" />
                        <CounsellyMark className="h-9 w-auto z-10" decorative />
                      </div>
                      <p className="text-[20px] font-sans font-semibold text-ink tracking-tight">
                        How can I help you today?
                      </p>
                      <p className="text-[13px] text-muted mt-2.5 max-w-[260px] leading-relaxed">
                        I can search college info, review your profile, brainstorm essays, and update your application details.
                      </p>
                    </div>
                    
                    {/* Premium designed quick prompts (Pills format) */}
                    <div className="px-5 pb-8 flex flex-wrap gap-2 justify-center shrink-0">
                      {QUICK_PROMPTS.map((label, idx) => (
                        <motion.button
                          key={label}
                          onClick={() => handleSend(label)}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          className={cn(
                            "px-3.5 py-1.5 rounded-full border border-hairline bg-surface-card/60 hover:bg-surface-card hover:border-primary/30",
                            "transition-all duration-200 active:scale-[0.97] cursor-pointer",
                            "text-[12px] text-body font-sans font-medium hover:text-ink leading-normal whitespace-nowrap"
                          )}
                        >
                          {label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 p-4 flex flex-col gap-4">
                    {messages.map((msg) => {
                      const isUser = msg.role === "user";

                      if (isUser) {
                        return (
                          <div key={msg.id} className="flex w-full justify-end animate-guide-in">
                            <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 bg-primary text-on-primary rounded-br-sm shadow-[0_2px_8px_rgba(204,120,92,0.18)]">
                              <span className="whitespace-pre-wrap text-[13px] leading-relaxed">
                                {msg.content}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const activeStep = !msg.settled
                        ? msg.statusSteps.find((s) => !s.done)
                        : null;
                      const hasBlocks = Boolean(msg.blocks && msg.blocks.length > 0);

                      return (
                        <div key={msg.id} className="flex w-full justify-start animate-guide-in">
                          <div className="max-w-[90%] flex flex-col w-full">
                            {hasBlocks ? (
                              <div className="rounded-xl px-3.5 py-2.5 bg-surface-card border border-hairline text-ink rounded-bl-sm w-full flex flex-col">
                                <WidgetMessageFlow
                                  blocks={msg.blocks!}
                                  isStreaming={!msg.settled}
                                />
                              </div>
                            ) : (
                              <>
                                {/* Live status pill */}
                                {activeStep && <WidgetStatusPill step={activeStep} />}

                                {/* Completed tool log */}
                                {msg.settled && msg.statusSteps.length > 0 && (
                                  <WidgetToolLog steps={msg.statusSteps} />
                                )}

                                {/* Message bubble */}
                                {(msg.content || (!msg.settled && msg.chunks.length === 0)) && (
                                  <div className="rounded-xl px-3.5 py-2.5 bg-surface-card border border-hairline text-ink rounded-bl-sm flex flex-col">
                                    {msg.chunks.length === 0 && !msg.settled ? (
                                      <ThinkingIndicator
                                        isActive={!activeQuiz}
                                        label="Thinking about your request…"
                                      />
                                    ) : (
                                      <span className="whitespace-pre-wrap text-[13px] leading-relaxed">
                                        {msg.content}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </>
                            )}

                            {/* Action cards */}
                            {msg.actions.map((action, i) => (
                              <WidgetActionCard key={i} action={action} />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Inline error */}
                    {error && (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-error/10 border border-error/20 text-[11px] text-error animate-guide-in">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {error}
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* Bottom: Quiz panel OR input bar */}
              <AnimatePresence mode="wait">
                {showQuiz ? (
                  <motion.div
                    key="quiz"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    transition={{ type: "spring", stiffness: 360, damping: 28 }}
                  >
                    <QuizPanel quiz={activeQuiz} onAnswer={handleQuizAnswer} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="px-4 pt-3 pb-4 shrink-0 border-t border-hairline bg-surface-soft"
                  >
                    <div
                      className={cn(
                        "relative flex items-center rounded-pill border border-hairline bg-canvas",
                        "h-11 px-4 transition-all duration-200",
                        "focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(204,120,92,0.08)]",
                        isStreaming && "opacity-60",
                      )}
                    >
                      <input
                        type="text"
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (input.trim() && !isStreaming) handleSend(input);
                          }
                        }}
                        disabled={isStreaming}
                        placeholder="Ask Counselly anything..."
                        className={cn(
                          "flex-1 min-w-0 bg-transparent text-[13px] text-ink placeholder:text-muted",
                          "text-left leading-normal font-sans",
                          "focus:outline-none disabled:cursor-not-allowed",
                          "pr-10",
                        )}
                      />
                      {isStreaming ? (
                        <button
                          type="button"
                          onClick={handleStop}
                          aria-label="Stop generating"
                          className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 text-ink hover:bg-ink/15 transition-all duration-200 active:scale-95 shrink-0 cursor-pointer"
                        >
                          <Square className="h-3 w-3 fill-current text-ink" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (input.trim()) handleSend(input);
                          }}
                          disabled={!input.trim()}
                          aria-label="Send message"
                          className={cn(
                            "absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full",
                            "bg-primary text-on-primary transition-all duration-200",
                            "hover:bg-primary-active active:scale-95",
                            "disabled:bg-surface-soft disabled:text-muted disabled:scale-100 disabled:cursor-not-allowed",
                            input.trim() && "shadow-[0_2px_8px_rgba(204,120,92,0.25)]",
                          )}
                        >
                          <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-1 mt-1.5 text-[9px] text-muted select-none">
                      <span>⌘J to close</span>
                      <span className="flex items-center gap-0.5">
                        Enter to send <CornerDownLeft className="h-2 w-2 ml-0.5" />
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
