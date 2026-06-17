"use client";

import React, { useState } from "react";
import { ShieldAlert, Activity, Zap, Info } from "lucide-react";

interface Ticket {
  id: string; original: string; reconstructed: string; urgency: number;
  category: string; timestamp: string; tacticalReasoning?: string;
  victimName?: string;
}

export default function PriorityBoard({ searchQuery = "" }: { searchQuery?: string }) {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredItems = items.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (t.reconstructed || "").toLowerCase().includes(query) ||
      (t.original || "").toLowerCase().includes(query) ||
      (t.victimName || "").toLowerCase().includes(query) ||
      (t.category || "").toLowerCase().includes(query)
    );
  });

  const run = async () => {
    setLoading(true);
    try { const r = await fetch("/api/prioritize", { method: "POST" }); setItems(await r.json()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const uc = (u: number) => u > 8 ? "var(--danger)" : u > 5 ? "var(--warning)" : "var(--mint)";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex justify-between items-end pb-5 border-b border-[var(--border)]">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <ShieldAlert size={18} className="text-[var(--mint)]" /> Tactical Triage
          </h2>
          <p className="text-[13px] text-[var(--text-3)] mt-0.5">AI-ranked priority assessment</p>
        </div>
        <button onClick={run} disabled={loading} className="sleek-btn sleek-btn-primary px-5 py-2.5">
          <Zap size={13} /> {loading ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>

      {/* Result Cards */}
      <div className="space-y-3">
        {items.length > 0 ? (
          filteredItems.length > 0 ? (
            filteredItems.map((t) => {
              const globalIndex = items.findIndex((item) => item.id === t.id);
              return (
                <div key={t.id} className="lucid-card flex flex-col md:flex-row items-stretch p-0 overflow-hidden">
                  {/* Rank */}
                  <div className="flex items-center justify-center px-6 py-4 bg-[var(--surface-2)] border-b md:border-b-0 md:border-r border-[var(--border)] min-w-[80px]">
                    <div className="text-center">
                      <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">Rank</p>
                      <p className="text-2xl font-light text-[var(--mint)]">{String(globalIndex + 1).padStart(2, '0')}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="bc-badge bg-[var(--surface-2)] border border-[var(--border)]" style={{ color: uc(t.urgency) }}>L{t.urgency}</span>
                      <span className="text-[12px] text-[var(--text-3)]">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {t.category}</span>
                    </div>
                    <p className="text-[16px] font-medium text-[var(--text)] leading-snug">{t.reconstructed}</p>
                    {t.tacticalReasoning && (
                      <div className="flex gap-2 items-start p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                        <Info size={13} className="text-[var(--plum)] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-[var(--plum)] uppercase tracking-wider mb-0.5">AI Reasoning</p>
                          <p className="text-[13px] text-[var(--text-2)] leading-relaxed">{t.tacticalReasoning}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-center px-5 py-4 bg-[var(--surface-2)] border-t md:border-t-0 md:border-l border-[var(--border)] min-w-[140px]">
                    <div className="text-center">
                      <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider mb-1">Strategy</p>
                      <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: globalIndex === 0 ? 'var(--danger)' : 'var(--teal)' }}>
                        {globalIndex === 0 ? "Critical" : "Staged"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bento-card border-dashed py-20 text-center">
              <p className="text-[13px] text-[var(--text-3)]">No matching priorities found</p>
            </div>
          )
        ) : (
          <div className="bento-card border-dashed py-20 text-center">
            <Activity size={28} className="mx-auto mb-3 text-[var(--text-3)] opacity-20" />
            <p className="text-[14px] text-[var(--text-3)]">Run analysis to rank priorities</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-[var(--border)]">
        <div className="lucid-card">
          <p className="stat-label mb-2">Survival Horizon</p>
          <p className="text-[13px] text-[var(--text-2)] leading-relaxed">Physiological time-limits override logistics.</p>
        </div>
        <div className="lucid-card">
          <p className="stat-label mb-2">Readiness</p>
          <div className="flex justify-between text-[11px] text-[var(--text-3)] mb-1.5"><span>Index</span><span>82%</span></div>
          <div className="h-1 bg-[var(--bg)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--plum)] rounded-full" style={{ width: '82%' }} />
          </div>
        </div>
        <div className="lucid-card">
          <p className="stat-label mb-2">Intercept</p>
          <p className="text-[13px] text-[var(--text-2)] leading-relaxed">Sector 7 ETA: <span className="text-[var(--mint)] font-semibold">4.2 min</span></p>
        </div>
      </div>
    </div>
  );
}
