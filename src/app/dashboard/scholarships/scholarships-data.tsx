import { getContextProfile } from "@/lib/supabase/cached";
import { getProfileContext } from "@/lib/profile-context";
import type { ProfileSnapshot } from "@/types/profile-context";
import { SCHOLARSHIPS } from "@/lib/scholarships-data";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTRY_FLAGS: Record<string, string> = {
  USA: "🇺🇸",
  UK: "🇬🇧",
  Canada: "🇨🇦",
  Australia: "🇦🇺",
  Singapore: "🇸🇬",
  Germany: "🇩🇪",
  Netherlands: "🇳🇱",
  India: "🇮🇳",
};

export async function ScholarshipsSubtitle() {
  const profile = await getContextProfile();
  const ctx = getProfileContext(profile as ProfileSnapshot | null);
  const userCountries = ctx.targetCountries;

  return (
    <p className="type-body-sm text-muted mt-2">
      {userCountries.length > 0
        ? `Showing scholarships relevant to your target countries (${userCountries.join(", ")}) first.`
        : "Curated scholarships for Indian students studying abroad."}
    </p>
  );
}

export async function ScholarshipsList() {
  const profile = await getContextProfile();
  const ctx = getProfileContext(profile as ProfileSnapshot | null);
  const userCountries = ctx.targetCountries;

  const relevant = SCHOLARSHIPS.filter((s) =>
    userCountries.some((c) => s.countries.includes(c)),
  );
  const other = SCHOLARSHIPS.filter(
    (s) => !userCountries.some((c) => s.countries.includes(c)),
  );
  const sorted =
    userCountries.length > 0 ? [...relevant, ...other] : SCHOLARSHIPS;

  return (
    <>
      {userCountries.length > 0 && relevant.length > 0 && (
        <p className="type-caption-upper text-muted mb-3">
          Matched to your targets
        </p>
      )}

      <div className="flex flex-col gap-3">
        {sorted.map((s, i) => {
          const isRelevant = userCountries.some((c) =>
            s.countries.includes(c),
          );
          const showDivider =
            userCountries.length > 0 &&
            i === relevant.length &&
            other.length > 0;

          return (
            <div key={s.name}>
              {showDivider && (
                <div className="py-3">
                  <p className="type-caption-upper text-muted">
                    Other scholarships
                  </p>
                </div>
              )}
              <div
                className={cn(
                  "rounded-lg border bg-surface-card p-5 transition-all hover:shadow-sm",
                  isRelevant ? "border-primary/15" : "border-hairline",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="type-caption text-ink">{s.name}</p>
                      {s.countries.map((c) => (
                        <span key={c} className="text-sm leading-none">
                          {COUNTRY_FLAGS[c] ?? "🌍"}
                        </span>
                      ))}
                    </div>
                    <p className="type-body-sm text-body mb-2">{s.provider}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      <div>
                        <p
                          className="type-caption-upper text-muted"
                          style={{ fontSize: "0.58rem" }}
                        >
                          Amount
                        </p>
                        <p className="type-body-sm text-ink">{s.amount}</p>
                      </div>
                      <div>
                        <p
                          className="type-caption-upper text-muted"
                          style={{ fontSize: "0.58rem" }}
                        >
                          Deadline
                        </p>
                        <p className="type-body-sm text-ink">{s.deadline}</p>
                      </div>
                      <div className="col-span-2">
                        <p
                          className="type-caption-upper text-muted"
                          style={{ fontSize: "0.58rem" }}
                        >
                          Eligibility
                        </p>
                        <p className="type-body-sm text-muted">
                          {s.eligibility}
                        </p>
                      </div>
                    </div>
                  </div>
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-canvas px-3 type-caption text-body hover:text-ink hover:border-primary/30 transition-colors"
                  >
                    Learn more
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
