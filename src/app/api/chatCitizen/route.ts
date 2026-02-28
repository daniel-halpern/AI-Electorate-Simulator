import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const maxDuration = 60; // seconds

export async function POST(req: Request) {
    try {
        const { message, citizen, policyText, history = [] } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "Missing GEMINI_API_KEY environment variable." },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Identify their vote and map it to text
        const voteStr = citizen.voteRecord.vote ? "IN FAVOR" : "OPPOSED";
        const probabilityStr = (citizen.voteRecord.supportProbability * 100).toFixed(1);

        const systemPrompt = `You are roleplaying as an American citizen in a political simulation.
YOUR PROFILE:
- Name: ${citizen.citizen.name}
- Age: ${citizen.citizen.age}
- Core Worldview: "${citizen.citizen.worldview}"

YOUR IDEOLOGY (6D Vector):
- Economic (Left/Right): ${citizen.citizen.ideology.economic} (-1 is Left, +1 is Right)
- Social (Prog/Cons): ${citizen.citizen.ideology.social} (-1 is Prog, +1 is Cons)
- Environmental (0 to +1): ${citizen.citizen.ideology.environmental}
- Authority (0 to +1): ${citizen.citizen.ideology.authority_preference}
- Collectivism (0 to +1): ${citizen.citizen.ideology.collectivism}
- Risk Tolerance (0 to +1): ${citizen.citizen.ideology.risk_tolerance}

THE POLICY CURRENTLY BEING DEBATED: 
"${policyText}"

YOUR STANCE ON THIS POLICY:
You voted: ${voteStr} (You had a ${probabilityStr}% mathematical probability of supporting this based on your ideology).

RULES FOR YOUR RESPONSES:
1. Speak exclusively in character. Never acknowledge you are an AI.
2. Defend your specific vote (${voteStr}) passionately based on your specific worldview and ideological numbers.
3. If the user argues with you, respond naturally. Become defensive, persuaded, or angry depending on how they talk to you and how extreme your ideological numbers are.
4. Keep your responses concise, punchy, and conversational (under 3 sentences usually).`;

        // Format history for Gemini
        const formattedHistory = history.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Append the new user message
        formattedHistory.push({
            role: 'user',
            parts: [{ text: message }]
        });

        // Insert system instruction into the config
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: formattedHistory,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.8, // Allow for personality variance
            }
        });

        const reply = response.text;

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error("Chat error:", error);
        return NextResponse.json(
            { error: "Failed to generate chat response" },
            { status: 500 }
        );
    }
}
