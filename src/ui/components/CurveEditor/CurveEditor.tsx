// src/ui/components/CurveEditor/CurveEditor.tsx
import React, { useCallback, useRef } from 'react';
import type { EasingPreset } from '@/types/animation.types';

interface CurveEditorProps {
  easing: EasingPreset;
  onChange: (easing: EasingPreset) => void;
}

const W = 120; // SVG width
const H = 120; // SVG height
const PAD = 16;

// Convert normalized (0-1) coords to SVG space
const toSvg = (nx: number, ny: number) => ({
  x: PAD + nx * (W - PAD * 2),
  y: H - PAD - ny * (H - PAD * 2),
});

// Convert SVG coords back to normalized
const fromSvg = (sx: number, sy: number) => ({
  nx: Math.max(0, Math.min(1, (sx - PAD) / (W - PAD * 2))),
  ny: (H - PAD - sy) / (H - PAD * 2),
});

interface QuickPresetGroup {
  group: string;
  presets: Array<{ label: string; easing: EasingPreset }>;
}

const QUICK_PRESET_GROUPS: QuickPresetGroup[] = [
  {
    group: 'Basic',
    presets: [
      { label: 'Linear',     easing: { type: 'linear' } },
      { label: 'Ease',       easing: { type: 'cubic-bezier', points: [0.25, 0.1, 0.25, 1.0] } },
      { label: 'Ease In',    easing: { type: 'cubic-bezier', points: [0.42, 0, 1, 1] } },
      { label: 'Ease Out',   easing: { type: 'cubic-bezier', points: [0, 0, 0.58, 1] } },
      { label: 'Ease In/Out', easing: { type: 'cubic-bezier', points: [0.42, 0, 0.58, 1] } },
      { label: 'Spring',     easing: { type: 'cubic-bezier', points: [0.34, 1.56, 0.64, 1] } },
    ],
  },
  {
    group: 'Sine',
    presets: [
      { label: 'In Sine',     easing: { type: 'cubic-bezier', points: [0.12, 0, 0.39, 0] } },
      { label: 'Out Sine',    easing: { type: 'cubic-bezier', points: [0.61, 1, 0.88, 1] } },
      { label: 'In/Out Sine', easing: { type: 'cubic-bezier', points: [0.37, 0, 0.63, 1] } },
    ],
  },
  {
    group: 'Quad',
    presets: [
      { label: 'In Quad',     easing: { type: 'cubic-bezier', points: [0.11, 0, 0.5, 0] } },
      { label: 'Out Quad',    easing: { type: 'cubic-bezier', points: [0.5, 1, 0.89, 1] } },
      { label: 'In/Out Quad', easing: { type: 'cubic-bezier', points: [0.45, 0, 0.55, 1] } },
    ],
  },
  {
    group: 'Cubic',
    presets: [
      { label: 'In Cubic',     easing: { type: 'cubic-bezier', points: [0.32, 0, 0.67, 0] } },
      { label: 'Out Cubic',    easing: { type: 'cubic-bezier', points: [0.33, 1, 0.68, 1] } },
      { label: 'In/Out Cubic', easing: { type: 'cubic-bezier', points: [0.65, 0, 0.35, 1] } },
    ],
  },
  {
    group: 'Back',
    presets: [
      { label: 'In Back',  easing: { type: 'cubic-bezier', points: [0.36, 0, 0.66, -0.56] } },
      { label: 'Out Back', easing: { type: 'cubic-bezier', points: [0.34, 1.56, 0.64, 1] } },
    ],
  },
];

