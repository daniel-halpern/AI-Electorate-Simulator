import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextResponse } from "next/server";
import { ideologyVectorSchema } from "@/types/ideology";

// For Vercel Edge Serverless functions (crucial for longer timeouts in free tiers)
export const maxDuration = 60; // seconds

export async function POST(req: Request) {
    try {
        const { policyText } = await req.json();

        if (!policyText) {
            return NextResponse.json(
                { error: "Must provide policyText" },
                { status: 400 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "Missing GEMINI_API_KEY environment variable. Local development: use mock data." },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Ensure Gemini returns EXACTLY the 6D vector structure
        const vectorSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                economic: {
                    type: Type.NUMBER,
                    description: "Float from -1 (Left/Socialist/Regulated) to 1 (Right/Capitalist/Free-Market)"
                },
                social: {
                    type: Type.NUMBER,
                    description: "Float from -1 (Progressive/Egalitarian) to 1 (Conservative/Traditionalist)"
                },
                environmental: {
                    type: Type.NUMBER,
                    description: "Float from 0 (Exploitative/Industrial) to 1 (Conservationist/Eco-friendly)"
                },
                authority_preference: {
                    type: Type.NUMBER,
                    description: "Float from 0 (Libertarian/Anarchic/Decentralized) to 1 (Authoritarian/Statist/Centralized)"
                },
                collectivism: {
                    type: Type.NUMBER,
                    description: "Float from 0 (Individualist/Self-reliance) to 1 (Collectivist/Community-focused)"
                },
                risk_tolerance: {
                    type: Type.NUMBER,
                    description: "Float from 0 (Risk Averse/Precautionary) to 1 (Risk Tolerant/Techno-optimist)"
                }
            },
            required: [
                "economic",
                "social",
                "environmental",
                "authority_preference",
                "collectivism",
                "risk_tolerance"
            ]
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a sophisticated political science simulation engine. Read the following policy proposal and map it exactly into the specified 6-dimensional ideological vector space.
      
      Policy Proposal: "${policyText}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: vectorSchema,
                temperature: 0.1, // Low temperature for consistent deterministic scoring
            }
        });

        const resultText = response.text;
        if (!resultText) {
            throw new Error("No text returned from Gemini");
        }

        // Parse the JSON. We use Zod to validate the structured output
        const rawVector = JSON.parse(resultText);
        const validatedVector = ideologyVectorSchema.parse(rawVector);

        return NextResponse.json({ vector: validatedVector });

    } catch (error: any) {
        console.error("Vectorization error:", error);

        // Handle Gemini 429 Too Many Requests
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded")) {
            return NextResponse.json(
                { error: "Google Gemini free tier limit reached! Please wait 60 seconds before running another simulation." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: "Failed to vectorize policy" },
            { status: 500 }
        );
    }
}
