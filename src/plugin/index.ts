// src/plugin/index.ts
// Main plugin thread (sandbox) - no DOM access
/// <reference types="@figma/plugin-typings" />

declare const __html__: string;

// Initialize the plugin
figma.showUI(__html__, { width: 1200, height: 680 });

// Define message types for plugin <-> UI communication
type UIToPluginMessageType =
  | 'APPLY_FRAME'
  | 'APPLY_ALL_FRAMES'
  | 'READ_SELECTION'
  | 'EXPORT_REQUEST'
  | 'EXPORT_FRAME_REQUEST'
  | 'RESIZE'
  | 'SAVE_STATE'
  | 'UI_READY';

interface UIToPluginMessage {
  type: UIToPluginMessageType;
  payload?: {
    nodeId?: string;
    nodeIds?: string[];
    values?: Record<string, unknown>;
    allLayerValues?: Record<string, Record<string, unknown>>;
    frameIndex?: number;
    width?: number;
    height?: number;
  };
}

// Persistent Map to store each layer's original (base) dimensions, keyed by nodeId.
// Seeded from _baseWidth/_baseHeight sent by the UI on every scale frame — this is
// the single source of truth and avoids the fragile __baseWidth node-property hack.
const nodeSizeCache = new Map<string, { w: number; h: number }>();

// Shared helper to apply transform values to a node
const applyValuesToNode = (nodeId: string, node: SceneNode, values: Record<string, unknown>) => {
  const fnode = node as SceneNode & { x: number; y: number; rotation: number; opacity: number };
  if (typeof values.x === 'number') fnode.x = values.x;
  if (typeof values.y === 'number') fnode.y = values.y;
  if (typeof values.rotation === 'number') fnode.rotation = values.rotation;
  if (typeof values.opacity === 'number') fnode.opacity = values.opacity / 100;
  if (typeof values.scaleX === 'number' || typeof values.scaleY === 'number') {
    if (typeof values._baseWidth === 'number' && typeof values._baseHeight === 'number') {
      nodeSizeCache.set(nodeId, { w: values._baseWidth, h: values._baseHeight });
    } else if (!nodeSizeCache.has(nodeId)) {
      nodeSizeCache.set(nodeId, { w: (fnode as any).width, h: (fnode as any).height });
    }
    const { w: baseW, h: baseH } = nodeSizeCache.get(nodeId)!;
    const sx = typeof values.scaleX === 'number' ? values.scaleX : 1;
    const sy = typeof values.scaleY === 'number' ? values.scaleY : 1;
    // Text nodes require auto-resize to be disabled before manual resize
    if ((fnode as any).type === 'TEXT') {
      (fnode as any).textAutoResize = 'NONE';
    }
    (fnode as any).resize(baseW * sx, baseH * sy);
  }
};

