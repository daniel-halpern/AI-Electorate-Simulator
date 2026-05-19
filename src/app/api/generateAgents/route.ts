import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { citizensListSchema } from "@/types/ideology";

export const maxDuration = 60; // seconds

export async function POST(req: Request) {
    try {
        const { count = 50, demographics = "" } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "Missing OPENAI_API_KEY environment variable. Local development: use mock data." },
                { status: 500 }
            );
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Generate in a single request
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.7, // Higher temp for better variance/blob shape
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "user",
                    content: `You are a sophisticated political science demographic model. Generate exactly ${count} distinct, highly realistic citizen personas for a governance simulation.

${demographics ? `CRITICAL CONTEXT - THE USER UPLOADED THIS DEMOGRAPHIC DATA:\n"""\n${demographics}\n"""\nYour generated electorate MUST accurately reflect these demographic statistics. Adjust the ages, genders, jobs, and ideological vectors to strictly map to the demographics provided above.` : 'Make sure to cover the absolute extremes of the political spectrum as well as the moderate center.'}

CRITICAL RULES FOR 6D IDEOLOGY VECTORS:
1. NATURAL VARIANCE (Avoid "Streaks"): Real humans are messy. Do not map everyone on a perfect straight line. Introduce heavy Gaussian noise and realistic contradictions (e.g. socially progressive but economically conservative, or vice versa). Scatter them into a natural "blob", not a flat line.
2. AXIS POLARITY WARNING: Read these mapping rules carefully or the simulation will fail:
   - Economic: -1.0 is Left/Socialist. +1.0 is Right/Capitalist.
   - Social: -1.0 is Progressive/Liberal. +1.0 is Conservative/Traditional. (College students must be heavily NEGATIVE).
   - Environmental: 0.0 is Exploitative. 1.0 is Conservationist.
   - Authority: 0.0 is Libertarian/Freedom. 1.0 is Authoritarian/Statist.
   - Collectivism: 0.0 is Individualist. 1.0 is Collectivist.
   - Risk: 0.0 is Risk Averse. 1.0 is Risk Tolerant.
3. NUMERICAL BOUNDS: Economic/Social must be strictly between -1.0 and 1.0. All others strictly between 0.0 and 1.0.

Return the response as JSON with this exact structure:
{
  "citizens": [
    {
      "id": "uuid-string",
      "name": "string",
      "age": number,
      "gender": "string",
      "job": "string",
      "worldview": "string",
      "ideology": {
        "economic": number,
        "social": number,
        "environmental": number,
        "authority_preference": number,
        "collectivism": number,
        "risk_tolerance": number
      }
    }
  ]
}`
                }
            ]
        });

        const resultText = response.choices[0].message.content;
        if (!resultText) {
            throw new Error("No text returned from OpenAI");
        }

        const rawData = JSON.parse(resultText);
        const validatedData = citizensListSchema.parse(rawData);

        // ALWAYS override the LLM's hallucinated IDs with true UUIDs to prevent React duplicate key crashes.
        const randomizedCitizens = validatedData.citizens.slice(0, count).map(c => ({
            ...c,
            id: crypto.randomUUID()
        }));

        return NextResponse.json({ citizens: randomizedCitizens });

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
