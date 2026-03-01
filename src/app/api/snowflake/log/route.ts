import { NextResponse } from "next/server";
import { initSnowflakeDatabase, executeSnowflakeQuery } from "@/lib/snowflake";

let isInitialized = false;

export async function POST(req: Request) {
    try {
        if (!isInitialized) {
            await initSnowflakeDatabase();
            isInitialized = true;
        }

        const body = await req.json();
        const { policyText, ayes, nays, abstains, turnoutPercentage } = body;

        await executeSnowflakeQuery(
            `INSERT INTO SIMULATION_LOGS (POLICY_TEXT, AYES, NAYS, ABSTAINS, TURNOUT_PERCENTAGE) VALUES (?, ?, ?, ?, ?)`,
            [policyText, ayes, nays, abstains, turnoutPercentage]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Snowflake Log Error:", error);
        return NextResponse.json({ error: error.message || "Failed to log simulation" }, { status: 500 });
    }
}
