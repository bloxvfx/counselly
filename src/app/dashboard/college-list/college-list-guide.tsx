"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Plus, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import {
  applySearchComplete,
  applySearchStart,
  applyStatusBlock,
  applyTextDelta,
  AssistantMessageFlow,
  AssistantMessageShell,
  finalizeStreamBlocks,
  GuideChatInput,
  initialStreamBlocks,
  StreamingFooter,
  UserMessageBubble,
  type MessageBlock,
  type SearchActivity,
  type SearchSource,
} from "./college-list-chat-ui";
import {
  discoveryQuestionProgress,
  getNextDiscoveryQuestion,
  getActiveQuestionFromMessages,
  formatMcqAnswerForApi,
  serializeGuideMessages,
  buildContextSummaryFromMessages,
  mergeProfileIntoDiscoveryContext,
  countInitialDiscoverySteps,
  patchContextFromMcqAnswer,
  shouldFetchRecommendations,
  type CollegeListContext,
  type CollegeListMcq,
  type CollegeRecommendation,
  type ContextSummaryItem,
  type ProfileForDiscovery,
  type StoredCollegeListMessage,
} from "@/lib/college-list-context";
import { addCollege, resetCollegeListSession, saveCollegeListMessages } from "./actions";

type StatusStep = { icon: string; text: string; done: boolean };
type ActionCard = { text: string; success: boolean };

type SSEEvent =
  | { type: "status"; icon: string; text: string }
  | { type: "search_start"; id: string; source: SearchSource; query: string }
  | {
      type: "search";
      id: string;
      source: SearchSource;
      query: string;
      total: number;
      results: Array<{ title: string; url: string; snippet?: string }>;
    }
  | { type: "text"; delta: string }
  | { type: "action"; text: string; success: boolean }
  | { type: "question"; question: string; options: string[]; allowMultiple?: boolean }
  | { type: "recommendations"; colleges: CollegeRecommendation[] }
  | { type: "stage"; stage: string }
  | { type: "done" };

type GuideMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  blocks?: MessageBlock[];
  statusSteps: StatusStep[];
  searchSteps?: SearchActivity[];
  actions: ActionCard[];
  question?: CollegeListMcq;
  recommendations?: CollegeRecommendation[];
  isStreaming?: boolean;
  streamStartedAt?: number;
  hidden?: boolean;
};

function storedToGuideMessages(stored: StoredCollegeListMessage[]): GuideMessage[] {
  return stored.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    statusSteps: [],
    actions: m.actions ?? [],
    question: m.question,
    recommendations: m.recommendations,
  }));
}

const TIER_STYLES: Record<string, string> = {
  reach: "bg-error/8 text-error border-error/20",
  target: "bg-warning/8 text-warning border-warning/20",
  safety: "bg-success/8 text-success border-success/20",
  "exam-cutoff": "bg-primary/8 text-primary border-primary/20",
};

function displayKeyFacts(facts: string): string {
  return facts
    .replace(/;\s*Source:\s*Counselly DB[^;]*/gi, "")
    .replace(/Source:\s*Counselly DB[^;]*/gi, "")
    .replace(/;\s*$/, "")
    .trim();
}

