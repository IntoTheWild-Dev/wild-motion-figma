declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    background?: string;
    transparent?: number | null;
    dither?: boolean | string;
  }

  interface AddFrameOptions {
    copy?: boolean;
    delay?: number;
    dispose?: number;
    transparent?: number | null;
  }

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      element: CanvasRenderingContext2D | HTMLCanvasElement | HTMLImageElement | ImageData,
      options?: AddFrameOptions
    ): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    render(): void;
    abort(): void;
  }

  export default GIF;
}

declare module 'gif.js/dist/gif.worker.js?raw' {
  const content: string;
  export default content;
}
