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
  RotateCcw,
  Lock,
  Plus,
  Minus,
  ExternalLink,
  AlertTriangle,
  Gauge
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface GestureDebounce {
  rightIndexPinch: boolean;
  rightMiddlePinch: boolean;
}

export function VoxelBuilder() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VoxelScene | null>(null);
  const { isInitialized, isRunning, error, gestures, videoRef, start, stop } = useHandTracking();
  const [voxelCount, setVoxelCount] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [cursorStatus, setCursorStatus] = useState({ hasTarget: false, canPlace: false, canDelete: false });
  const [sensitivity, setSensitivity] = useState(1.5);
  const lastGestureRef = useRef<GestureDebounce>({
    rightIndexPinch: false,
    rightMiddlePinch: false,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const scene = new VoxelScene(containerRef.current);
      sceneRef.current = scene;
      setVoxelCount(scene.getVoxelCount());

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
      scene.updateLeftHand(
        gestures.left.palmPosition,
        gestures.left.indexThumbPinch,
        gestures.left.middleThumbPinch,
        gestures.left.ringThumbPinch,
        gestures.left.pinkyThumbPinch
      );
      setIsLocked(scene.isLockedState());
    }

    if (gestures.right) {
      const status = scene.updateCursor(gestures.right.palmPosition, gestures.right.ringThumbPinch);
      setCursorStatus(status);

      if (gestures.right.indexThumbPinch && !lastGesture.rightIndexPinch) {
        if (status.canPlace && scene.placeCube()) {
          setVoxelCount(scene.getVoxelCount());
        }
      }

      if (gestures.right.middleThumbPinch && !lastGesture.rightMiddlePinch) {
        if (status.canDelete && scene.deleteCube()) {
          setVoxelCount(scene.getVoxelCount());
        }
      }

      lastGesture.rightIndexPinch = gestures.right.indexThumbPinch;
      lastGesture.rightMiddlePinch = gestures.right.middleThumbPinch;
    } else {
      scene.hideCursor();
      setCursorStatus({ hasTarget: false, canPlace: false, canDelete: false });
    }
  }, []);

  useEffect(() => {
    processGestures(gestures);
  }, [gestures, processGestures]);

  const handleClear = () => {
    if (sceneRef.current) {
      sceneRef.current.clearAll();
      setVoxelCount(1);
    }
  };

  const handleSensitivityChange = (value: number[]) => {
    const newValue = value[0];
    setSensitivity(newValue);
    if (sceneRef.current) {
      sceneRef.current.setSensitivity(newValue);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0f]">
      <div 
        ref={containerRef} 
        className="absolute inset-0"
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
          Hand-Tracking 3D Builder
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
          Reset
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
            {voxelCount} {voxelCount === 1 ? 'voxel' : 'voxels'}
          </span>
        </div>
        
        <div className="space-y-2 pt-2 border-t border-primary/20">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sensitivity</span>
            <span className="text-xs font-mono text-primary ml-auto">{sensitivity.toFixed(1)}x</span>
          </div>
          <Slider
            value={[sensitivity]}
            onValueChange={handleSensitivityChange}
            min={0.5}
            max={10}
            step={0.1}
            className="w-32"
            data-testid="slider-sensitivity"
          />
        </div>

        {isLocked && (
          <div className="flex items-center gap-3 text-amber-400">
            <Lock className="w-5 h-5" />
            <span className="font-mono text-sm">LOCKED</span>
          </div>
        )}
        {cursorStatus.hasTarget && (
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs">Surface Selected</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <div className={`w-3 h-3 rounded-full ${gestures.left ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
          <span className="text-xs text-muted-foreground">Left</span>
          <div className={`w-3 h-3 rounded-full ml-2 ${gestures.right ? 'bg-secondary animate-pulse' : 'bg-muted'}`} />
          <span className="text-xs text-muted-foreground">Right</span>
        </div>
      </div>

      {showInstructions && (
        <div className="absolute top-20 left-4 glass-strong rounded-xl p-4 max-w-sm space-y-4" data-testid="panel-instructions">
          <h3 className="font-display text-lg text-primary border-b border-primary/20 pb-2">
            Controls
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Hand className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-primary">Left Hand - View Control</p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                  <li className="flex items-center gap-2">
                    <RotateCcw className="w-3 h-3" /> Thumb + Index → Rotate (drag)
                  </li>
                  <li className="flex items-center gap-2">
                    <ZoomIn className="w-3 h-3" /> Thumb + Middle → Zoom in
                  </li>
                  <li className="flex items-center gap-2">
                    <ZoomOut className="w-3 h-3" /> Thumb + Ring → Zoom out
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Thumb + Pinky → Lock view
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hand className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-secondary">Right Hand - Build</p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                  <li className="flex items-center gap-2">
                    <Hand className="w-3 h-3" /> Thumb + Ring → Cycle surface selection
                  </li>
                  <li className="flex items-center gap-2">
                    <Plus className="w-3 h-3 text-green-400" /> Thumb + Index → Place cube
                  </li>
                  <li className="flex items-center gap-2">
                    <Minus className="w-3 h-3 text-red-400" /> Thumb + Middle → Delete cube
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/70 border-t border-primary/10 pt-2">
            Point at a block face to place adjacent cubes. Release rotation pinch for inertia effect.
          </p>
        </div>
      )}

      {webglError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-strong rounded-xl p-6 text-center max-w-md z-50" data-testid="panel-webgl-error">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="font-display text-lg text-amber-400 mb-2">WebGL Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This 3D app requires WebGL. The preview may have limited support.
          </p>
          <Button
            onClick={() => window.open(window.location.href, '_blank')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-open-new-tab"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      )}

      {error && !webglError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-strong rounded-xl p-6 text-center max-w-md" data-testid="panel-error">
          <CameraOff className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="font-display text-lg text-destructive mb-2">Camera Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {!isRunning && !error && !webglError && isInitialized && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center" data-testid="panel-start-prompt">
          <div className="glass-strong rounded-2xl p-8 cyber-border animate-pulse-glow">
            <Hand className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-2xl text-primary text-glow-subtle mb-2">
              Ready to Build
            </h2>
            <p className="text-muted-foreground mb-4">
              Click "Start Tracking" to begin
            </p>
          </div>
        </div>
      )}
    </div>
  );
}