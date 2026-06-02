"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Building2, ChevronDown, Database, Globe, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CounsellyMark } from "@/components/brand/counselly-mark";
import { cn } from "@/lib/utils";

export type SearchSource = "web" | "database";

export type SearchActivity = {
  id: string;
  source: SearchSource;
  query: string;
  results: Array<{ title: string; url: string; snippet?: string }>;
  totalResults: number;
  done: boolean;
};

export type StatusStep = { icon: string; text: string; done: boolean };

export type MessageBlock =
  | { type: "thinking" }
  | { type: "status"; icon: string; text: string; done: boolean }
  | { type: "search"; search: SearchActivity }
  | { type: "text"; content: string }
  | { type: "synthesizing" };

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function faviconUrl(url: string): string {
  const domain = domainFromUrl(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function resultCountLabel(search: SearchActivity): string {
  if (!search.done) return "Searching…";
  const total = search.totalResults || search.results.length;
  if (total === 0) return "No results";
  return total === 1 ? "1 result" : `${total} results`;
}

function searchBlockKey(search: SearchActivity): string {
  return `${search.source}:${search.query.toLowerCase().trim()}`;
}

export function dedupeSearchBlocks(blocks: MessageBlock[]): MessageBlock[] {
  const bestByKey = new Map<string, SearchActivity>();
  for (const block of blocks) {
    if (block.type !== "search") continue;
    const key = searchBlockKey(block.search);
    const prev = bestByKey.get(key);
    if (
      !prev ||
      block.search.totalResults > prev.totalResults ||
      (block.search.done && block.search.totalResults >= prev.totalResults)
    ) {
      bestByKey.set(key, block.search);
    }
  }

  const seen = new Set<string>();
  const out: MessageBlock[] = [];
  for (const block of blocks) {
    if (block.type !== "search") {
      out.push(block);
      continue;
    }
    const key = searchBlockKey(block.search);
    if (seen.has(key)) continue;
    seen.add(key);
    const best = bestByKey.get(key);
    if (best) out.push({ type: "search", search: best });
  }
  return out;
}

function removeEphemeralBlocks(blocks: MessageBlock[]): MessageBlock[] {
  return blocks.filter((b) => b.type !== "thinking" && b.type !== "synthesizing");
}

export function initialStreamBlocks(): MessageBlock[] {
  return [{ type: "thinking" }];
}

export function applyStatusBlock(
  blocks: MessageBlock[],
  status: { icon: string; text: string; done: boolean },
): MessageBlock[] {
  return [...removeEphemeralBlocks(blocks), { type: "status", ...status }];
}

export function applySearchStart(
  blocks: MessageBlock[],
  search: Pick<SearchActivity, "id" | "source" | "query">,
): MessageBlock[] {
  const pending: SearchActivity = {
    ...search,
    results: [],
    totalResults: 0,
    done: false,
  };
  const withoutDupes = dedupeSearchBlocks(blocks);
  const existing = withoutDupes.find(
    (b) => b.type === "search" && searchBlockKey(b.search) === searchBlockKey(pending),
  );
  if (existing?.type === "search" && existing.search.done) {
    return withoutDupes;
  }
  return [...removeEphemeralBlocks(withoutDupes), { type: "search", search: pending }];
}

export function applySearchComplete(blocks: MessageBlock[], search: SearchActivity): MessageBlock[] {
  const idx = blocks.findIndex((b) => b.type === "search" && b.search.id === search.id);
  let next: MessageBlock[];
  if (idx >= 0) {
    next = [...blocks];
    next[idx] = { type: "search", search };
  } else {
    next = [...removeEphemeralBlocks(blocks), { type: "search", search }];
  }
  return dedupeSearchBlocks(next);
}

export function applyTextDelta(blocks: MessageBlock[], delta: string): MessageBlock[] {
  const base = removeEphemeralBlocks(blocks);
  const last = base[base.length - 1];
  if (last?.type === "text") {
    return [...base.slice(0, -1), { type: "text", content: last.content + delta }];
  }
  return [...base, { type: "text", content: delta }];
}

export function finalizeStreamBlocks(blocks: MessageBlock[]): MessageBlock[] {
  return dedupeSearchBlocks(
    removeEphemeralBlocks(blocks).map((block) => {
      if (block.type === "search") {
        return { type: "search", search: { ...block.search, done: true } };
      }
      if (block.type === "status") {
        return { ...block, done: true };
      }
      return block;
    }),
  );
}

function SearchSourceIcon({ source }: { source: SearchSource }) {
  if (source === "database") {
    return <Database className="h-3.5 w-3.5 shrink-0 text-primary/80" strokeWidth={1.75} />;
  }
  return <Globe className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.75} />;
}

function searchSourceLabel(source: SearchSource): string {
  return source === "database" ? "Counselly database" : "Web";
}

export function ThinkingIndicator({
  isActive,
  startedAt,
  label = "Thinking about your request",
}: {
  isActive: boolean;
  startedAt?: number;
  label?: string;
}) {
  const baseRef = useRef(startedAt ?? Date.now());

  useEffect(() => {
    if (startedAt !== undefined) baseRef.current = startedAt;
  }, [startedAt]);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive || startedAt === undefined) return;
    const tick = () => setElapsed(Math.floor((Date.now() - baseRef.current) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isActive, startedAt]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2.5 min-h-7 animate-guide-in">
      <CounsellyMark decorative className="h-6 w-[1.45rem] shrink-0" />
      <p className="type-body-sm text-muted">
        {label}
        {startedAt !== undefined ? (
          <span className="tabular-nums text-muted/80"> · {elapsed}s</span>
        ) : null}
      </p>
    </div>
  );
}

