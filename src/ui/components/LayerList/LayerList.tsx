// src/ui/components/LayerList/LayerList.tsx
// Note: layer list UI is now embedded in Timeline.tsx.
// This standalone component is kept for potential future use.
import React from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { LayerRow } from './LayerRow';

const LayerList: React.FC = () => {
  const { layers, selectedLayerId, setSelectedLayerId } = useAnimationStore((state) => ({
    layers: state.layers,
    selectedLayerId: state.selectedLayerId,
    setSelectedLayerId: state.setSelectedLayerId,
  }));

  return (
    <div className="flex flex-col bg-wm-panel">
      {layers.map((layer) => (
        <LayerRow
          key={layer.id}
          layer={layer}
          isSelected={layer.id === selectedLayerId}
          onSelect={() => setSelectedLayerId(layer.id)}
        />
      ))}
    </div>
  );
};

export default LayerList;
