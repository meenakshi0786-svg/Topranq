"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface Action {
  id: string;
  agentName: string;
  actionType: string;
  inputSummary: string;
  outputSummary: string;
  qualityGatePassed: boolean;
  creditsUsed: number;
  timestamp: string;
}

const agentColors: Record<string, string> = {
  orchestrator: "#4F6EF7",
  crawler: "#7C5CFC",
  auditor: "#E5890A",
  strategist: "#30A46C",
  writer: "#E5484D",
};

export default function HistoryPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/domains/${domainId}/history`)
      .then((r) => r.json())
      .then((data) => { setActions(data); setLoading(false); });
  }, [domainId]);

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">History</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Action History</h1>

        {loading ? (
          <div className="card-static p-16 text-center fade-in">
            <p style={{ color: "var(--text-muted)" }}>Loading...</p>
          </div>
        ) : actions.length === 0 ? (
          <div className="card-static p-16 text-center fade-in">
            <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--border-light)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="text-base font-semibold mb-1">No actions yet</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Agent actions will appear here after you run an audit
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((action, i) => (
              <div key={action.id} className="card-static p-4 fade-in" style={{ animationDelay: `${i * 0.02}s` }}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: agentColors[action.agentName] || "#9AA0B4" }}
                  >
                    {action.agentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium capitalize">{action.agentName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
                        {action.actionType}
                      </span>
                      {action.qualityGatePassed ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--low-bg)", color: "var(--success)" }}>Passed</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--critical-bg)", color: "var(--critical)" }}>Failed</span>
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {action.outputSummary?.slice(0, 200)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(action.timestamp).toLocaleString()}
                    </p>
                    {action.creditsUsed > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {action.creditsUsed} credit{action.creditsUsed !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
