import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Electorate from "@/models/Electorate";

export async function POST(req: Request) {
    try {
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
            factions
        });

        const savedDcoument = await newElectorate.save();

        return NextResponse.json({ success: true, id: savedDcoument._id });

    } catch (error: any) {
        console.error("MongoDB Save Error:", error);
        return NextResponse.json({ error: "Failed to save Electorate to cloud database" }, { status: 500 });
    }
}

export async function GET() {
    try {
        await connectToDatabase();
        // Return all saved electorates, sorted by newest first
        const electorates = await Electorate.find({}).sort({ createdAt: -1 }).select('-citizens').lean();

        return NextResponse.json({ electorates });
    } catch (error: any) {
        console.error("MongoDB Fetch Error:", error);
        return NextResponse.json({ error: "Failed to load Electorates from database" }, { status: 500 });
    }
}