function RecommendationCard({
  college,
  onAdd,
  adding,
  added,
}: {
  college: CollegeRecommendation;
  onAdd: () => void;
  adding: boolean;
  added: boolean;
}) {
  const tierStyle = TIER_STYLES[college.tier] ?? TIER_STYLES.target;
  const keyFacts = college.key_facts ? displayKeyFacts(college.key_facts) : "";

  return (
    <div className="rounded-lg border border-hairline bg-canvas p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-caption text-ink">{college.college_name}</p>
          <p className="type-body-sm text-muted mt-0.5">
            {[college.program, college.country].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-pill px-2.5 py-0.5 type-caption border capitalize",
            tierStyle,
          )}
          style={{ fontSize: "0.68rem" }}
        >
          {college.tier.replace("-", " ")}
        </span>
      </div>
      <p className="type-body-sm text-body leading-relaxed">{college.fit_summary}</p>
      <p className="type-body-sm text-muted italic leading-relaxed">{college.honest_assessment}</p>
      {keyFacts ? (
        <p className="type-body-sm text-muted font-mono" style={{ fontSize: "0.72rem" }}>
          {keyFacts}
        </p>
      ) : null}
      <button
        onClick={onAdd}
        disabled={adding || added}
        className={cn(
          "inline-flex h-9 w-full sm:w-auto sm:h-8 items-center justify-center gap-1.5 sm:self-start rounded-md px-3 type-caption transition-colors",
          added
            ? "bg-success/10 text-success border border-success/20"
            : "bg-primary text-on-primary hover:bg-primary-active disabled:opacity-50",
        )}
      >
        {added ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" /> Added
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            {adding ? "Adding…" : "Add to list"}
          </>
        )}
      </button>
    </div>
  );
}

function MCQFooter({
  question,
  onSubmit,
  disabled,
}: {
  question: CollegeListMcq;
  onSubmit: (answer: string | string[]) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState("");
  const allowMultiple = question.allowMultiple === true;
  const customTrimmed = customText.trim();
  const canSubmit = selected.size > 0 || customTrimmed.length > 0;

  const toggleOption = (opt: string) => {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (allowMultiple) {
        if (next.has(opt)) next.delete(opt);
        else next.add(opt);
      } else {
        next.clear();
        next.add(opt);
      }
      return next;
    });
    if (!allowMultiple) setCustomText("");
  };

  const handleCustomChange = (value: string) => {
    setCustomText(value);
    if (!allowMultiple && value.trim()) setSelected(new Set());
  };

  const handleSubmit = () => {
    if (disabled || !canSubmit) return;

    if (customTrimmed && selected.size === 0) {
      onSubmit(customTrimmed);
      return;
    }

    if (selected.size > 0 && customTrimmed) {
      onSubmit(allowMultiple ? [...Array.from(selected), customTrimmed] : customTrimmed);
      return;
    }

    const answer = allowMultiple ? Array.from(selected) : Array.from(selected)[0];
    onSubmit(answer);
  };

  return (
    <div className="border-t border-hairline bg-canvas px-4 py-2 sm:px-5 sm:py-2 animate-guide-in">
      <p className="type-body-sm text-ink font-medium leading-snug mb-4">
        {question.question}
      </p>
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSelected = selected.has(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleOption(opt)}
              disabled={disabled}
              className={cn(
                "w-full text-left rounded-lg border px-4 py-3 transition-all duration-150",
                "type-body-sm leading-snug",
                isSelected
                  ? "border-primary/50 bg-primary/8 text-ink shadow-[inset_0_0_0_1px_rgba(204,120,92,0.15)]"
                  : "border-hairline bg-surface-card text-body hover:border-primary/30 hover:bg-surface-soft",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={customText}
        onChange={(e) => handleCustomChange(e.target.value)}
        disabled={disabled}
        placeholder="Something else…"
        className={cn(
          "w-full mt-3 rounded-lg border border-hairline bg-surface-card px-4 py-2.5",
          "type-body-sm text-ink placeholder:text-muted",
          "focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all",
          "disabled:opacity-50",
          customTrimmed && "border-primary/30 bg-primary/4",
        )}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !canSubmit}
        className="w-full h-10 mt-4 rounded-lg bg-primary type-caption text-on-primary hover:bg-primary-active disabled:bg-primary/25 disabled:text-ink/40 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}

function buildProfileContextItems(
  profile: ProfileForDiscovery,
  context: CollegeListContext,
): ContextSummaryItem[] {
  const items: ContextSummaryItem[] = [];
  const major = context.study_field?.trim() || profile.intended_major?.trim();
  if (major && major !== "Undecided") {
    items.push({ id: "profile-major", label: "Major", value: major });
  }
  const countries = context.location_preferences?.length
    ? context.location_preferences.join(", ")
    : profile.target_countries?.filter(Boolean).join(", ");
  if (countries) {
    items.push({ id: "profile-countries", label: "Countries", value: countries });
  }
  return items;
}

function ContextSummary({ items }: { items: ContextSummaryItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-hairline bg-surface-soft/50 px-3 py-2.5 animate-guide-in">
      <p className="type-caption text-muted mb-2" style={{ fontSize: "0.68rem" }}>
        So far
      </p>
      <dl className="grid gap-1.5">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[4.5rem_1fr] gap-2 items-baseline">
            <dt className="type-caption text-muted">{item.label}</dt>
            <dd className="type-body-sm text-ink line-clamp-2">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function isWelcomeContent(content: string): boolean {
  const c = content.toLowerCase();
  return (
    c.includes("hello") ||
    c.includes("great to help") ||
    c.includes("build your college list") ||
    c.includes("personalised session")
  );
}

function findPendingQuestionMessage(messages: GuideMessage[]): GuideMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (
      m.role === "assistant" &&
      m.question &&
      m.question.answeredWith === undefined &&
      !m.isStreaming
    ) {
      return m;
    }
  }
  return null;
}

function createQuestionMessage(question: CollegeListMcq): GuideMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    statusSteps: [],
    actions: [],
    question,
  };
}

