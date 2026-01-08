import { useRef, useEffect, useState, useCallback } from 'react';
import { VoxelScene } from '@/lib/voxelScene';
import { useHandTracking } from '@/hooks/useHandTracking';
import { HandGestures } from '@/lib/gestureRecognition';
import { Button } from '@/components/ui/button';
import { 
  Hand, 
  Camera, 
  CameraOff, 
  Trash2, 
  Info,
  Box,
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

interface GestureDebounce {
  rightIndexPinch: boolean;
  rightMiddlePinch: boolean;
  leftIndexPinch: boolean;
  leftMiddlePinch: boolean;
}

export function VoxelBuilder() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VoxelScene | null>(null);
  const { isInitialized, isRunning, error, gestures, videoRef, start, stop } = useHandTracking();
  const [voxelCount, setVoxelCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showInstructions, setShowInstructions] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);
  const lastGestureRef = useRef<GestureDebounce>({
    rightIndexPinch: false,
    rightMiddlePinch: false,
    leftIndexPinch: false,
    leftMiddlePinch: false,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const scene = new VoxelScene(containerRef.current);
      sceneRef.current = scene;

      return () => {
        scene.destroy();
        sceneRef.current = null;
      };
    } catch (e: any) {
      console.error('Failed to create VoxelScene:', e);
      setWebglError(e.message || 'WebGL initialization failed');
    }
  }, []);

  const processGestures = useCallback((gestures: HandGestures) => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const lastGesture = lastGestureRef.current;

    if (gestures.left) {
      scene.updateWorldTransform(gestures.left.palmPosition, gestures.left.palmRotation);

      if (gestures.left.indexThumbPinch && !lastGesture.leftIndexPinch) {
        scene.zoomIn();
      } else if (gestures.left.indexThumbPinch) {
        scene.zoomIn();
      }

      if (gestures.left.middleThumbPinch && !lastGesture.leftMiddlePinch) {
        scene.zoomOut();
      } else if (gestures.left.middleThumbPinch) {
        scene.zoomOut();
      }

      lastGesture.leftIndexPinch = gestures.left.indexThumbPinch;
      lastGesture.leftMiddlePinch = gestures.left.middleThumbPinch;
    }

    if (gestures.right) {
      scene.updateTargetFromRay(gestures.right.palmPosition, gestures.right.indexDirection);

      if (gestures.right.indexThumbPinch && !lastGesture.rightIndexPinch) {
        if (scene.placeCube()) {
          setVoxelCount(scene.getVoxelCount());
        }
      }

      if (gestures.right.middleThumbPinch && !lastGesture.rightMiddlePinch) {
        if (scene.deleteCube()) {
          setVoxelCount(scene.getVoxelCount());
        }
      }

      lastGesture.rightIndexPinch = gestures.right.indexThumbPinch;
      lastGesture.rightMiddlePinch = gestures.right.middleThumbPinch;
    } else {
      scene.hideTarget();
    }

    setZoom(scene.getZoom());
  }, []);

  useEffect(() => {
    processGestures(gestures);
  }, [gestures, processGestures]);

  const handleClear = () => {
    if (sceneRef.current) {
      sceneRef.current.clearAll();
      setVoxelCount(0);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <div 
        ref={containerRef} 
        className="absolute inset-0 grid-pattern"
        data-testid="canvas-3d-scene"
      />

      <video
        ref={videoRef}
        className="absolute bottom-4 right-4 w-48 h-36 rounded-lg border border-primary/30 glass object-cover transform scale-x-[-1]"
        autoPlay
        playsInline
        muted
        data-testid="video-camera-feed"
      />

      <div className="absolute top-4 left-4 glass-strong rounded-xl p-4 max-w-xs">
        <h1 className="font-display text-2xl text-primary text-glow-subtle mb-1" data-testid="text-title">
          VoxelCraft
        </h1>
        <p className="text-sm text-muted-foreground">
          3D Hand-Tracking Builder
        </p>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {!isRunning ? (
          <Button
            onClick={start}
            disabled={!isInitialized}
            className="glass border-primary/30 hover:border-primary/60 text-primary"
            data-testid="button-start-tracking"
          >
            <Camera className="w-4 h-4 mr-2" />
            {isInitialized ? 'Start Tracking' : 'Initializing...'}
          </Button>
        ) : (
          <Button
            onClick={stop}
            variant="destructive"
            className="glass"
            data-testid="button-stop-tracking"
          >
            <CameraOff className="w-4 h-4 mr-2" />
            Stop Tracking
          </Button>
        )}

        <Button
          onClick={handleClear}
          variant="outline"
          className="glass border-destructive/30 hover:border-destructive/60 text-destructive"
          data-testid="button-clear-all"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>

        <Button
          onClick={() => setShowInstructions(!showInstructions)}
          variant="outline"
          className="glass border-muted-foreground/30"
          data-testid="button-toggle-instructions"
        >
          <Info className="w-4 h-4 mr-2" />
          {showInstructions ? 'Hide' : 'Show'} Help
        </Button>
      </div>

      <div className="absolute bottom-4 left-4 glass-strong rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Box className="w-5 h-5 text-primary" />
          <span className="font-mono text-lg" data-testid="text-voxel-count">
            {voxelCount} voxels
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ZoomIn className="w-5 h-5 text-secondary" />
          <span className="font-mono text-lg" data-testid="text-zoom-level">
            {(zoom * 100).toFixed(0)}% zoom
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className={`w-3 h-3 rounded-full ${gestures.left ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
          <span className="text-xs text-muted-foreground">Left Hand</span>
          <div className={`w-3 h-3 rounded-full ml-2 ${gestures.right ? 'bg-secondary animate-pulse' : 'bg-muted'}`} />
          <span className="text-xs text-muted-foreground">Right Hand</span>
        </div>
      </div>

      {showInstructions && (
        <div className="absolute top-20 left-4 glass-strong rounded-xl p-4 max-w-sm space-y-4" data-testid="panel-instructions">
          <h3 className="font-display text-lg text-primary border-b border-primary/20 pb-2">
            Hand Controls
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Hand className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Left Hand - World Control</p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                  <li className="flex items-center gap-2">
                    <Move className="w-3 h-3" /> Move hand → Rotate/Move scene
                  </li>
                  <li className="flex items-center gap-2">
                    <ZoomIn className="w-3 h-3" /> Index + Thumb pinch → Zoom in
                  </li>
                  <li className="flex items-center gap-2">
                    <ZoomOut className="w-3 h-3" /> Middle + Thumb pinch → Zoom out
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hand className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Right Hand - Cube Control</p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                  <li className="flex items-center gap-2">
                    <MousePointer className="w-3 h-3" /> Point index finger → Aim cursor
                  </li>
                  <li className="flex items-center gap-2">
                    <Box className="w-3 h-3 text-green-400" /> Index + Thumb pinch → Place cube
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 className="w-3 h-3 text-red-400" /> Middle + Thumb pinch → Delete cube
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/70 border-t border-primary/10 pt-2">
            Motion is mirrored: move left to rotate left. Cubes snap to grid automatically.
          </p>
        </div>
      )}

      {webglError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-strong rounded-xl p-6 text-center max-w-md z-50" data-testid="panel-webgl-error">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="font-display text-lg text-amber-400 mb-2">WebGL Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This 3D application requires WebGL. The preview iframe may have limited WebGL support.
          </p>
          <Button
            onClick={() => window.open(window.location.href, '_blank')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-open-new-tab"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
          <p className="text-xs text-muted-foreground/70 mt-4">
            Opening in a new browser tab usually resolves WebGL issues.
          </p>
        </div>
      )}

      {error && !webglError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-strong rounded-xl p-6 text-center max-w-md" data-testid="panel-error">
          <CameraOff className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="font-display text-lg text-destructive mb-2">Camera Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            Make sure to allow camera access when prompted.
          </p>
        </div>
      )}

      {!isRunning && !error && isInitialized && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center" data-testid="panel-start-prompt">
          <div className="glass-strong rounded-2xl p-8 cyber-border animate-pulse-glow">
            <Hand className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-2xl text-primary text-glow-subtle mb-2">
              Ready to Build
            </h2>
            <p className="text-muted-foreground mb-4">
              Click "Start Tracking" to begin using your hands
            </p>
          </div>
        </div>
      )}
    </div>
  );
}