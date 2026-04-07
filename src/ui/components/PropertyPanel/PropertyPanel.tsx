// src/ui/components/PropertyPanel/PropertyPanel.tsx
// Note: property selection is now handled inline in the Timeline tracks.
// This standalone component is kept for potential future use.
import React from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import type { PropertyType } from '@/types/animation.types';

const PropertyPanel: React.FC = () => {
  const { selectedLayerId, selectedProperty, setSelectedProperty } = useAnimationStore(
    (state) => ({
      selectedLayerId: state.selectedLayerId,
      selectedProperty: state.selectedProperty,
      setSelectedProperty: state.setSelectedProperty,
    })
  );

  const properties: PropertyType[] = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'];

  if (!selectedLayerId) {
    return (
      <div className="p-3 text-xs text-wm-muted">Select a layer to edit properties</div>
    );
  }

  return (
    <div className="p-3 flex flex-wrap gap-1">
      {properties.map((prop) => (
        <button
          key={prop}
          onClick={() => setSelectedProperty(prop)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            selectedProperty === prop
              ? 'bg-wm-accent text-white'
              : 'bg-wm-panel border border-wm-border text-wm-muted hover:text-wm-text'
          }`}
        >
          {prop}
        </button>
      ))}
    </div>
  );
};

export default PropertyPanel;