function shouldShowInThread(msg: GuideMessage, index: number, visible: GuideMessage[]): boolean {
  if (msg.role === "assistant") {
    if (msg.isStreaming) return true;
    if (msg.recommendations?.length) return true;
    if (msg.content.includes("Something went wrong") || msg.content.includes("Connection error")) {
      return false;
    }
    if (isWelcomeContent(msg.content) && !msg.recommendations?.length) {
      return false;
    }
    if (msg.question && msg.question.answeredWith === undefined) {
      return false;
    }
    if (msg.actions.length > 0 && !msg.content && !msg.recommendations?.length && !msg.question) {
      return false;
    }
    if (msg.actions.some((a) => a.success && a.text.includes("Preferences saved"))) {
      return false;
    }
    if (msg.question?.answeredWith !== undefined && !msg.content && !msg.recommendations?.length) {
      return false;
    }
  }
  if (msg.role === "user") {
    const prev = visible[index - 1];
    if (prev?.role === "assistant" && prev.question?.answeredWith !== undefined) {
      return false;
    }
  }
  return true;
}

function mergeContextItems(
  profileItems: ContextSummaryItem[],
  answerItems: ContextSummaryItem[],
): ContextSummaryItem[] {
  const merged = new Map<string, ContextSummaryItem>();
  for (const item of profileItems) merged.set(item.label, item);
  for (const item of answerItems) merged.set(item.label, item);
  return Array.from(merged.values()).slice(-8);
}

function buildLegacyBlocks(msg: GuideMessage): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  if (msg.content.trim()) blocks.push({ type: "text", content: msg.content });
  for (const search of msg.searchSteps ?? []) {
    blocks.push({ type: "search", search });
  }
  return blocks;
}

