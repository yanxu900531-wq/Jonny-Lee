
import React, { useState, useRef } from 'react';
import { analyzeHomework } from '../services/geminiService';
import { HomeworkAnalysisResult } from '../types';
import { Button } from './Button';
import { LoadingState } from './LoadingState';

interface HomeworkHelperProps {
  onBack: () => void;
}

export const HomeworkHelper: React.FC<HomeworkHelperProps> = ({ onBack }) => {
  const [images, setImages] = useState<string[]>([]);
  const [result, setResult] = useState<HomeworkAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert all selected files to base64
    const newImages: string[] = [];
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        promises.push(new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
            if (reader.result) {
                newImages.push((reader.result as string).split(',')[1]);
            }
            resolve();
            };
            reader.readAsDataURL(file);
        }));
    }

    await Promise.all(promises);
    setImages(prev => [...prev, ...newImages]);
  };

  const handleClear = () => {
    setImages([]);
    setResult(null);
  };

  const startAnalysis = async () => {
    if (images.length === 0) return;
    setLoading(true);
    try {
      const analysisData = await analyzeHomework(images);
      setResult(analysisData);
    } catch (error) {
      console.error(error);
      alert("Oops! Couldn't grade the homework right now. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState text="Grading homework... 🍎" />;

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="px-4 py-2 bg-white rounded-xl shadow text-gray-600 font-bold">← Back</button>
        <h2 className="text-2xl font-display font-bold text-brand-dark">Homework Helper ✍️</h2>
      </div>

      {!result ? (
        <div className="bg-white rounded-3xl p-8 shadow-xl border-t-8 border-fun-purple">
          <div className="text-center space-y-6">
            <div className="text-6xl animate-bounce">📸</div>
            <h3 className="text-xl font-bold text-gray-800">Upload Homework Photos</h3>
            <p className="text-gray-500">Take photos of your English homework. I will check them for you!</p>
            
            <div className="flex flex-col items-center gap-4">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Button onClick={() => fileInputRef.current?.click()} size="lg" className="w-full sm:w-auto">
                {images.length > 0 ? 'Add More Photos' : 'Select Photos'}
              </Button>
            </div>

            {images.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-2xl animate-fade-in">
                <p className="font-bold text-gray-600 mb-3">{images.length} photo(s) selected</p>
                <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                  {images.map((img, idx) => (
                    <div key={idx} className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                      <img src={`data:image/jpeg;base64,${img}`} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-center mt-4">
                  <Button variant="danger" size="sm" onClick={handleClear}>Clear</Button>
                  <Button variant="primary" onClick={startAnalysis}>Check Homework ✅</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Result Header */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border-l-8 border-brand">
             <div className="flex justify-between items-center">
               <h3 className="text-2xl font-display font-bold text-gray-800">Grading Report</h3>
               <Button variant="secondary" size="sm" onClick={handleClear}>New Homework</Button>
             </div>
          </div>

          {/* Corrections List */}
          <div className="grid gap-4">
            {result.corrections.map((item, idx) => (
              <div key={idx} className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${item.isCorrect ? 'border-green-100' : 'border-red-100'}`}>
                <div className="flex items-start gap-4">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${item.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                     {item.isCorrect ? '✓' : '✗'}
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{item.questionNumber}</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800 mb-2">"{item.studentText}"</p>
                      
                      {!item.isCorrect && (
                        <div className="bg-red-50 rounded-xl p-3 text-sm">
                          <p className="text-red-800 font-bold mb-1">Correct Answer: {item.correctAnswer}</p>
                          <p className="text-red-600">{item.explanation}</p>
                        </div>
                      )}
                      {item.isCorrect && (
                         <p className="text-green-600 font-bold text-sm">Great job!</p>
                      )}
                   </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Card */}
          <div className="bg-gradient-to-br from-fun-yellow/20 to-orange-100 rounded-3xl p-6 shadow-xl border-t-8 border-fun-yellow">
            <h3 className="text-xl font-display font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🧐</span> Teacher's Summary
            </h3>
            
            <div className="mb-6">
              <h4 className="font-bold text-gray-700 mb-2">Why did I make mistakes?</h4>
              <p className="bg-white/60 p-4 rounded-xl text-gray-700 leading-relaxed">
                {result.summary.commonErrors}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-700 mb-2">How can I do better?</h4>
              <ul className="space-y-2">
                {result.summary.solutions.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 bg-white/60 p-3 rounded-xl text-gray-700">
                    <span className="text-fun-yellow font-bold">★</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
