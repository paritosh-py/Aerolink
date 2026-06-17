import { NextResponse } from "next/server";
import { getTickets } from "@/lib/db";
import { checkAuth } from "@/lib/auth";

export async function POST() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key not configured." }, { status: 500 });

    const tickets = getTickets().filter((t: any) => t.status !== "completed");
    if (tickets.length === 0) return NextResponse.json([]);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `
          Tactical Triage Officer Analysis.
          PROTOCOL: 
          1. Tier 1 (minutes): Fire, Drowning, Trauma.
          2. Tier 2 (hours): Food, Water, Shelter.
          Tier 1 overrides Tier 2 regardless of count.

          TICKETS: ${JSON.stringify(tickets)}
        ` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              sortedIds: {
                type: "ARRAY",
                items: { type: "STRING" }
              },
              rationale: {
                type: "OBJECT",
                additionalProperties: { type: "STRING" }
              }
            },
            required: ["sortedIds", "rationale"]
          }
        }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    // Gemini 2.5 Flash returns thinking tokens in earlier parts (thought: true).
    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) throw new Error("Empty response from prioritization engine");
    const textPart = parts.find((p: { thought?: boolean; text?: string }) => !p.thought && p.text);
    const responseText = textPart?.text;
    if (!responseText) throw new Error("No text response from prioritization engine");
    
    let result;
    try {
      result = JSON.parse(responseText.trim());
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else throw new Error("Failed to parse prioritization response as JSON");
    }

    const prioritizedTickets = result.sortedIds.map((id: string) => {
      const ticket = tickets.find((t: any) => t.id === id);
      if (ticket) return { ...ticket, tacticalReasoning: result.rationale[id] };
      return null;
    }).filter(Boolean);

    const missing = tickets.filter((t: any) => !result.sortedIds.includes(t.id));
    return NextResponse.json([...prioritizedTickets, ...missing]);
  } catch (error: any) {
    console.error("Prioritization Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