const CurveEditor: React.FC<CurveEditorProps> = ({ easing, onChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<'p1' | 'p2' | null>(null);

  // Get current bezier points (default to linear-ish if not cubic)
  const points: [number, number, number, number] =
    easing.type === 'cubic-bezier' && easing.points
      ? [easing.points[0], easing.points[1], easing.points[2], easing.points[3]]
      : [0.25, 0.25, 0.75, 0.75];

  const [p1x, p1y, p2x, p2y] = points;

  // SVG positions
  const start = toSvg(0, 0);
  const end = toSvg(1, 1);
  const cp1 = toSvg(p1x, p1y);
  const cp2 = toSvg(p2x, p2y);

  const pathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
  const line1D = `M ${start.x} ${start.y} L ${cp1.x} ${cp1.y}`;
  const line2D = `M ${end.x} ${end.y} L ${cp2.x} ${cp2.y}`;

  const getSvgCoords = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const sy = ((e.clientY - rect.top) / rect.height) * H;
    return fromSvg(sx, sy);
  }, []);

  const handlePointerDown = useCallback((handle: 'p1' | 'p2', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = handle;
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    const { nx, ny } = coords;
    const newPoints: [number, number, number, number] = [...points] as [number, number, number, number];
    if (dragging.current === 'p1') {
      newPoints[0] = Math.max(0, Math.min(1, nx));
      newPoints[1] = ny; // y can go outside 0-1 for overshoot
    } else {
      newPoints[2] = Math.max(0, Math.min(1, nx));
      newPoints[3] = ny;
    }
    onChange({ type: 'cubic-bezier', points: newPoints });
  }, [points, getSvgCoords, onChange]);

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 items-start">
        {/* SVG Canvas */}
        <div className="flex-shrink-0 rounded border border-wm-border bg-wm-bg overflow-hidden" style={{ width: W, height: H }}>
          <svg
            ref={svgRef}
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="cursor-crosshair"
          >
            {/* Grid lines */}
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#ffffff10" strokeWidth="1" />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#ffffff10" strokeWidth="1" />
            <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#ffffff08" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="#ffffff08" strokeWidth="1" strokeDasharray="3 3" />

            {/* Handle lines */}
            <path d={line1D} stroke="#0d99ff60" strokeWidth="1" fill="none" />
            <path d={line2D} stroke="#c084fc60" strokeWidth="1" fill="none" />

            {/* Bezier curve */}
            <path d={pathD} stroke="#0d99ff" strokeWidth="2" fill="none" strokeLinecap="round" />

            {/* Start/End anchors */}
            <circle cx={start.x} cy={start.y} r={3} fill="#ffffff40" />
            <circle cx={end.x} cy={end.y} r={3} fill="#ffffff40" />

            {/* Control point handles */}
            <circle
              cx={cp1.x} cy={cp1.y} r={5}
              fill="#0d99ff" stroke="#0d99ff40" strokeWidth="2"
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => handlePointerDown('p1', e)}
            />
            <circle
              cx={cp2.x} cy={cp2.y} r={5}
              fill="#c084fc" stroke="#c084fc40" strokeWidth="2"
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => handlePointerDown('p2', e)}
            />
          </svg>
        </div>

        {/* Quick preset buttons — scrollable grouped list */}
        <div className="flex flex-col gap-0 flex-1 min-w-0" style={{ maxHeight: 120, overflowY: 'auto' }}>
          <span className="text-2xs text-wm-muted uppercase tracking-wider mb-1 flex-shrink-0">Presets</span>
          {QUICK_PRESET_GROUPS.map((group) => (
            <div key={group.group} className="mb-1">
              <div className="text-2xs text-wm-muted/60 uppercase tracking-wider px-0.5 mb-0.5">{group.group}</div>
              {group.presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => onChange(p.easing)}
                  className="w-full text-left text-xs px-2 py-0.5 rounded border border-wm-border text-wm-muted hover:text-wm-text hover:border-wm-border-light transition-colors mb-0.5"
                >
                  {p.label}
                </button>
              ))}
            </div>
          ))}
          {/* Custom values readout */}
          {easing.type === 'cubic-bezier' && (
            <div className="mt-1 text-2xs text-wm-muted font-mono leading-relaxed flex-shrink-0">
              <div>{p1x.toFixed(2)}, {p1y.toFixed(2)}</div>
              <div>{p2x.toFixed(2)}, {p2y.toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurveEditor;