function GuideAssistantMessage({
  msg,
  onAddCollege,
  addingIds,
  addedNames,
}: {
  msg: GuideMessage;
  onAddCollege: (college: CollegeRecommendation) => void;
  addingIds: Set<string>;
  addedNames: Set<string>;
}) {
  const flowBlocks = msg.blocks?.length ? msg.blocks : buildLegacyBlocks(msg);
  const hasFlow = flowBlocks.length > 0 || Boolean(msg.isStreaming);
  const hasTextInFlow = flowBlocks.some((b) => b.type === "text" && b.content.trim());
  return (
    <AssistantMessageShell>
      {hasFlow ? (
        <AssistantMessageFlow
          blocks={flowBlocks}
          isStreaming={Boolean(msg.isStreaming)}
          streamStartedAt={msg.streamStartedAt ?? 0}
          hasRecommendations={Boolean(msg.recommendations?.length)}
        />
      ) : null}

      {!msg.blocks?.length && msg.content && !hasTextInFlow ? (
        <div className="max-w-[92%] text-ink type-body-sm leading-relaxed [&_p]:text-body [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:my-1.5 [&_li]:text-body [&_strong]:text-ink [&_strong]:font-semibold animate-guide-in">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
      ) : null}

      {!msg.content && !msg.isStreaming && !msg.recommendations?.length && (msg.searchSteps?.length ?? 0) > 0 && (
        <p className="type-body-sm text-body animate-guide-in leading-relaxed">
          I finished researching but couldn&apos;t build your list this time. Try sending a message
          like &ldquo;Show my college recommendations&rdquo; to retry.
        </p>
      )}

      {msg.actions.map((action, i) =>
        action.success &&
        (action.text.includes("Added") || action.text.includes("Preferences saved")) ? null : (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs mt-1",
              action.success
                ? "bg-success/8 border-success/20 text-success"
                : "bg-error/8 border-error/20 text-error",
            )}
          >
            {action.success ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="font-mono text-[0.68rem]">{action.text}</span>
          </div>
        ),
      )}

      {msg.recommendations && msg.recommendations.length > 0 && (
        <div className="mt-2 grid gap-2.5 animate-guide-in">
          {msg.recommendations.map((college) => {
            const key = `${college.college_name}-${college.country}`;
            return (
              <RecommendationCard
                key={key}
                college={college}
                onAdd={() => onAddCollege(college)}
                adding={addingIds.has(key)}
                added={addedNames.has(key)}
              />
            );
          })}
        </div>
      )}

    </AssistantMessageShell>
  );
}