// Handle messages from UI
// Figma wraps messages sent via window.parent.postMessage({ pluginMessage: ... })
figma.ui.onmessage = async (msg: UIToPluginMessage) => {
  switch (msg.type) {
  case 'READ_SELECTION': {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'IMPORT_LAYERS',
        data: {
          layers: [],
          error: 'No layer selected. Select a layer (rectangle, text, vector, etc.) to animate.',
        },
      });
      return;
    }

    // Helper to extract animatable props from any node with transforms
    const extractProps = (node: SceneNode) => {
      if (!('x' in node && 'y' in node)) return null;
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        x: (node as FrameNode).x,
        y: (node as FrameNode).y,
        rotation: (node as FrameNode).rotation ?? 0,
        opacity: 'opacity' in node ? (node as FrameNode).opacity : 1,
        width:
            'width' in node && typeof (node as any).width === 'number'
              ? (node as FrameNode).width
              : 0,
        height:
            'height' in node && typeof (node as any).height === 'number'
              ? (node as FrameNode).height
              : 0,
      };
    };

    // Check if any selected nodes are frames/components (containers)
    const frameTypes = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET']);
    const hasFrames = selection.some((node: SceneNode) => frameTypes.has(node.type));

    if (hasFrames) {
      // Provide a helpful message about frames
      const frameNames = selection
        .filter((n: SceneNode) => frameTypes.has(n.type))
        .map((n: SceneNode) => n.name)
        .slice(0, 3)
        .join(', ');
      figma.ui.postMessage({
        type: 'IMPORT_LAYERS',
        data: {
          layers: [],
          error: `Frame(s) selected: "${frameNames}". Please select individual layers inside the frame to animate, not the frame itself.`,
          isFrameSelection: true,
        },
      });
      return;
    }

    // Import each selected node directly as its own layer
    const layers: (ReturnType<typeof extractProps> & { type?: string })[] = [];
    for (const node of selection) {
      const props = extractProps(node);
      if (props) layers.push(props);
    }

    if (layers.length === 0) {
      figma.ui.postMessage({
        type: 'IMPORT_LAYERS',
        data: {
          layers: [],
          error: 'No animatable layers found. Select shapes, text, or vectors.',
        },
      });
      return;
    }

    figma.ui.postMessage({ type: 'IMPORT_LAYERS', data: { layers } });
    break;
  }

  case 'APPLY_FRAME': {
    const { nodeId, values } = msg.payload as { nodeId: string; values: Record<string, unknown> };
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      // Silently skip missing nodes during playback (layer may have been deleted in Figma)
      figma.ui.postMessage({ type: 'NODE_DELETED', nodeId });
      break;
    }
    applyValuesToNode(nodeId, node, values);
    break;
  }

  case 'APPLY_ALL_FRAMES': {
    const { allLayerValues } = msg.payload as { allLayerValues: Record<string, Record<string, unknown>> };
    if (!allLayerValues) break;
    for (const [nodeId, values] of Object.entries(allLayerValues)) {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) continue;
      applyValuesToNode(nodeId, node, values);
    }
    break;
  }

  case 'EXPORT_FRAME_REQUEST': {
    // Apply transforms for all layers at this animation frame, then export a PNG
    const payload = msg.payload || {};
    const {
      allLayerValues,
      frameIndex,
      width = 1920,
    } = payload as typeof msg.payload & { width?: number };
    if (!allLayerValues) break;

    // Save original node state before applying transforms
    const originalStates = new Map<string, { x: number; y: number; rotation: number; opacity: number; width: number; height: number }>();

    // Apply all layer transforms
    for (const [nodeId, values] of Object.entries(allLayerValues)) {
      const n = await figma.getNodeByIdAsync(nodeId);
      if (!n) continue;

      // Save original state
      if (!originalStates.has(nodeId)) {
        originalStates.set(nodeId, {
          x: 'x' in n ? (n as any).x : 0,
          y: 'y' in n ? (n as any).y : 0,
          rotation: 'rotation' in n ? (n as any).rotation : 0,
          opacity: 'opacity' in n ? (n as any).opacity : 1,
          width: 'width' in n ? (n as any).width : 0,
          height: 'height' in n ? (n as any).height : 0,
        });
      }

      // Apply transforms
      if ('x' in n && typeof values.x === 'number') (n as any).x = values.x;
      if ('y' in n && typeof values.y === 'number') (n as any).y = values.y;
      if ('rotation' in n && typeof values.rotation === 'number')
        (n as any).rotation = values.rotation;
      if ('opacity' in n && 'opacity' in values) {
        const ov = values.opacity;
        if (typeof ov === 'number') (n as any).opacity = ov / 100;
      }
      // Scale support for export frames
      if ('width' in n && 'height' in n) {
        const scaleX = typeof values.scaleX === 'number' ? values.scaleX : null;
        const scaleY = typeof values.scaleY === 'number' ? values.scaleY : null;
        if (scaleX !== null || scaleY !== null) {
          if (typeof values._baseWidth === 'number' && typeof values._baseHeight === 'number') {
            nodeSizeCache.set(nodeId, { w: values._baseWidth, h: values._baseHeight });
          } else if (!nodeSizeCache.has(nodeId)) {
            nodeSizeCache.set(nodeId, { w: (n as any).width, h: (n as any).height });
          }
          const { w: baseW, h: baseH } = nodeSizeCache.get(nodeId)!;
          const sx = scaleX ?? 1;
          const sy = scaleY ?? 1;
          (n as any).resize(baseW * sx, baseH * sy);
        }
      }
    }

    // Find export target: the containing frame of animated layers (not the whole page)
    const exportNodeIds = Object.keys(allLayerValues);
    let exportTarget: SceneNode | PageNode = figma.currentPage;

    if (exportNodeIds.length > 0) {
      const firstNode = await figma.getNodeByIdAsync(exportNodeIds[0]);
      if (firstNode) {
        const frameTypes = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET']);
        // Walk up from the animated node to find the containing frame
        let candidate: BaseNode | null = firstNode.parent;
        while (candidate && candidate.type !== 'PAGE') {
          if (frameTypes.has(candidate.type)) {
            exportTarget = candidate as SceneNode;
            break;
          }
          candidate = candidate.parent;
        }
        // If no parent frame found and the node itself is a frame, export it directly
        if (exportTarget === figma.currentPage && frameTypes.has(firstNode.type)) {
          exportTarget = firstNode as SceneNode;
        }
      }
    }

    // Export the target frame as PNG
    try {
      const bytes = await exportTarget.exportAsync({
        format: 'PNG',
        constraint: { type: 'WIDTH', value: width },
      });
      figma.ui.postMessage({
        type: 'FRAME_EXPORT_RESULT',
        frameIndex,
        bytes,
      });
    } catch (err) {
      figma.ui.postMessage({
        type: 'FRAME_EXPORT_ERROR',
        frameIndex,
        error: String(err),
      });
    }

    // Restore original node state after export
    for (const [nodeId, orig] of originalStates) {
      const n = await figma.getNodeByIdAsync(nodeId);
      if (!n) continue;
      if ('x' in n) (n as any).x = orig.x;
      if ('y' in n) (n as any).y = orig.y;
      if ('rotation' in n) (n as any).rotation = orig.rotation;
      if ('opacity' in n) (n as any).opacity = orig.opacity;
      if ('width' in n && 'height' in n) {
        (n as any).resize(orig.width, orig.height);
      }
    }

    break;
  }

  case 'UI_READY': {
    // UI has finished mounting and registered all listeners — safe to send initial selection
    pushSelectionToUI();
    // Load saved animation state from clientStorage and send to UI
    try {
      const savedState = await figma.clientStorage.getAsync('wildMotionState');
      if (savedState) {
        figma.ui.postMessage({ type: 'RESTORE_STATE', data: savedState });
      }
    } catch (_) {
      // clientStorage unavailable or empty — start fresh
    }
    break;
  }

  case 'SAVE_STATE': {
    // Persist the animation state (projects, customPresets) to clientStorage
    const savePayload = (msg as { type: string; payload?: unknown }).payload;
    if (savePayload) {
      try {
        await figma.clientStorage.setAsync('wildMotionState', savePayload);
      } catch (_) {
        // Save failed — not critical, user continues working
      }
    }
    break;
  }

  case 'RESIZE': {
    const h = (msg.payload as { height?: number })?.height;
    if (typeof h === 'number' && h >= 380 && h <= 960) {
      figma.ui.resize(1200, h);
    }
    break;
  }

  default:
    // Unknown message type
    console.warn('Unknown message type received in plugin:', msg);
  }
};

// Helper to extract animatable props (shared between READ_SELECTION and selectionchange)
const extractNodeProps = (node: SceneNode) => {
  if (!('x' in node && 'y' in node)) return null;
  return {
    id: node.id,
    name: node.name,
    x: (node as FrameNode).x,
    y: (node as FrameNode).y,
    rotation: (node as FrameNode).rotation ?? 0,
    opacity: 'opacity' in node ? (node as FrameNode).opacity : 1,
    width: 'width' in node ? (node as FrameNode).width : 0,
    height: 'height' in node ? (node as FrameNode).height : 0,
  };
};

// Push current selection to UI immediately (on load and on every selection change)
const pushSelectionToUI = () => {
  const selection = figma.currentPage.selection;
  const layers: NonNullable<ReturnType<typeof extractNodeProps>>[] = [];
  for (const node of selection) {
    const props = extractNodeProps(node);
    if (props !== null) layers.push(props);
  }
  figma.ui.postMessage({ type: 'SELECTION_CHANGE', data: { layers } });
};

// Push on initial load so UI knows current selection right away
pushSelectionToUI();

// Push on every selection change
figma.on('selectionchange', pushSelectionToUI);
