import { Suspense } from "react";
import { ChatData } from "./chat-data";
import { ChatSkeleton } from "@/components/loading/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

function ChatShellSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-68px)] flex-col bg-canvas lg:h-screen">
      <div className="flex items-center gap-3 border-b border-hairline px-4 py-3.5 sm:px-6 sm:py-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <ChatSkeleton />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatShellSkeleton />}>
      <div className="flex h-[calc(100dvh-68px)] flex-col bg-canvas lg:h-screen">
        <ChatData />
      </div>
    </Suspense>
  );
}
