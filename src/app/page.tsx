"use client";

import { useState, useEffect } from "react";
import { Citizen, Policy, SimulationResult } from "@/types/ideology";
import { runSimulation } from "@/lib/simulation/vectorMath";
import IdeologyScatter from "@/components/visualization/IdeologyScatter";
import { Loader2, Users, Send, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { MOCK_CITIZENS } from "@/lib/simulation/mockData";

export default function Home() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [isGeneratingAgents, setIsGeneratingAgents] = useState(false);

  const [policyText, setPolicyText] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

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
        body: JSON.stringify({ count: 50 })
      });

      const data = await res.json();
      if (data.error) {
        alert("Error generating agents: " + data.error);
      } else {
        // Replace mock with real AI generated ones
        setCitizens(data.citizens);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reach Gemini API");
    } finally {
      setIsGeneratingAgents(false);
    }
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
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Electorate Size: <span className="text-white bg-slate-800 px-2 py-1 rounded">{citizens.length}</span>
                </span>
              </div>
              <button
                onClick={handleGenerateAgents}
                disabled={isGeneratingAgents}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                {isGeneratingAgents ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate New AI Electorate"}
              </button>
            </div>
          </div>

          {/* Core Input Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex-1">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" />
              Propose Policy
            </h2>
            <form onSubmit={handleSimulate} className="flex flex-col h-full gap-4">
              <textarea
                value={policyText}
                onChange={(e) => setPolicyText(e.target.value)}
                placeholder="e.g. Ban all internal combustion engine vehicles by 2035 and invest heavily in high-speed public rail networks..."
                className="w-full flex-1 min-h-[160px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none placeholder:text-slate-600"
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
        </div>

        {/* Visualization & Results Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl h-[500px]">
            <IdeologyScatter citizens={citizens} result={result || undefined} />
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