function SearchResultIcon({
  source,
  url,
}: {
  source: SearchSource;
  url: string;
}) {
  const hasLink = Boolean(url && url.startsWith("http"));
  if (hasLink) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={faviconUrl(url)}
        alt=""
        className="h-4 w-4 shrink-0 rounded-sm mt-0.5"
        loading="lazy"
      />
    );
  }

  const Icon = source === "database" ? Building2 : Globe;
  return (
    <div className="flex h-4 w-4 shrink-0 items-center justify-center mt-0.5">
      <Icon className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
    </div>
  );
}

function SearchResultRow({
  result,
  source,
}: {
  result: { title: string; url: string; snippet?: string };
  source: SearchSource;
}) {
  const hasLink = Boolean(result.url && result.url.startsWith("http"));
  const inner = (
    <>
      <SearchResultIcon source={source} url={result.url} />
      <div className="min-w-0 flex-1">
        <p className="type-body-sm text-ink truncate">{result.title}</p>
        {result.snippet ? (
          <p className="type-caption text-muted mt-0.5 line-clamp-1">{result.snippet}</p>
        ) : null}
      </div>
      {hasLink ? (
        <span className="type-caption text-muted shrink-0 hidden sm:inline self-center">
          {domainFromUrl(result.url)}
        </span>
      ) : source === "database" ? (
        <span className="type-caption text-muted shrink-0 self-center">Verified</span>
      ) : null}
    </>
  );

  if (hasLink) {
    return (
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 px-4 py-3 border-b border-hairline/60 last:border-b-0 hover:bg-surface-soft/60 transition-colors"
      >
        {inner}
      </a>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-hairline/60 last:border-b-0">
      {inner}
    </div>
  );
}

export function CollapsibleSearchCard({
  search,
  defaultCollapsed,
}: {
  search: SearchActivity;
  defaultCollapsed?: boolean;
}) {
  const collapsible = search.source === "database" || (search.results.length > 0 && search.done);
  const [open, setOpen] = useState(() => search.source !== "database" && !defaultCollapsed);

  useEffect(() => {
    if (!search.done) setOpen(true);
  }, [search.done]);

  const header = (
    <div className="flex items-start gap-2.5 w-full text-left">
      <SearchSourceIcon source={search.source} />
      <div className="min-w-0 flex-1">
        <p className="type-caption text-muted" style={{ fontSize: "0.68rem" }}>
          {searchSourceLabel(search.source)}
        </p>
        <p
          className="type-body-sm text-ink font-mono mt-0.5 break-words"
          style={{ fontSize: "0.78rem" }}
        >
          {search.query}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        <span className="type-caption text-muted tabular-nums">{resultCountLabel(search)}</span>
        {collapsible && search.done ? (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted transition-transform duration-200",
              open && "rotate-180",
            )}
            strokeWidth={2}
          />
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="rounded-lg border border-hairline bg-canvas/50 p-4 animate-guide-in">
      {collapsible && search.done ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full rounded-md -m-1 p-1 hover:bg-surface-soft/50 transition-colors"
          aria-expanded={open}
        >
          {header}
        </button>
      ) : (
        header
      )}

      {(!collapsible || open || !search.done) && (
        <div className={cn("mt-3", collapsible && search.done && "animate-guide-in")}>
          {search.results.length > 0 ? (
            <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden">
              {search.results.slice(0, 8).map((r, i) => (
                <SearchResultRow key={`${r.title}-${i}`} result={r} source={search.source} />
              ))}
              {search.done && search.totalResults > search.results.length ? (
                <p className="type-caption text-muted px-4 py-2.5 bg-canvas/40 border-t border-hairline/60">
                  +{search.totalResults - search.results.length} more not shown
                </p>
              ) : null}
            </div>
          ) : search.done ? (
            <p className="type-body-sm text-muted pl-6">No matching colleges in Counselly DB</p>
          ) : (
            <p className="type-body-sm text-muted pl-6 animate-guide-shimmer">Searching…</p>
          )}
        </div>
      )}
    </div>
  );
}

