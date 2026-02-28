"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { SimulationResult, Citizen } from "@/types/ideology";

interface Props {
    citizens: Citizen[];
    result?: SimulationResult;
    clusterAssignments?: { citizenId: string, clusterIndex: number }[];
    onNodeClick?: (citizenData: any) => void;
}

// Colors
const SUPPORT_COLOR = new THREE.Color("#10b981"); // Emerald 500
const OPPOSE_COLOR = new THREE.Color("#ef4444"); // Red 500
const NEUTRAL_COLOR = new THREE.Color("#64748b"); // Slate 500

function Scene({ citizens, result, setHoveredCitizen, isPaused, clusterAssignments, viewMode, onNodeClick }: { citizens: Citizen[], result?: SimulationResult, setHoveredCitizen: (c: any) => void, isPaused: boolean, clusterAssignments?: { citizenId: string, clusterIndex: number }[], viewMode: 'vote' | 'faction', onNodeClick?: (c: any) => void }) {
    const groupRef = useRef<THREE.Group>(null);

    // Slowly rotate the entire scatter plot for a premium dynamic feel
    useFrame((state, delta) => {
        if (groupRef.current && !isPaused) {
            groupRef.current.rotation.y += delta * 0.1;
        }
    });

    const data = useMemo(() => {
        return citizens.map((c, i) => {
            const voteRecord = result?.votes.find(v => v.citizenId === c.id);
            // Map axes: X = Economic, Y = Social, Z = Authority
            // Scale up by 5 for a wider visual distribution
            const SCALE = 5;
            const position = new THREE.Vector3(
                c.ideology.economic * SCALE,
                c.ideology.social * SCALE,
                (c.ideology.authority_preference * 2 - 1) * SCALE // map 0-1 to -1 to 1
            );

            // Default Color
            let color = NEUTRAL_COLOR;

            if (viewMode === 'faction' && clusterAssignments && clusterAssignments.length > 0) {
                // Faction Colors
                const myFaction = clusterAssignments.find(a => a.citizenId === c.id);
                if (myFaction !== undefined) {
                    const FACTION_COLORS = ["#a855f7", "#f59e0b", "#ec4899", "#06b6d4", "#84cc16"]; // purple, amber, pink, cyan, lime
                    color = new THREE.Color(FACTION_COLORS[myFaction.clusterIndex % FACTION_COLORS.length]);
                }
            } else if (viewMode === 'vote' && voteRecord) {
                // Vote Record Colors
                if (!voteRecord.didVote) {
                    color = NEUTRAL_COLOR;
                } else {
                    color = voteRecord.vote ? SUPPORT_COLOR : OPPOSE_COLOR;
                }
            }

            return {
                id: c.id,
                position,
                color,
                citizen: c,
                voteRecord
            };
        });
    }, [citizens, result, clusterAssignments, viewMode]);

    return (
        <group ref={groupRef}>
            {/* Draw Axes Limits */}
            <axesHelper args={[6]} />

            {/* Render all nodes */}
            {data.map((node) => (
                <mesh
                    key={node.id}
                    position={node.position}
                    onPointerOver={(e) => { e.stopPropagation(); setHoveredCitizen(node); document.body.style.cursor = 'pointer'; }}
                    onPointerOut={() => { setHoveredCitizen(null); document.body.style.cursor = 'auto'; }}
                    onPointerUp={(e) => { e.stopPropagation(); if (onNodeClick) onNodeClick(node); }}
                >
                    <sphereGeometry args={[0.2, 16, 16]} />
                    <meshStandardMaterial
                        color={node.color}
                        emissive={node.color}
                        emissiveIntensity={0.5}
                        roughness={0.2}
                        metalness={0.8}
                    />
                </mesh>
            ))}

            {/* Axis Labels */}
            <Text position={[6.5, 0, 0]} fontSize={0.3} color="#94a3b8" anchorX="left">Economic (Right)</Text>
            <Text position={[-6.5, 0, 0]} fontSize={0.3} color="#94a3b8" anchorX="right">Economic (Left)</Text>
            <Text position={[0, 6.5, 0]} fontSize={0.3} color="#94a3b8" anchorY="bottom">Social (Cons)</Text>
            <Text position={[0, -6.5, 0]} fontSize={0.3} color="#94a3b8" anchorY="top">Social (Prog)</Text>
            <Text position={[0, 0, 6.5]} fontSize={0.3} color="#94a3b8" anchorX="center">Authority (Statist)</Text>
            <Text position={[0, 0, -6.5]} fontSize={0.3} color="#94a3b8" anchorX="center">Authority (Liberty)</Text>
        </group>
    );
}

