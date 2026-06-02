import { Nav } from "@/components/layout/nav";

export default function CollegesLoading() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-canvas">
        <section className="bg-surface-dark py-16 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="h-4 w-32 bg-surface-dark-elevated rounded animate-pulse mb-4" />
            <div className="h-12 w-96 bg-surface-dark-elevated rounded animate-pulse mb-3" />
            <div className="h-6 w-2/3 bg-surface-dark-elevated rounded animate-pulse" />
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-6 lg:px-8 py-12">
          <div className="h-12 bg-surface-soft rounded-lg animate-pulse mb-6 max-w-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-48 bg-surface-soft rounded-lg animate-pulse" />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
