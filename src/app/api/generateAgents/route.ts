import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextResponse } from "next/server";
import { citizensListSchema } from "@/types/ideology";

export const maxDuration = 60; // seconds

export async function POST(req: Request) {
    try {
        const { count = 50, demographics = "" } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "Missing GEMINI_API_KEY environment variable. Local development: use mock data." },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Ensure Gemini returns EXACTLY the Citizen array structure
        const citizenListGenSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                citizens: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            age: { type: Type.NUMBER },
                            worldview: {
                                type: Type.STRING,
                                description: "A short, one-sentence narrative explaining their core beliefs."
                            },
                            ideology: {
                                type: Type.OBJECT,
                                properties: {
                                    economic: { type: Type.NUMBER },
                                    social: { type: Type.NUMBER },
                                    environmental: { type: Type.NUMBER },
                                    authority_preference: { type: Type.NUMBER },
                                    collectivism: { type: Type.NUMBER },
                                    risk_tolerance: { type: Type.NUMBER }
                                },
                                required: ["economic", "social", "environmental", "authority_preference", "collectivism", "risk_tolerance"]
                            }
                        },
                        required: ["id", "name", "age", "worldview", "ideology"]
                    }
                }
            },
            required: ["citizens"]
        };

        // Generate in a single request to avoid 429 Too Many Requests on Free Tier
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are generating exactly ${count} distinctly diverse citizens for a governance simulation.
${demographics ? `CRITICAL CONTEXT: The generated citizens MUST accurately reflect the following real-world demographic data or profile: "${demographics}". Their ideological vectors, age, and worldviews should be heavily weighted to match this specific demographic breakdown.` : 'Make sure to cover the absolute extremes of the political spectrum as well as the moderate center.'}
CRITICAL: All numerical values MUST strictly adhere to their specified ranges.
- economic, social: precisely between -1.0 and 1.0
- environmental, authority_preference, collectivism, risk_tolerance: precisely between 0.0 and 1.0
Do not exceed these bounds even slightly (e.g., no 1.01).`,
            config: {
                responseMimeType: "application/json",
                responseSchema: citizenListGenSchema,
                temperature: 0.4,
            }
        });

        const resultText = response.text;
        if (!resultText) {
            throw new Error("No text returned from Gemini");
        }

        const rawData = JSON.parse(resultText);
        const validatedData = citizensListSchema.parse(rawData);

        // Return exactly the requested count
        return NextResponse.json({ citizens: validatedData.citizens.slice(0, count) });

    } catch (error: any) {
        console.error("Agent generation error:", error);

        // Handle Gemini 429 Too Many Requests
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded")) {
            return NextResponse.json(
                { error: "Google Gemini free tier limit reached! Please wait 60 seconds before generating more agents." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate agents" },
            { status: 500 }
        );
    }
}
