import React from 'react';

export const LoadingState: React.FC<{ text?: string }> = ({ text = "Creating magic..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 animate-pulse">
      <div className="text-6xl mb-4">✨</div>
      <h3 className="text-2xl font-display font-bold text-brand-dark">{text}</h3>
      <p className="text-gray-500 mt-2">Asking the English Wizard...</p>
    </div>
  );
};