export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function webSearch(
  query: string,
  numResults = 5
): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: numResults }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const organic: Array<{ title?: string; snippet?: string; link?: string }> =
      data.organic ?? [];

    return organic.slice(0, numResults).map((r) => ({
      title: r.title ?? "",
      snippet: r.snippet ?? "",
      url: r.link ?? "",
    }));
  } catch {
    return [];
  }
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "No search results found.";
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
    )
    .join("\n\n");
}
