"use client";

import { useState, useEffect } from "react";
import { Citizen, Policy, SimulationResult } from "@/types/ideology";
import { runSimulation } from "@/lib/simulation/vectorMath";
import IdeologyScatter from "@/components/visualization/IdeologyScatter";
import { Loader2, Users, Send, TrendingUp, CheckCircle, XCircle, Download, Upload, Trash2 } from "lucide-react";
import { MOCK_CITIZENS } from "@/lib/simulation/mockData";

export default function Home() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [isGeneratingAgents, setIsGeneratingAgents] = useState(false);
  const [demographics, setDemographics] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Clustering State
  const [isClustering, setIsClustering] = useState(false);
  // Factions returned from the AI
  const [factions, setFactions] = useState<{ clusterIndex: number, name: string, description: string }[]>([]);
  // Map of Citizen ID to their Faction Index
  const [clusterAssignments, setClusterAssignments] = useState<{ citizenId: string, clusterIndex: number }[]>([]);

  // Initialize with mock citizens to avoid API rate limits during dev
  useEffect(() => {
    setCitizens(MOCK_CITIZENS);
  }, []);

  const handleGenerateAgents = async () => {
    setIsGeneratingAgents(true);
    setResult(null);
    try {
      const res = await fetch("/api/generateAgents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 30, demographics }) // Requesting 30 at a time to stay well under the Vercel 60s Edge timeout
      });

      const data = await res.json();
      if (data.error) {
        alert("Error generating agents: " + data.error);
      } else {
        // Append the new real AI citizens to the existing electorate!
        // If it's currently filled with the 100 mock citizens, we'll replace the first time.
        setCitizens(prev => {
          // Sneaky trick: if the first citizen has the mock name, clear the mock array.
          if (prev.length > 0 && prev[0].name === "Marcus Vance") {
            return data.citizens;
          }
          return [...data.citizens, ...prev];
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reach Gemini API");
    } finally {
      setIsGeneratingAgents(false);
    }
  };

  const handleResetElectorate = () => {
    if (confirm("Are you sure you want to clear the entire electorate?")) {
      setCitizens([]);
      setResult(null);
      setFactions([]);
      setClusterAssignments([]);
    }
  };

  const handleExportElectorate = () => {
    if (citizens.length === 0) return;
    const blob = new Blob([JSON.stringify(citizens, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `electorate_${citizens.length}_agents.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportElectorate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedCitizens = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedCitizens) && importedCitizens.length > 0 && importedCitizens[0].ideology) {
          setCitizens(importedCitizens);
          setResult(null);
        } else {
          alert("Invalid electorate file format.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyText.trim() || citizens.length === 0) return;

    setIsSimulating(true);
    try {
      // 1. Vectorize the policy via Gemini
      const vectorRes = await fetch("/api/vectorizePolicy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyText })
      });

      const vectorData = await vectorRes.json();
      if (vectorData.error) throw new Error(vectorData.error);

      const policy: Policy = {
        title: "Simulation Proposal",
        description: policyText,
        vector: vectorData.vector
      };

      // 2. Run simulation math locally
      const simResult = runSimulation(policy, citizens);
      setResult(simResult);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Simulation Failed");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCluster = async () => {
    if (citizens.length < 10) {
      alert("Please generate at least 10 citizens before clustering.");
      return;
    }
    setIsClustering(true);
    try {
      const res = await fetch("/api/clusterElectorate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizens })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setFactions(data.factions);
      setClusterAssignments(data.assignments);
    } catch (err: any) {
      alert(err.message || "Failed to cluster electorate.");
    } finally {
      setIsClustering(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Header / Sidebar Control Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-br from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              AI Electorate Simulator
            </h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Define a nuanced policy proposal. Gemini will vectorize it into a 6D ideological space, and our custom math engine will simulate the voting behavior of {citizens.length} AI personas.
            </p>

            {/* Agent Control */}
            <div className="mt-8 pt-8 border-t border-slate-800">
              <div className="flex flex-col gap-3 mb-4">
                <label className="text-xs text-slate-400 font-medium tracking-wide uppercase">Real-World Demographics (Optional RAG)</label>
                <textarea
                  value={demographics}
                  onChange={(e) => setDemographics(e.target.value)}
                  placeholder="e.g. 50% union workers in Ohio, 20% college students, 30% wealthy suburbanites..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none h-20 placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Electorate Size: <span className="text-white bg-slate-800 px-2 py-1 rounded">{citizens.length}</span>
                </span>

                <div className="flex gap-2">
                  <button onClick={handleResetElectorate} className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors" title="Clear Electorate">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={handleExportElectorate} disabled={citizens.length === 0} className="p-2 bg-slate-800 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 disabled:opacity-50 rounded transition-colors" title="Export to JSON">
                    <Download className="w-4 h-4" />
                  </button>
                  <label className="p-2 bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded transition-colors cursor-pointer" title="Import from JSON">
                    <Upload className="w-4 h-4" />
                    <input type="file" accept=".json" onChange={handleImportElectorate} className="hidden" />
                  </label>
                </div>
              </div>
              <button
                onClick={handleGenerateAgents}
                disabled={isGeneratingAgents}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                {isGeneratingAgents ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add 30 AI Personas"}
              </button>
            </div>
          </div>

          {/* Core Input Form & Factions Panel */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex-shrink-0">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-400" />
                Propose Policy
              </h2>
              <form onSubmit={handleSimulate} className="flex flex-col gap-4">
                <textarea
                  value={policyText}
                  onChange={(e) => setPolicyText(e.target.value)}
                  placeholder="e.g. Ban all internal combustion engine vehicles by 2035 and invest heavily in high-speed public rail networks..."
                  className="w-full flex-1 min-h-[120px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none placeholder:text-slate-600"
                />
                <button
                  type="submit"
                  disabled={isSimulating || !policyText.trim()}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 tracking-wide shadow-lg shadow-blue-500/20"
                >
                  {isSimulating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Run Voting Simulation"}
                </button>
              </form>
            </div>

            {/* Factions Discovered Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Political Factions
                </h2>
                <button
                  onClick={handleCluster}
                  disabled={isClustering || citizens.length === 0}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg text-xs font-bold text-slate-300 transition-colors flex items-center gap-2"
                >
                  {isClustering ? <Loader2 className="w-3 h-3 animate-spin" /> : "Identify Factions"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {factions.length === 0 ? (
                  <div className="text-slate-500 text-sm text-center italic mt-10">Run the K-Means algorithm to discover the underlying demographic factions.</div>
                ) : (
                  factions.map((f, i) => {
                    // Assign deterministic distinct colors to the factions
                    const colors = ['border-purple-500 text-purple-400', 'border-amber-500 text-amber-400', 'border-pink-500 text-pink-400', 'border-cyan-500 text-cyan-400', 'border-lime-500 text-lime-400'];
                    const colorClass = colors[i % colors.length];
                    const factionSize = clusterAssignments.filter(a => a.clusterIndex === f.clusterIndex).length;
                    const percentage = Math.round((factionSize / citizens.length) * 100);

                    return (
                      <div key={i} className={`p-4 bg-slate-950 rounded-xl border-l-4 ${colorClass}`}>
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-bold">{f.name}</div>
                          <div className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded">{percentage}%</div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Visualization & Results Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl h-[500px]">
            <IdeologyScatter citizens={citizens} result={result || undefined} clusterAssignments={clusterAssignments} />
          </div>

          {/* Metrics Dashboard */}
          {result && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Outcome</span>
                {result.passed ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-xl font-bold">
                    <CheckCircle className="w-6 h-6" /> Passed
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400 text-xl font-bold">
                    <XCircle className="w-6 h-6" /> Failed
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Support</span>
                <span className="text-3xl font-black text-emerald-400">{result.supportCount}</span>
                <span className="text-slate-500 text-xs mt-1">votes</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Oppose</span>
                <span className="text-3xl font-black text-red-400">{result.opposeCount}</span>
                <span className="text-slate-500 text-xs mt-1">votes</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Polarization</span>
                <div className="flex items-center gap-2 text-blue-400 text-xl font-bold font-mono">
                  <TrendingUp className="w-5 h-5" />
                  {result.polarizationIndex.toFixed(2)}
                </div>
                <span className="text-slate-500 text-[10px] mt-1 relative w-full text-center">Avg dist from center</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
