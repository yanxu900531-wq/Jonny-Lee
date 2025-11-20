import React, { useState, useRef, useEffect } from 'react';
import { generateStory, generateStoryAudio } from '../services/geminiService';
import { StoryData } from '../types';
import { Button } from './Button';
import { LoadingState } from './LoadingState';

interface StoryReaderProps {
  onAddScore: (points: number) => void;
  onBack: () => void;
  onLearnWords: (words: string[]) => void;
}

const quickTopics = [
  { emoji: '🎭', label: 'Furina', prompt: 'Furina, the star of Fontaine, directing a dramatic stage play for ocean creatures while eating cake' },
  { emoji: '⚔️', label: 'Skirk', prompt: 'Skirk, the mysterious sword master from the shadows, teaching a student how to fight a giant space whale' },
  { emoji: '🐉', label: 'Neuvillette', prompt: 'Neuvillette the Hydro Dragon feeling sad and making it rain, then judging a dispute between two crabs' },
  { emoji: '☂️', label: 'Navia', prompt: 'Navia, the boss of Spina di Rosula, baking giant macarons and solving a mystery in Poisson' },
  { emoji: '🍵', label: 'Zhongli', prompt: 'Zhongli walking through Liyue Harbor sharing ancient wisdom about rocks but realizing he forgot his wallet (Mora)' },
  { emoji: '🍃', label: 'Venti', prompt: 'Venti the bard playing a magical song on his lyre to calm the wind dragon Dvalin in Mondstadt' },
  { emoji: '🎆', label: 'Yoimiya', prompt: 'Yoimiya making the most colorful fireworks display for the summer festival in Inazuma' },
  { emoji: '🎩', label: 'Lyney', prompt: 'Lyney the magician performing a magic show in the Opera Epiclese where a cat disappears and reappears in a hat' },
  { emoji: '👻', label: 'Hu Tao', prompt: 'Hu Tao writing funny poems and playing hide-and-seek with a friendly ghost named Boo Tao at night' },
  { emoji: '👺', label: 'Xiao', prompt: 'Xiao the Yaksha protecting Liyue from bad monsters and then enjoying a bowl of Almond Tofu' },
  { emoji: '🍳', label: 'Xiangling', prompt: 'Xiangling and Guoba the bear searching for spicy chili peppers to cook a delicious but weird new dish' },
  { emoji: '⚡', label: 'Raiden Shogun', prompt: 'The Raiden Shogun trying to cook a meal in her kitchen but accidentally causing a thunderstorm' },
  { emoji: '✨', label: 'Paimon', prompt: 'Paimon and the Traveler discovering a hidden treasure chest filled with delicious snacks' },
  { emoji: '💣', label: 'Klee', prompt: 'Klee escaping solitary confinement to go fish blasting at Starfell Lake (Jean is chasing her)' },
  { emoji: '🍃', label: 'Nahida', prompt: 'Nahida the Dendro Archon using her dreams to help a sad child feel happy again' },
];

