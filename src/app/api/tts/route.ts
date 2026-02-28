import { NextResponse } from "next/server";

export const maxDuration = 60; // seconds

export async function POST(req: Request) {
    try {
        const { text, voiceId = "EXAVITQu4vr4xnSDxMaL" } = await req.json(); // Default to 'Bella' or similar ID

        if (!process.env.ELEVENLABS_API_KEY) {
            return NextResponse.json(
                { error: "Missing ELEVENLABS_API_KEY environment variable. Text-to-speech is disabled." },
                { status: 500 }
            );
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail?.message || "Failed to fetch from ElevenLabs");
        }

        // Return the binary audio stream
        const arrayBuffer = await response.arrayBuffer();

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': arrayBuffer.byteLength.toString(),
            },
        });

    } catch (error: any) {
        console.error("ElevenLabs TTS Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate audio" },
            { status: 500 }
        );
    }
}
