"use client";

import { useMemo } from "react";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import { SimulationResult, Citizen } from "@/types/ideology";


interface Props {
    citizens: Citizen[];
    result?: SimulationResult;
}

export default function IdeologyScatter({ citizens, result }: Props) {
    // Map our 6D space to 2D. 
    // For a fast hackathon MVP without bringing in complex matrix math libraries, 
    // we can map the 2 most polarizing axes (Economic and Social) directly as proxies for PCA components,
    // OR we can do a quick weighted sum mapping.
    // We'll map X = Economic, Y = Social for the raw un-simulated view to give the user immediate visual grounding.

    const data = useMemo(() => {
        return citizens.map(c => {
            // Find what this citizen voted if a simulation has run
            const voteRecord = result?.votes.find(v => v.citizenId === c.id);

            // We are plotting Economic (-1 left to 1 right) on X axis
            // We are plotting Social (-1 prog to 1 cons) on Y axis
            return {
                id: c.id,
                name: c.name,
                x: c.ideology.economic,
                y: c.ideology.social,
                vote: voteRecord?.vote,
                prob: voteRecord?.supportProbability,
                z: 100 // size of the dot
            };
        });
    }, [citizens, result]);

    // Colors
    const SUPPORT_COLOR = "#10b981"; // Emerald 500
    const OPPOSE_COLOR = "#ef4444"; // Red 500
    const NEUTRAL_COLOR = "#64748b"; // Slate 500

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-sm">
                    <p className="font-bold text-white">{data.name}</p>
                    <div className="flex justify-between items-center mt-2 gap-4">
                        <span className="text-slate-400">Economic:</span>
                        <span className="text-white font-mono">{data.x.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-400">Social:</span>
                        <span className="text-white font-mono">{data.y.toFixed(2)}</span>
                    </div>

                    {data.vote !== undefined && (
                        <div className="mt-2 pt-2 border-t border-slate-700">
                            <div className="flex justify-between items-center font-bold">
                                <span className="text-slate-400 font-normal">Vote:</span>
                                <span className={data.vote ? "text-emerald-400" : "text-red-400"}>
                                    {data.vote ? "SUPPORT" : "OPPOSE"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs mt-1">
                                <span className="text-slate-500">Probability:</span>
                                <span className="text-slate-300">{(data.prob * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full bg-slate-950/50 rounded-xl border border-slate-800 p-4 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-4 left-4 text-xs text-slate-500 font-medium tracking-widest uppercase">
                Ideological Space (Eco/Soc)
            </div>

            {/* Quadrant labels for aesthetic flavor */}
            <div className="absolute top-4 right-8 text-[10px] text-slate-600 font-bold uppercase rotate-90 origin-right">Right / Capitalist →</div>
            <div className="absolute bottom-4 left-8 text-[10px] text-slate-600 font-bold uppercase tracking-widest">← Progressive / Left</div>

            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis
                        type="number"
                        dataKey="x"
                        name="Economic"
                        domain={[-1.1, 1.1]}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#475569' }}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        name="Social"
                        domain={[-1.1, 1.1]}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#475569' }}
                    />
                    <ZAxis type="number" dataKey="z" range={[40, 40]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1', strokeWidth: 1 }} />
                    <Scatter name="Electorate" data={data} fill="#8884d8" shape="circle">
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.vote === undefined ? NEUTRAL_COLOR : entry.vote ? SUPPORT_COLOR : OPPOSE_COLOR}
                                style={{
                                    transition: 'fill 0.5s ease-in-out',
                                    opacity: entry.vote === undefined ? 0.6 : 0.9,
                                    filter: entry.vote !== undefined ? 'drop-shadow(0px 0px 4px rgba(255,255,255,0.2))' : 'none'
                                }}
                            />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
