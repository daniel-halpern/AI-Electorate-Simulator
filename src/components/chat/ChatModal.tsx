import React, { useState, useRef, useEffect } from 'react';
import { Citizen, Policy } from '@/types/ideology';
import { X, Send, Play, Square, Loader2 } from 'lucide-react';

interface ChatModalProps {
    citizenData: any; // The node data from IdeologyScatter containing citizen and voteRecord
    policy: Policy;
    onClose: () => void;
}

export default function ChatModal({ citizenData, policy, onClose }: ChatModalProps) {
    const { citizen, voteRecord } = citizenData;
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Audio State
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioState, setAudioState] = useState<{ status: 'idle' | 'fetching' | 'playing', index: number | null }>({ status: 'idle', index: null });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial greeting based on their vote
    useEffect(() => {
        let text = "";

        if (!voteRecord) {
            text = `Hi, I'm ${citizen.name}. I haven't made up my mind yet about the "${policy.title}" proposal. What do you want to ask me?`;
        } else {
            let voteStr = "";
            if (!voteRecord.didVote) {
                voteStr = "abstained from voting on";
            } else {
                voteStr = voteRecord.vote ? "voted in favor of" : "opposed";
            }
            text = `Hi, I'm ${citizen.name}. I ${voteStr} the "${policy.title}" proposal. What do you want to ask me?`;
        }

        setMessages([{
            role: 'model',
            text
        }]);
    }, [citizen, policy, voteRecord]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handlePlayAudio = async (text: string, index: number) => {
        if (audioState.index === index && audioState.status === 'playing') {
            audioRef.current?.pause();
            setAudioState({ status: 'idle', index: null });
            return;
        }

        audioRef.current?.pause();
        setAudioState({ status: 'fetching', index });

        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voiceId: citizen.citizenId?.charCodeAt(0) % 2 === 0 ? "EXAVITQu4vr4xnSDxMaL" : "pNInz6obpgDQGcFmaJgB" }) // basic pseudorandom voice swap based on name
            });
            if (!res.ok) throw new Error((await res.json()).error || "TTS Failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            if (!audioRef.current) audioRef.current = new Audio();
            audioRef.current.src = url;
            audioRef.current.onended = () => setAudioState({ status: 'idle', index: null });
            audioRef.current.play();
            setAudioState({ status: 'playing', index });
        } catch (err: any) {
            console.error(err);
            alert("Voice generation failed: " + err.message);
            setAudioState({ status: 'idle', index: null });
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsTyping(true);

        try {
            const res = await fetch('/api/chatCitizen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    citizen: citizenData,
                    policyText: policy.description,
                    history: messages.slice(1) // exclude initial hardcoded greeting
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'model', text: `[System Error: ${err.message}]` }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,15,10,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'hsl(0 0% 100%)', border: `1px solid hsl(30 12% 82%)`, borderRadius: 12, width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', height: '80vh', maxHeight: 700, boxShadow: '0 24px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid hsl(30 12% 82%)`, background: 'hsl(36 18% 91%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: 'hsl(25 15% 12%)', margin: '0 0 2px 0' }}>{citizen.name}</h2>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'hsl(25 8% 45%)', letterSpacing: '0.05em' }}>
                            {citizen.age} yrs · {voteRecord ? (
                                !voteRecord.didVote ? <span style={{ color: 'hsl(25 8% 45%)', fontStyle: 'italic' }}>Abstained</span> :
                                    voteRecord.vote ? <span style={{ color: 'hsl(142 45% 36%)' }}>Voted Yes</span> : <span style={{ color: 'hsl(0 60% 48%)' }}>Voted No</span>
                            ) : (
                                <span style={{ color: 'hsl(30 15% 65%)', fontStyle: 'italic' }}>Undecided</span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(25 8% 45%)', padding: 4, borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <X size={18} />
                    </button>
                </div>

                {/* Profile Snapshot */}
                <div style={{ padding: '12px 20px', background: 'hsl(40 20% 96%)', borderBottom: `1px solid hsl(30 12% 82%)`, fontSize: 12, fontFamily: "'Newsreader', serif", color: 'hsl(25 8% 45%)', lineHeight: 1.5, fontStyle: 'italic' }}>
                    "{citizen.worldview}"
                </div>

                {/* Chat Log */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, background: 'hsl(0 0% 100%)' }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                            {m.role === 'model' && (
                                <button
                                    onClick={() => handlePlayAudio(m.text, i)}
                                    disabled={audioState.status === 'fetching' && audioState.index !== i}
                                    style={{
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: audioState.index === i && audioState.status === 'playing' ? 'hsl(20 75% 42%)' : 'hsl(40 20% 90%)',
                                        border: `1px solid ${audioState.index === i && audioState.status === 'playing' ? 'hsl(20 75% 42%)' : 'hsl(30 12% 82%)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                                        color: audioState.index === i && audioState.status === 'playing' ? 'white' : 'hsl(25 15% 12%)'
                                    }}
                                >
                                    {audioState.index === i && audioState.status === 'fetching' ? (
                                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                    ) : audioState.index === i && audioState.status === 'playing' ? (
                                        <Square size={10} fill="currentColor" />
                                    ) : (
                                        <Play size={12} fill="currentColor" style={{ marginLeft: 2 }} />
                                    )}
                                </button>
                            )}
                            <div style={{
                                maxWidth: '85%',
                                padding: '10px 14px',
                                borderRadius: 8,
                                background: m.role === 'user' ? 'hsl(20 75% 42%)' : 'hsl(40 15% 97%)',
                                color: m.role === 'user' ? 'white' : 'hsl(25 15% 12%)',
                                border: m.role === 'model' ? `1px solid hsl(30 12% 82%)` : 'none',
                                fontFamily: "'Newsreader', serif",
                                fontSize: 14,
                                lineHeight: 1.5
                            }}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'hsl(40 15% 97%)', border: `1px solid hsl(30 12% 82%)`, color: 'hsl(25 15% 12%)' }}>
                                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} style={{ padding: 16, borderTop: `1px solid hsl(30 12% 82%)`, background: 'hsl(40 20% 96%)', display: 'flex', gap: 8 }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Debate this citizen..."
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 6, border: `1px solid hsl(30 12% 82%)`, fontFamily: "'Newsreader', serif", fontSize: 14, outline: 'none' }}
                        onFocus={e => (e.target.style.borderColor = 'hsl(20 75% 42%)')}
                        onBlur={e => (e.target.style.borderColor = 'hsl(30 12% 82%)')}
                    />
                    <button type="submit" disabled={!input.trim() || isTyping} style={{ padding: '0 16px', background: 'hsl(20 75% 42%)', border: 'none', borderRadius: 6, color: 'white', cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer', opacity: !input.trim() || isTyping ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Send size={16} />
                    </button>
                </form>

            </div>
        </div>
    );
}
