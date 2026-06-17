/**
 * DISAST-ED MISSION BRIDGE (DUPLEX v2.0)
 * -------------------
 * Bridges ESP32 Base Station (COM12) to the Intelligence Dashboard.
 * 
 * PROTOCOL: (Name|Location|message)
 * 
 * INSTALL: npm install serialport
 * RUN: node scripts/bridge.js COM12
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const API_ROOT = 'http://127.0.0.1:3000/api';
const BAUD_RATE = 115200;
const POLL_INTERVAL = 2000; // Poll for Admin replies every 2 seconds.

// Load admin password from env for secure route authentication
const fs = require('fs');
const path = require('path');
let adminPassword = 'Aerolink2026!';
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/ADMIN_PASSWORD=([^\s#]+)/);
    if (match) {
      adminPassword = match[1];
    }
  }
} catch (e) {
  // Ignored
}

const args = process.argv.slice(2);
const portPath = args[0] || 'COM12';

if (portPath === '--list') {
  SerialPort.list().then(ports => {
    console.log('\n--- SYSTEM PORTS ---');
    ports.forEach(p => console.log(`${p.path}\t${p.manufacturer || 'Unknown'}`));
    process.exit(0);
  });
} else {

  const port = new SerialPort({ path: portPath, baudRate: BAUD_RATE });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  const seenNoteTimestamps = new Set(); // To avoid repeating admin notes
  const MAX_SEEN_NOTES = 500; // Cap to prevent memory leaks in long-running deployments
  let activeTicketIds = new Set();
  const nextjsToVictimId = new Map();

  console.log(`\n[BRIDGE] CodeRed Base Station Linked @ ${portPath}`);
  console.log(`[BRIDGE] Protocol: (Name|Location|Message)`);
  console.log(`[BRIDGE] Monitoring for Admin Feedback...\n`);

  // 1. UPLINK: ESP32 -> DASHBOARD
  parser.on('data', async (line) => {
    const cleanLine = line.trim();
    if (!cleanLine) return;

    console.log(`[ESP] Incoming Raw: ${cleanLine}`);

    let victimName, manualLocation, message, origId;
    const match1 = cleanLine.match(/\(([^|]+)\|([^|]+)\|([^)]+)\)/);
    const match2 = cleanLine.match(/\[(TKT-\d+)\]\s*Name:\s*([^|]+)\|\s*Loc:\s*([^|]+)\|\s*Msg:\s*([^]+)/i);

    if (match2) {
      origId = match2[1];
      victimName = match2[2].trim();
      manualLocation = match2[3].trim();
      message = match2[4].trim();
    } else if (match1) {
      origId = null;
      victimName = match1[1].trim();
      manualLocation = match1[2].trim();
      message = match1[3].trim();
    }

    if (victimName) {
      const payload = {
        victimName,
        manualLocation,
        message,
        origId,
        lat: 0,
        lng: 0
      };

      console.log(`[BRIDGE] Parsed SOS from ${payload.victimName}. Uplinking...`);

      try {
        await fetch(`${API_ROOT}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log(`[BRIDGE] Signal Buffered for Admin Review.`);
      } catch (e) { console.error(`[ERROR] Dispatch Offline: ${e.message}`); }
    } else {
      console.log(`[WARN] Non-protocol signal ignored: ${cleanLine}`);
    }
  });

  // 2. DOWNLINK: DASHBOARD -> ESP32 BROWADCAST
  setInterval(async () => {
    try {
      const res = await fetch(`${API_ROOT}/reconstruct`, {
        headers: {
          'x-bridge-auth': adminPassword
        }
      });
      if (!res.ok) {
        console.warn(`[WARN] Downlink Poll failed with status: ${res.status}`);
        return;
      }

      const tickets = await res.json();

      for (const ticket of tickets) {
        if (!ticket.adminNotes) continue;

        for (const note of ticket.adminNotes) {
          const noteId = `${ticket.id}-${note.timestamp}`;

          if (!seenNoteTimestamps.has(noteId)) {
            seenNoteTimestamps.add(noteId);
            // Evict oldest entries to prevent unbounded memory growth
            if (seenNoteTimestamps.size > MAX_SEEN_NOTES) {
              const oldest = seenNoteTimestamps.values().next().value;
              seenNoteTimestamps.delete(oldest);
            }

            console.log(`[COMMAND] New Feedback for ${ticket.victimName}: ${note.text}`);

            // Send to ESP32 prepending the Unified TKT ID
            const broadcastMsg = `[${ticket.id}] COMMAND TO ${ticket.victimName.toUpperCase()}: ${note.text.toUpperCase()}\n`;

            if (port.isOpen) {
              port.write(broadcastMsg, (err) => {
                if (err) console.error(`[ERROR] Broadcast Link Failure: ${err.message}`);
              });
            } else {
              console.warn(`[WARN] Serial link offline; skipped broadcast to mesh: ${broadcastMsg.trim()}`);
            }
          }
        }
      }
    } catch (e) {
      console.error(`[ERROR] Downlink Poll Failure: ${e.message}`);
    }
  }, POLL_INTERVAL);

  port.on('error', (err) => console.error(`[CRITICAL] Serial Link Failure: ${err.message}`));

} // end else (not --list)
