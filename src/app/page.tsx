"use client";

import { useState, useEffect } from "react";
import { Citizen, Policy, SimulationResult } from "@/types/ideology";
import { runSimulation } from "@/lib/simulation/vectorMath";
import IdeologyScatter from "@/components/visualization/IdeologyScatter";
import { Loader2, Users, TrendingUp, CheckCircle, XCircle, Download, Upload, Trash2, Cloud, CloudDownload, LogOut, LogIn } from "lucide-react";
import { MOCK_CITIZENS } from "@/lib/simulation/mockData";
import { useUser } from '@auth0/nextjs-auth0/client';

// ── Design tokens (light mode) ──────────────────────────────────────────────
const T = {
  bg: 'hsl(40 20% 96%)',       // warm off-white page
  bgSidebar: 'hsl(36 18% 91%)',       // slightly darker sidebar
  bgCard: 'hsl(0 0% 100%)',        // pure white cards
  bgInput: 'hsl(40 15% 97%)',       // near-white inputs
  bgAccent: 'hsl(20 60% 94%)',       // faint terracotta tint
  border: 'hsl(30 12% 82%)',       // warm grey border
  borderStrong: 'hsl(30 12% 68%)',
  text: 'hsl(25 15% 12%)',       // warm near-black
  textMuted: 'hsl(25 8% 45%)',        // mid-grey
  textFaint: 'hsl(25 6% 62%)',        // light grey
  accent: 'hsl(20 75% 42%)',       // terracotta/brick red
  accentHover: 'hsl(20 75% 36%)',
  accentLight: 'hsl(20 60% 94%)',
  green: 'hsl(142 45% 36%)',
  red: 'hsl(0 60% 48%)',
  redLight: 'hsl(0 60% 96%)',
  amber: 'hsl(38 80% 44%)',
};

