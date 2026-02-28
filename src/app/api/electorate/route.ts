import { NextResponse } from "next/server";
import { auth0 } from '@/lib/auth0';
import connectToDatabase from "@/lib/db/mongodb";
import Electorate from "@/models/Electorate";

export async function POST(req: Request) {
    try {
        const session = await auth0.getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, description, citizens, factions } = await req.json();

        if (!name || !citizens || citizens.length === 0) {
            return NextResponse.json({ error: "Missing required fields or empty electorate" }, { status: 400 });
        }

        await connectToDatabase();

        const newElectorate = new Electorate({
            name,
            description,
            size: citizens.length,
            citizens,
            factions,
            userId: session.user.sub // Link to Auth0 profile ID
        });

        const savedDcoument = await newElectorate.save();

        return NextResponse.json({ success: true, id: savedDcoument._id });

    } catch (error: any) {
        console.error("MongoDB Save Error:", error);
        return NextResponse.json({ error: "Failed to save Electorate to cloud database", details: error.message, stack: error.stack }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth0.getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        // Return only the saved electorates owned by this authenticated user
        const electorates = await Electorate.find({ userId: session.user.sub }).sort({ createdAt: -1 }).select('-citizens').lean();

        return NextResponse.json({ electorates });
    } catch (error: any) {
        console.error("MongoDB Fetch Error:", error);
        return NextResponse.json({ error: "Failed to load Electorates from database", details: error.message, stack: error.stack }, { status: 500 });
    }
}
