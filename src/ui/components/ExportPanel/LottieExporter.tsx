// src/ui/components/ExportPanel/LottieExporter.tsx
import React from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { generateLottie } from '@/ui/exporters/lottieBuilder';

const LottieExporter: React.FC = () => {
  const { layers, fps } = useAnimationStore((state) => ({
    layers: state.layers,
    fps: state.fps
  }));

  const handleExport = () => {
    const lottie = generateLottie(layers, fps);
    const blob = new Blob([JSON.stringify(lottie, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link to download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animation.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Also copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(lottie, null, 2)).then(() => {
      alert('Lottie JSON copied to clipboard and downloaded as animation.json');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      alert('Lottie JSON downloaded as animation.json (copy to clipboard failed)');
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Lottie Export Settings</h4>
      <div className="space-y-2">
        <label className="flex items-center text-sm">
          <input type="checkbox" className="mr-2" />
          Include metadata
        </label>
        <label className="flex items-center text-sm">
          <input type="checkbox" className="mr-2" />
          Minify JSON
        </label>
      </div>
      <div className="mt-4">
        <button
          onClick={handleExport}
          className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          Export Lottie JSON
        </button>
      </div>
    </div>
  );
};

export default LottieExporter;