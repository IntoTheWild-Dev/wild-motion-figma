// src/ui/components/LayerList/LayerRow.tsx
import React from 'react';
import type { Layer } from '@/types/animation.types';

interface LayerRowProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: () => void;
}

export const LayerRow: React.FC<LayerRowProps> = ({ layer, isSelected, onSelect }) => (
  <div
    className={`flex items-center px-2 py-1.5 gap-1.5 cursor-pointer border-b border-wm-border text-xs transition-colors ${
      isSelected ? 'bg-wm-accent/10 text-wm-text' : 'text-wm-muted hover:bg-wm-surface hover:text-wm-text'
    }`}
    onClick={onSelect}
  >
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="flex-shrink-0 opacity-60">
      <rect x="1" y="1" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="3" y="3" width="4" height="4" rx="0.5" />
    </svg>
    <span className="truncate">{layer.name}</span>
  </div>
);
