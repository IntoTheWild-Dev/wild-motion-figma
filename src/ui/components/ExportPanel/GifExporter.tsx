// src/ui/components/ExportPanel/GifExporter.tsx
import React from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { generateGif } from '@/ui/exporters/gifBuilder';

const GifExporter: React.FC = () => {
  const { layers, fps } = useAnimationStore((state) => ({
    layers: state.layers,
    fps: state.fps
  }));

  const handleExport = async () => {
    try {
      const blob = await generateGif(layers, fps);
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link to download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'animation.gif';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('GIF exported as animation.gif');
    } catch (err) {
      console.error('Failed to export GIF:', err);
      alert('Failed to export GIF');
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium">GIF Export Settings</h4>
      <div className="space-y-2">
        <label className="flex items-center text-sm">
          <input type="checkbox" className="mr-2" />
          Transparent background
        </label>
        <label className="flex items-center text-sm">
          <input type="checkbox" className="mr-2" />
          Loop forever
        </label>
      </div>
      <div className="mt-4">
        <button
          onClick={handleExport}
          className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          Export GIF
        </button>
      </div>
    </div>
  );
};

export default GifExporter;