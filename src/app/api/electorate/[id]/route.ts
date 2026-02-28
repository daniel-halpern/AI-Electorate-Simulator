import { NextResponse } from "next/server";
import { auth0 } from '@/lib/auth0';
import connectToDatabase from "@/lib/db/mongodb";
import Electorate from "@/models/Electorate";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth0.getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const { id } = await params;

        const electorate = await Electorate.findById(id).lean();

        if (!electorate) {
            return NextResponse.json({ error: "Electorate not found in database" }, { status: 404 });
        }

        // Strict ownership check
        if (electorate.userId !== session.user.sub) {
            return NextResponse.json({ error: "Forbidden: You do not have access to this Electorate" }, { status: 403 });
        }

        return NextResponse.json({ electorate });
    } catch (error: any) {
        console.error("MongoDB Fetch Error:", error);
        return NextResponse.json({ error: "Failed to load Electorate details" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth0.getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const { id } = await params;

        // Ensure we only delete if the ID matches AND the owner matches the session user
        const deletedElectorate = await Electorate.findOneAndDelete({ _id: id, userId: session.user.sub });

        if (!deletedElectorate) {
            return NextResponse.json({ error: "Electorate not found or you do not have permission to delete it" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Electorate deleted successfully" });
    } catch (error: any) {
        console.error("MongoDB Delete Error:", error);
        return NextResponse.json({ error: "Failed to delete Electorate" }, { status: 500 });
    }
}
