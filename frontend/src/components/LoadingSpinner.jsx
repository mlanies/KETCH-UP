import React from 'react';

export default function LoadingSpinner({ message = 'Загрузка...' }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wine-500"></div>
      <span className="ml-2">{message}</span>
    </div>
  );
} 