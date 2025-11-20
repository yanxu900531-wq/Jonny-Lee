import React, { useState, useRef } from 'react';
import { extractWordsFromImage } from '../services/geminiService';
import { Button } from './Button';
import { LoadingState } from './LoadingState';

interface DictationPracticeProps {
  onBack: () => void;
  onLearnWords: (words: string[]) => void;
}

export const DictationPractice: React.FC<DictationPracticeProps> = ({ onBack, onLearnWords }) => {
  const [step, setStep] = useState<'upload' | 'review' | 'practice'>('upload');
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [intervalTime, setIntervalTime] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const extractedWords = await extractWordsFromImage(base64String);
        setWords(extractedWords);
        setStep('review');
      } catch (err) {
        console.error(err);
        alert("Couldn't extract words. Try a clearer photo!");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const speakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const startDictation = () => {
    setStep('practice');
    setIsPlaying(true);
    setCurrentIndex(-1);
    playNextWord(-1);
  };

  const playNextWord = (idx: number) => {
    const nextIdx = idx + 1;
    if (nextIdx >= words.length) {
      setIsPlaying(false);
      setCurrentIndex(words.length);
      onLearnWords(words); // Save history
      return;
    }

    setCurrentIndex(nextIdx);
    speakWord(words[nextIdx]);

    timerRef.current = window.setTimeout(() => {
      playNextWord(nextIdx);
    }, intervalTime * 1000);
  };

  const stopDictation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const resetDictation = () => {
    stopDictation();
    setStep('review');
    setCurrentIndex(-1);
  };

  if (loading) return <LoadingState text="Reading your photo..." />;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => { stopDictation(); onBack(); }} className="mb-6 px-4 py-2 bg-white rounded-xl shadow text-gray-600 font-bold">← Back</button>

      <div className="bg-white rounded-3xl p-8 shadow-xl border-t-8 border-fun-green">
        <h2 className="text-3xl font-display font-bold text-center text-gray-800 mb-8">
          Magic Dictation 📝
        </h2>

        {step === 'upload' && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
            <div className="text-6xl mb-4">📸</div>
            <p className="text-lg text-gray-600 mb-6">Take a photo of your English book vocabulary!</p>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button size="lg" onClick={() => fileInputRef.current?.click()}>
              Upload Photo
            </Button>
          </div>
        )}

        {step === 'review' && (
          <div>
            <p className="text-center text-gray-500 mb-4">I found these words. Are they correct?</p>
            <div className="bg-sky-50 p-4 rounded-2xl mb-6 grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {words.map((w, i) => (
                <div key={i} className="bg-white px-3 py-2 rounded-lg shadow-sm text-center font-bold text-gray-700">
                  {w}
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center gap-4 mb-6 bg-gray-100 p-3 rounded-xl">
              <span className="font-bold text-gray-600">Speed:</span>
              <input 
                type="range" 
                min="3" 
                max="10" 
                value={intervalTime} 
                onChange={(e) => setIntervalTime(parseInt(e.target.value))}
                className="w-32 accent-fun-green"
              />
              <span className="font-bold text-fun-green">{intervalTime} seconds</span>
            </div>

            <div className="flex justify-center gap-4">
               <Button variant="outline" onClick={() => setStep('upload')}>Retake</Button>
               <Button onClick={startDictation}>Start Dictation ▶️</Button>
            </div>
          </div>
        )}

        {step === 'practice' && (
          <div className="text-center space-y-8">
            <div className="text-sm font-bold text-gray-400 uppercase">
               Word {Math.min(currentIndex + 1, words.length)} of {words.length}
            </div>

            <div className="py-12">
               {isPlaying ? (
                 <div className="animate-pulse text-6xl">🔊</div>
               ) : (
                 <div className="text-6xl">✅</div>
               )}
               <p className="mt-4 text-xl font-bold text-gray-700">
                 {isPlaying ? "Listen and Write..." : "All done!"}
               </p>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="danger" onClick={resetDictation}>Stop</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};