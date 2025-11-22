import React, { useState, useEffect } from 'react';
import { generateCrossword } from '../services/geminiService';
import { CrosswordData } from '../types';
import { Button } from './Button';
import { LoadingState } from './LoadingState';

interface CrosswordGameProps {
  onAddScore: (points: number) => void;
  onBack: () => void;
  onLearnWords: (words: string[]) => void;
}

const GRID_SIZE = 10;

export const CrosswordGame: React.FC<CrosswordGameProps> = ({ onAddScore, onBack, onLearnWords }) => {
  const [data, setData] = useState<CrosswordData | null>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [userInputs, setUserInputs] = useState<string[][]>([]);
  const [lockedCells, setLockedCells] = useState<boolean[][]>([]); // Hints are locked
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const loadGame = async () => {
    setLoading(true);
    setSolved(false);
    setFeedback(null);
    setData(null);
    try {
      const crosswordData = await generateCrossword();
      setData(crosswordData);
      
      const emptyGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
      const inputGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
      const locks = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
      
      // 1. Map structure
      crosswordData.words.forEach(w => {
        for (let i = 0; i < w.word.length; i++) {
           if (w.direction === 'across') {
             emptyGrid[w.startY][w.startX + i] = '#';
           } else {
             emptyGrid[w.startY + i][w.startX] = '#';
           }
        }
      });
      
      // 2. Apply Hints (Fill ~30% of letters randomly)
      crosswordData.words.forEach(w => {
         const chars = w.word.toUpperCase().split('');
         // Pick 1-2 random indices to reveal per word
         const numReveals = Math.ceil(chars.length * 0.3);
         const indices = new Set<number>();
         while (indices.size < numReveals) {
            indices.add(Math.floor(Math.random() * chars.length));
         }
         
         indices.forEach(idx => {
            const r = w.direction === 'across' ? w.startY : w.startY + idx;
            const c = w.direction === 'across' ? w.startX + idx : w.startX;
            inputGrid[r][c] = chars[idx];
            locks[r][c] = true;
         });
      });

      setGrid(emptyGrid);
      setUserInputs(inputGrid);
      setLockedCells(locks);

    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', text: "Failed to load crossword." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGame();
  }, []);

  const handleInputChange = (row: number, col: number, val: string) => {
    if (lockedCells[row][col]) return;
    setFeedback(null);
    
    // Handle empty (delete)
    if (val === '') {
      const newInputs = [...userInputs.map(r => [...r])];
      newInputs[row][col] = '';
      setUserInputs(newInputs);
      return;
    }

    // Take last character for new input to prevent multi-char strings from autocomplete
    const lastChar = val.slice(-1);

    // Only allow letters
    if (!/^[a-zA-Z]$/.test(lastChar)) return;

    const newInputs = [...userInputs.map(r => [...r])];
    newInputs[row][col] = lastChar.toUpperCase();
    setUserInputs(newInputs);
  };

  const checkPuzzle = () => {
    if (!data) return;
    let allCorrect = true;

    data.words.forEach(w => {
      const wUpper = w.word.toUpperCase();
      for (let i = 0; i < wUpper.length; i++) {
        const r = w.direction === 'across' ? w.startY : w.startY + i;
        const c = w.direction === 'across' ? w.startX + i : w.startX;
        if (userInputs[r][c] !== wUpper[i]) {
          allCorrect = false;
        }
      }
    });

    if (allCorrect) {
      setSolved(true);
      setFeedback({ type: 'success', text: "Awesome! +50 Points 🌟" });
      onAddScore(50);
      const learned = data.words.map(w => w.word);
      onLearnWords(learned);
    } else {
      setFeedback({ type: 'error', text: "Not quite! Check your spelling and try again." });
    }
  };

  if (loading) return <LoadingState text="Building a puzzle for Rachel..." />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="px-4 py-2 bg-white rounded-xl shadow text-gray-600 font-bold">← Back</button>
        <Button variant="secondary" size="sm" onClick={loadGame}>New Puzzle</Button>
      </div>

      {data && (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-brand-light overflow-auto">
             <h2 className="text-2xl font-display font-bold text-center mb-4 text-brand-dark">{data.title}</h2>
             <div className="grid gap-1 bg-gray-200 p-1 rounded-xl" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
               {grid.map((row, rIdx) => (
                 row.map((cell, cIdx) => {
                   const isActive = cell === '#';
                   const isLocked = lockedCells[rIdx][cIdx];
                   
                   // Check for ALL words starting at this cell to display multiple IDs
                   const startWords = data.words.filter(w => w.startY === rIdx && w.startX === cIdx);
                   
                   return (
                     <div key={`${rIdx}-${cIdx}`} className={`relative aspect-square w-8 sm:w-10 ${isActive ? 'bg-white' : 'bg-transparent'}`}>
                       {isActive ? (
                         <>
                           {startWords.length > 0 && (
                             <span className="absolute top-0.5 left-0.5 text-[10px] leading-none font-bold text-gray-600 z-20 pointer-events-none bg-white/80 px-0.5 rounded">
                               {startWords.map(w => w.id).join('/')}
                             </span>
                           )}
                           <input 
                             id={`cell-${rIdx}-${cIdx}`}
                             name={`cell-${rIdx}-${cIdx}`}
                             type="text"
                             maxLength={1}
                             autoComplete="off"
                             autoCorrect="off"
                             autoCapitalize="characters"
                             spellCheck="false"
                             value={userInputs[rIdx][cIdx]}
                             onChange={(e) => handleInputChange(rIdx, cIdx, e.target.value)}
                             disabled={solved || isLocked}
                             className={`w-full h-full text-center font-bold uppercase text-lg sm:text-xl border rounded focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent z-10 relative bg-transparent
                               ${solved ? 'text-green-600' : 'text-gray-800'} 
                               ${isLocked ? 'bg-gray-50' : 'bg-white'}
                             `}
                           />
                         </>
                       ) : (
                         <div className="w-full h-full"></div>
                       )}
                     </div>
                   );
                 })
               ))}
             </div>
             
             <div className="mt-6 flex flex-col items-center">
                {feedback && (
                    <div className={`mb-3 font-bold px-4 py-2 rounded-xl animate-fade-in ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {feedback.text}
                    </div>
                )}
                {!solved ? (
                   <Button onClick={checkPuzzle}>Check Answers</Button>
                ) : (
                   <Button onClick={loadGame} variant="secondary">Play Again</Button>
                )}
             </div>
          </div>

          <div className="flex-1 bg-white p-6 rounded-3xl shadow-lg h-fit">
            <h3 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Clues 🕵️‍♀️</h3>
            <div className="grid gap-6">
              <div>
                <h4 className="font-bold text-brand uppercase tracking-wider text-sm mb-2">Across ➡️</h4>
                <ul className="space-y-2">
                  {data.words.filter(w => w.direction === 'across').map(w => (
                    <li key={w.id} className="text-gray-600 text-sm">
                      <span className="font-bold text-gray-900 mr-1">{w.id}.</span>
                      {w.clue}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-brand uppercase tracking-wider text-sm mb-2">Down ⬇️</h4>
                <ul className="space-y-2">
                   {data.words.filter(w => w.direction === 'down').map(w => (
                    <li key={w.id} className="text-gray-600 text-sm">
                      <span className="font-bold text-gray-900 mr-1">{w.id}.</span>
                      {w.clue}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};