export const StoryReader: React.FC<StoryReaderProps> = ({ onAddScore, onBack, onLearnWords }) => {
  const [topic, setTopic] = useState('');
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setStory(null);
    setAnswers([]);
    setShowResults(false);
    stopAudio();
    try {
      const data = await generateStory(topic);
      setStory(data);
      setAnswers(new Array(data.questions.length).fill(-1));
    } catch (error) {
      console.error(error);
      alert("Oops! Something went wrong. Try a different topic.");
    } finally {
      setLoading(false);
    }
  };

  const handleReadAloud = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
    if (!story) return;

    // 1. Initialize or Resume AudioContext IMMEDIATELY on click
    // This ensures mobile browsers unlock audio playback
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    setAudioLoading(true);
    try {
      // 2. Fetch audio data (raw PCM as floats)
      const { audioData, sampleRate } = await generateStoryAudio(story.content);
      
      if (!audioContextRef.current) return; // Safety check

      // 3. Create AudioBuffer
      const buffer = audioContextRef.current.createBuffer(1, audioData.length, sampleRate);
      buffer.getChannelData(0).set(audioData);

      // 4. Play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start(0);
      sourceNodeRef.current = source;
      setIsPlaying(true);
    } catch (e) {
      console.error("Audio error", e);
      alert("Couldn't generate audio right now.");
    } finally {
      setAudioLoading(false);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleAnswer = (qIndex: number, optionIndex: number) => {
    if (showResults) return;
    const newAnswers = [...answers];
    newAnswers[qIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const checkAnswers = () => {
    if (!story) return;
    let correctCount = 0;
    story.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswerIndex) correctCount++;
    });
    onAddScore(correctCount * 10);
    setShowResults(true);

    // Save words
    if (story.vocabulary && story.vocabulary.length > 0) {
      onLearnWords(story.vocabulary);
    }
  };

  if (loading) return <LoadingState text="Writing a story for Rachel..." />;

  if (!story) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-3xl shadow-xl border-b-8 border-brand-light">
        <button onClick={onBack} className="mb-4 text-gray-400 hover:text-gray-600 font-bold">← Back</button>
        <h2 className="text-3xl font-display font-bold text-brand-dark mb-6 text-center">
          Story Time! 📚
        </h2>
        <div className="space-y-4">
          <p className="text-lg text-gray-600 text-center">
            What do you want to read about today, Rachel?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., A magical unicorn, A school trip..."
              className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg focus:border-brand focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <Button onClick={handleGenerate} disabled={!topic.trim()}>
              Create Story
            </Button>
          </div>
          
          <div className="pt-6">
            <p className="text-sm text-gray-400 font-bold mb-3 uppercase tracking-wider">Genshin Impact Picks ✨</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quickTopics.map(t => (
                <button 
                  key={t.label}
                  onClick={() => setTopic(t.prompt)}
                  className="p-3 bg-gray-50 rounded-xl hover:bg-brand-light/30 text-gray-600 font-bold transition-colors text-sm sm:text-base text-left flex items-center gap-2 group"
                >
                  <span className="group-hover:scale-110 transition-transform">{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
       <div className="flex justify-between items-center">
        <button onClick={() => { stopAudio(); onBack(); }} className="px-4 py-2 bg-white rounded-xl shadow text-gray-600 font-bold">← Back</button>
        <Button variant="secondary" size="sm" onClick={() => { setStory(null); setTopic(''); stopAudio(); }}>
           New Story
        </Button>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-lg border-b-8 border-fun-yellow/50 relative">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-800">{story.title}</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReadAloud}
            isLoading={audioLoading}
            className="min-w-[140px]"
          >
             {isPlaying ? '⏹ Stop' : '🔊 Read Aloud'}
          </Button>
        </div>
        
        <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
          {story.content}
        </div>
        
        <div className="mt-6 flex flex-wrap gap-2">
            {story.vocabulary.map((word, i) => (
                <span key={i} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-sm font-bold">
                    {word}
                </span>
            ))}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Summary (Chinese)</h3>
          <p className="text-gray-600">{story.chineseSummary}</p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-display font-bold text-center text-brand-dark">Did you understand? 🤔</h3>
        {story.questions.map((q, qIdx) => {
          const isAnswered = answers[qIdx] !== -1;
          const isCorrect = answers[qIdx] === q.correctAnswerIndex;
          
          return (
            <div key={qIdx} className="bg-white rounded-2xl p-6 shadow-md">
              <p className="text-lg font-bold text-gray-800 mb-4">{qIdx + 1}. {q.questionText}</p>
              <div className="grid gap-3">
                {q.options.map((opt, optIdx) => {
                  let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all ";
                  if (showResults) {
                    if (optIdx === q.correctAnswerIndex) btnClass += "bg-green-100 border-green-500 text-green-800";
                    else if (answers[qIdx] === optIdx) btnClass += "bg-red-100 border-red-500 text-red-800";
                    else btnClass += "border-gray-100 opacity-50";
                  } else {
                    if (answers[qIdx] === optIdx) btnClass += "bg-brand-light border-brand text-brand-dark font-bold";
                    else btnClass += "border-gray-100 hover:border-brand-light hover:bg-gray-50";
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleAnswer(qIdx, optIdx)}
                      className={btnClass}
                      disabled={showResults}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {showResults && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <p className="font-bold">{isCorrect ? "Correct! 🎉" : "Nice try! 😅"}</p>
                  <p>{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}

        {!showResults && (
          <div className="flex justify-center pt-4">
            <Button size="lg" onClick={checkAnswers} disabled={answers.some(a => a === -1)}>
              Check Answers
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};