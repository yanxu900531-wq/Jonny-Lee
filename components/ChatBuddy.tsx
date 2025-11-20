import React, { useState, useRef, useEffect } from 'react';
import { ai, getChatResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Modality, LiveServerMessage } from '@google/genai';
import { Button } from './Button';

interface ChatBuddyProps {
  onBack: () => void;
  onLearnWords: (words: string[]) => void;
}

// Helper to convert float32 audio to int16 pcm for Gemini
const floatTo16BitPCM = (input: Float32Array) => {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
};

// Helper to base64 encode
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// Helper to decode audio from Gemini
function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const ChatBuddy: React.FC<ChatBuddyProps> = ({ onBack, onLearnWords }) => {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm Sparky. 🐿️ Type below or switch to Voice Mode!" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  
  // Manual word adding
  const [wordInput, setWordInput] = useState('');
  const [showWordInput, setShowWordInput] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        stopVoiceMode();
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await getChatResponse(history, userMsg.text);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Oops! Sparky is confused." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAddWord = () => {
      if (wordInput.trim()) {
          onLearnWords([wordInput.trim()]);
          setWordInput('');
          setShowWordInput(false);
          // Optional feedback
          alert(`Added "${wordInput}" to your journal!`);
      }
  };

  const startVoiceMode = async () => {
    try {
      setMode('voice');
      setVoiceActive(true);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      
      // Input stream (Mic)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      streamRef.current = stream;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => {
                console.log("Live session connected");
                // Start Processing Audio
                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = floatTo16BitPCM(inputData);
                    const base64 = arrayBufferToBase64(pcm16.buffer);
                    
                    sessionPromise.then(session => {
                        session.sendRealtimeInput({ 
                            media: { 
                                mimeType: 'audio/pcm;rate=16000', 
                                data: base64 
                            } 
                        });
                    });
                };
                source.connect(processor);
                processor.connect(audioContext.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
                 const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                 if (base64Audio) {
                     const audioData = decodeAudio(base64Audio);
                     // Decode the raw PCM from model (24kHz)
                     const float32Data = new Float32Array(audioData.length / 2);
                     const dataView = new DataView(audioData.buffer);
                     
                     for(let i=0; i < float32Data.length; i++) {
                         float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
                     }

                     const buffer = audioContext.createBuffer(1, float32Data.length, 24000);
                     buffer.getChannelData(0).set(float32Data);

                     const playSource = audioContext.createBufferSource();
                     playSource.buffer = buffer;
                     playSource.connect(audioContext.destination);
                     
                     const startTime = Math.max(audioContext.currentTime, nextStartTimeRef.current);
                     playSource.start(startTime);
                     nextStartTimeRef.current = startTime + buffer.duration;
                 }
            },
            onclose: () => {
                console.log("Live session closed");
                setVoiceActive(false);
            },
            onerror: (err) => {
                console.error("Live session error", err);
                setVoiceActive(false);
            }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            },
            systemInstruction: "You are Sparky the Squirrel. You are chatting with a 4th grade child. Be short, very funny, and encouraging. Speak simply.",
        }
      });

      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error("Failed to start voice mode", e);
      alert("Could not access microphone.");
      setMode('text');
    }
  };

  const stopVoiceMode = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    
    setVoiceActive(false);
    setMode('text');
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[80vh] bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-fun-purple relative">
      {/* Header */}
      <div className="bg-fun-purple p-4 flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
            <button onClick={() => { stopVoiceMode(); onBack(); }} className="text-white hover:bg-white/20 p-2 rounded-full">←</button>
            <div className="relative">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow">🐿️</div>
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${voiceActive ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`}></div>
            </div>
            <div>
            <h3 className="font-display font-bold text-white text-lg">Sparky</h3>
            <p className="text-purple-100 text-xs">{mode === 'voice' ? 'Listening...' : 'Your English Buddy'}</p>
            </div>
        </div>
        <button 
            onClick={mode === 'text' ? startVoiceMode : stopVoiceMode}
            className={`px-4 py-1 rounded-full text-sm font-bold transition-colors ${
                mode === 'text' ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500 text-white hover:bg-red-600'
            }`}
        >
            {mode === 'text' ? '🎙️ Voice Mode' : 'End Voice'}
        </button>
      </div>

      {mode === 'voice' ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-purple-50 p-8 text-center space-y-8">
              <div className={`w-40 h-40 rounded-full bg-fun-purple flex items-center justify-center text-6xl shadow-xl transition-transform duration-500 ${voiceActive ? 'scale-110' : ''}`}>
                  🐿️
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-bold text-gray-800">I'm listening!</h2>
                <p className="text-gray-500">Speak to Sparky...</p>
              </div>
              <div className="flex gap-1 h-8 items-end">
                   {/* Fake visualizer */}
                   {[1,2,3,4,5].map(i => (
                       <div key={i} className="w-2 bg-fun-purple rounded-full animate-bounce" style={{ height: '100%', animationDelay: `${i * 0.1}s`}}></div>
                   ))}
              </div>
          </div>
      ) : (
        <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-purple-50">
                {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                    className={`max-w-[80%] px-5 py-3 rounded-2xl text-lg leading-snug ${
                        msg.role === 'user' 
                        ? 'bg-fun-purple text-white rounded-br-none shadow-md' 
                        : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-purple-100'
                    }`}
                    >
                    {msg.text}
                    </div>
                </div>
                ))}
                {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-purple-100 flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
                {showWordInput && (
                    <div className="mb-2 flex gap-2 bg-yellow-50 p-2 rounded-xl animate-fade-in">
                        <input 
                            type="text" 
                            placeholder="Type a word you learned..."
                            className="flex-1 px-3 py-2 rounded-lg border border-yellow-200 text-sm"
                            value={wordInput}
                            onChange={e => setWordInput(e.target.value)}
                        />
                        <Button size="sm" variant="secondary" onClick={handleAddWord}>Save</Button>
                        <button onClick={() => setShowWordInput(false)} className="text-gray-400 hover:text-gray-600 px-2">✕</button>
                    </div>
                )}
                <div className="flex gap-2">
                <button 
                  onClick={() => setShowWordInput(!showWordInput)}
                  className="p-3 rounded-xl bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition-colors"
                  title="Save a word to your journal"
                >
                    ⭐
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type something..."
                    className="flex-1 bg-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fun-purple/50"
                    disabled={isTyping}
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="bg-fun-purple text-white px-6 rounded-xl font-bold hover:bg-purple-600 disabled:opacity-50 transition-colors"
                >
                    Send
                </button>
                </div>
            </div>
        </>
      )}
    </div>
  );
};