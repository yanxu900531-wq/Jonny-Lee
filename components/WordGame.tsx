import React, { useState, useEffect } from 'react';
import { generateWordChallenge } from '../services/geminiService';
import { WordChallenge } from '../types';
import { Button } from './Button';

interface WordGameProps {
  onAddScore: (points: number) => void;
  onBack: () => void;
  onLearnWords: (words: string[]) => void;
}

export const WordGame: React.FC<WordGameProps> = ({ onAddScore, onBack, onLearnWords }) => {
  const [challenge, setChallenge] = useState<WordChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  const loadNewWord = async () => {
    setLoading(true);
    setChallenge(null); // Clear immediately to show loading screen
    setSelectedOption(null);
    try {
      const data = await generateWordChallenge();
      setChallenge(data);
    } catch (error) {
      console.error("Failed to load word", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNewWord();
  }, []);

  const handleGuess = (index: number) => {
    if (selectedOption !== null || !challenge) return;
    setSelectedOption(index);
    
    if (index === challenge.correctIndex) {
      const points = 10 + (streak * 2);
      onAddScore(points);
      setStreak(s => s + 1);
      onLearnWords([challenge.word]);
    } else {
      setStreak(0);
    }
  };

  // Custom "Mystery" Loading Screen
  if (loading) {
    return (
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="text-gray-500 font-bold">← Exit</button>
          <div className="bg-fun-yellow/20 text-fun-yellow text-dark font-bold px-3 py-1 rounded-full">
             Streak: 🔥 {streak}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl text-center relative overflow-hidden min-h-[450px] flex flex-col items-center justify-center">
           <div className="absolute top-0 left-0 w-full h-2 bg-gray-100" />
           
           <div className="text-7xl mb-6 animate-bounce">🎩</div>
           <h2 className="text-3xl font-display font-bold text-brand-dark mb-4">Mixing Magic...</h2>
           <p className="text-xl text-gray-600 italic mb-8">Guess the next category!</p>
           
           <div className="flex justify-center gap-4 bg-gray-50 p-4 rounded-2xl">
              <div className="text-4xl animate-pulse" style={{animationDelay: '0s'}} title="Food">🍎</div>
              <div className="text-4xl animate-pulse" style={{animationDelay: '0.2s'}} title="Animals">🦁</div>
              <div className="text-4xl animate-pulse" style={{animationDelay: '0.4s'}} title="Sports">⚽</div>
              <div className="text-4xl animate-pulse" style={{animationDelay: '0.6s'}} title="Home">🏠</div>
           </div>
           <p className="text-sm text-gray-400 mt-4">Is it an animal? Or maybe food?</p>
        </div>
      </div>
    );
  }

  if (!challenge) return null;

  const isCorrect = selectedOption === challenge.correctIndex;
  const hasGuessed = selectedOption !== null;

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-gray-500 font-bold">← Exit</button>
        <div className="bg-fun-yellow/20 text-fun-yellow text-dark font-bold px-3 py-1 rounded-full">
          Streak: 🔥 {streak}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-xl text-center relative overflow-hidden min-h-[450px] flex flex-col justify-center">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand via-fun-purple to-fun-pink" />
        
        <div className="text-6xl mb-4 animate-bounce">{challenge.emoji}</div>
        <h2 className="text-4xl font-display font-bold text-gray-800 mb-2">{challenge.word}</h2>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-8">
          <p className="text-xl text-gray-600 italic">"{challenge.sentence}"</p>
        </div>

        <div className="grid gap-3">
          {challenge.options.map((opt, idx) => {
             let btnClass = "w-full p-4 rounded-2xl font-bold text-lg transition-all transform active:scale-95 border-2 ";
             
             if (hasGuessed) {
               if (idx === challenge.correctIndex) btnClass += "bg-green-500 border-green-500 text-white shadow-lg";
               else if (idx === selectedOption) btnClass += "bg-red-500 border-red-500 text-white";
               else btnClass += "bg-gray-100 border-gray-100 text-gray-400";
             } else {
               btnClass += "bg-white border-gray-200 text-gray-700 hover:border-brand hover:text-brand hover:shadow-md";
             }

             return (
               <button
                key={idx}
                onClick={() => handleGuess(idx)}
                disabled={hasGuessed}
                className={btnClass}
               >
                 {opt}
               </button>
             );
          })}
        </div>

        {hasGuessed && (
          <div className="mt-8 animate-fade-in">
            <div className={`mb-4 text-xl font-display font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
              {isCorrect ? "Awesome Job! 🌟" : `The answer was: ${challenge.options[challenge.correctIndex]}`}
            </div>
            <Button onClick={loadNewWord} isLoading={loading} className="w-full">
              Next Word ➔
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};