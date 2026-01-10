import { useState } from 'react';
import { 
  Settings, 
  FileUp, 
  Save, 
  RotateCcw, 
  X,
  User,
  Settings2,
  Eye,
  EyeOff,
  Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface SettingsMenuProps {
  onOpen: () => void;
  onSave: () => void;
  onReset: () => void;
  config: {
    leftHandEnabled: boolean;
    rightHandEnabled: boolean;
    showHandOverlay: boolean;
    sensitivity: number;
  };
  onConfigChange: (key: string, value: any) => void;
}

export function SettingsMenu({ onOpen, onSave, onReset, config, onConfigChange }: SettingsMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="glass border-primary/30 hover:border-primary/60 text-primary"
          size="icon"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong border-l border-primary/20 text-foreground">
        <SheetHeader>
          <SheetTitle className="text-primary font-display text-2xl">Settings</SheetTitle>
        </SheetHeader>
        
        <div className="py-6 space-y-8 h-[calc(100vh-120px)] overflow-y-auto pr-2">
          {/* File Operations */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary/80">
              <FileUp className="w-4 h-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">File</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={onOpen} variant="outline" className="justify-start glass border-primary/20">
                <FileUp className="w-4 h-4 mr-2" />
                Open Project
              </Button>
              <Button onClick={onSave} variant="outline" className="justify-start glass border-primary/20">
                <Save className="w-4 h-4 mr-2" />
                Save As...
              </Button>
              <Button onClick={onReset} variant="outline" className="justify-start glass border-destructive/20 text-destructive hover:text-destructive">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Scene
              </Button>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* Configurations */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary/80">
              <Settings2 className="w-4 h-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Configurations</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-muted-foreground" />
                    <Label>Sensitivity</Label>
                  </div>
                  <span className="text-xs font-mono text-primary">{config.sensitivity.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[config.sensitivity]}
                  onValueChange={(val) => onConfigChange('sensitivity', val[0])}
                  min={1}
                  max={10}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Left Hand Functions</Label>
                  <p className="text-xs text-muted-foreground">View & Zoom control</p>
                </div>
                <Switch 
                  checked={config.leftHandEnabled}
                  onCheckedChange={(val) => onConfigChange('leftHandEnabled', val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Right Hand Functions</Label>
                  <p className="text-xs text-muted-foreground">Building & Selection</p>
                </div>
                <Switch 
                  checked={config.rightHandEnabled}
                  onCheckedChange={(val) => onConfigChange('rightHandEnabled', val)}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* Visualization */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary/80">
              <User className="w-4 h-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Visualization</h3>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Hand Overlay</Label>
                <p className="text-xs text-muted-foreground">Show skeleton on camera</p>
              </div>
              <Switch 
                checked={config.showHandOverlay}
                onCheckedChange={(val) => onConfigChange('showHandOverlay', val)}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="absolute bottom-6 left-6 right-6">
          <p className="text-[10px] text-center text-muted-foreground/50 w-full uppercase tracking-widest">
            VoxelCraft v1.0.0
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}