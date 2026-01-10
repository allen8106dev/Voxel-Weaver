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
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { SettingsMenu } from '@/components/SettingsMenu';

interface GestureDebounce {
  rightIndexPinch: boolean;
  rightMiddlePinch: boolean;
}

export function VoxelBuilder() {
  const [config, setConfig] = useState({
    leftHandEnabled: true,
    rightHandEnabled: true,
    showHandOverlay: true,
    sensitivity: 5.0,
    left: {
      rotate: true,
      zoomIn: true,
      zoomOut: true,
      lock: true
    },
    right: {
      cycleBlocks: true,
      cycleSurfaces: true,
      place: true,
      delete: true
    }
  });
  const [voxelCount, setVoxelCount] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [cursorStatus, setCursorStatus] = useState({ hasTarget: false, canPlace: false, canDelete: false });
  const [isFullScreen, setIsFullScreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VoxelScene | null>(null);
  const { isInitialized, isRunning, error, gestures, videoRef, canvasRef, start, stop } = useHandTracking(config.showHandOverlay);
  
  const [showCamera, setShowCamera] = useState(true);

  const lastGestureRef = useRef<GestureDebounce>({
    rightIndexPinch: false,
    rightMiddlePinch: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        setIsFullScreen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

    if (gestures.left && config.leftHandEnabled) {
      scene.updateLeftHand(
        gestures.left.palmPosition,
        config.left.rotate && gestures.left.indexThumbPinch,
        config.left.zoomIn && gestures.left.middleThumbPinch,
        config.left.zoomOut && gestures.left.ringThumbPinch,
        config.left.lock && gestures.left.pinkyThumbPinch
      );
      setIsLocked(scene.isLockedState());
    }

    if (gestures.right && config.rightHandEnabled) {
      const status = scene.updateCursor(
        gestures.right.palmPosition,
        config.right.cycleBlocks && gestures.right.ringThumbPinch,
        config.right.cycleSurfaces && gestures.right.pinkyThumbPinch
      );
      setCursorStatus(status);

      if (config.right.place && gestures.right.indexThumbPinch && !lastGesture.rightIndexPinch) {
        if (status.canPlace && scene.placeCube()) {
          setVoxelCount(scene.getVoxelCount());
        }
      }

      if (config.right.delete && gestures.right.middleThumbPinch && !lastGesture.rightMiddlePinch) {
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
  }, [config]);

  useEffect(() => {
    processGestures(gestures);
  }, [gestures]);

  const handleClear = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.clearAll();
      setVoxelCount(1);
    }
  }, []);

  const handleOpen = () => {
    console.log('Open project');
  };

  const handleSave = () => {
    console.log('Save project');
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      if (key === 'sensitivity' && sceneRef.current) {
        sceneRef.current.setSensitivity(value * 2);
      }
      return newConfig;
    });
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-[#0a0a0f] ${isFullScreen ? 'fullscreen-mode' : ''}`}>
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        data-testid="canvas-3d-scene"
      />

      <div className={`absolute bottom-4 right-4 flex flex-col items-end gap-2 transition-opacity duration-300 ${isFullScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex gap-2">
          {!isRunning ? (
            <Button
              onClick={start}
              disabled={!isInitialized}
              variant="outline"
              size="icon"
              className="glass h-8 w-8 border-primary/30 hover:border-primary/60 text-primary"
              title="Start Tracking"
            >
              <Camera className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={stop}
              variant="destructive"
              size="icon"
              className="glass h-8 w-8"
              title="Stop Tracking"
            >
              <CameraOff className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={() => handleConfigChange('showHandOverlay', !config.showHandOverlay)}
            variant="outline"
            size="icon"
            className={`glass h-8 w-8 transition-colors ${config.showHandOverlay ? 'border-primary/60 text-primary' : 'border-primary/20 text-muted-foreground'}`}
            title="Toggle Overlay"
          >
            {config.showHandOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </Button>
          <Button
            onClick={() => setShowCamera(!showCamera)}
            variant="outline"
            size="icon"
            className="glass h-8 w-8 border-primary/20 text-muted-foreground hover:text-primary"
            title={showCamera ? 'Hide Feed' : 'Show Feed'}
          >
            {showCamera ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>

        <div className={`relative rounded-lg overflow-hidden border border-primary/30 glass transition-all duration-200 ${showCamera ? 'w-48 h-36 opacity-100' : 'w-0 h-0 opacity-0 border-0'}`}>
          <video
            ref={videoRef}
            className="w-48 h-36 object-cover transform scale-x-[-1]"
            autoPlay
            playsInline
            muted
            data-testid="video-camera-feed"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]"
            width={640}
            height={480}
          />
        </div>
      </div>

      <div className={`absolute top-4 left-4 glass-strong rounded-xl p-4 max-w-xs transition-opacity duration-300 ${isFullScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <h1 className="font-display text-2xl text-primary text-glow-subtle mb-1" data-testid="text-title">
          VoxelCraft
        </h1>
        <p className="text-sm text-muted-foreground">
          Hand-Tracking 3D Builder
        </p>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2 z-50">
        <div className="flex gap-2">
          <SettingsMenu 
            onOpen={handleOpen}
            onSave={handleSave}
            onReset={handleClear}
            config={config}
            onConfigChange={handleConfigChange}
          />
          <Button
            onClick={() => setShowInstructions(!showInstructions)}
            variant="outline"
            className="glass border-primary/30 hover:border-primary/60 text-primary"
            size="icon"
            title="Toggle Help"
          >
            <Info className="w-5 h-5" />
          </Button>
          <Button
            onClick={() => setIsFullScreen(!isFullScreen)}
            variant="outline"
            className="glass border-primary/30 hover:border-primary/60 text-primary"
            size="icon"
            title="Toggle Fullscreen (F)"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className={`absolute bottom-4 left-4 glass-strong rounded-xl p-4 space-y-3 transition-opacity duration-300 ${isFullScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-3">
          <Box className="w-5 h-5 text-primary" />
          <span className="font-mono text-lg" data-testid="text-voxel-count">
            {voxelCount} {voxelCount === 1 ? 'voxel' : 'voxels'}
          </span>
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

      {showInstructions && !isFullScreen && (
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
                    <Hand className="w-3 h-3" /> Move Hand → Highlight Block
                  </li>
                  <li className="flex items-center gap-2">
                    <Hand className="w-3 h-3" /> Thumb + Ring → Cycle surfaces
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
