import { requireUser } from "@/lib/supabase/cached";
import { ChatClient } from "./chat-client";

export async function ChatData() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("counselly_profiles")
    .select("full_name, target_countries")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const targetCountries: string[] = profile?.target_countries ?? [];

  return (
    <>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-hairline px-4 py-3.5 sm:px-6 sm:py-4">
        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-sm">🎓</span>
        </div>
        <div>
          <p className="type-caption font-semibold text-ink">AI Counsellor</p>
          <p className="text-muted" style={{ fontSize: "0.68rem" }}>
            {targetCountries.length > 0
              ? `Personalised for ${targetCountries.join(", ")} · Agentic`
              : "Agentic · Web search · Profile sync"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-muted" style={{ fontSize: "0.65rem" }}>Online</span>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatClient userName={firstName} />
      </div>
    </>
  );
}
