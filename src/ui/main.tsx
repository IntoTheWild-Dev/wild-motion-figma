// src/ui/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5, color: '#e85252', background: '#0d1b2e', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          <strong>React Error:</strong>{'\n'}{String(err)}{err.stack ? '\n' + err.stack : ''}
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
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
    // Legacy handler — kept for backwards compatibility
    window.dispatchEvent(new CustomEvent('apply-success', { detail: msg }));
  } else if (msg.type === 'APPLY_ERROR') {
    window.dispatchEvent(new CustomEvent('apply-error', { detail: msg }));
  } else if (msg.type === 'NODE_DELETED') {
    window.dispatchEvent(new CustomEvent('node-deleted', { detail: msg.nodeId }));
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
export const sendFrameToPlugin = (frameData: { nodeId: string; values: Record<string, unknown> }) => {
  window.parent.postMessage(
    { pluginMessage: { type: 'APPLY_FRAME', payload: frameData } },
    '*'
  );
};
