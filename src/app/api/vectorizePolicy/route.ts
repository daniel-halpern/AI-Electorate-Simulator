import { OpenAI } from "openai";
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

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "Missing OPENAI_API_KEY environment variable. Local development: use mock data." },
                { status: 500 }
            );
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.1, // Low temperature for consistent deterministic scoring
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "user",
                    content: `You are a sophisticated political science simulation engine. 
First, evaluate if the following proposal is a valid political concept, election, historical hypothetical, or public figure. Treat elections or public figures as valid proposals representing their political platforms. Only reject if it is purely trolling, spam, or absolute nonsense (like "nuke the moon" or "make a dog the president").
If it is invalid, set 'isValid' to false, populate 'rejectionReason', set 'universal_appeal' to an appropriate score (-1.0 for universally hated things like killing everyone, 1.0 for universally loved things like not killing everyone or saving puppies), and fill the vectors with 0. 
If it is valid, set 'isValid' to true, leave 'rejectionReason' empty, evaluate 'universal_appeal', and map it exactly into the specified 6-dimensional ideological vector space.
      
Policy Proposal: "${policyText}"

Return JSON with this exact structure:
{
  "isValid": boolean,
  "rejectionReason": "string or empty if valid",
  "universal_appeal": number (float from -1.0 to 1.0),
  "vector": {
    "economic": number (float from -1 to 1, where -1 is Left/Socialist/Regulated and 1 is Right/Capitalist/Free-Market),
    "social": number (float from -1 to 1, where -1 is Progressive/Egalitarian and 1 is Conservative/Traditionalist),
    "environmental": number (float from 0 to 1, where 0 is Exploitative/Industrial and 1 is Conservationist/Eco-friendly),
    "authority_preference": number (float from 0 to 1, where 0 is Libertarian/Anarchic/Decentralized and 1 is Authoritarian/Statist/Centralized),
    "collectivism": number (float from 0 to 1, where 0 is Individualist/Self-reliance and 1 is Collectivist/Community-focused),
    "risk_tolerance": number (float from 0 to 1, where 0 is Risk Averse/Precautionary and 1 is Risk Tolerant/Techno-optimist)
  }
}`
                }
            ]
        });

        const resultText = response.choices[0].message.content;
        if (!resultText) {
            throw new Error("No text returned from OpenAI");
        }

        // Parse the JSON. We use Zod to validate the structured output
        const rawOutput = JSON.parse(resultText);
        
        let universal_appeal = rawOutput.universal_appeal ?? 0.0;

        const validatedVector = ideologyVectorSchema.parse(rawOutput.vector);

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
