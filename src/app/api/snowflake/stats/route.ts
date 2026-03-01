import { NextResponse } from "next/server";
import { executeSnowflakeQuery } from "@/lib/snowflake";

export async function GET() {
    try {
        const totalSimulationsQuery = await executeSnowflakeQuery(`SELECT COUNT(*) as TOTAL FROM SIMULATION_LOGS`);

        const winLossQuery = await executeSnowflakeQuery(`
            SELECT 
                SUM(CASE WHEN AYES > NAYS THEN 1 ELSE 0 END) as PASSED,
                SUM(CASE WHEN AYES <= NAYS THEN 1 ELSE 0 END) as FAILED
            FROM SIMULATION_LOGS
        `);

        const avgTurnoutQuery = await executeSnowflakeQuery(`
            SELECT AVG(TURNOUT_PERCENTAGE) as AVG_TURNOUT
            FROM SIMULATION_LOGS
            WHERE TURNOUT_PERCENTAGE IS NOT NULL
        `);

        const recentPoliciesQuery = await executeSnowflakeQuery(`
            SELECT POLICY_TEXT, AYES, NAYS, TURNOUT_PERCENTAGE, TIMESTAMP
            FROM SIMULATION_LOGS
            ORDER BY TIMESTAMP DESC
            LIMIT 10
        `);

        return NextResponse.json({
            totalSimulations: totalSimulationsQuery[0]?.TOTAL || 0,
            passed: winLossQuery[0]?.PASSED || 0,
            failed: winLossQuery[0]?.FAILED || 0,
            avgTurnout: avgTurnoutQuery[0]?.AVG_TURNOUT || 0,
            recentPolicies: recentPoliciesQuery || []
        });

    } catch (error: any) {
        console.error("Snowflake Stats Error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch stats" }, { status: 500 });
    }
}