function SearchRowCompact({ search }: { search: SearchActivity }) {
  return (
    <div className="flex items-center gap-3 py-2.5 animate-guide-in">
      <SearchSourceIcon source={search.source} />
      <div className="min-w-0 flex-1">
        <p className="type-caption text-muted" style={{ fontSize: "0.68rem" }}>
          {searchSourceLabel(search.source)}
        </p>
        <p className="type-body-sm text-ink truncate font-mono" style={{ fontSize: "0.78rem" }}>
          {search.query}
        </p>
      </div>
      <span className="type-caption text-muted shrink-0 tabular-nums">
        {resultCountLabel(search)}
      </span>
    </div>
  );
}

function compressZeroResultSearches(blocks: MessageBlock[]): MessageBlock[] {
  const out: MessageBlock[] = [];
  let zeroBatch: SearchActivity[] = [];

  const flushZeroBatch = () => {
    if (zeroBatch.length === 0) return;
    if (zeroBatch.length === 1) {
      out.push({ type: "search", search: zeroBatch[0]! });
    } else {
      out.push({
        type: "search",
        search: {
          id: `batch-${zeroBatch[0]!.id}`,
          source: "database",
          query: `${zeroBatch.length} colleges checked in Counselly DB`,
          results: zeroBatch.slice(0, 4).map((s) => ({
            title: s.query,
            url: "",
            snippet: "Not in database",
          })),
          totalResults: 0,
          done: true,
        },
      });
    }
    zeroBatch = [];
  };

  for (const block of blocks) {
    // Only batch-group genuine college name lookups that returned nothing,
    // not discovery searches (country+programs combos which contain " · " or ", ").
    const isFailedNameLookup =
      block.type === "search" &&
      block.search.source === "database" &&
      block.search.done &&
      block.search.totalResults === 0 &&
      block.search.query.length > 2 &&
      !block.search.query.includes(" · ") &&
      !block.search.query.includes(", ") &&
      !/^(USA|UK|Canada|Singapore|Germany|Australia|Netherlands|France|Switzerland|India)/i.test(
        block.search.query,
      );

    if (isFailedNameLookup) {
      zeroBatch.push(block.search);
      continue;
    }
    flushZeroBatch();
    out.push(block);
  }
  flushZeroBatch();
  return out;
}

