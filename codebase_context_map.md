# Aerolink Basecamp Codebase Context Map

Welcome! This document serves as a complete, self-contained **Context Map** for the **Aerolink Basecamp** repository. Any AI model or developer reading this document will gain immediate, exhaustive context on the project's purpose, design, data flow, hardware-software bridge, and exact source-code breakdown.

---

## 🛰 Project Overview

**Aerolink Basecamp** is an industry-grade, tactical Command & Control (C2) web platform designed for mission-critical disaster management. In scenarios where cellular/public networks have collapsed, Aerolink bridges the gap by capturing, decoding, and prioritizing emergency signals. It links field-deployed ESP32 LoRa nodes to a central dashboard via a local serial-to-web bridge, using Generative AI (Gemini 2.5 Flash) to reconstruct corrupted signals and score triage priority.

---

## 🏗 System Architecture & Data Flow

```mermaid
graph TD
    subgraph "Field Layer (Tactical - ESP32 Mesh)"
        VictimNode[Victim/Field Node - ESP32] -->|UDP Broadcast: Port 4330| MeshRelay[Mesh Relays / Router Nodes]
        MeshRelay -->|UDP Broadcast: Port 4330| AdminNode[Base Station Admin Node - ESP32]
    end
    
    subgraph "Bridge Layer (Serial & REST)"
        AdminNode -->|USB Serial Connection: 115200 Baud| NodeBridge[Node.js Bridge: scripts/bridge.js]
        NodeBridge -->|POST /api/data JSON Payload| NextAPIData[/api/data]
    end
    
    subgraph "Command Center (Next.js Application)"
        NextAPIData -->|Buffer Pending State| ExtJSON[(src/data/external.json)]
        DispatcherPage[Dispatcher UI: RequestsPage.tsx] -->|Authorize Signal| NextAPIApprove[/api/data/approve]
        NextAPIApprove -->|Request Reconstruction| GeminiAPI{{Google Gemini 2.5 Flash API}}
        GeminiAPI -->|JSON Parse: Reconstructed & Urgency| NextAPIApprove
        NextAPIApprove -->|Decrypt/Encrypt & Save| SecureDB[DB Layer: src/lib/db.ts]
        SecureDB -->|Encrypted IO| TicketsJSON[(src/data/tickets.json)]
        
        PriorityUI[Priority UI: PriorityBoard.tsx] -->|Trigger Sort| NextAPIPrioritize[/api/prioritize]
        NextAPIPrioritize -->|Triage Prompt| GeminiAPI
    end
    
    subgraph "Feedback & Downlink Control Loop"
        DispatcherPage -->|Green/Yellow/Red Marker Update| NextAPIRecPATCH[/api/reconstruct PATCH]
        NextAPIRecPATCH -->|Append Note| SecureDB
        NodeBridge -->|Polls: GET /api/reconstruct| NextAPIRecPATCH
        NextAPIRecPATCH -->|Return Active Notes| NodeBridge
        NodeBridge -->|Serial Broadcast Command| AdminNode
        AdminNode -->|UDP mesh downlink| VictimNode
    end
```

---

## 📁 File Registry

Here is the exact mapping of all files in the project workspace:

