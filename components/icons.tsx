
import React from 'react';

export const GasolineIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 11h1.5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1.5a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2Z" />
    <path d="M8 14v5a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-5" />
    <path d="M10 11V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14" />
    <path d="M5 11h3" />
  </svg>
);

export const DieselIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 11h1.5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1.5a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2Z" />
    <path d="M8 14v5a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-5" />
    <path d="M10 11V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14" />
    <path d="M5 11h3" />
    <text x="13.5" y="18" fontFamily="sans-serif" fontSize="6" fill="currentColor" textAnchor="middle">D</text>
  </svg>
);


export const LPGIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 6.5h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h4" />
    <path d="M14 19.5v-3.5" />
    <path d="m11.5 13.5 2 2.5 2-2.5" />
    <path d="M17.5 10.5 16 9l-1.5 1.5" />
    <path d="M8.5 6.5h-4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h1" />
  </svg>
);

export const HybridIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 7.5a2.5 2.5 0 0 1 0 5" />
    <path d="M12 12.5a2.5 2.5 0 0 0 0 5" />
  </svg>
);

export const PHEVIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
    <path d="M12.5 7.5h-1a1 1 0 0 0-1 1v1.5" />
  </svg>
);
