import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 ${className} ${onClick ? 'cursor-pointer hover:border-zinc-200 transition-colors' : ''}`}
    >
      {children}
    </div>
  );
};