// src/ui/components/ExportPanel/CSSExporter.tsx
import React from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { generateCss } from '@/ui/exporters/cssBuilder';

const CSSExporter: React.FC = () => {
  const { layers, fps } = useAnimationStore((state) => ({
    layers: state.layers,
    fps: state.fps
  }));

  const handleExport = () => {
    const css = generateCss(layers, fps);
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link to download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animation.css';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Also copy to clipboard
    navigator.clipboard.writeText(css).then(() => {
      alert('CSS animation copied to clipboard and downloaded as animation.css');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      alert('CSS animation downloaded as animation.css (copy to clipboard failed)');
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium">CSS Export Settings</h4>
      <div className="space-y-2">
        <label className="flex items-center text-sm">
          <input type="checkbox" className="mr-2" />
          Include vendor prefixes
        </label>
        <label className="flex items-center text-sm">
          <input type="checkbox" className="mr-2" />
          Use :root variables for colors
        </label>
      </div>
      <div className="mt-4">
        <button
          onClick={handleExport}
          className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          Export CSS Animation
        </button>
      </div>
    </div>
  );
};

export default CSSExporter;