"use client";

import { useState, useEffect } from "react";
import { Citizen, Policy, SimulationResult } from "@/types/ideology";
import { runSimulation } from "@/lib/simulation/vectorMath";
import IdeologyScatter from "@/components/visualization/IdeologyScatter";
import { Loader2, Users, Send, TrendingUp, CheckCircle, XCircle, Download, Upload, Trash2, Cloud, CloudDownload } from "lucide-react";
import { MOCK_CITIZENS } from "@/lib/simulation/mockData";

export default function Home() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [isGeneratingAgents, setIsGeneratingAgents] = useState(false);
  const [demographics, setDemographics] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Cloud DB State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(false);
  const [savedElectorates, setSavedElectorates] = useState<any[]>([]);
  const [showLoadModal, setShowLoadModal] = useState(false);

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

  const handleSaveToCloud = async () => {
    if (citizens.length === 0) return;
    const name = prompt("Enter a name for this Electorate (e.g. 'Ohio Union Workers'):");
    if (!name) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/electorate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: demographics || "Generated AI Electorate",
          citizens,
          factions: factions.length > 0 ? factions : undefined
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert("Electorate saved to MongoDB Atlas!");
    } catch (err: any) {
      alert(err.message || "Failed to save to cloud");
    } finally {
      setIsSaving(false);
    }
  };

  const loadElectorateList = async () => {
    setIsLoadingDB(true);
    try {
      const res = await fetch("/api/electorate");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSavedElectorates(data.electorates);
      setShowLoadModal(true);
    } catch (err: any) {
      alert(err.message || "Failed to fetch from MongoDB");
    } finally {
      setIsLoadingDB(false);
    }
  };

  const handleLoadFromCloud = async (id: string) => {
    setIsLoadingDB(true);
    try {
      const res = await fetch(`/api/electorate/${id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.electorate.citizens) {
        setCitizens(data.electorate.citizens);
        setResult(null);
        if (data.electorate.factions) {
          setFactions(data.electorate.factions);
          // Since we didn't save assignments natively to save space, we need to re-assign or rely on the saved assignments.
          // For the MVP, we will clear the assignments requiring a re-cluster click, or we could just save them if we added it to schema.
          setClusterAssignments([]);
        } else {
          setFactions([]);
          setClusterAssignments([]);
        }
        setShowLoadModal(false);
      }
    } catch (err: any) {
      alert(err.message || "Failed to load specific Electorate");
    } finally {
      setIsLoadingDB(false);
    }
  };

  const handleDeleteFromCloud = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the electorate: "${name}"?`)) return;

    try {
      const res = await fetch(`/api/electorate/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Remove it from the local state list immediately
      setSavedElectorates(prev => prev.filter(e => e._id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete from MongoDB");
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
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans flex h-screen overflow-hidden">

      {/* Sidebar */}
      <div className="w-[300px] bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            AI Electorate Sim
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Electorate DB</span>
            <div className="flex flex-col gap-1">
              <button onClick={loadElectorateList} disabled={isLoadingDB} className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-800 rounded-lg text-sm text-slate-300 transition-colors text-left font-medium" title="Load from Cloud">
                <CloudDownload className="w-4 h-4 text-emerald-400" />
                Load Electorates
              </button>
              <button onClick={handleSaveToCloud} disabled={citizens.length === 0 || isSaving} className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-800 rounded-lg text-sm text-slate-300 transition-colors text-left font-medium disabled:opacity-50" title="Save to Cloud">
                <Cloud className="w-4 h-4 text-slate-400" />
                Save to Cloud
              </button>
              <div className="h-px bg-slate-800 w-full my-2"></div>
              <label className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-800 rounded-lg text-sm text-slate-300 transition-colors text-left font-medium cursor-pointer" title="Import JSON">
                <Upload className="w-4 h-4 text-slate-400" />
                Import JSON
                <input type="file" accept=".json" onChange={handleImportElectorate} className="hidden" />
              </label>
              <button onClick={handleExportElectorate} disabled={citizens.length === 0} className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-800 rounded-lg text-sm text-slate-300 transition-colors text-left font-medium disabled:opacity-50" title="Export JSON">
                <Download className="w-4 h-4 text-slate-400" />
                Export JSON
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Factions</span>
              {factions.length > 0 && <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">{factions.length}</span>}
            </div>

            {factions.length === 0 ? (
              <div className="text-slate-500 text-xs italic p-3 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">Run K-Means to populate.</div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto">
                {factions.map((f, i) => {
                  const colors = ['border-purple-500', 'border-amber-500', 'border-pink-500', 'border-cyan-500', 'border-lime-500'];
                  const colorClass = colors[i % colors.length];
                  const factionSize = clusterAssignments.filter(a => a.clusterIndex === f.clusterIndex).length;

                  return (
                    <div key={i} className={`p-3 bg-slate-950 rounded-xl border-l-2 ${colorClass} hover:border-l-4 transition-all cursor-default shadow-sm`}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-xs font-bold text-slate-200 truncate pr-2">{f.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">{factionSize}</div>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{f.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={handleResetElectorate} className="flex items-center gap-3 w-full p-3 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl text-sm text-red-500/80 hover:text-red-400 transition-colors justify-center mt-auto font-medium" title="Clear All Data">
            <Trash2 className="w-4 h-4" />
            Clear Workspace
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-950">
        <div className="max-w-4xl mx-auto w-full p-6 lg:p-10 flex flex-col gap-8 min-h-full pb-32">

          {/* Header Message */}
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex flex-shrink-0 items-center justify-center border border-emerald-500/30">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-medium text-slate-200">Welcome to the Simulator</h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                I can help you simulate the political outcomes of any policy. Start by filling out the target demographic data below, or just instantly generate a random base of 30 AI personas.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 ml-12">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <div className="flex flex-col gap-4">
                <label className="text-sm font-medium text-slate-300">1. Target Electorate (RAG)</label>
                <textarea
                  value={demographics}
                  onChange={(e) => setDemographics(e.target.value)}
                  placeholder="e.g. 50% union workers in Ohio, 20% college students, 30% wealthy suburbanites..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 resize-y min-h-[100px]"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-slate-500 font-mono">Current Size: <span className="text-emerald-400 bg-slate-900 px-2 py-1 rounded-md">{citizens.length}</span></div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCluster}
                      disabled={isClustering || citizens.length === 0}
                      className="py-2 px-4 bg-transparent hover:bg-slate-800 text-slate-300 disabled:opacity-50 border border-slate-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {isClustering ? <Loader2 className="w-4 h-4 animate-spin" /> : "Identify Factions"}
                    </button>
                    <button
                      onClick={handleGenerateAgents}
                      disabled={isGeneratingAgents}
                      className="py-2 px-6 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {isGeneratingAgents ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add 30 Personas"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                2. Policy Proposal
              </h2>
              <form onSubmit={handleSimulate} className="flex flex-col gap-4">
                <textarea
                  value={policyText}
                  onChange={(e) => setPolicyText(e.target.value)}
                  placeholder="e.g. Ban all internal combustion engine vehicles by 2035 and invest heavily in high-speed public rail networks..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 resize-y min-h-[120px]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSimulating || !policyText.trim() || citizens.length === 0}
                    className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run Simulation Engine"}
                  </button>
                </div>
              </form>
            </div>

            {/* Results Area */}
            {(result || citizens.length > 0) && (
              <div className="bg-slate-900/50 p-2 rounded-2xl border border-slate-800 h-[500px] mt-4">
                <IdeologyScatter citizens={citizens} result={result || undefined} clusterAssignments={clusterAssignments} />
              </div>
            )}

            {/* Metrics */}
            {result && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                <div className="bg-slate-900/50 flex flex-col items-center justify-center text-center p-5 border border-slate-800 rounded-2xl">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Outcome</span>
                  {result.passed ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <CheckCircle className="w-5 h-5" /> Passed
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-400 font-medium">
                      <XCircle className="w-5 h-5" /> Failed
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/50 flex flex-col items-center justify-center text-center p-5 border border-slate-800 rounded-2xl">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Support</span>
                  <span className="text-3xl font-mono text-emerald-400">{result.supportCount}</span>
                </div>

                <div className="bg-slate-900/50 flex flex-col items-center justify-center text-center p-5 border border-slate-800 rounded-2xl">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Oppose</span>
                  <span className="text-3xl font-mono text-red-400">{result.opposeCount}</span>
                </div>

                <div className="bg-slate-900/50 flex flex-col items-center justify-center text-center p-5 border border-slate-800 rounded-2xl">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Polarization</span>
                  <div className="flex items-center gap-2 text-blue-400 font-mono text-xl">
                    <TrendingUp className="w-4 h-4" />
                    {result.polarizationIndex.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Load from Cloud Database Dashboard Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CloudDownload className="w-6 h-6 text-amber-500" />
                MongoDB Target Populations
              </h2>
              <button onClick={() => setShowLoadModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {savedElectorates.length === 0 ? (
                <div className="text-center text-slate-500 py-10">No electorates found in the cloud database. Generate and save one first!</div>
              ) : (
                savedElectorates.map((elec) => (
                  <div key={elec._id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center hover:border-amber-500/50 transition-colors">
                    <div>
                      <h3 className="font-bold text-lg text-emerald-400">{elec.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">{elec.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {elec.size} Citizens</span>
                        <span>Saved: {new Date(elec.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteFromCloud(elec._id, elec.name)}
                        className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/50 flex-shrink-0"
                        title="Delete from MongoDB"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleLoadFromCloud(elec._id)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors text-sm shadow-lg shadow-amber-500/20 flex-shrink-0"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