### 1. Root & Configuration
*   [package.json](file:///c:/Users/parit/Downloads/Aeroloink/package.json): Defines dependencies. Key packages include `next: 16.2.4`, `react: 19.2.4`, `serialport: ^13.0.0`, `@google/generative-ai` (unused SDK in code, endpoint used instead), `pigeon-maps` (primary GIS engine), `leaflet` & `react-leaflet` (fallback GIS), and `framer-motion` (animations).
*   [tsconfig.json](file:///c:/Users/parit/Downloads/Aeroloink/tsconfig.json): TypeScript compiler configuration, specifying path aliases like `@/*` targeting the `src/` directory.
*   [next.config.ts](file:///c:/Users/parit/Downloads/Aeroloink/next.config.ts): Configures Next.js compilation settings.
*   [eslint.config.mjs](file:///c:/Users/parit/Downloads/Aeroloink/eslint.config.mjs): Linting rules configuration.
*   [README.md](file:///c:/Users/parit/Downloads/Aeroloink/README.md): High-level developer setup guides and architecture details.
*   [AGENTS.md](file:///c:/Users/parit/Downloads/Aeroloink/AGENTS.md): Critical developer rules regarding breaking changes in Next.js 16/React 19 conventions.

### 2. Hardware (`/hardware`)
*   [transceiver.ino](file:///c:/Users/parit/Downloads/Aeroloink/hardware/transceiver.ino): ESP32 Arduino code. Handles UDP socket bindings on universal port `4330` over Wi-Fi SSID `"CodeRed_SOS_Network"`. Standardizes:
    1.  Printing incoming UDP packets onto the Serial Monitor.
    2.  Capturing user entries from the Serial Monitor, calculating subnet broadcast address, and broadcasting the outbound packet.

### 3. Scripts (`/scripts`)
*   [bridge.js](file:///c:/Users/parit/Downloads/Aeroloink/scripts/bridge.js): Run via Node on base station terminal (e.g. `node scripts/bridge.js COM12`). Bridges Serial Port communications to local HTTP APIs.
    *   **Uplink**: Parses incoming strings matching `(Name|Location|Message)` or `[TKT-XXXX] Name: ...|Loc: ...|Msg: ...` and hits `POST /api/data`.
    *   **Downlink**: Runs an interval timer polling `/api/reconstruct` for any new `adminNotes`. Formats them as `[TKT-XXXX] COMMAND TO <VICTIM>: <NOTE>` and broadcasts them over the serial port.
*   [bump.js](file:///c:/Users/parit/Downloads/Aeroloink/scripts/bump.js): Typography utility script. Walks the `src/` directory and increments any Tailwind font sizes (like `text-[12px]`) by `2px` in `.ts`/`.tsx` files.

### 4. Database & Storage Layer (`src/lib` & `src/data`)
*   [encryption.ts](file:///c:/Users/parit/Downloads/Aeroloink/src/lib/encryption.ts): Security encoder utility. Uses AES-256-CBC with a 32-character key (`ENCRYPTION_KEY`) and dynamic initialization vectors (IV). Outputs ciphertext as `iv_hex:ciphertext_hex`.
*   [db.ts](file:///c:/Users/parit/Downloads/Aeroloink/src/lib/db.ts): Manages read/write streams on `tickets.json`. Automatically encrypts fields (`original`, `reconstructed`, `location`, `manualLocation`, `victimName`, `adminNotes.text`) when saving, and decrypts them when loading. Includes robust try-catch fallback for raw/legacy tickets.
*   [tickets.json](file:///c:/Users/parit/Downloads/Aeroloink/src/data/tickets.json): Secured JSON database storage containing all emergency ticket history.
*   [external.json](file:///c:/Users/parit/Downloads/Aeroloink/src/data/external.json): Serves as the single-item buffer cache for incoming raw signals awaiting dispatcher approval.

### 5. API Layer (`src/app/api`)
*   [api/data/route.ts](file:///c:/Users/parit/Downloads/Aeroloink/src/app/api/data/route.ts): 
    *   `GET`: Pulls pending signal buffer details from `external.json`.
    *   `POST`: Receives incoming signals from the bridge, runs a 3-second deduplication check, and writes the signal to `external.json` in state `AWAITING_REVIEW`.
    *   `PATCH`: Resets the buffer state.
*   [api/data/approve/route.ts](file:///c:/Users/parit/Downloads/Aeroloink/src/app/api/data/approve/route.ts): 
    *   `POST`: Triggers AI reconstruction on the currently buffered signal in `external.json`, creates a new ticket object, writes it to `tickets.json` via `db.ts`, and resets the buffer back to `IDLE`.
*   [api/prioritize/route.ts](file:///c:/Users/parit/Downloads/Aeroloink/src/app/api/prioritize/route.ts):
    *   `POST`: Fetches active tickets and forwards them to Gemini to perform triage ranking. Returns the prioritized list alongside rationale texts.
*   [api/reconstruct/route.ts](file:///c:/Users/parit/Downloads/Aeroloink/src/app/api/reconstruct/route.ts):
    *   `GET`: Returns all tickets (supports filtering by a list of `ids` or a single `id`).
    *   `POST`: Performs manual ticket generation.
    *   `PATCH`: Appends dispatcher notes, system alerts, or updates marker colors and dispatch status.

### 6. User Interface & Route Pages (`src/app` & `src/components`)
*   [app/page.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/app/page.tsx): Main landing page. Renders `AdminDashboard`.
*   [app/layout.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/app/layout.tsx): Top-level shell initializing Outfit/Inter and JetBrains Mono variables and global settings.
*   [app/globals.css](file:///c:/Users/parit/Downloads/Aeroloink/src/app/globals.css): Curated CSS tokens and minimalist bento/lucid card class declarations.
*   [app/monitor/page.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/app/monitor/page.tsx): Legacy signal decoder dashboard panel with client-side simulator preset buttons.
*   [app/victim/page.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/app/victim/page.tsx): Mobile-optimized Field Node page. Polls current signal buffer and local ticket histories (retrieved via `localStorage` key `myDistressTickets`) to display active dispatch status (forces en route, message read) and direct messages from command.
*   [components/AdminDashboard.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/components/AdminDashboard.tsx): Orchestrates the state, active navigation tabs, and fetches base station geolocation coordinates.
*   [components/AdminSidebar.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/components/AdminSidebar.tsx): Sidebar navigation panel containing Overview, Dispatcher, Priority, and Intelligence tabs.
*   [components/StatsDashboard.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/components/StatsDashboard.tsx): Small widgets showing counts of active, pending, deployed, and resolved tickets.
*   [components/SituationalMap.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/components/SituationalMap.tsx): Core GIS component built on `pigeon-maps`. Renders base station home nodes, draws map overlays for targets, pans using coordinates, toggles fullscreen, and calculates the Haversine distance.
*   [components/RequestsPage.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/components/RequestsPage.tsx): Primary operator control panel (Intake Log). Manages signal interception, AI authorization, dispatcher-to-victim chat loops, and dispatch status marker updates.
*   [components/PriorityBoard.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/components/PriorityBoard.tsx): Renders AI triage sorted queues with expandable boxes detailing reasoning.
*   [components/IntelligenceModule.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/components/IntelligenceModule.tsx): Manual operator interface for pasting garbled texts and reconstructing them instantly.
*   [components/DisasterHeatMap.tsx](file:///c:/Users/parit/Downloads/Aeroloink/src/components/DisasterHeatMap.tsx): Leaflet map rendering mockup disaster circles around Delhi (used for conceptual simulations).

---

## 🗃 Key Data Schemas & Structures

### 1. Ticket Object Schema (`db.ts`)
```typescript
export interface Ticket {
  id: string;                                                         // Unique short hash, e.g. "ok7ojpw"
  original: string;                                                   // Raw input, e.g. "h..lp fl..d r..sing"
  reconstructed: string;                                              // AI reconstructed plain text
  urgency: number;                                                    // Urgency scale 1 - 10
  category: string;                                                   // Threat category, e.g., "Trauma", "Drowning"
  location: { lat: number, lng: number };                             // GPS coordinates
  manualLocation?: string;                                            // Optional text location description or string coordinates
  victimName?: string;                                                // Optional victim name or tag
  timestamp: string;                                                  // ISO Date string
  status: string;                                                     // "pending" | "received" | "completed"
  markerColor: "green" | "yellow" | "red" | "none";                   // Maps to dispatch status colors
  adminNotes: { 
    text: string, 
    timestamp: string, 
    sender: "admin" | "system"                                        // notes logged by admin or status markers
  }[];
  source?: string;                                                    // e.g. "ESP32 Device", "Manual Uplink"
}
```

### 2. Encryption Format (`encryption.ts`)
Stored string format:
`[16-byte random IV as hex] : [AES-256-CBC Encrypted ciphertext as hex]`
*Example:* `f6bd4f4d1c058cd80f4b3ca3291e8045:f2c9a7f123...`

---

## 📻 Networking & Serial Protocol

### 1. Serial Frame Format (Uplink: ESP32 -> Web)
The bridge expects lines matching one of these regex patterns:
1.  **Format A:** `(Name|Location|Message)`
    *   *Regex:* `/\(([^|]+)\|([^|]+)\|([^)]+)\)/`
2.  **Format B:** `[TKT-XXXX] Name: <Name> | Loc: <Location> | Msg: <Message>`
    *   *Regex:* `/\[(TKT-\d+)\]\s*Name:\s*([^|]+)\|\s*Loc:\s*([^|]+)\|\s*Msg:\s*([^]+)/i`

### 2. Serial Control Format (Downlink: Web -> ESP32)
Dispatched commands or status responses are formatted as uppercase text lines with the ticket ID prepended:
`[<Ticket ID>] COMMAND TO <VICTIM NAME>: <MESSAGE>\n`
*Example:* `[ok7ojpw] COMMAND TO JOHN DOE: FORCES EN ROUTE. STAY PUT.\n`

---

## 🤖 Gemini AI Prompt Prompts & Integration

The project communicates directly with **Google Gemini 2.5 Flash** using dynamic prompt instructions.

### 1. Signal Reconstruction API (`src/lib/intelligence.ts`)
*   **Model**: `gemini-2.5-flash`
*   **Prompt context**:
    ```text
    Emergency Response AI Analyst.
    Context: 
      VICTIM NAME: <Name>
      REPORTED LOCATION: <Location>
    Signal Extraction: "<Raw Garbled Signal>"
    
    Task: 
    1. Reconstruct fragmented signal into professional clean text.
    2. Categorize (e.g. Trauma, Fire, Drowning).
    3. Score urgency (1-10).
    
    Respond strictly in JSON: { "reconstructed": "...", "urgency": #, "category": "..." }
    ```

### 2. Signal Prioritization Triage (`src/app/api/prioritize/route.ts`)
*   **Model**: `gemini-2.5-flash`
*   **Prompt context**:
    ```text
    Tactical Triage Officer Analysis.
    PROTOCOL: 
    1. Tier 1 (minutes): Fire, Drowning, Trauma.
    2. Tier 2 (hours): Food, Water, Shelter.
    Tier 1 overrides Tier 2 regardless of count.

    TICKETS: <Stringified Array of active tickets>

    Respond strictly in JSON format:
    {
      "sortedIds": ["id1", "id2", ...],
      "rationale": { "id1": "reason", "id2": "reason" }
    }
    ```

---

## 🎨 Styling & Design Tokens (`globals.css`)

Aerolink Basecamp implements a modern, minimalist dark/light hybrid layout system.
*   **Color Palette**:
    *   `--c-white`: `#F6F6F5` (Primary background canvas)
    *   `--c-orange`: `#F0946C` (Mint/Highlight - acts as primary active states)
    *   `--c-blue`: `#979CB7` (Teal - secondary actions)
    *   `--c-purple`: `#78647C` (Frost - informational states)
    *   `--c-dark`: `#4A3B44` (Plum - dark highlights)
    *   `--muted`: `#A8A8AE` (Muted details)
*   **Dispatch Marker System**:
    *   **Green (`green`)**: `#47E5BC` (Forces on the way / active dispatch)
    *   **Yellow (`yellow`)**: `#E5C247` (Message read by command center)
    *   **Red (`red`)**: `#E5475A` (Not read / unacknowledged alert)
    *   **None (`none`)**: `#5C5F6E` (No status / pending review)
*   **Custom Class Layouts**:
    *   `.lucid-card`: Clean card border mapping `#E0E0E2` that darkens on hover.
    *   `.bento-card`: Large layout container block with `#FFFFFF` background.
    *   `.sleek-btn`: Buttons utilizing uppercase, letter-spacing, and highlight animations.
