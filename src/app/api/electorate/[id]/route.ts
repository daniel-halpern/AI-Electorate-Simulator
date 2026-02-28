import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Electorate from "@/models/Electorate";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const electorate = await Electorate.findById(id).lean();

        if (!electorate) {
            return NextResponse.json({ error: "Electorate not found in database" }, { status: 404 });
        }

        return NextResponse.json({ electorate });
    } catch (error: any) {
        console.error("MongoDB Fetch Error:", error);
        return NextResponse.json({ error: "Failed to load Electorate details" }, { status: 500 });
    }
}
