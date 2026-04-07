// src/types/figma.d.ts
declare const figma: PluginAPI & UIPluginAPI & {
  readonly plugin: Plugin;
  readonly root: BaseNode;
  readonly viewport: Rectangle;
  readonly currentPage: PageNode;
  readonly selection: ReadonlyArray<SceneNode>;
  readonly root: BaseNode;
  readonly viewport: Rectangle;
  readonly timer: {
    readonly start: () => number;
    readonly stop: () => number;
  };
  notify: (
    message: string,
    options?: {
      timeout?: number;
    }
  ) => void;
  on: (
    event: 'run' | 'cancel' | 'close' | 'selectionchange' | 'viewportchange',
    handler: () => void
  ) => void;
  off: (
    event: 'run' | 'cancel' | 'close' | 'selectionchange' | 'viewportchange',
    handler: () => void
  ) => void;
  showUI: (
    html: string,
    options?: {
      width?: number;
      height?: number;
      visible?: boolean;
    }
  ) => void;
  closePlugin: (reason?: string) => void;
  postMessage: (pluginMessage: PluginMessage) => void;
};