export function AssistantMessageFlow({
  blocks,
  isStreaming,
  streamStartedAt,
  hasRecommendations,
}: {
  blocks: MessageBlock[];
  isStreaming: boolean;
  streamStartedAt: number;
  hasRecommendations?: boolean;
}) {
  const ordered = compressZeroResultSearches(dedupeSearchBlocks(blocks));
  const searchBlocks = ordered.filter((b): b is Extract<MessageBlock, { type: "search" }> => b.type === "search");
  const hasText = ordered.some((b) => b.type === "text" && b.content.trim().length > 0);
  const pendingSearch = searchBlocks.some((b) => !b.search.done);
  const searchesComplete =
    searchBlocks.length > 0 && searchBlocks.every((b) => b.search.done) && !pendingSearch;
  const showSynthesizing =
    isStreaming && searchesComplete && !hasText && !hasRecommendations;
  const useCompactSearches = searchBlocks.length > 3;

  if (ordered.length === 0 && !showSynthesizing) return null;

  return (
    <div className="flex flex-col gap-3">
      {ordered.map((block, index) => {
        if (block.type === "thinking") {
          return (
            <ThinkingIndicator
              key={`thinking-${index}`}
              startedAt={streamStartedAt}
              isActive={isStreaming}
            />
          );
        }
        if (block.type === "status" && isStreaming && !block.done) {
          return (
            <div key={`status-${index}`} className="flex items-center min-h-7">
              <p className="type-body-sm text-muted animate-guide-in">{block.text}</p>
            </div>
          );
        }
        if (block.type === "text" && block.content.trim()) {
          return (
            <div
              key={`text-${index}`}
              className="max-w-[92%] text-ink type-body-sm leading-relaxed [&_p]:text-body [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:my-1.5 [&_li]:text-body [&_strong]:text-ink [&_strong]:font-semibold animate-guide-in"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
            </div>
          );
        }
        if (block.type === "search") {
          if (useCompactSearches) {
            return <SearchRowCompact key={block.search.id} search={block.search} />;
          }
          return (
            <CollapsibleSearchCard
              key={block.search.id}
              search={block.search}
              defaultCollapsed={block.search.source === "database" && block.search.done}
            />
          );
        }
        return null;
      })}

      {showSynthesizing && (
        <div className="flex items-center min-h-7">
          <p className="type-body-sm text-muted animate-guide-in">
            Pulling together your matches…
          </p>
        </div>
      )}
    </div>
  );
}

export function UserMessageBubble({ content, animate }: { content: string; animate?: boolean }) {
  return (
    <div
      className={cn(
        "max-w-[85%] px-4 py-2.5 rounded-lg rounded-br-sm bg-primary text-on-primary type-body-sm leading-relaxed",
        animate && "animate-message-send",
      )}
    >
      {content}
    </div>
  );
}

export function GuideChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Ask about a college, fit, or your list…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-hairline px-4 py-1.5 sm:px-5 sm:py-2 bg-canvas/30">
      <div
        className={cn(
          "relative flex items-center rounded-pill border border-hairline bg-canvas",
          "h-11 px-4 transition-all duration-200",
          "focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(204,120,92,0.08)]",
          disabled && "opacity-60",
        )}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "flex-1 min-w-0 bg-transparent type-body-sm text-ink placeholder:text-muted",
            "text-left leading-normal",
            "focus:outline-none disabled:cursor-not-allowed",
            "pr-10",
          )}
        />
        <button
          type="button"
          onClick={() => {
            if (canSend) onSend();
          }}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full",
            "bg-primary text-on-primary transition-all duration-200",
            "hover:bg-primary-active active:scale-95",
            "disabled:bg-surface-soft disabled:text-muted disabled:scale-100",
            canSend && "shadow-[0_2px_8px_rgba(204,120,92,0.25)]",
          )}
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}

export function StreamingFooter({ onStop }: { onStop: () => void }) {
  return (
    <div className="border-t border-hairline px-4 py-1.5 bg-canvas/30 flex justify-end">
      <button
        type="button"
        onClick={onStop}
        className="inline-flex items-center gap-2 rounded-pill border border-hairline bg-canvas px-3 py-1.5 type-caption text-muted hover:text-ink hover:border-primary/30 transition-colors"
        aria-label="Stop generating"
      >
        <Square className="h-3 w-3 fill-current" />
        Stop
      </button>
    </div>
  );
}

export function AssistantMessageShell({ children }: { children: ReactNode }) {
  return <div className="max-w-full w-full min-w-0">{children}</div>;
}
