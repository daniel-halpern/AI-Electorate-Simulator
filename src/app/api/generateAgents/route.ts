import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextResponse } from "next/server";
import { citizensListSchema } from "@/types/ideology";

export const maxDuration = 60; // seconds

export async function POST(req: Request) {
    try {
        const { count = 50 } = await req.json();

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

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are generating the initial population for a governance simulation. Generating exactly ${count} distinctly diverse citizens. Make sure to cover the absolute extremes of the political spectrum as well as the moderate center. Generate unique UUIDs for 'id'.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: citizenListGenSchema,
                temperature: 0.9, // High temp to ensure high variance in the generated population
            }
        });

        const resultText = response.text;
        if (!resultText) {
            throw new Error("No text returned from Gemini");
        }

        const rawData = JSON.parse(resultText);
        const validatedData = citizensListSchema.parse(rawData);

        return NextResponse.json({ citizens: validatedData.citizens });

    } catch (error) {
        console.error("Agent generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate agents" },
            { status: 500 }
        );
    }
}
