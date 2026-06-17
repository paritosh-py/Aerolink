import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getTickets } from "@/lib/db";

const EXTERNAL_FILE = path.join(process.cwd(), "src/data/external.json");

// ── Mutex for external.json serialization ──
let _extLock: Promise<void> = Promise.resolve();
function withExternalLock<T>(fn: () => Promise<T>): Promise<T> {
  let release: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  const wait = _extLock;
  _extLock = next;
  return wait.then(fn).finally(() => release!());
}

function getExternalData() {
  if (fs.existsSync(EXTERNAL_FILE)) {
    return JSON.parse(fs.readFileSync(EXTERNAL_FILE, "utf-8"));
  }
  return { message: "READY", state: "IDLE", timestamp: new Date().toISOString() };
}

function saveExternalData(data: Record<string, unknown>) {
  fs.writeFileSync(EXTERNAL_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json(getExternalData());
}

export async function POST(req: Request) {
  return withExternalLock(async () => {
    try {
      const body = await req.json();
      const rawMessage = body.message || "";
      const victimName = body.victimName || "Unknown";
      const manualLocation = body.manualLocation || "Unknown Location";
      const origId = body.origId || "";

      if (!rawMessage) return NextResponse.json({ error: "Empty signal" }, { status: 400 });

      const tickets = getTickets();
      const now = new Date();
      
      // Deduplication (same message from same user in 15s)
      const isDuplicate = tickets.some(t => 
        t.original === rawMessage && 
        t.victimName === victimName &&
        (now.getTime() - new Date(t.timestamp).getTime()) < 15000
      );

      if (isDuplicate) {
        return NextResponse.json({ success: true, status: "duplicate suppressed" });
      }

      saveExternalData({ 
        message: rawMessage, 
        state: "AWAITING_REVIEW", 
        timestamp: now.toISOString(), 
        victimName,
        manualLocation,
        origId,
        isNew: true
      });

      return NextResponse.json({ success: true, status: "Signal Buffered for Admin Review" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      saveExternalData({ message: "ERROR", state: "FAIL", timestamp: new Date().toISOString() });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function PATCH() {
  return withExternalLock(async () => {
    saveExternalData({ message: "SCANNING...", state: "IDLE", timestamp: new Date().toISOString() });
    return NextResponse.json({ success: true });
  });
}
