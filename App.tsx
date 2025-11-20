import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import { StoryReader } from './components/StoryReader';
import { WordGame } from './components/WordGame';
import { ChatBuddy } from './components/ChatBuddy';
import { CrosswordGame } from './components/CrosswordGame';
import { DictationPractice } from './components/DictationPractice';
import { LearningCalendar } from './components/LearningCalendar';
import { SmartImage } from './components/SmartImage';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [score, setScore] = useState(0);
  const [animateScore, setAnimateScore] = useState(false);

  // Load score
  useEffect(() => {
    const saved = localStorage.getItem('wonderWordScore');
    if (saved) setScore(parseInt(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('wonderWordScore', score.toString());
  }, [score]);

  // Cleanup legacy icons to prevent QuotaExceededError
  useEffect(() => {
    try {
      // We loop backwards because removing items changes the length/indices
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('icon_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      if (keysToRemove.length > 0) {
        console.log(`Cleaned up ${keysToRemove.length} legacy icons from LocalStorage.`);
      }
    } catch (e) {
      console.warn("Cleanup failed", e);
    }
  }, []);

  const handleAddScore = (points: number) => {
    setScore(prev => prev + points);
    setAnimateScore(true);
    setTimeout(() => setAnimateScore(false), 1000);
  };

  const handleLearnWords = (newWords: string[]) => {
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const historyJson = localStorage.getItem('rachelLearningHistory');
      const history: Record<string, string[]> = historyJson ? JSON.parse(historyJson) : {};
      
      // Ensure it's an array in case of corruption
      const existing = Array.isArray(history[dateStr]) ? history[dateStr] : [];
      
      // Merge and dedup (case insensitive check)
      const existingLower = new Set(existing.map((w: string) => w.toLowerCase()));
      const toAdd = newWords.filter(w => !existingLower.has(w.toLowerCase()));
      
      const merged = [...existing, ...toAdd];
      
      if (toAdd.length > 0) {
          history[dateStr] = merged;
          localStorage.setItem('rachelLearningHistory', JSON.stringify(history));
      }
    } catch (e) {
      console.error("Failed to save words", e);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.STORY:
        return <StoryReader onAddScore={handleAddScore} onBack={() => setCurrentView(AppView.HOME)} onLearnWords={handleLearnWords} />;
      case AppView.QUIZ:
        return <WordGame onAddScore={handleAddScore} onBack={() => setCurrentView(AppView.HOME)} onLearnWords={handleLearnWords} />;
      case AppView.CHAT:
        return <ChatBuddy onBack={() => setCurrentView(AppView.HOME)} onLearnWords={handleLearnWords} />;
      case AppView.CROSSWORD:
        return <CrosswordGame onAddScore={handleAddScore} onBack={() => setCurrentView(AppView.HOME)} onLearnWords={handleLearnWords} />;
      case AppView.DICTATION:
        return <DictationPractice onBack={() => setCurrentView(AppView.HOME)} onLearnWords={handleLearnWords} />;
      case AppView.CALENDAR:
        return <LearningCalendar onBack={() => setCurrentView(AppView.HOME)} />;
      default:
        return <Home onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 font-sans selection:bg-brand selection:text-white pb-safe">
      {/* Navigation / Header with Safe Area padding for iOS Notch */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-sky-100 pt-safe">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView(AppView.HOME)} role="button">
            <span className="text-3xl">🌈</span>
            <h1 className="text-2xl font-display font-bold text-brand-dark hidden sm:block">
              WonderWord
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white border-2 border-yellow-400 rounded-full px-4 py-1 shadow-sm">
              <span className="text-xl">⭐</span>
              <span className={`text-xl font-bold text-yellow-600 transition-transform duration-300 ${animateScore ? 'scale-150' : ''}`}>
                {score}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {renderView()}
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm pb-12">
        <p>Made with ❤️ for Rachel</p>
      </footer>
    </div>
  );
};

// Home Component
const Home: React.FC<{ onViewChange: (view: AppView) => void }> = ({ onViewChange }) => {
  return (
    <div className="space-y-12 py-4">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-display font-bold text-brand-dark">
          Ready to explore, Rachel? 🌍
        </h2>
        <p className="text-xl text-gray-600">Pick a game to start learning!</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard 
          title="Story Magic"
          description="Read stories and now listen to them!"
          prompt="A magical open book with sparkling letters flying out, cute 3d icon white background"
          cacheKey="story_icon_v2"
          fallbackEmoji="📚"
          color="bg-fun-pink"
          onClick={() => onViewChange(AppView.STORY)}
        />
        <FeatureCard 
          title="Word Wizard"
          description="Guess the word from emojis and sentences."
          prompt="A magical wizard hat and a spellbook, cute 3d cartoon icon, white background"
          cacheKey="quiz_icon_v3" 
          fallbackEmoji="🧙‍♂️"
          color="bg-brand"
          onClick={() => onViewChange(AppView.QUIZ)}
        />
        <FeatureCard 
          title="Sparky Chat"
          description="Talk to Sparky. Now with Voice Mode!"
          prompt="A friendly cute squirrel face waving hand, 3d cartoon icon white background"
          cacheKey="chat_icon_v2"
          fallbackEmoji="🐿️"
          color="bg-fun-purple"
          onClick={() => onViewChange(AppView.CHAT)}
        />
        <FeatureCard 
          title="Crossword Fun"
          description="Solve puzzles with words you know."
          prompt="A colorful crossword puzzle grid with a pencil, cute 3d icon white background"
          cacheKey="crossword_icon_v2"
          fallbackEmoji="🧩"
          color="bg-fun-green"
          onClick={() => onViewChange(AppView.CROSSWORD)}
        />
         <FeatureCard 
          title="Dictation"
          description="Take a photo of your words and practice spelling."
          prompt="A notepad with a camera and a pencil, cute 3d icon white background"
          cacheKey="dictation_icon_v2"
          fallbackEmoji="📝"
          color="bg-fun-yellow"
          onClick={() => onViewChange(AppView.DICTATION)}
        />
        <FeatureCard 
          title="My Journal"
          description="See all the words you learned today!"
          prompt="A colorful calendar with a big gold star and heart, cute 3d icon white background"
          cacheKey="calendar_icon_v2"
          fallbackEmoji="📅"
          color="bg-red-400"
          onClick={() => onViewChange(AppView.CALENDAR)}
        />
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{ 
  title: string, 
  description: string, 
  prompt: string, 
  cacheKey: string,
  fallbackEmoji: string, 
  color: string, 
  onClick: () => void 
}> = ({ title, description, prompt, cacheKey, fallbackEmoji, color, onClick }) => (
  <button 
    onClick={onClick}
    className="group relative overflow-hidden rounded-3xl bg-white p-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-left border-b-8 border-gray-100 hover:border-transparent h-full flex flex-col"
  >
    <div className={`absolute top-0 left-0 w-full h-2 ${color} z-10`} />
    
    {/* Image Container */}
    <div className="w-full h-48 bg-gray-50 overflow-hidden relative flex items-center justify-center">
      <SmartImage 
        prompt={prompt} 
        cacheKey={cacheKey} 
        alt={title} 
        fallbackEmoji={fallbackEmoji}
        className="w-full h-full group-hover:scale-110 transition-transform duration-500" 
      />
    </div>

    <div className="p-8 flex-1 flex flex-col">
      <h3 className="text-2xl font-display font-bold text-gray-800 mb-3 group-hover:text-brand-dark">{title}</h3>
      <p className="text-gray-500 leading-relaxed flex-1">{description}</p>
      <div className="mt-6 flex items-center text-brand font-bold group-hover:translate-x-2 transition-transform">
        Let's Go <span className="ml-2">➜</span>
      </div>
    </div>
  </button>
);

export default App;