import { useRef, useEffect, useState, useCallback } from 'react';
import { HandTracker, HandTrackingResult } from '@/lib/handTracking';
import { HandGestures, processHandGestures } from '@/lib/gestureRecognition';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';

export interface UseHandTrackingResult {
  isInitialized: boolean;
  isRunning: boolean;
  error: string | null;
  gestures: HandGestures;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  start: () => void;
  stop: () => void;
}

export function useHandTracking(showOverlay: boolean = true): UseHandTrackingResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gestures, setGestures] = useState<HandGestures>({ left: null, right: null });

  const handleResults = useCallback((result: HandTrackingResult) => {
    const newGestures = processHandGestures(result.leftHand, result.rightHand);
    setGestures(newGestures);

    if (canvasRef.current) {
      const canvasCtx = canvasRef.current.getContext('2d');
      if (canvasCtx) {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        if (showOverlay && result.rawResults && result.rawResults.multiHandLandmarks) {
          for (const landmarks of result.rawResults.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
              color: '#00FF00',
              lineWidth: 5,
            });
            drawLandmarks(canvasCtx, landmarks, {
              color: '#FF0000',
              lineWidth: 2,
            });
          }
        }
        canvasCtx.restore();
      }
    }
  }, [showOverlay]);

  useEffect(() => {
    const initTracker = async () => {
      if (!videoRef.current) return;

      try {
        const tracker = new HandTracker();
        await tracker.initialize(videoRef.current, handleResults);
        trackerRef.current = tracker;
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize hand tracking:', err);
        setError('Failed to initialize camera. Please ensure camera access is granted.');
      }
    };

    const timeoutId = setTimeout(initTracker, 100);

    return () => {
      clearTimeout(timeoutId);
      if (trackerRef.current) {
        trackerRef.current.destroy();
        trackerRef.current = null;
      }
    };
  }, [handleResults]);

  const start = useCallback(() => {
    if (trackerRef.current && isInitialized) {
      trackerRef.current.start();
      setIsRunning(true);
    }
  }, [isInitialized]);

  const stop = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.stop();
      setIsRunning(false);
    }
  }, []);

  return {
    isInitialized,
    isRunning,
    error,
    gestures,
    videoRef,
    canvasRef,
    start,
    stop,
  };
}