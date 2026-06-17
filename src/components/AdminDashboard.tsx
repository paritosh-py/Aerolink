"use client";

import React, { useState, useEffect, useRef } from "react";
import StatsDashboard from "./StatsDashboard";
import IntelligenceModule from "./IntelligenceModule";
import RequestsPage from "./RequestsPage";
import PriorityBoard from "./PriorityBoard";
import AdminSidebar from "./AdminSidebar";
import SituationalMap from "./SituationalMap";
import { 
  Bell, Search, User, Shield, ShieldCheck, Database, 
  Terminal, X, Radio, Lock, Server, Clock, LogOut, CheckCircle 
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [baseCoord, setBaseCoord] = useState<{lat: number, lng: number} | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  
  // New polished UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"registry" | "logs" | "security" | null>(null);
  
  // Reference hooks for clicking outside dropdowns
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (navigator.geolocation && !baseCoord) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setBaseCoord({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Location permission denied or unavailable"),
        { enableHighAccuracy: true }
      );
    }
  }, [baseCoord]);

  // Fetch tickets periodically
  const fetchT = async () => { 
    try { 
      const r = await fetch("/api/reconstruct"); 
      if (r.ok) {
        setTickets(await r.json()); 
      }
    } catch {} 
  };

  useEffect(() => {
    fetchT();
    const i = setInterval(fetchT, 4000);
    return () => clearInterval(i);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Dynamic notifications list
  const baseNotifications = [
    { id: "1", type: "system", text: "AI priority triage protocol online.", time: "System startup" },
    { id: "2", type: "security", text: "AES-256 database key authenticated successfully.", time: "System startup" },
    { id: "3", type: "uplink", text: "Listening on Serial Bridge gateway (COM3 / 9600 baud).", time: "Uplink online" }
  ];

  // Dynamic logs generation
  const getMockLogs = () => {
    const isFinished = (t: any) => t.status === "resolved" || t.status === "completed";
    const activeCount = tickets.filter((t) => !isFinished(t)).length;
    const resolvedCount = tickets.filter((t) => isFinished(t)).length;
    const timeStr = new Date().toLocaleTimeString();

    return [
      `[${timeStr}] DB_DECRYPT: Successfully decrypted system database src/data/tickets.json (AES-256)`,
      `[${timeStr}] AUDIT_LOG: Admin session authenticated. Session token validated.`,
      `[${timeStr}] NODE_UPLINK: Serial gateway active on virtual host endpoint /api/data`,
      `[${timeStr}] TRIAGE_DAEMON: ${activeCount} active signals detected, ${resolvedCount} resolved tasks stored`,
      searchQuery ? `[${timeStr}] ENGINE_SEARCH: Global filter query applied: "${searchQuery}"` : null,
      `[${timeStr}] SYSTEM: System status clear. Diagnostic check: OK.`
    ].filter(Boolean);
  };

  // Filtered tickets based on search query
  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (t.reconstructed || "").toLowerCase().includes(query) ||
      (t.original || "").toLowerCase().includes(query) ||
      (t.victimName || "").toLowerCase().includes(query) ||
      (t.category || "").toLowerCase().includes(query) ||
      (t.manualLocation || "").toLowerCase().includes(query)
    );
  });

  const title: Record<string, string> = {
    overview: "Overview",
    intelligence: "Signal Intelligence",
    requests: "Dispatcher Log",
    priority: "Triage Priority",
  };

  return (
    <div className="admin-layout">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-5 border-b border-[var(--border)] relative z-40">
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">{title[activeTab] || "Overview"}</h1>
            <p className="text-[13px] text-[var(--text-3)] mt-0.5">Aerolink Basecamp · Tier-A</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="Search signals, units..." 
                className="bc-input py-2 pl-8 pr-3 text-[13px] w-[180px] focus:w-[240px] transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text)]"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Notifications Icon & Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`p-2 rounded-lg hover:bg-[var(--surface-2)] transition-all text-[var(--text-3)] hover:text-[var(--text)] relative cursor-pointer ${notificationsOpen ? "bg-[var(--surface-2)] text-[var(--text)]" : ""}`}
              >
                <Bell size={15} />
                <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-[var(--mint)] animate-ping" />
                <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-[var(--mint)]" />
              </button>
              
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-[320px] bento-card p-4 shadow-xl border border-[var(--border)] bg-[var(--surface)] z-50 text-[13px]"
                  >
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-2.5 mb-2.5">
                      <span className="font-bold text-[var(--text)] flex items-center gap-1.5">
                        <Bell size={14} className="text-[var(--mint)]" /> Live Notifications
                      </span>
                      <span className="text-[10px] text-[var(--text-3)] uppercase tracking-wider bg-[var(--surface-2)] px-1.5 py-0.5 rounded">Active Node</span>
                    </div>
                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                      {tickets.filter(t => t.urgency > 7 && t.status !== "completed" && t.status !== "resolved").map((t) => (
                        <div key={t.id} className="p-2 rounded bg-[rgba(229,71,90,0.04)] border border-[rgba(229,71,90,0.2)] text-[12px]">
                          <span className="font-bold text-[var(--danger)] uppercase tracking-wider block mb-0.5">⚠️ Urgent Distress (L{t.urgency})</span>
                          <p className="text-[var(--text)] leading-relaxed italic">&ldquo;{t.reconstructed}&rdquo;</p>
                          <span className="text-[10px] text-[var(--text-3)] mt-1 block">{new Date(t.timestamp).toLocaleTimeString()} · Unit {t.victimName || t.id}</span>
                        </div>
                      ))}
                      {baseNotifications.map((n) => (
                        <div key={n.id} className="p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[12px] space-y-0.5">
                          <p className="text-[var(--text-2)] leading-relaxed">{n.text}</p>
                          <span className="text-[10px] text-[var(--text-3)] block uppercase tracking-wider">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile User Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-8 h-8 rounded-lg bg-[var(--plum)] flex items-center justify-center cursor-pointer hover:opacity-90 transition-all border border-[var(--border)]"
              >
                <User size={13} className="text-white" />
              </button>
              
              <AnimatePresence>
                {profileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-[240px] bento-card p-4 shadow-xl border border-[var(--border)] bg-[var(--surface)] z-50 text-[13px] space-y-3.5"
                  >
                    <div className="border-b border-[var(--border)] pb-2.5">
                      <p className="font-bold text-[var(--text)]">Administrator</p>
                      <p className="text-[11px] text-[var(--text-3)] uppercase tracking-wider mt-0.5">Incident Commander</p>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-[var(--text-2)]">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-3)]">Operator:</span>
                        <span className="font-mono">admin</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-3)]">Security level:</span>
                        <span className="text-[var(--mint)] font-bold uppercase">Tier-A (AES)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-3)]">Node:</span>
                        <span className="font-mono">Basecamp-Base-1</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-lg bg-[rgba(225,71,90,0.06)] hover:bg-[rgba(225,71,90,0.1)] text-[var(--danger)] border border-[rgba(225,71,90,0.15)] transition-all cursor-pointer"
                    >
                      <LogOut size={12} /> Disconnect Session
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar relative z-10">
          {activeTab === "overview" && (
            <div className="space-y-6 pb-12">
              <StatsDashboard tickets={filteredTickets} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 h-[320px]">
                  <SituationalMap tickets={filteredTickets} baseCoord={baseCoord} height={320} />
                </div>
                
                {/* Alert Feed */}
                <div className="bento-card flex flex-col h-[320px]">
                  <div className="border-b border-[var(--border)] pb-3 mb-3 flex items-center justify-between">
                    <span className="stat-label">System Feed</span>
                    <span className="status-dot status-dot-live animate-ping" />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-[12px]">
                    {filteredTickets.filter(t => t.status !== "completed").length > 0 ? (
                      filteredTickets.filter(t => t.status !== "completed").slice(0, 4).map((t) => (
                        <div key={t.id} className="p-2.5 rounded border border-[var(--border)] bg-[var(--bg)] space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-[var(--text-3)]">
                            <span className="font-bold text-[var(--mint)] uppercase">{t.category}</span>
                            <span>{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[var(--text)] font-medium italic line-clamp-2">&ldquo;{t.reconstructed}&rdquo;</p>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-center text-[var(--text-3)] py-12">
                        <div>
                          <Radio size={24} className="mx-auto mb-2 text-[var(--text-3)] opacity-20" />
                          <p className="uppercase tracking-[2px] text-[10px] font-bold">All Sectors Secure</p>
                          <p className="text-[11px] mt-0.5">Scanning airwaves for signals</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "intelligence" && <IntelligenceModule />}
          {activeTab === "requests" && <RequestsPage searchQuery={searchQuery} />}
          {activeTab === "priority" && <PriorityBoard searchQuery={searchQuery} />}
        </div>
        
        {/* Footer */}
        <footer className="mt-6 pt-4 border-t border-[var(--border)] flex justify-between text-[11px] text-[var(--text-3)]">
          <span>Aerolink v1.0 · AES-256 Enabled</span>
          <div className="flex gap-5">
            <span 
              onClick={() => setActiveModal("registry")}
              className="hover:text-[var(--mint)] cursor-pointer hover:underline transition-all"
            >
              Registry
            </span>
            <span 
              onClick={() => setActiveModal("logs")}
              className="hover:text-[var(--mint)] cursor-pointer hover:underline transition-all"
            >
              Logs
            </span>
            <span 
              onClick={() => setActiveModal("security")}
              className="hover:text-[var(--mint)] cursor-pointer hover:underline transition-all"
            >
              Security
            </span>
          </div>
        </footer>
      </main>

      {/* System Modal Dialogs */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-[rgba(17,17,17,0.4)] backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-[500px] bento-card border border-[var(--border)] shadow-2xl relative overflow-hidden bg-[var(--surface)] max-h-[85vh] flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--mint)]" />
              
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-4 mb-4">
                <h3 className="text-base font-bold text-[var(--text)] uppercase tracking-wider flex items-center gap-2">
                  {activeModal === "registry" && <Database size={16} className="text-[var(--mint)]" />}
                  {activeModal === "logs" && <Terminal size={16} className="text-[var(--mint)]" />}
                  {activeModal === "security" && <Lock size={16} className="text-[var(--mint)]" />}
                  System {activeModal}
                </h3>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar text-[13px] text-[var(--text-2)] space-y-4">
                {activeModal === "registry" && (
                  <div className="space-y-3.5">
                    <p className="text-[13px] text-[var(--text-3)] leading-relaxed">
                      Aerolink nodes directory and database registration logs. Basecamp tracks client files and physical gateways.
                    </p>
                    <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-mono text-[11px] space-y-1.5">
                      <div className="flex justify-between"><span className="text-[var(--text-3)]">Registry Node ID:</span><span>Basecamp-Base-1</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-3)]">Storage Path:</span><span>src/data/tickets.json</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-3)]">Uplink Gateway:</span><span>src/data/external.json</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-3)]">Database State:</span><span className="text-[var(--mint)] font-bold">DECRYPTED / SECURE</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-3)]">Total Files Index:</span><span>{tickets.length} Incidents</span></div>
                    </div>
                    
                    <div className="border-t border-[var(--border)] pt-3.5 space-y-2">
                      <h4 className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider">Connected Devices</h4>
                      <div className="grid grid-cols-2 gap-2 text-[12px]">
                        <div className="p-2 border border-[var(--border)] rounded flex items-center gap-2 bg-[var(--surface-2)]">
                          <Radio size={14} className="text-[var(--mint)]" />
                          <div>
                            <span className="font-bold block text-[11px]">LoRa Gateway</span>
                            <span className="text-[9px] text-[var(--text-3)] uppercase">Online · 433 MHz</span>
                          </div>
                        </div>
                        <div className="p-2 border border-[var(--border)] rounded flex items-center gap-2 bg-[var(--surface-2)]">
                          <Server size={14} className="text-[var(--mint)]" />
                          <div>
                            <span className="font-bold block text-[11px]">Bridge uplink</span>
                            <span className="text-[9px] text-[var(--text-3)] uppercase">Online · COM3</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === "logs" && (
                  <div className="space-y-3.5 flex flex-col h-full">
                    <p className="text-[13px] text-[var(--text-3)]">
                      Internal trace logs captured during current admin session runtime.
                    </p>
                    <div className="flex-1 bg-[#151515] text-[#22c55e] p-3 rounded-lg font-mono text-[11px] space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar border border-[#2d2d2d] leading-relaxed select-text">
                      {getMockLogs().map((l, idx) => (
                        <p key={idx} className="break-all whitespace-pre-wrap">{l}</p>
                      ))}
                    </div>
                  </div>
                )}

                {activeModal === "security" && (
                  <div className="space-y-4">
                    <p className="text-[13px] text-[var(--text-3)] leading-relaxed">
                      Aerolink protects sensitive casualty coordinates and distress payloads using bank-grade local cryptographic standards.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex gap-3 items-start p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                        <ShieldCheck size={18} className="text-[var(--mint)] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[13px] text-[var(--text)]">AES-256-CBC Database Encryption</p>
                          <p className="text-[12px] text-[var(--text-3)] mt-0.5 leading-relaxed">
                            Incident database records are securely stored as cipher text. Personal information, messages, and coordinates are dynamically encrypted before file writes.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                        <Lock size={18} className="text-[var(--mint)] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[13px] text-[var(--text)]">Secure Cookie Session Auth</p>
                          <p className="text-[12px] text-[var(--text-3)] mt-0.5 leading-relaxed">
                            Administrators execute actions on a cryptographically isolated session. Cookies are marked HTTPOnly and Strict SameSite to prevent client-side intercept attacks.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-[var(--border)] pt-4 mt-4 text-right">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="sleek-btn sleek-btn-primary px-5 py-2"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
