import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface LearningCalendarProps {
  onBack: () => void;
}

export const LearningCalendar: React.FC<LearningCalendarProps> = ({ onBack }) => {
  const [history, setHistory] = useState<Record<string, string[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [today] = useState(new Date());

  useEffect(() => {
    try {
      const data = localStorage.getItem('rachelLearningHistory');
      if (data) {
        setHistory(JSON.parse(data));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  // Simple calendar generation for current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(today);
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  const renderCalendarDays = () => {
    const slots = [];
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      slots.push(<div key={`empty-${i}`} className="h-16 sm:h-24 bg-transparent"></div>);
    }

    for (let d = 1; d <= days; d++) {
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const words = history[dateStr] || [];
      const hasWords = words.length > 0;
      
      slots.push(
        <button 
          key={d} 
          onClick={() => hasWords ? setSelectedDate(dateStr) : null}
          className={`h-16 sm:h-24 rounded-xl border-2 flex flex-col items-start justify-start p-2 transition-all relative overflow-hidden group
            ${hasWords 
              ? 'bg-green-50 border-green-300 text-green-900 shadow-sm hover:bg-green-100 hover:shadow-md cursor-pointer' 
              : 'bg-gray-50 border-gray-100 text-gray-300 cursor-default'
            }
            ${selectedDate === dateStr ? 'ring-4 ring-brand/30 !border-brand z-10' : ''}
          `}
        >
          <span className={`text-sm font-bold ${hasWords ? 'text-green-800' : 'text-gray-300'}`}>{d}</span>
          
          {hasWords && (
            <>
              <div className="mt-1 w-full relative z-10">
                <div className="flex gap-1 flex-wrap">
                  <span className="text-[10px] sm:text-xs bg-white/60 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-100">
                    {words.length} words
                  </span>
                </div>
                <div className="mt-1 text-[10px] sm:text-xs text-green-600/80 truncate w-full text-left pl-1">
                   {words[0]}...
                </div>
              </div>
              {/* Decorative Watermark */}
              <div className="absolute -bottom-2 -right-2 text-3xl sm:text-4xl opacity-20 rotate-12 group-hover:scale-110 transition-transform pointer-events-none">
                🌟
              </div>
            </>
          )}
        </button>
      );
    }
    return slots;
  };

  const selectedWords = selectedDate ? (history[selectedDate] || []) : [];

  return (
    <div className="max-w-4xl mx-auto">
       <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="px-4 py-2 bg-white rounded-xl shadow text-gray-600 font-bold">← Back</button>
        <h2 className="text-2xl font-display font-bold text-brand-dark">My Learning Journal 📅</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-gray-800 capitalize">{monthName}</h3>
          </div>
          
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {renderCalendarDays()}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl h-fit border-t-8 border-yellow-400">
          {selectedDate ? (
            <>
              <h3 className="text-lg font-bold text-gray-400 uppercase tracking-wider mb-1">
                {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}
              </h3>
              <div className="text-3xl font-display font-bold text-brand-dark mb-6">
                {selectedWords.length} Words Learned! 🌟
              </div>
              
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {selectedWords.map((word, idx) => (
                  <div key={idx} className="bg-yellow-50 p-3 rounded-xl text-lg font-bold text-gray-700 flex items-center gap-3">
                    <span className="text-yellow-500">★</span> {word}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4 grayscale opacity-50">📅</div>
              <p>Click on a green day to see your words!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};