export function CollegeListGuide({
  userName: _userName,
  listContext,
  profileForDiscovery,
  initialMessages,
  autoStart,
  existingCollegeNames,
}: {
  userName: string;
  listContext: CollegeListContext;
  profileForDiscovery: ProfileForDiscovery;
  initialMessages: StoredCollegeListMessage[];
  autoStart: boolean;
  existingCollegeNames: string[];
}) {
  const router = useRouter();
  const [discoveryContext, setDiscoveryContext] = useState<CollegeListContext>(() =>
    mergeProfileIntoDiscoveryContext(listContext, profileForDiscovery),
  );
  const totalDiscoverySteps = useRef(
    countInitialDiscoverySteps(
      profileForDiscovery,
      mergeProfileIntoDiscoveryContext(listContext, profileForDiscovery),
    ),
  );
  const [messages, setMessages] = useState<GuideMessage[]>(() =>
    storedToGuideMessages(initialMessages),
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [stage, setStage] = useState(listContext.discovery_stage ?? "intro");
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedNames, setAddedNames] = useState<Set<string>>(
    () => new Set(existingCollegeNames.map((n) => n.toLowerCase())),
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoStartedRef = useRef(false);
  const resumeAttemptedRef = useRef(false);
  const recommendationsFetchRef = useRef(false);
  const [lastSentUserId, setLastSentUserId] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [needsResumeOnMount] = useState(() => {
    if (initialMessages.length === 0 || listContext.discovery_completed) return false;
    const ctx = mergeProfileIntoDiscoveryContext(listContext, profileForDiscovery);
    if (getActiveQuestionFromMessages(initialMessages)) return false;
    return Boolean(getNextDiscoveryQuestion(profileForDiscovery, ctx, initialMessages));
  });

  const persistMessages = useCallback(
    async (
      msgs: GuideMessage[],
      contextPatch?: Partial<CollegeListContext>,
      stageOverride?: CollegeListContext["discovery_stage"],
    ) => {
      const serialized = serializeGuideMessages(msgs);
      const mergedContext = contextPatch
        ? { ...discoveryContext, ...contextPatch }
        : discoveryContext;
      if (contextPatch) setDiscoveryContext(mergedContext);
      await saveCollegeListMessages(serialized, {
        ...mergedContext,
        discovery_stage: stageOverride ?? stage,
      });
    },
    [stage, discoveryContext],
  );

  const streamChat = useCallback(
    async (
      apiMessages: Array<{ role: "user" | "assistant"; content: string }>,
      options: {
        autoStart?: boolean;
        recommendations?: boolean;
        contextPatch?: Partial<CollegeListContext>;
      } = {},
    ) => {
      const {
        autoStart: autoStartFlag = false,
        recommendations = false,
        contextPatch,
      } = options;
      setStreaming(true);

      const assistantId = crypto.randomUUID();
      const streamStartedAt = Date.now();
      const assistantMsg: GuideMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        blocks: initialStreamBlocks(),
        statusSteps: [],
        searchSteps: [],
        actions: [],
        isStreaming: true,
        streamStartedAt,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/college-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            autoStart: autoStartFlag,
            mode: recommendations ? "recommendations" : undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: "Something went wrong. Please try again.",
                    isStreaming: false,
                  }
                : m,
            ),
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

            if (event.type === "stage") {
              setStage(
                (event.stage as CollegeListContext["discovery_stage"]) ?? "intro",
              );
            }

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId) return m;

                switch (event.type) {
                  case "status": {
                    const updatedSteps = m.statusSteps.map((s) => ({ ...s, done: true }));
                    const statusStep = { icon: event.icon, text: event.text, done: false };
                    return {
                      ...m,
                      statusSteps: [...updatedSteps, statusStep],
                      blocks: applyStatusBlock(m.blocks ?? [], statusStep),
                    };
                  }
                  case "search_start":
                    return {
                      ...m,
                      searchSteps: [
                        ...(m.searchSteps ?? []),
                        {
                          id: event.id,
                          source: event.source,
                          query: event.query,
                          results: [],
                          totalResults: 0,
                          done: false,
                        },
                      ],
                      blocks: applySearchStart(m.blocks ?? [], {
                        id: event.id,
                        source: event.source,
                        query: event.query,
                      }),
                    };
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
                    const content = m.content + event.delta;
                    return {
                      ...m,
                      content,
                      blocks: applyTextDelta(m.blocks ?? [], event.delta),
                    };
                  }
                  case "action":
                    return {
                      ...m,
                      actions: [...m.actions, { text: event.text, success: event.success }],
                    };
                  case "question":
                    return {
                      ...m,
                      question: {
                        question: event.question,
                        options: event.options,
                        allowMultiple: event.allowMultiple,
                      },
                    };
                  case "recommendations":
                    return { ...m, recommendations: event.colleges };
                  case "stage":
                    return m;
                  case "done": {
                    const finalSteps = m.statusSteps.map((s) => ({ ...s, done: true }));
                    const finalSearches = (m.searchSteps ?? []).map((s) => ({ ...s, done: true }));
                    return {
                      ...m,
                      isStreaming: false,
                      statusSteps: finalSteps,
                      searchSteps: finalSearches,
                      blocks: finalizeStreamBlocks(m.blocks ?? []),
                    };
                  }
                  default:
                    return m;
                }
              }),
            );

            if (event.type === "action" && event.success && event.text.includes("Added")) {
              router.refresh();
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: "Connection error. Please try again.",
                    isStreaming: false,
                  }
                : m,
            ),
          );
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
        let nextMessages: GuideMessage[] = [];
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === assistantId && m.isStreaming
              ? {
                  ...m,
                  isStreaming: false,
                  statusSteps: m.statusSteps.map((s) => ({ ...s, done: true })),
                  searchSteps: (m.searchSteps ?? []).map((s) => ({ ...s, done: true })),
                  blocks: finalizeStreamBlocks(m.blocks ?? []),
                }
              : m,
          );

          const last = updated[updated.length - 1];
          if (
            last?.id === assistantId &&
            last.role === "assistant" &&
            !last.question &&
            !last.recommendations?.length &&
            !last.content &&
            recommendations
          ) {
            nextMessages = updated.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      "I researched your options but hit a snag building the list. Send a quick message to retry.",
                  }
                : m,
            );
            return nextMessages;
          }

          if (
            last?.id === assistantId &&
            last.role === "assistant" &&
            !last.question &&
            !last.recommendations?.length
          ) {
            const fallback = getNextDiscoveryQuestion(
              profileForDiscovery,
              discoveryContext,
              serializeGuideMessages(updated),
            );
            if (fallback) {
              nextMessages = updated.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      question: {
                        question: fallback.question,
                        options: fallback.options,
                        allowMultiple: fallback.allowMultiple,
                      },
                    }
                  : m,
              );
              return nextMessages;
            }
          }
          nextMessages = updated;
          return updated;
        });
        if (nextMessages.length > 0) {
          const hasRecommendations = nextMessages.some((m) => m.recommendations?.length);
          void persistMessages(
            nextMessages,
            recommendations && hasRecommendations
              ? { ...contextPatch, discovery_completed: true }
              : contextPatch,
            recommendations ? "recommendations" : undefined,
          );
        }
      }
    },
    [router, profileForDiscovery, discoveryContext, persistMessages],
  );

  const fetchRecommendations = useCallback(
    async (baseMessages: GuideMessage[], context: CollegeListContext) => {
      const apiMessages = baseMessages
        .filter((m) => !m.hidden && (m.role === "user" || m.content))
        .map((m) => ({ role: m.role, content: m.content }));
      setStage("recommendations");
      await streamChat(apiMessages, { recommendations: true, contextPatch: context });
    },
    [streamChat],
  );

  const advanceDiscovery = useCallback(
    async (baseMessages: GuideMessage[], patchedContext: CollegeListContext) => {
      const serialized = serializeGuideMessages(baseMessages);
      const nextQ = getNextDiscoveryQuestion(
        profileForDiscovery,
        patchedContext,
        serialized,
      );

      if (nextQ) {
        const withQuestion = [...baseMessages, createQuestionMessage(nextQ)];
        setMessages(withQuestion);
        setDiscoveryContext(patchedContext);
        await persistMessages(withQuestion, patchedContext, "preferences");
        return;
      }

      setMessages(baseMessages);
      setDiscoveryContext(patchedContext);
      await persistMessages(baseMessages, patchedContext, "preferences");
      await fetchRecommendations(baseMessages, patchedContext);
    },
    [profileForDiscovery, persistMessages, fetchRecommendations],
  );

  const submitUserReply = useCallback(
    async (text: string, markAnswer?: string | string[]) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      setInput("");

      let base = messages;
      let patchedContext = discoveryContext;
      const pending = findPendingQuestionMessage(messages);

      if (markAnswer !== undefined && pending?.question) {
        const copy = [...messages];
        for (let i = copy.length - 1; i >= 0; i--) {
          const m = copy[i];
          if (
            m.role === "assistant" &&
            m.question &&
            m.question.answeredWith === undefined
          ) {
            copy[i] = {
              ...m,
              question: { ...m.question, answeredWith: markAnswer },
            };
            break;
          }
        }
        base = copy;
        patchedContext = {
          ...discoveryContext,
          ...patchContextFromMcqAnswer(pending.question.question, markAnswer),
        };
      }

      const userMsg: GuideMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        statusSteps: [],
        actions: [],
      };
      setLastSentUserId(userMsg.id);

      const nextMessages = [...base, userMsg];

      if (markAnswer !== undefined) {
        setMessages(nextMessages);
        setDiscoveryContext(patchedContext);
        await advanceDiscovery(nextMessages, patchedContext);
        return;
      }

      setMessages(nextMessages);
      await persistMessages(nextMessages);

      const apiMessages = nextMessages
        .filter((m) => !m.hidden && (m.role === "user" || m.content))
        .map((m) => ({ role: m.role, content: m.content }));

      await streamChat(apiMessages);
    },
    [messages, streaming, discoveryContext, advanceDiscovery, streamChat, persistMessages],
  );

  const send = useCallback(
    async (text: string) => {
      await submitUserReply(text);
    },
    [submitUserReply],
  );

  const handleResetSession = useCallback(async () => {
    if (resetting) return;
    setResetting(true);
    abortRef.current?.abort();
    setStreaming(false);

    const result = await resetCollegeListSession();
    if (result.error) {
      setResetting(false);
      setResetConfirm(false);
      return;
    }

    autoStartedRef.current = false;
    resumeAttemptedRef.current = false;
    recommendationsFetchRef.current = false;

    const ctx = mergeProfileIntoDiscoveryContext({}, profileForDiscovery);
    totalDiscoverySteps.current = countInitialDiscoverySteps(profileForDiscovery, ctx);
    setDiscoveryContext(ctx);
    setStage("intro");
    setInput("");
    setLastSentUserId(null);

    const first = getNextDiscoveryQuestion(profileForDiscovery, ctx, []);
    if (first) {
      autoStartedRef.current = true;
      const opening = createQuestionMessage(first);
      setMessages([opening]);
      await persistMessages([opening], ctx, "preferences");
    } else {
      setMessages([]);
    }

    setResetConfirm(false);
    setResetting(false);
    router.refresh();
  }, [persistMessages, profileForDiscovery, resetting, router]);

  useEffect(() => {
    if (autoStart && !autoStartedRef.current && messages.length === 0) {
      autoStartedRef.current = true;
      const ctx = mergeProfileIntoDiscoveryContext(listContext, profileForDiscovery);
      const first = getNextDiscoveryQuestion(profileForDiscovery, ctx, []);
      if (!first) return;
      setDiscoveryContext(ctx);
      const opening = createQuestionMessage(first);
      setMessages([opening]);
      void persistMessages([opening], ctx, "preferences");
    }
  }, [autoStart, messages.length, listContext, profileForDiscovery, persistMessages]);

  useEffect(() => {
    if (!needsResumeOnMount || resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;

    const ctx = mergeProfileIntoDiscoveryContext(listContext, profileForDiscovery);
    const fallback = getNextDiscoveryQuestion(profileForDiscovery, ctx, initialMessages);
    if (!fallback) return;

    const resumeMsg = createQuestionMessage(fallback);
    setDiscoveryContext(ctx);

    setMessages((prev) => {
      const next = [...prev, resumeMsg];
      void persistMessages(next, ctx, "preferences");
      return next;
    });
  }, [needsResumeOnMount, profileForDiscovery, listContext, initialMessages, persistMessages]);

  useEffect(() => {
    if (streaming || recommendationsFetchRef.current) return;
    const visible = messages.filter((m) => !m.hidden);
    if (!shouldFetchRecommendations(profileForDiscovery, discoveryContext, visible)) return;

    recommendationsFetchRef.current = true;
    void fetchRecommendations(visible, discoveryContext);
  }, [messages, streaming, profileForDiscovery, discoveryContext, fetchRecommendations]);

  const handleMcqSubmit = useCallback(
    (answer: string | string[]) => {
      void submitUserReply(formatMcqAnswerForApi(answer), answer);
    },
    [submitUserReply],
  );

  const handleAddCollege = useCallback(
    async (college: CollegeRecommendation) => {
      const key = `${college.college_name}-${college.country}`;
      setAddingIds((prev) => new Set(prev).add(key));

      const result = await addCollege({
        college_name: college.college_name,
        country: college.country,
        program: college.program ?? "",
        tier: college.tier,
        application_deadline: "",
        portal_name: "",
      });

      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });

      if (!result.error) {
        setAddedNames((prev) => new Set(prev).add(college.college_name.toLowerCase()));
        router.refresh();
      }
    },
    [router],
  );

  const visibleMessages = messages.filter((m) => !m.hidden);
  const contextItems = mergeContextItems(
    buildProfileContextItems(profileForDiscovery, discoveryContext),
    buildContextSummaryFromMessages(visibleMessages),
  );
  const pendingMsg = findPendingQuestionMessage(visibleMessages);
  const activeQuestion = !streaming && pendingMsg?.question ? pendingMsg.question : null;

  const threadMessages = visibleMessages.filter((msg, index) =>
    shouldShowInThread(msg, index, visibleMessages),
  );

  const progress = discoveryQuestionProgress(
    visibleMessages,
    totalDiscoverySteps.current,
    Boolean(findPendingQuestionMessage(visibleMessages)),
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeQuestion]);

  return (
    <div className="flex flex-col h-full min-h-[min(56dvh,420px)] lg:min-h-[480px] rounded-lg border border-hairline bg-surface-card overflow-hidden">
      <div className="px-4 py-3 border-b border-hairline bg-canvas/50">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-pill bg-surface-soft overflow-hidden">
            <div
              className="h-full bg-primary rounded-pill transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="type-caption text-muted shrink-0 tabular-nums">
            {progress.step}/{progress.total}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 mt-1.5">
          <p className="type-caption text-muted" style={{ fontSize: "0.65rem" }}>
            {progress.step >= progress.total
              ? streaming
                ? "Fetching college matches…"
                : "All set — fetching college matches…"
              : `Question ${progress.step} of ${progress.total}`}
          </p>

          {resetConfirm ? (
            <div className="flex items-center gap-2 animate-guide-in shrink-0">
              <span className="type-caption text-body hidden sm:inline">Start over?</span>
              <button
                type="button"
                onClick={() => void handleResetSession()}
                disabled={resetting || streaming}
                className="inline-flex items-center gap-1 rounded-md border border-error/30 bg-error/8 px-2.5 py-1 type-caption text-error hover:bg-error/12 transition-colors disabled:opacity-50"
              >
                {resetting ? "Resetting…" : "Yes, reset"}
              </button>
              <button
                type="button"
                onClick={() => setResetConfirm(false)}
                disabled={resetting}
                className="inline-flex items-center rounded-md border border-hairline px-2.5 py-1 type-caption text-muted hover:text-ink transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setResetConfirm(true)}
              disabled={streaming || resetting}
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1 type-caption text-muted hover:text-ink hover:border-primary/30 transition-colors disabled:opacity-50 shrink-0"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={2} />
              Start over
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-1 flex flex-col gap-3 min-h-0">
        {contextItems.length > 0 && <ContextSummary items={contextItems} />}

        {!activeQuestion ? (
          threadMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "user" ? (
                <UserMessageBubble
                  content={msg.content}
                  animate={msg.id === lastSentUserId}
                />
              ) : (
                <GuideAssistantMessage
                  msg={msg}
                  onAddCollege={handleAddCollege}
                  addingIds={addingIds}
                  addedNames={addedNames}
                />
              )}
            </div>
          ))
        ) : null}
        <div ref={bottomRef} />
      </div>

      {activeQuestion ? (
        <MCQFooter
          key={activeQuestion.question}
          question={activeQuestion}
          onSubmit={handleMcqSubmit}
          disabled={streaming}
        />
      ) : streaming ? (
        <StreamingFooter onStop={() => abortRef.current?.abort()} />
      ) : (
        <GuideChatInput
          value={input}
          onChange={setInput}
          onSend={() => void send(input)}
          disabled={streaming}
        />
      )}
    </div>
  );
}