export default function Home() {
  const { user, isLoading: authLoading } = useUser();
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [generateCount, setGenerateCount] = useState<number>(30);
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

  useEffect(() => { setCitizens(MOCK_CITIZENS); }, []);

  const handleGenerateAgents = async () => {
    setIsGeneratingAgents(true); setResult(null);
    try {
      const res = await fetch("/api/generateAgents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: generateCount, demographics }) });
      const data = await res.json();
      if (data.error) { alert("Error generating agents: " + data.error); }
      else { setCitizens(prev => (prev.length > 0 && prev[0].name === "Marcus Vance") ? data.citizens : [...data.citizens, ...prev]); }
    } catch { alert("Failed to reach Gemini API"); }
    finally { setIsGeneratingAgents(false); }
  };

  const handleResetElectorate = () => {
    if (confirm("Clear entire electorate?")) { setCitizens([]); setResult(null); setFactions([]); setClusterAssignments([]); }
  };

  const handleExportElectorate = () => {
    if (citizens.length === 0) return;
    const blob = new Blob([JSON.stringify(citizens, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `electorate_${citizens.length}_agents.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportElectorate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported) && imported.length > 0 && imported[0].ideology) { setCitizens(imported); setResult(null); }
        else alert("Invalid electorate file format.");
      } catch { alert("Failed to parse JSON file."); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleSaveToCloud = async () => {
    if (citizens.length === 0) return;
    const name = prompt("Electorate name:"); if (!name) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/electorate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description: demographics || "Generated AI Electorate", citizens, factions: factions.length > 0 ? factions : undefined }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert("Saved to MongoDB Atlas!");
    } catch (err: any) { alert(err.message || "Failed to save"); }
    finally { setIsSaving(false); }
  };

  const loadElectorateList = async () => {
    setIsLoadingDB(true);
    try {
      const res = await fetch("/api/electorate"); const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSavedElectorates(data.electorates); setShowLoadModal(true);
    } catch (err: any) { alert(err.message || "Failed to fetch"); }
    finally { setIsLoadingDB(false); }
  };

  const handleLoadFromCloud = async (id: string) => {
    setIsLoadingDB(true);
    try {
      const res = await fetch(`/api/electorate/${id}`); const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.electorate.citizens) {
        setCitizens(data.electorate.citizens); setResult(null);
        setFactions(data.electorate.factions || []); setClusterAssignments([]);
        setShowLoadModal(false);
      }
    } catch (err: any) { alert(err.message || "Failed to load"); }
    finally { setIsLoadingDB(false); }
  };

  const handleDeleteFromCloud = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/electorate/${id}`, { method: "DELETE" }); const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSavedElectorates(prev => prev.filter(e => e._id !== id));
    } catch (err: any) { alert(err.message || "Failed to delete"); }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!policyText.trim() || citizens.length === 0) return;
    setIsSimulating(true);
    try {
      const vectorRes = await fetch("/api/vectorizePolicy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ policyText }) });
      const vectorData = await vectorRes.json(); if (vectorData.error) throw new Error(vectorData.error);

      const policy: Policy = { title: "Simulation Proposal", description: policyText, vector: vectorData.vector, universal_appeal: vectorData.universal_appeal };
      setResult(runSimulation(policy, citizens));
    } catch (err: any) { alert(err.message || "Simulation Failed"); }
    finally { setIsSimulating(false); }
  };

  const handleCluster = async () => {
    if (citizens.length < 10) { alert("Generate at least 10 citizens first."); return; }
    setIsClustering(true);
    try {
      const res = await fetch("/api/clusterElectorate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ citizens }) });
      const data = await res.json(); if (data.error) throw new Error(data.error);
      setFactions(data.factions); setClusterAssignments(data.assignments);
    } catch (err: any) { alert(err.message || "Failed to cluster."); }
    finally { setIsClustering(false); }
  };

  const factionColors = ['#C2410C', '#2563EB', '#DB2777', '#16A34A', '#7C3AED'];

  // ── Shared hover helpers ─────────────────────────────────────────────────
  const hoverBg = (bg: string) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.background = bg; },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; },
  });

  return (
    <main style={{ minHeight: '100vh', display: 'flex', height: '100vh', overflow: 'hidden', background: T.bg, color: T.text, fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{ width: 256, background: T.bgSidebar, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.accent }} />
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: '0.04em', color: T.text }}>ELECTORATE SIM</span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.textFaint, letterSpacing: '0.08em' }}>AI · POLICY · ANALYSIS</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* DB */}
          <section>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.18em', color: T.textFaint, textTransform: 'uppercase', marginBottom: 6, paddingLeft: 8 }}>Electorate DB</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { icon: <CloudDownload size={14} />, label: user ? "Load Electorates" : "Load (Login Required)", onClick: loadElectorateList, disabled: isLoadingDB || !user, accent: true },
                { icon: <Cloud size={14} />, label: user ? "Save to Cloud" : "Save (Login Required)", onClick: handleSaveToCloud, disabled: citizens.length === 0 || isSaving || !user, accent: false },
              ].map((item, i) => (
                <button key={i} onClick={item.onClick} disabled={item.disabled}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', borderRadius: 4, cursor: item.disabled ? 'not-allowed' : 'pointer', opacity: item.disabled ? 0.4 : 1, color: item.accent ? T.accent : T.textMuted, fontFamily: "'Newsreader', serif", fontSize: 13, textAlign: 'left', transition: 'background 0.12s' }}
                  {...hoverBg(T.border + '55')}
                >
                  {item.icon} {item.label}
                </button>
              ))}
              <div style={{ height: 1, background: T.border, margin: '4px 6px' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 10px', borderRadius: 4, cursor: 'pointer', color: T.textMuted, fontFamily: "'Newsreader', serif", fontSize: 13, transition: 'background 0.12s' }}
                {...hoverBg(T.border + '55')}
              >
                <Upload size={14} /> Import JSON
                <input type="file" accept=".json" onChange={handleImportElectorate} style={{ display: 'none' }} />
              </label>
              <button onClick={handleExportElectorate} disabled={citizens.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', borderRadius: 4, cursor: citizens.length === 0 ? 'not-allowed' : 'pointer', opacity: citizens.length === 0 ? 0.4 : 1, color: T.textMuted, fontFamily: "'Newsreader', serif", fontSize: 13, textAlign: 'left', transition: 'background 0.12s' }}
                {...hoverBg(T.border + '55')}
              >
                <Download size={14} /> Export JSON
              </button>
            </div>
          </section>

          {/* Factions */}
          <section style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingLeft: 8 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.18em', color: T.textFaint, textTransform: 'uppercase' }}>Factions</span>
              {factions.length > 0 && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.accent, background: T.accentLight, padding: '1px 6px', borderRadius: 2 }}>{factions.length}</span>}
            </div>
            {factions.length === 0 ? (
              <div style={{ padding: '10px 12px', background: T.bgCard, border: `1px dashed ${T.border}`, borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.textFaint, fontStyle: 'italic' }}>
                Run K-Means to populate.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
                {factions.map((f, i) => {
                  const color = factionColors[i % factionColors.length];
                  const size = clusterAssignments.filter(a => a.clusterIndex === f.clusterIndex).length;
                  return (
                    <div key={i} style={{ padding: '8px 10px', background: T.bgCard, borderRadius: 4, borderLeft: `2px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 11, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 145 }}>{f.name}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: color }}>{size}</span>
                      </div>
                      <p style={{ fontFamily: "'Newsreader', serif", fontSize: 11, color: T.textMuted, lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Clear */}
          <button onClick={handleResetElectorate}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '8px', background: 'transparent', border: `1px solid transparent`, borderRadius: 4, cursor: 'pointer', color: T.red, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.redLight; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
          >
            <Trash2 size={12} /> Clear Workspace
          </button>

          {/* Auth */}
          {!authLoading && (
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
              {user ? (
                <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 4, padding: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                    {user.picture
                      ? <img src={user.picture} alt="Profile" style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${T.border}` }} />
                      : <div style={{ width: 30, height: 30, borderRadius: '50%', background: T.accentLight, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, color: T.accent }}>{user.name?.charAt(0) || user.email?.charAt(0) || "U"}</div>
                    }
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 12, color: T.text, maxWidth: 148, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.email}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Authenticated</div>
                    </div>
                  </div>
                  <a href="/auth/logout"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '6px', background: T.redLight, border: `1px solid #fca5a5`, borderRadius: 3, color: T.red, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', textDecoration: 'none', textTransform: 'uppercase', transition: 'all 0.12s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#fee2e2')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = T.redLight)}
                  >
                    <LogOut size={11} /> Sign Out
                  </a>
                </div>
              ) : (
                <a href="/auth/login"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px', background: T.accent, border: 'none', borderRadius: 4, color: 'white', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.06em', textDecoration: 'none', textTransform: 'uppercase', fontWeight: 500, transition: 'background 0.12s', boxShadow: `0 2px 8px ${T.accent}44` }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = T.accentHover)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = T.accent)}
                >
                  <LogIn size={12} /> Login / Sign Up
                </a>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 120px', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Header */}
          <header style={{ paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8 }}>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em', color: T.text, margin: 0 }}>Political Simulation Engine</h1>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.accent, letterSpacing: '0.1em', border: `1px solid ${T.accent}66`, padding: '2px 7px', borderRadius: 2 }}>v2.1</span>
            </div>
            <p style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 15, color: T.textMuted, margin: 0, lineHeight: 1.6 }}>
              Model AI-generated citizen personas across an ideological space. Define your electorate, propose a policy, and observe coalition dynamics.
            </p>
          </header>

          {/* Step 1 */}
          <section>
            <SectionLabel number="01" title="Target Electorate" subtitle="RAG-augmented persona generation" />
            <div style={{ marginTop: 12, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <textarea value={demographics} onChange={e => setDemographics(e.target.value)}
                placeholder="e.g. 50% union workers in Ohio, 20% college students, 30% wealthy suburbanites..."
                style={{ width: '100%', background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 4, padding: '11px 13px', fontFamily: "'Newsreader', serif", fontSize: 14, color: T.text, resize: 'vertical', minHeight: 88, outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                onFocus={e => (e.target.style.borderColor = T.accent + '88')}
                onBlur={e => (e.target.style.borderColor = T.border)}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.textFaint, letterSpacing: '0.1em' }}>CORPUS SIZE</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: T.accent, background: T.accentLight, padding: '2px 8px', borderRadius: 3, border: `1px solid ${T.accent}33` }}>{citizens.length}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <OutlineBtn onClick={handleCluster} disabled={isClustering || citizens.length === 0}>
                    {isClustering ? <><Spin />&nbsp;Clustering…</> : "Identify Factions"}
                  </OutlineBtn>
                  <div style={{ display: 'flex', alignItems: 'center', background: T.bgInput, border: `1px solid hsl(20 50% 72%)`, borderRadius: 4, overflow: 'hidden' }}>
                    <input type="number" value={generateCount} onChange={e => setGenerateCount(Math.max(1, Math.min(100, Number(e.target.value))))}
                      style={{ width: 44, padding: '7px 0 7px 8px', background: 'transparent', border: 'none', borderRight: `1px solid hsl(20 50% 72%)`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.text, outline: 'none' }}
                    />
                    <button onClick={handleGenerateAgents} disabled={isGeneratingAgents}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'hsl(20 60% 94%)', border: 'none', cursor: isGeneratingAgents ? 'not-allowed' : 'pointer', opacity: isGeneratingAgents ? 0.4 : 1, color: T.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500, transition: 'all 0.12s' }}
                      onMouseEnter={e => !isGeneratingAgents && (e.currentTarget.style.background = 'hsl(20 55% 89%)')}
                      onMouseLeave={e => !isGeneratingAgents && (e.currentTarget.style.background = 'hsl(20 60% 94%)')}
                    >
                      {isGeneratingAgents ? <><Spin />&nbsp;Gen…</> : "Add Personas"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <SectionLabel number="02" title="Policy Proposal" subtitle="Vectorized for ideological alignment scoring" />
            <div style={{ marginTop: 12, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <form onSubmit={handleSimulate}>
                <textarea value={policyText} onChange={e => setPolicyText(e.target.value)}
                  placeholder="e.g. Ban all internal combustion engine vehicles by 2035 and invest heavily in high-speed public rail networks..."
                  style={{ width: '100%', background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 4, padding: '11px 13px', fontFamily: "'Newsreader', serif", fontSize: 14, color: T.text, resize: 'vertical', minHeight: 110, outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                  onFocus={e => (e.target.style.borderColor = T.accent + '88')}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <RunBtn disabled={isSimulating || !policyText.trim() || citizens.length === 0}>
                    {isSimulating ? <><Spin />&nbsp;Running…</> : "Run Simulation Engine →"}
                  </RunBtn>
                </div>
              </form>
            </div>
          </section>

          {/* Scatter */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color: T.textFaint, textTransform: 'uppercase' }}>3D Ideological Space</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.textFaint, letterSpacing: '0.05em' }}>left click to rotate · scroll to zoom</span>
            </div>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, height: 500, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <IdeologyScatter citizens={citizens} result={result || undefined} clusterAssignments={clusterAssignments} />
            </div>
          </section>

          {/* Results */}
          {result && (
            <section>
              <SectionLabel number="03" title="Simulation Results" subtitle={`Policy: ${policyText.slice(0, 55)}…`} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                <MetricCard label="Outcome">
                  {result.passed
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.green }}><CheckCircle size={15} /><span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14 }}>PASSED</span></div>
                    : <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.red }}><XCircle size={15} /><span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14 }}>FAILED</span></div>
                  }
                </MetricCard>
                <MetricCard label="In Favour">
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, color: T.green }}>{result.supportCount}</span>
                </MetricCard>
                <MetricCard label="Opposed">
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, color: T.red }}>{result.opposeCount}</span>
                </MetricCard>
                <MetricCard label="Polarization">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.amber }}>
                    <TrendingUp size={13} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22 }}>{result.polarizationIndex.toFixed(2)}</span>
                  </div>
                </MetricCard>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Load Modal ──────────────────────────────────────────────────── */}
      {showLoadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,15,10,0.5)', backdropFilter: 'blur(3px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 24, width: '100%', maxWidth: 580, display: 'flex', flexDirection: 'column', maxHeight: '80vh', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, color: T.text, margin: '0 0 3px 0' }}>Saved Electorates</h2>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.textFaint, letterSpacing: '0.1em' }}>MONGODB ATLAS</span>
              </div>
              <button onClick={() => setShowLoadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint, padding: 2 }}>
                <XCircle size={19} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {savedElectorates.length === 0 ? (
                <div style={{ textAlign: 'center', color: T.textFaint, padding: '36px 0', fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 14 }}>No electorates saved yet.</div>
              ) : savedElectorates.map(elec => (
                <div key={elec._id}
                  style={{ background: T.bgCard, border: `1px solid ${T.border}`, padding: '11px 14px', borderRadius: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.12s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = T.accent + '66')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.accent, margin: '0 0 3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{elec.name}</h3>
                    <p style={{ fontFamily: "'Newsreader', serif", fontSize: 12, color: T.textMuted, margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{elec.description}</p>
                    <div style={{ display: 'flex', gap: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.textFaint }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} /> {elec.size} citizens</span>
                      <span>{new Date(elec.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    <button onClick={() => handleDeleteFromCloud(elec._id, elec.name)}
                      style={{ padding: '6px 8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 3, cursor: 'pointer', color: T.textFaint, transition: 'all 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = T.red; e.currentTarget.style.background = T.redLight; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textFaint; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                    <button onClick={() => handleLoadFromCloud(elec._id)}
                      style={{ padding: '6px 14px', background: T.accent, border: 'none', borderRadius: 3, cursor: 'pointer', color: 'white', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.accentHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = T.accent)}
                    >
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

const T2 = {
  text: 'hsl(25 15% 12%)',
  textMuted: 'hsl(25 8% 45%)',
  textFaint: 'hsl(25 6% 62%)',
  accent: 'hsl(20 75% 42%)',
  border: 'hsl(30 12% 82%)',
  bgCard: 'hsl(0 0% 100%)',
};

function SectionLabel({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 11 }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T2.accent, letterSpacing: '0.08em', opacity: 0.7 }}>{number}</span>
      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: T2.text, letterSpacing: '-0.01em' }}>{title}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T2.textFaint, letterSpacing: '0.04em' }}>{subtitle}</span>
    </div>
  );
}

function MetricCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T2.bgCard, border: `1px solid ${T2.border}`, borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 7, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.18em', color: T2.textFaint, textTransform: 'uppercase' }}>{label}</span>
      {children}
    </div>
  );
}

function OutlineBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', background: 'transparent', border: `1px solid ${T2.border}`, borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, color: T2.textMuted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'all 0.12s' }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'hsl(30 12% 95%)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  const accent = 'hsl(20 75% 42%)';
  const accentHover = 'hsl(20 75% 36%)';
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 15px', background: 'hsl(20 60% 94%)', border: `1px solid hsl(20 50% 72%)`, borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, color: accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500, transition: 'all 0.12s' }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'hsl(20 55% 89%)')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.background = 'hsl(20 60% 94%)')}
    >
      {children}
    </button>
  );
}

function RunBtn({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const accent = 'hsl(20 75% 42%)';
  return (
    <button type="submit" disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: disabled ? 'hsl(30 10% 90%)' : accent, border: 'none', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, color: disabled ? 'hsl(30 6% 55%)' : 'white', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, transition: 'background 0.12s', boxShadow: disabled ? 'none' : `0 2px 10px ${accent}44` }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'hsl(20 75% 36%)')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.background = accent)}
    >
      {children}
    </button>
  );
}

function Spin() {
  return <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />;
}
