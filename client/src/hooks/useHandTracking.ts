import { useRef, useEffect, useState, useCallback } from 'react';
import { HandTracker, HandTrackingResult } from '@/lib/handTracking';
import { HandGestures, processHandGestures } from '@/lib/gestureRecognition';

export interface UseHandTrackingResult {
  isInitialized: boolean;
  isRunning: boolean;
  error: string | null;
  gestures: HandGestures;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: () => void;
  stop: () => void;
}

export function useHandTracking(): UseHandTrackingResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gestures, setGestures] = useState<HandGestures>({ left: null, right: null });

  const handleResults = useCallback((result: HandTrackingResult) => {
    const newGestures = processHandGestures(result.leftHand, result.rightHand);
    setGestures(newGestures);
  }, []);

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
    start,
    stop,
  };
}