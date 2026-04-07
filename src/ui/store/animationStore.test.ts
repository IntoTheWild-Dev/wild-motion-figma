// src/ui/store/animationStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationStore } from './animationStore';
import type { PropertyType, Keyframe } from '@/types/animation.types';

// Mock the crypto object properly
const mockCrypto = {
  randomUUID: () => 'test-uuid'
};

const emptyPropertyTracks = (): Record<PropertyType, Keyframe[]> => ({
  x: [],
  y: [],
  scaleX: [],
  scaleY: [],
  rotation: [],
  opacity: [],
  fill: []
});

describe('animationStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAnimationStore.setState({
      layers: [],
      selectedLayerId: null,
      playhead: 0,
      isPlaying: false,
      fps: 30,
      duration: 90,
      exportFormat: null,
      exportSettings: {
        format: 'lottie',
        fps: 30,
        resolution: 1,
        loop: false,
        backgroundColor: '#ffffff'
      },
      currentFrameValues: {}
    });
    
    // Mock crypto by overriding the property
    Object.defineProperty(globalThis, 'crypto', {
      value: mockCrypto,
      writable: true
    });
  });

  // Restore original crypto after all tests
  // Note: Using afterAll instead of afterEach to avoid the ReferenceError
  // afterAll(() => {
  //   Object.defineProperty(globalThis, 'crypto', {
  //     value: originalCrypto,
  //     writable: true
  //   });
  // });

  describe('addLayer', () => {
    it('should add a layer to the store', () => {
      useAnimationStore.getState().addLayer({
        name: 'Test Layer',
        nodeId: '123:456',
        propertyTracks: emptyPropertyTracks()
      });

      const state = useAnimationStore.getState();
      expect(state.layers).toHaveLength(1);
      expect(state.layers[0]).toMatchObject({
        name: 'Test Layer',
        nodeId: '123:456',
        id: expect.any(String),
      });
    });
  });

  describe('addKeyframe', () => {
    it('should add a keyframe to a layer', () => {
      // First add a layer
      useAnimationStore.getState().addLayer({
        name: 'Test Layer',
        nodeId: '123:456',
        propertyTracks: emptyPropertyTracks()
      });

      const state = useAnimationStore.getState();
      const layerId = state.layers[0].id;

      // Add a keyframe
      useAnimationStore.getState().addKeyframe(layerId, 'x', 10, 100);

      const updatedState = useAnimationStore.getState();
      const layer = updatedState.layers[0];
      
      expect(layer.propertyTracks['x']).toHaveLength(1);
      expect(layer.propertyTracks['x'][0]).toMatchObject({
        id: expect.any(String), // Keyframe ID will be different
        frame: 10,
        value: 100,
        easing: { type: 'linear' }
      });
    });
  });

  describe('setPlayhead', () => {
    it('should set the playhead within bounds', () => {
      useAnimationStore.getState().setPlayhead(45);
      expect(useAnimationStore.getState().playhead).toBe(45);

      // Test clamping to upper bound
      useAnimationStore.getState().setPlayhead(150);
      expect(useAnimationStore.getState().playhead).toBe(90); // duration

      // Test clamping to lower bound
      useAnimationStore.getState().setPlayhead(-10);
      expect(useAnimationStore.getState().playhead).toBe(0);
    });
  });

  describe('setSelectedLayerId', () => {
    it('should set the selected layer ID', () => {
      useAnimationStore.getState().setSelectedLayerId('layer-123');
      expect(useAnimationStore.getState().selectedLayerId).toBe('layer-123');
    });
  });
  
  describe('getValueAtFrame', () => {
    it('should return correct value at frame with keyframes', () => {
      // Add a layer
      useAnimationStore.getState().addLayer({
        name: 'Test Layer',
        nodeId: '123:456',
        propertyTracks: emptyPropertyTracks()
      });
      
      const state = useAnimationStore.getState();
      const layerId = state.layers[0].id;
      
      // Add keyframes: at frame 0 value 0, at frame 30 value 100
      useAnimationStore.getState().addKeyframe(layerId, 'x', 0, 0);
      useAnimationStore.getState().addKeyframe(layerId, 'x', 30, 100);
      
      // Test at start
      expect(useAnimationStore.getState().getValueAtFrame(layerId, 'x', 0)).toBe(0);
      
      // Test at end
      expect(useAnimationStore.getState().getValueAtFrame(layerId, 'x', 30)).toBe(100);
      
      // Test at midpoint (should be 50 with linear interpolation)
      expect(useAnimationStore.getState().getValueAtFrame(layerId, 'x', 15)).toBeCloseTo(50);
    });
    
    it('should return default value for property without keyframes', () => {
      // Add a layer
      useAnimationStore.getState().addLayer({
        name: 'Test Layer',
        nodeId: '123:456',
        propertyTracks: emptyPropertyTracks()
      });
      
      const state = useAnimationStore.getState();
      const layerId = state.layers[0].id;
      
      // Test properties without keyframes should return defaults
      expect(useAnimationStore.getState().getValueAtFrame(layerId, 'x', 0)).toBe(0); // default for position
      expect(useAnimationStore.getState().getValueAtFrame(layerId, 'scaleX', 0)).toBe(1); // default for scale
      expect(useAnimationStore.getState().getValueAtFrame(layerId, 'opacity', 0)).toBe(100); // default for opacity
    });
  });
});