import React from "react";
import { ShieldCheck, Zap, Activity, CheckCircle2 } from "lucide-react";
import { Ticket } from "@/lib/db";

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  accent: string;
}

function StatCard({ label, value, sub, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="lucid-card space-y-4">
      <div className="flex justify-between items-start">
        <p className="stat-label">{label}</p>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <h3 className="stat-value">{typeof value === "number" && value < 10 && value !== 0 ? `0${value}` : value}</h3>
      <p className="text-[13px] text-[var(--text-3)]">{sub}</p>
    </div>
  );
}

interface StatsDashboardProps {
  tickets: Ticket[];
}

export default function StatsDashboard({ tickets }: StatsDashboardProps) {
  const isFinished = (t: Ticket) => t.status === "resolved" || t.status === "completed";
  const stats = {
    active: tickets.filter((t) => !isFinished(t)).length,
    pending: tickets.filter((t) => t.status === "pending").length,
    deployed: tickets.filter((t) => t.status === "received").length,
    resolved: tickets.filter((t) => isFinished(t)).length,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Deployed" value={stats.deployed} sub={stats.deployed > 0 ? "Field support active" : "Awaiting order"} icon={ShieldCheck} accent="var(--mint)" />
      <StatCard label="Active" value={stats.active} sub="Live signals" icon={Activity} accent="var(--teal)" />
      <StatCard label="Pending" value={stats.pending} sub={stats.pending > 0 ? "Awaiting triage" : "Queue clear"} icon={Zap} accent="var(--frost)" />
      <StatCard label="Resolved" value={stats.resolved} sub="Completed" icon={CheckCircle2} accent="var(--plum)" />
    </div>
  );
}
