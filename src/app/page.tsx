"use client";

import { useState, useEffect } from "react";
import { Citizen, Policy, SimulationResult } from "@/types/ideology";
import { runSimulation } from "@/lib/simulation/vectorMath";
import IdeologyScatter from "@/components/visualization/IdeologyScatter";
import { Loader2, Users, TrendingUp, CheckCircle, XCircle, Download, Upload, Trash2, Cloud, CloudDownload, LogOut, LogIn } from "lucide-react";
import { MOCK_CITIZENS } from "@/lib/simulation/mockData";
import { useUser } from '@auth0/nextjs-auth0/client';

export default function Home() {
  const { user, isLoading: authLoading } = useUser();
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [isGeneratingAgents, setIsGeneratingAgents] = useState(false);
  const [demographics, setDemographics] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(false);
  const [savedElectorates, setSavedElectorates] = useState<any[]>([]);
  const [showLoadModal, setShowLoadModal] = useState(false);

  const [isClustering, setIsClustering] = useState(false);
  const [factions, setFactions] = useState<{ clusterIndex: number, name: string, description: string }[]>([]);
  const [clusterAssignments, setClusterAssignments] = useState<{ citizenId: string, clusterIndex: number }[]>([]);

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
        body: JSON.stringify({ count: 30, demographics })
      });
      const data = await res.json();
      if (data.error) {
        alert("Error generating agents: " + data.error);
      } else {
        setCitizens(prev => {
          if (prev.length > 0 && prev[0].name === "Marcus Vance") return data.citizens;
          return [...data.citizens, ...prev];
        });
      }
    } catch (err) {
      alert("Failed to reach Gemini API");
    } finally {
      setIsGeneratingAgents(false);
    }
  };

  const handleResetElectorate = () => {
    if (confirm("Clear entire electorate?")) {
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
      } catch { alert("Failed to parse JSON file."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveToCloud = async () => {
    if (citizens.length === 0) return;
    const name = prompt("Electorate name (e.g. 'Ohio Union Workers'):");
    if (!name) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/electorate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: demographics || "Generated AI Electorate", citizens, factions: factions.length > 0 ? factions : undefined })
      });
      const data = await res.json();
      if (data.error) throw new Error(`${data.error} | ${data.details || ""}`);
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
          setClusterAssignments([]);
        } else {
          setFactions([]);
          setClusterAssignments([]);
        }
        setShowLoadModal(false);
      }
    } catch (err: any) {
      alert(err.message || "Failed to load Electorate");
    } finally {
      setIsLoadingDB(false);
    }
  };

  const handleDeleteFromCloud = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/electorate/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
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
      const vectorRes = await fetch("/api/vectorizePolicy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyText })
      });
      const vectorData = await vectorRes.json();
      if (vectorData.error) throw new Error(vectorData.error);
      const policy: Policy = { title: "Simulation Proposal", description: policyText, vector: vectorData.vector };
      const simResult = runSimulation(policy, citizens);
      setResult(simResult);
    } catch (err: any) {
      alert(err.message || "Simulation Failed");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCluster = async () => {
    if (citizens.length < 10) { alert("Generate at least 10 citizens before clustering."); return; }
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

  const factionColors = ['#F59E0B', '#60A5FA', '#F472B6', '#34D399', '#A78BFA'];

  return (
    <main className="min-h-screen flex h-screen overflow-hidden" style={{ background: 'hsl(20 10% 5%)', color: 'hsl(40 20% 92%)', fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 260, background: 'hsl(20 8% 7%)', borderRight: '1px solid hsl(30 8% 12%)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid hsl(30 8% 12%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'hsl(38 95% 55%)', boxShadow: '0 0 8px hsl(38 95% 55%)' }} />
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: '0.05em', color: 'hsl(40 20% 92%)' }}>ELECTORATE SIM</span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(30 6% 40%)', letterSpacing: '0.1em' }}>AI · POLICY · ANALYSIS</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* DB Section */}
          <section>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color: 'hsl(30 6% 35%)', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>Electorate DB</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { icon: <CloudDownload size={14} />, label: user ? "Load Electorates" : "Load (Login Required)", onClick: loadElectorateList, disabled: isLoadingDB || !user, accent: true },
                { icon: <Cloud size={14} />, label: user ? "Save to Cloud" : "Save (Login Required)", onClick: handleSaveToCloud, disabled: citizens.length === 0 || isSaving || !user },
              ].map((item, i) => (
                <button key={i} onClick={item.onClick} disabled={item.disabled}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: 4, cursor: item.disabled ? 'not-allowed' : 'pointer', opacity: item.disabled ? 0.35 : 1, color: item.accent ? 'hsl(38 95% 55%)' : 'hsl(30 6% 55%)', fontFamily: "'Newsreader', serif", fontSize: 13, textAlign: 'left', transition: 'background 0.15s, color 0.15s' }}
                  onMouseEnter={e => !item.disabled && (e.currentTarget.style.background = 'hsl(30 8% 11%)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {item.icon} {item.label}
                </button>
              ))}

              <div style={{ height: 1, background: 'hsl(30 8% 12%)', margin: '6px 4px' }} />

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 4, cursor: 'pointer', color: 'hsl(30 6% 55%)', fontFamily: "'Newsreader', serif", fontSize: 13, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'hsl(30 8% 11%)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Upload size={14} /> Import JSON
                <input type="file" accept=".json" onChange={handleImportElectorate} style={{ display: 'none' }} />
              </label>

              <button onClick={handleExportElectorate} disabled={citizens.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: 4, cursor: citizens.length === 0 ? 'not-allowed' : 'pointer', opacity: citizens.length === 0 ? 0.35 : 1, color: 'hsl(30 6% 55%)', fontFamily: "'Newsreader', serif", fontSize: 13, textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => citizens.length > 0 && (e.currentTarget.style.background = 'hsl(30 8% 11%)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Download size={14} /> Export JSON
              </button>
            </div>
          </section>

          {/* Factions Section */}
          <section style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 8 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color: 'hsl(30 6% 35%)', textTransform: 'uppercase' }}>Factions</span>
              {factions.length > 0 && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(38 95% 55%)', background: 'hsl(38 30% 10%)', padding: '1px 6px', borderRadius: 2 }}>{factions.length}</span>}
            </div>

            {factions.length === 0 ? (
              <div style={{ padding: '12px 10px', background: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.012) 4px, rgba(255,255,255,0.012) 8px)', border: '1px dashed hsl(30 8% 15%)', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(30 6% 30%)', fontStyle: 'italic' }}>
                Run K-Means to populate.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
                {factions.map((f, i) => {
                  const color = factionColors[i % factionColors.length];
                  const factionSize = clusterAssignments.filter(a => a.clusterIndex === f.clusterIndex).length;
                  return (
                    <div key={i} style={{ padding: '8px 10px', background: 'hsl(20 8% 8%)', borderRadius: 4, borderLeft: `2px solid ${color}`, cursor: 'default' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 11, color: 'hsl(40 20% 85%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{f.name}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: color, opacity: 0.8 }}>{factionSize}</span>
                      </div>
                      <p style={{ fontFamily: "'Newsreader', serif", fontSize: 11, color: 'hsl(30 6% 45%)', lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Clear */}
          <button onClick={handleResetElectorate}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '8px', background: 'transparent', border: '1px solid transparent', borderRadius: 4, cursor: 'pointer', color: 'hsl(0 60% 45%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'hsl(0 30% 8%)'; e.currentTarget.style.borderColor = 'hsl(0 40% 20%)'; e.currentTarget.style.color = 'hsl(0 70% 55%)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'hsl(0 60% 45%)'; }}
          >
            <Trash2 size={12} /> Clear Workspace
          </button>

          {/* Auth */}
          {!authLoading && (
            <div style={{ borderTop: '1px solid hsl(30 8% 12%)', paddingTop: 12 }}>
              {user ? (
                <div style={{ background: 'hsl(20 8% 8%)', border: '1px solid hsl(30 8% 14%)', borderRadius: 4, padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {user.picture
                      ? <img src={user.picture} alt="Profile" style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid hsl(30 8% 20%)' }} />
                      : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'hsl(38 30% 12%)', border: '1px solid hsl(38 30% 20%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, color: 'hsl(38 95% 55%)' }}>{user.name?.charAt(0) || user.email?.charAt(0) || "U"}</div>
                    }
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 12, color: 'hsl(40 20% 85%)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.email}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(38 95% 55%)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Authenticated</div>
                    </div>
                  </div>
                  <a href="/auth/logout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '6px', background: 'hsl(0 20% 8%)', border: '1px solid hsl(0 20% 14%)', borderRadius: 3, color: 'hsl(0 60% 50%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', textDecoration: 'none', textTransform: 'uppercase', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(0 30% 12%)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(0 20% 8%)'; }}
                  >
                    <LogOut size={11} /> Sign Out
                  </a>
                </div>
              ) : (
                <a href="/auth/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px', background: 'hsl(38 30% 10%)', border: '1px solid hsl(38 50% 22%)', borderRadius: 4, color: 'hsl(38 95% 60%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', textTransform: 'uppercase', fontWeight: 500, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(38 30% 13%)'; (e.currentTarget as HTMLElement).style.borderColor = 'hsl(38 60% 35%)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(38 30% 10%)'; (e.currentTarget as HTMLElement).style.borderColor = 'hsl(38 50% 22%)'; }}
                >
                  <LogIn size={12} /> Login / Sign Up
                </a>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'hsl(20 10% 5%)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 120px', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Header */}
          <header style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 24, borderBottom: '1px solid hsl(30 8% 10%)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em', color: 'hsl(40 20% 92%)', margin: 0 }}>Political Simulation Engine</h1>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(38 95% 55%)', letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid hsl(38 40% 22%)', padding: '2px 8px', borderRadius: 2 }}>v2.1</span>
            </div>
            <p style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 15, color: 'hsl(30 6% 45%)', margin: 0, lineHeight: 1.5 }}>
              Simulate political outcomes by modeling AI-generated citizen personas across an ideological space. Define your electorate, propose a policy, and observe coalition dynamics.
            </p>
          </header>

          {/* Step 1 */}
          <section>
            <SectionLabel number="01" title="Target Electorate" subtitle="RAG-augmented persona generation" />
            <div style={{ marginTop: 12, background: 'hsl(20 8% 7%)', border: '1px solid hsl(30 8% 12%)', borderRadius: 4, padding: 20 }}>
              <textarea
                value={demographics}
                onChange={(e) => setDemographics(e.target.value)}
                placeholder="e.g. 50% union workers in Ohio, 20% college students, 30% wealthy suburbanites..."
                style={{ width: '100%', background: 'hsl(20 10% 4%)', border: '1px solid hsl(30 8% 10%)', borderRadius: 3, padding: '12px 14px', fontFamily: "'Newsreader', serif", fontSize: 14, color: 'hsl(40 20% 85%)', resize: 'vertical', minHeight: 90, outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                onFocus={e => (e.target.style.borderColor = 'hsl(38 50% 25%)')}
                onBlur={e => (e.target.style.borderColor = 'hsl(30 8% 10%)')}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(30 6% 35%)', letterSpacing: '0.1em' }}>CORPUS SIZE</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'hsl(38 95% 55%)', background: 'hsl(38 30% 8%)', padding: '2px 8px', borderRadius: 2, border: '1px solid hsl(38 30% 14%)' }}>{citizens.length}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <OutlineButton onClick={handleCluster} disabled={isClustering || citizens.length === 0}>
                    {isClustering ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Clustering…</> : "Identify Factions"}
                  </OutlineButton>
                  <PrimaryButton onClick={handleGenerateAgents} disabled={isGeneratingAgents}>
                    {isGeneratingAgents ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : "+ 30 Personas"}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <SectionLabel number="02" title="Policy Proposal" subtitle="Vectorized for ideological alignment scoring" />
            <div style={{ marginTop: 12, background: 'hsl(20 8% 7%)', border: '1px solid hsl(30 8% 12%)', borderRadius: 4, padding: 20 }}>
              <form onSubmit={handleSimulate}>
                <textarea
                  value={policyText}
                  onChange={(e) => setPolicyText(e.target.value)}
                  placeholder="e.g. Ban all internal combustion engine vehicles by 2035 and invest heavily in high-speed public rail networks..."
                  style={{ width: '100%', background: 'hsl(20 10% 4%)', border: '1px solid hsl(30 8% 10%)', borderRadius: 3, padding: '12px 14px', fontFamily: "'Newsreader', serif", fontSize: 14, color: 'hsl(40 20% 85%)', resize: 'vertical', minHeight: 110, outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                  onFocus={e => (e.target.style.borderColor = 'hsl(38 50% 25%)')}
                  onBlur={e => (e.target.style.borderColor = 'hsl(30 8% 10%)')}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                  <RunButton disabled={isSimulating || !policyText.trim() || citizens.length === 0}>
                    {isSimulating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running…</> : "Run Simulation Engine →"}
                  </RunButton>
                </div>
              </form>
            </div>
          </section>

          {/* Scatter Plot */}
          {(result || citizens.length > 0) && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color: 'hsl(30 6% 35%)', textTransform: 'uppercase' }}>3D Ideological Space</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(30 6% 28%)', letterSpacing: '0.05em' }}>left click to rotate · scroll to zoom</span>
              </div>
              <div style={{ background: 'hsl(20 8% 6%)', border: '1px solid hsl(30 8% 10%)', borderRadius: 4, height: 500, overflow: 'hidden' }}>
                <IdeologyScatter citizens={citizens} result={result || undefined} clusterAssignments={clusterAssignments} />
              </div>
            </section>
          )}

          {/* Results Grid */}
          {result && (
            <section>
              <SectionLabel number="03" title="Simulation Results" subtitle={`Policy: ${policyText.slice(0, 60)}…`} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                <MetricCard label="Outcome">
                  {result.passed
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'hsl(142 60% 50%)' }}><CheckCircle size={16} /><span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>PASSED</span></div>
                    : <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'hsl(0 65% 55%)' }}><XCircle size={16} /><span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>FAILED</span></div>
                  }
                </MetricCard>
                <MetricCard label="In Favour">
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 500, color: 'hsl(142 60% 50%)' }}>{result.supportCount}</span>
                </MetricCard>
                <MetricCard label="Opposed">
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 500, color: 'hsl(0 65% 55%)' }}>{result.opposeCount}</span>
                </MetricCard>
                <MetricCard label="Polarization">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'hsl(38 95% 60%)' }}>
                    <TrendingUp size={14} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 500 }}>{result.polarizationIndex.toFixed(2)}</span>
                  </div>
                </MetricCard>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Load Modal ── */}
      {showLoadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'hsl(20 8% 7%)', border: '1px solid hsl(30 8% 15%)', borderRadius: 6, padding: 24, width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', maxHeight: '80vh', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: 'hsl(40 20% 92%)', margin: '0 0 4px 0' }}>Saved Electorates</h2>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(30 6% 35%)', letterSpacing: '0.1em' }}>MONGODB ATLAS — CLOUD DATABASE</span>
              </div>
              <button onClick={() => setShowLoadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(30 6% 40%)', padding: 4, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'hsl(40 20% 80%)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'hsl(30 6% 40%)')}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {savedElectorates.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'hsl(30 6% 35%)', padding: '40px 0', fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 14 }}>No electorates found in the cloud database.</div>
              ) : (
                savedElectorates.map((elec) => (
                  <div key={elec._id} style={{ background: 'hsl(20 10% 5%)', border: '1px solid hsl(30 8% 12%)', padding: '12px 14px', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'hsl(38 40% 20%)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'hsl(30 8% 12%)')}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: 'hsl(38 95% 60%)', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{elec.name}</h3>
                      <p style={{ fontFamily: "'Newsreader', serif", fontSize: 12, color: 'hsl(30 6% 45%)', margin: '0 0 8px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{elec.description}</p>
                      <div style={{ display: 'flex', gap: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(30 6% 35%)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={10} /> {elec.size} citizens</span>
                        <span>{new Date(elec.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                      <button onClick={() => handleDeleteFromCloud(elec._id, elec.name)}
                        style={{ padding: '6px 8px', background: 'transparent', border: '1px solid hsl(30 8% 14%)', borderRadius: 3, cursor: 'pointer', color: 'hsl(30 6% 40%)', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(0 40% 25%)'; e.currentTarget.style.color = 'hsl(0 60% 50%)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(30 8% 14%)'; e.currentTarget.style.color = 'hsl(30 6% 40%)'; }}
                      >
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => handleLoadFromCloud(elec._id)}
                        style={{ padding: '6px 14px', background: 'hsl(38 30% 10%)', border: '1px solid hsl(38 50% 22%)', borderRadius: 3, cursor: 'pointer', color: 'hsl(38 95% 60%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.05em', fontWeight: 500, textTransform: 'uppercase', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'hsl(38 30% 14%)'; e.currentTarget.style.borderColor = 'hsl(38 60% 35%)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'hsl(38 30% 10%)'; e.currentTarget.style.borderColor = 'hsl(38 50% 22%)'; }}
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

/* ── Subcomponents ── */

function SectionLabel({ number, title, subtitle }: { number: string, title: string, subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(38 95% 45%)', letterSpacing: '0.1em', flexShrink: 0 }}>{number}</span>
      <div>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: 'hsl(40 20% 88%)', letterSpacing: '-0.01em' }}>{title}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(30 6% 35%)', marginLeft: 10, letterSpacing: '0.05em' }}>{subtitle}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div style={{ background: 'hsl(20 8% 7%)', border: '1px solid hsl(30 8% 12%)', borderRadius: 4, padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8 }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color: 'hsl(30 6% 35%)', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </div>
  );
}

function OutlineButton({ children, onClick, disabled }: { children: React.ReactNode, onClick?: () => void, disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'transparent', border: '1px solid hsl(30 8% 18%)', borderRadius: 3, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, color: 'hsl(30 6% 55%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500, transition: 'all 0.15s' }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'hsl(30 8% 11%)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode, onClick?: () => void, disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: 'hsl(38 30% 10%)', border: '1px solid hsl(38 50% 22%)', borderRadius: 3, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, color: 'hsl(38 95% 60%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500, transition: 'all 0.15s' }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'hsl(38 30% 14%)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'hsl(38 30% 10%)')}
    >
      {children}
    </button>
  );
}

function RunButton({ children, disabled }: { children: React.ReactNode, disabled?: boolean }) {
  return (
    <button type="submit" disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', background: disabled ? 'hsl(38 15% 9%)' : 'hsl(38 70% 14%)', border: `1px solid ${disabled ? 'hsl(30 8% 14%)' : 'hsl(38 60% 28%)'}`, borderRadius: 3, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, color: 'hsl(38 95% 60%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, transition: 'all 0.15s', boxShadow: disabled ? 'none' : '0 0 20px hsla(38, 70%, 30%, 0.2)' }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'hsl(38 70% 18%)')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.background = 'hsl(38 70% 14%)')}
    >
      {children}
    </button>
  );
}
