import { NextResponse } from "next/server";
import { kmeans } from "ml-kmeans";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Citizen } from "@/types/ideology";

export const maxDuration = 60; // seconds

export async function POST(req: Request) {
    try {
        const { citizens } = await req.json();

        if (!citizens || citizens.length === 0) {
            return NextResponse.json({ error: "Electorate cannot be empty" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
        }

        // 1. Prepare data for K-Means (Extract the 6D Vectors)
        const data = citizens.map((c: Citizen) => [
            c.ideology.economic,
            c.ideology.social,
            c.ideology.environmental,
            c.ideology.authority_preference,
            c.ideology.collectivism,
            c.ideology.risk_tolerance
        ]);

        // 2. Run K-Means Clustering
        // We will dynamically pick K based on the population size (max 5 factions)
        const k = Math.min(5, Math.max(2, Math.floor(citizens.length / 10)));
        const result = kmeans(data, k, { initialization: "kmeans++" });

        // Calculate the centroids (the average math vector of each faction)
        const centroids = result.centroids;

        // Map each citizen ID to their assigned faction cluster index (0 to k-1)
        const clusteringAssignments = citizens.map((c: any, idx: number) => ({
            citizenId: c.id,
            clusterIndex: result.clusters[idx]
        }));

        // 3. Send the raw Centroid Math to AI to invent real Political Faction Names
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const factionListSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                factions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            clusterIndex: { type: Type.NUMBER },
                            name: { type: Type.STRING },
                            description: { type: Type.STRING, description: "A 1-sentence description of what this political faction believes based on their ideological center." }
                        },
                        required: ["clusterIndex", "name", "description"]
                    }
                }
            },
            required: ["factions"]
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an expert political analyst. I have run a K-Means clustering algorithm on a simulated electorate across a 6D ideological space.
Here is the mathematical center (centroid) for each of the ${k} discovered factions:
${centroids.map((centroid, i) => `
Faction ${i}:
- Economic (-1 Left to 1 Right): ${centroid[0].toFixed(2)}
- Social (-1 Prog to 1 Cons): ${centroid[1].toFixed(2)}
- Environmental (0 Exploit to 1 Conserve): ${centroid[2].toFixed(2)}
- Authority (0 Liberty to 1 Statist): ${centroid[3].toFixed(2)}
- Collectivism (0 Indiv to 1 Collect): ${centroid[4].toFixed(2)}
- Risk Tolerance (0 Averse to 1 Tolerant): ${centroid[5].toFixed(2)}
`).join("\n")}

Invent a realistic, immersive political party name and description for each mathematical centroid. Ensure the clusterIndex matches the Faction number.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: factionListSchema,
                temperature: 0.7,
            }
        });

        const resultText = response.text;
        if (!resultText) throw new Error("Gemini returned empty text for factions");

        const factionData = JSON.parse(resultText);

        return NextResponse.json({
            assignments: clusteringAssignments,
            factions: factionData.factions
        });

    } catch (error: any) {
        console.error("Clustering error:", error);
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded")) {
            return NextResponse.json({ error: "Gemini Free Tier limit reached. Wait 60s." }, { status: 429 });
        }
        return NextResponse.json({ error: "Failed to cluster electorate" }, { status: 500 });
    }
}
