"use client";

export function PageSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg animate-pulse" style={{ background: "var(--border-light)" }} />
            <div className="w-24 h-4 rounded animate-pulse" style={{ background: "var(--border-light)" }} />
          </div>
          <div className="w-28 h-9 rounded-lg animate-pulse" style={{ background: "var(--border-light)" }} />
        </div>
      </div>
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="w-48 h-6 rounded mb-2 animate-pulse" style={{ background: "var(--border-light)" }} />
        <div className="w-80 h-4 rounded mb-8 animate-pulse" style={{ background: "var(--border-light)" }} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-static p-7 animate-pulse">
              <div className="w-32 h-4 rounded mb-3" style={{ background: "var(--border-light)" }} />
              <div className="w-full h-3 rounded mb-2" style={{ background: "var(--border-light)" }} />
              <div className="w-3/4 h-3 rounded" style={{ background: "var(--border-light)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-static p-5 flex items-center gap-4 animate-pulse">
          <div className="w-20 h-12 rounded-lg shrink-0" style={{ background: "var(--border-light)" }} />
          <div className="flex-1">
            <div className="w-48 h-4 rounded mb-2" style={{ background: "var(--border-light)" }} />
            <div className="w-32 h-3 rounded" style={{ background: "var(--border-light)" }} />
          </div>
          <div className="w-16 h-6 rounded" style={{ background: "var(--border-light)" }} />
        </div>
      ))}
    </div>
  );
}