export default function IdeologyScatter({ citizens, result, clusterAssignments, onNodeClick }: Props) {
    const [hoveredNode, setHoveredNode] = useState<any>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [preferredView, setPreferredView] = useState<'vote' | 'faction'>('faction');

    const hasVotes = !!result;
    const hasFactions = clusterAssignments && clusterAssignments.length > 0;

    let viewMode: 'vote' | 'faction' = 'vote';
    if (hasFactions && hasVotes) {
        viewMode = preferredView;
    } else if (hasFactions) {
        viewMode = 'faction';
    } else {
        viewMode = 'vote';
    }

    return (
        <div className="w-full h-full bg-slate-950/50 rounded-xl border border-slate-800 relative overflow-hidden backdrop-blur-sm shadow-2xl">
            <div className="absolute top-4 left-4 text-xs text-slate-500 font-medium tracking-widest uppercase z-10">
                3D Ideological Space
                <div className="text-[10px] lowercase text-slate-600 mt-1">Left click to rotate. Scroll to zoom.</div>
            </div>

            {hasVotes && hasFactions && (
                <button
                    onClick={() => setPreferredView(v => v === 'vote' ? 'faction' : 'vote')}
                    className="absolute bottom-4 left-4 z-20 px-3 py-1.5 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg text-xs font-bold tracking-widest text-emerald-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shadow-lg"
                >
                    SWITCH TO {preferredView === 'vote' ? 'FACTION' : 'VOTE'} VIEW
                </button>
            )}

            <button
                onClick={() => setIsPaused(!isPaused)}
                className="absolute bottom-4 right-4 z-20 px-3 py-1.5 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg text-xs font-bold tracking-widest text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
                {isPaused ? "▶ PLAY ROTATION" : "⏸ PAUSE ROTATION"}
            </button>

            {/* Custom UI Tooltip overlaying the canvas */}
            {hoveredNode && (
                <div
                    className="absolute top-4 right-4 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl text-sm z-20 w-72 pointer-events-none transition-opacity"
                >
                    <p className="font-bold text-white mb-1">
                        {hoveredNode.citizen.name} <span className="text-slate-500 font-normal text-xs ml-2">({hoveredNode.citizen.age}, {hoveredNode.citizen.gender})</span>
                    </p>
                    <p className="text-xs text-slate-400 mb-3 italic">
                        {hoveredNode.citizen.job || "Occupation Unknown"}
                    </p>
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-slate-400">Economic:</span>
                        <span className="text-emerald-400 font-mono">{hoveredNode.citizen.ideology.economic.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-slate-400">Social:</span>
                        <span className="text-blue-400 font-mono">{hoveredNode.citizen.ideology.social.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Authority:</span>
                        <span className="text-purple-400 font-mono">{hoveredNode.citizen.ideology.authority_preference.toFixed(2)}</span>
                    </div>

                    <p className="text-xs text-slate-400 mt-3 italic leading-relaxed border-t border-slate-800 pt-3">
                        "{hoveredNode.citizen.worldview}"
                    </p>

                    {hoveredNode.voteRecord && (
                        <div className="mt-3 pt-3 border-t border-slate-700 bg-slate-950/50 -mx-4 -mb-4 p-4 rounded-b-xl">
                            <div className="flex justify-between items-center font-bold">
                                <span className="text-slate-400 font-normal">Vote:</span>
                                <span className={!hoveredNode.voteRecord.didVote ? "text-slate-500 italic" : hoveredNode.voteRecord.vote ? "text-emerald-400" : "text-red-400"}>
                                    {!hoveredNode.voteRecord.didVote ? "ABSTAINED" : hoveredNode.voteRecord.vote ? "SUPPORT" : "OPPOSE"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs mt-1">
                                <span className="text-slate-500">Turnout Prob:</span>
                                <span className="text-slate-300">{(hoveredNode.voteRecord.turnoutProbability * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center text-xs mt-1 border-t border-slate-800/50 pt-1">
                                <span className="text-slate-600">Ideology Match:</span>
                                <span className="text-slate-400">{(hoveredNode.voteRecord.supportProbability * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Canvas camera={{ position: [8, 8, 12], fov: 50 }} className="cursor-crosshair w-full h-full">
                <color attach="background" args={["#020617"]} /> {/* slate-950 */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#475569" />

                <Scene citizens={citizens} result={result} setHoveredCitizen={setHoveredNode} isPaused={isPaused} clusterAssignments={clusterAssignments} viewMode={viewMode} onNodeClick={onNodeClick} />

                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={5}
                    maxDistance={25}
                />
            </Canvas>
        </div>
    );
}
