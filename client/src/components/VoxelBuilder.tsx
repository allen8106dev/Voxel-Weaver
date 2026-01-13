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
  Plus,
  Minus,
  ExternalLink,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Lock,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

import { SettingsMenu, ActionType } from '@/components/SettingsMenu';

interface GestureDebounce {
  rightIndexPinch: boolean;
  rightMiddlePinch: boolean;
  leftIndexPinch: boolean;
  leftMiddlePinch: boolean;
}

export function VoxelBuilder() {
  const DEFAULT_CONFIG = {
    leftHandEnabled: true,
    rightHandEnabled: true,
    showHandOverlay: true,
    sensitivity: 10.0,
    handsSwapped: false,
    left: {
      index: 'rotate' as ActionType,
      middle: 'zoomIn' as ActionType,
      ring: 'zoomOut' as ActionType,
      pinky: 'lock' as ActionType
    },
    right: {
      index: 'place' as ActionType,
      middle: 'delete' as ActionType
    }
  };

  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const handleResetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    if (sceneRef.current) {
      sceneRef.current.setSensitivity(DEFAULT_CONFIG.sensitivity);
    }
  }, []);
  
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
    leftIndexPinch: false,
    leftMiddlePinch: false,
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

    const getActionFromMappings = (hand: 'left' | 'right', action: ActionType, pinches: { index: boolean; middle: boolean; ring?: boolean; pinky?: boolean }): boolean => {
      if (hand === 'right') {
        const mappings = config.right;
        if (mappings.index === action && pinches.index) return true;
        if (mappings.middle === action && pinches.middle) return true;
        return false;
      }
      
      const mappings = config.left;
      if (mappings.index === action && pinches.index) return true;
      if (mappings.middle === action && pinches.middle) return true;
      if (mappings.ring === action && pinches.ring) return true;
      if (mappings.pinky === action && pinches.pinky) return true;
      return false;
    };

    // Determine which real hand maps to which logic hand
    const viewHand = config.handsSwapped ? gestures.right : gestures.left;
    const buildHand = config.handsSwapped ? gestures.left : gestures.right;

    if (viewHand && config.leftHandEnabled) {
      const pinches = {
        index: viewHand.indexThumbPinch,
        middle: viewHand.middleThumbPinch,
        ring: viewHand.ringThumbPinch,
        pinky: viewHand.pinkyThumbPinch
      };
      
      scene.updateLeftHand(
        viewHand.palmPosition,
        getActionFromMappings('left', 'rotate', pinches),
        getActionFromMappings('left', 'zoomIn', pinches),
        getActionFromMappings('left', 'zoomOut', pinches),
        getActionFromMappings('left', 'lock', pinches)
      );
      setIsLocked(scene.isLockedState());
    }

    if (buildHand && config.rightHandEnabled) {
      const pinches = {
        index: buildHand.indexThumbPinch,
        middle: buildHand.middleThumbPinch,
        ring: false,
        pinky: false
      };

      const status = scene.updateCursor(
        buildHand.palmPosition,
        false,
        false
      );
      setCursorStatus(status);

      const placeActive = getActionFromMappings('right', 'place', pinches);
      const deleteActive = getActionFromMappings('right', 'delete', pinches);

      if (placeActive && !lastGesture.rightIndexPinch && status.canPlace) {
        if (scene.placeCube()) setVoxelCount(scene.getVoxelCount());
      }
      if (deleteActive && !lastGesture.rightMiddlePinch && status.canDelete) {
        if (scene.deleteCube()) setVoxelCount(scene.getVoxelCount());
      }

      lastGesture.rightIndexPinch = placeActive;
      lastGesture.rightMiddlePinch = deleteActive;
    } else {
      scene.hideCursor();
      setCursorStatus({ hasTarget: false, canPlace: false, canDelete: false });
    }

    if (viewHand && config.leftHandEnabled) {
      lastGesture.leftIndexPinch = viewHand.indexThumbPinch;
      lastGesture.leftMiddlePinch = viewHand.middleThumbPinch;
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

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => {
      let newConfig = { ...prev, [key]: value };
      
      if (key === 'sensitivity' && sceneRef.current) {
        sceneRef.current.setSensitivity(value);
      }
      return newConfig;
    });
  };

  const handleOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const data = JSON.parse(event.target.result);
          if (Array.isArray(data) && sceneRef.current) {
            sceneRef.current.importData(data);
            setVoxelCount(sceneRef.current.getVoxelCount());
          }
        } catch (err) {
          console.error('Failed to parse voxel data:', err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleSave = useCallback(() => {
    if (sceneRef.current) {
      const data = sceneRef.current.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `voxelcraft_${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, []);

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-[#0a0a0f] ${isFullScreen ? 'fullscreen-mode' : ''}`}>
      <div ref={containerRef} className="absolute inset-0" />

      <div className={`absolute bottom-4 right-4 flex flex-col items-end gap-2 transition-opacity duration-300 ${isFullScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={start} disabled={!isInitialized} variant="outline" size="icon" className="glass h-8 w-8 text-primary">
              <Camera className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={stop} variant="destructive" size="icon" className="glass h-8 w-8">
              <CameraOff className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={() => handleConfigChange('showHandOverlay', !config.showHandOverlay)} variant="outline" size="icon" className={`glass h-8 w-8 ${config.showHandOverlay ? 'text-primary' : 'text-muted-foreground'}`}>
            {config.showHandOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </Button>
          <Button onClick={() => setShowCamera(!showCamera)} variant="outline" size="icon" className="glass h-8 w-8 text-muted-foreground">
            {showCamera ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>

        <div className={`relative rounded-lg overflow-hidden border border-primary/30 glass transition-all duration-200 ${showCamera ? 'w-48 h-36 opacity-100' : 'w-0 h-0 opacity-0 border-0'}`}>
          <video ref={videoRef} className="w-48 h-36 object-cover transform scale-x-[-1]" autoPlay playsInline muted />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]" width={640} height={480} />
        </div>
      </div>

      <div className={`absolute top-4 left-4 glass-strong rounded-xl p-4 max-w-xs transition-opacity duration-300 ${isFullScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <h1 className="font-display text-2xl text-primary text-glow-subtle mb-1">VoxelCraft v1.2.1</h1>
        <p className="text-sm text-muted-foreground">Hand-Tracking 3D Builder</p>
      </div>

      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <SettingsMenu 
          onOpen={handleOpen} 
          onSave={handleSave} 
          onReset={handleClear} 
          onResetConfig={handleResetConfig}
          config={config} 
          onConfigChange={handleConfigChange} 
        />
        <Button onClick={() => setShowInstructions(!showInstructions)} variant="outline" size="icon" className="glass text-primary h-8 w-8">
          <Info className="w-5 h-5" />
        </Button>
        <Button onClick={() => setIsFullScreen(!isFullScreen)} variant="outline" size="icon" className="glass text-primary h-8 w-8">
          {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>

      <div className={`absolute bottom-4 left-4 glass-strong rounded-xl p-4 space-y-3 transition-opacity duration-300 ${isFullScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-3">
          <Box className="w-5 h-5 text-primary" />
          <span className="font-mono text-lg">{voxelCount} {voxelCount === 1 ? 'voxel' : 'voxels'}</span>
        </div>
        {isLocked && <div className="flex items-center gap-3 text-amber-400"><Lock className="w-5 h-5" /><span className="font-mono text-sm">LOCKED</span></div>}
        {cursorStatus.hasTarget && <div className="flex items-center gap-2 text-green-400"><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><span className="text-xs">Surface Selected</span></div>}
        <div className="flex items-center gap-2 mt-2">
          <div className={`w-3 h-3 rounded-full ${gestures.left ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
          <span className="text-xs text-muted-foreground">Left</span>
          <div className={`w-3 h-3 rounded-full ml-2 ${gestures.right ? 'bg-secondary animate-pulse' : 'bg-muted'}`} />
          <span className="text-xs text-muted-foreground">Right</span>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="glass h-8 px-3 text-[10px] font-medium uppercase tracking-wider text-primary/70 hover:text-primary transition-all hover:bg-primary/5 border-primary/20 w-full justify-center mt-2"
        >
          <a href="https://buymeacoffee.com/allen_joseph" target="_blank" rel="noopener noreferrer">
            ☕ Buy me a coffee
          </a>
        </Button>
      </div>

      {showInstructions && !isFullScreen && (
        <div className="absolute top-20 left-4 glass-strong rounded-xl p-4 max-w-sm space-y-4">
          <h3 className="font-display text-lg text-primary border-b border-primary/20 pb-2">Controls</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Hand className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-primary">Left Hand - View</p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                  <li><RotateCcw className="w-3 h-3 inline mr-1" /> {config.left.index} (Index)</li>
                  <li><ZoomIn className="w-3 h-3 inline mr-1" /> {config.left.middle} (Middle)</li>
                  <li><ZoomOut className="w-3 h-3 inline mr-1" /> {config.left.ring} (Ring)</li>
                  <li><Lock className="w-3 h-3 inline mr-1" /> {config.left.pinky} (Pinky)</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Hand className="w-5 h-5 text-secondary mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-secondary">Right Hand - Build</p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                  <li><Plus className="w-3 h-3 inline mr-1" /> {config.right.index} (Index)</li>
                  <li><Minus className="w-3 h-3 inline mr-1" /> {config.right.middle} (Middle)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {webglError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-strong rounded-xl p-6 text-center max-w-md z-50">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="font-display text-lg text-amber-400 mb-2">WebGL Required</h3>
          <Button onClick={() => window.open(window.location.href, '_blank')} className="bg-primary text-primary-foreground">
            <ExternalLink className="w-4 h-4 mr-2" /> Open in New Tab
          </Button>
        </div>
      )}

      {!isRunning && !error && !webglError && isInitialized && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="glass-strong rounded-2xl p-8 cyber-border animate-pulse-glow">
            <Hand className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-2xl text-primary mb-2">Ready to Build</h2>
            <Button onClick={start} className="mt-4">Start Tracking</Button>
          </div>
        </div>
      )}
    </div>
  );
}
