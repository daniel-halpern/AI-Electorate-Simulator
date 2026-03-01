"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, Database } from "lucide-react";

const T = {
    bg: '#1a1a1a',
    surface: '#2a2a2a',
    text: '#e5e5e5',
    accent: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
};

export default function GlobalStats() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/snowflake/stats")
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: "100vh", backgroundColor: T.bg, color: T.text, fontFamily: "'IBM Plex Mono', monospace" }}>
                <Database size={48} color={T.accent} style={{ animation: 'pulse 2s infinite', marginBottom: 20 }} />
                <div style={{ fontSize: 18 }}>Querying Snowflake Data Warehouse...</div>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; text-shadow: 0 0 10px ${T.accent}; } 50% { opacity: .5; text-shadow: none; } }`}</style>
            </div>
        );
    }

    const pieData = [
        { name: "Passed", value: Number(stats?.passed) || 0 },
        { name: "Failed", value: Number(stats?.failed) || 0 },
    ];

    return (
        <div style={{ minHeight: "100vh", backgroundColor: T.bg, color: T.text, padding: "40px 20px", fontFamily: "'IBM Plex Mono', monospace" }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>

                <a href="/" style={{ color: T.accent, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 40, fontSize: 14 }}>
                    <ArrowLeft size={16} /> Back to Simulator
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                    <Database size={32} color={T.accent} />
                    <h1 style={{ fontSize: 28, margin: 0 }}>Global Macro-Analytics</h1>
                </div>
                <p style={{ color: "#888", marginBottom: 32 }}>Real-time telemetry powered by Snowflake Data Warehouse</p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 40 }}>
                    <div style={{ background: T.surface, padding: 24, borderRadius: 8, border: `1px solid #333` }}>
                        <div style={{ color: "#888", fontSize: 12, letterSpacing: '0.05em', marginBottom: 8 }}>TOTAL SIMULATIONS RUN</div>
                        <div style={{ fontSize: 42, fontWeight: "bold", color: T.accent }}>{stats?.totalSimulations || 0}</div>
                    </div>
                    <div style={{ background: T.surface, padding: 24, borderRadius: 8, border: `1px solid #333` }}>
                        <div style={{ color: "#888", fontSize: 12, letterSpacing: '0.05em', marginBottom: 8 }}>GLOBAL AVG TURNOUT</div>
                        <div style={{ fontSize: 42, fontWeight: "bold" }}>{stats?.avgTurnout ? Number(stats.avgTurnout).toFixed(1) : 0}%</div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 300, background: T.surface, padding: 24, borderRadius: 8, border: `1px solid #333` }}>
                        <h3 style={{ marginBottom: 20, fontSize: 16, borderBottom: '1px solid #444', paddingBottom: 10 }}>Policy Pass Rate</h3>
                        <div style={{ width: "100%", height: 250 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                                        <Cell fill={T.green} />
                                        <Cell fill={T.red} />
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: T.bg, border: '1px solid #444', borderRadius: 4 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ flex: 2, minWidth: 400, background: T.surface, padding: 24, borderRadius: 8, border: `1px solid #333` }}>
                        <h3 style={{ marginBottom: 20, fontSize: 16, borderBottom: '1px solid #444', paddingBottom: 10 }}>Recent Global Proposals</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 250, overflowY: 'auto', paddingRight: 10 }}>
                            {stats?.recentPolicies?.map((p: any, i: number) => (
                                <div key={i} style={{ padding: 12, background: T.bg, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${p.AYES > p.NAYS ? T.green : T.red}` }}>
                                    <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 20, fontSize: 13 }} title={p.POLICY_TEXT}>
                                        {p.POLICY_TEXT}
                                    </div>
                                    <div style={{ color: p.AYES > p.NAYS ? T.green : T.red, fontWeight: "bold", fontSize: 13 }}>
                                        {p.AYES > p.NAYS ? "PASSED" : "FAILED"}
                                    </div>
                                </div>
                            ))}
                            {(!stats?.recentPolicies || stats.recentPolicies.length === 0) && (
                                <div style={{ color: "#888", fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                                    No simulations have been run yet. Go simulate some policies to populate the data warehouse!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
