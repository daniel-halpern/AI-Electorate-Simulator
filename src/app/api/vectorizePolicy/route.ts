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

        // Ensure Gemini returns EXACTLY the 6D vector structure PLUS a universal appeal score
        const geminiOutputSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                universal_appeal: {
                    type: Type.NUMBER,
                    description: "Float from -1.0 to 1.0. Represents the non-ideological base appeal of the proposal. Normal debatable political issues should be 0.0. Universally loved/beneficial concepts (e.g. 'save all puppies') should be up to 1.0. Universally hated, horrific, or absurd troll concepts (e.g. 'kill everyone', 'make me king') should be down to -1.0."
                },
                vector: {
                    type: Type.OBJECT,
                    description: "The 6-dimensional ideological vector mapping of the policy.",
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
                }
            },
            required: [
                "universal_appeal",
                "vector"
            ]
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a sophisticated political science simulation engine. 
First, evaluate if the following policy proposal is a valid, debatable political concept, or if it is purely trolling, spam, physically impossible, or overtly unconstitutional/illegal nonsense (like "nuke the moon" or "make the president a dictator").
If it is invalid, set 'isValid' to false, populate 'rejectionReason', and fill the vectors with 0. 
If it is valid, set 'isValid' to true, leave 'rejectionReason' empty, and map it exactly into the specified 6-dimensional ideological vector space.
      
      Policy Proposal: "${policyText}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: geminiOutputSchema,
                temperature: 0.1, // Low temperature for consistent deterministic scoring
            }
        });

        const resultText = response.text;
        if (!resultText) {
            throw new Error("No text returned from Gemini");
        }

        // Parse the JSON. We use Zod to validate the structured output
        const rawOutput = JSON.parse(resultText);
        const validatedVector = ideologyVectorSchema.parse(rawOutput.vector);

        // Default to 0.0 (normal ideological voting) if missing
        const universal_appeal = rawOutput.universal_appeal ?? 0.0;

        return NextResponse.json({ vector: validatedVector, universal_appeal });

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
