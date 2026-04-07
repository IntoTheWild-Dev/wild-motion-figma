// src/ui/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Listen for messages from plugin thread
// This runs in the UI thread (iframe) which has DOM access
const pluginToUiMessageHandler = (event: MessageEvent) => {
  // Figma wraps plugin→UI messages as event.data.pluginMessage
  const msg = event.data?.pluginMessage;
  if (!msg) return;
  if (msg.type === 'IMPORT_LAYERS') {
    window.dispatchEvent(new CustomEvent('import-layers', { detail: msg.data }));
  } else if (msg.type === 'NODE_PROPS') {
    window.dispatchEvent(new CustomEvent('node-props-received', { detail: msg.data }));
  } else if (msg.type === 'SELECTION_CHANGE') {
    // Plugin pushes selection state proactively — dispatch for UI to cache
    window.dispatchEvent(
      new CustomEvent('selection-changed', {
        detail: msg.data, // { layers: [...] } or null
      })
    );
  } else if (msg.type === 'FRAME_EXPORT_RESULT' || msg.type === 'FRAME_EXPORT_ERROR') {
    window.dispatchEvent(
      new CustomEvent(msg.type.toLowerCase().replace(/_/g, '-'), {
        detail: msg,
      })
    );
  } else if (msg.type === 'APPLY_SUCCESS') {
    window.dispatchEvent(new CustomEvent('apply-success', { detail: msg }));
  } else if (msg.type === 'APPLY_ERROR') {
    window.dispatchEvent(new CustomEvent('apply-error', { detail: msg }));
  } else if (msg.type === 'PLUGIN_RECEIVED') {
    window.dispatchEvent(new CustomEvent('plugin-received', { detail: msg }));
  } else if (msg.type === 'RESTORE_STATE') {
    window.dispatchEvent(new CustomEvent('restore-state', { detail: msg.data }));
  }
};

// Listen for messages from plugin
window.addEventListener('message', pluginToUiMessageHandler);

// Notify the plugin that the UI is ready to receive messages.
// This triggers pushSelectionToUI() in the plugin thread so the initial
// SELECTION_CHANGE arrives after all listeners are registered — avoiding the
// race condition where pushSelectionToUI() fires before the UI iframe loads.
window.parent.postMessage({ pluginMessage: { type: 'UI_READY' } }, '*');

// Clean up on unload
window.addEventListener('beforeunload', () => {
  window.removeEventListener('message', pluginToUiMessageHandler);
});

// Function to send frame updates to plugin for preview
export const sendFrameToPlugin = (frameData: { nodeId: string; values: Record<string, any> }) => {
  console.log('[WM-UI] Sending APPLY_FRAME', frameData.nodeId, JSON.stringify(frameData.values));
  window.parent.postMessage(
    {
      pluginMessage: {
        type: 'APPLY_FRAME',
        payload: frameData,
      },
    },
    '*'
  );
};
