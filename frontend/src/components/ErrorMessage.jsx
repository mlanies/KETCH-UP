import React from 'react';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-300">
      <div className="flex items-center gap-2 mb-2">
        <span>⚠️</span>
        <span className="font-medium">Ошибка</span>
      </div>
      <p className="text-sm mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
        >
          Попробовать снова
        </button>
      )}
    </div>
  );
} 