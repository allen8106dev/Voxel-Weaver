import { useRef, useEffect, useState, useCallback } from 'react';
import { HandTracker, HandTrackingResult } from '@/lib/handTracking';
import { HandGestures, processHandGestures } from '@/lib/gestureRecognition';
import { Hands, HAND_CONNECTIONS, Results, NormalizedLandmarkList } from '@mediapipe/hands';

// Helper to draw landmarks and connectors manually if drawing_utils is missing
function drawHand(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmarkList) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';

  // Draw connections
  HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  });

  // Draw landmarks
  ctx.fillStyle = '#FF0000';
  landmarks.forEach((landmark) => {
    ctx.beginPath();
    ctx.arc(landmark.x * width, landmark.y * height, 3, 0, 2 * Math.PI);
    ctx.fill();
  });
}

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
        // Always clear the canvas first
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Only draw if overlay is enabled and we have results
        if (showOverlay && result.rawResults && result.rawResults.multiHandLandmarks) {
          for (const landmarks of result.rawResults.multiHandLandmarks) {
            drawHand(canvasCtx, landmarks);
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