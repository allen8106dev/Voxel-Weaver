import { useState } from 'react';
import { 
  Settings, 
  FileUp, 
  Save, 
  RotateCcw, 
  Settings2,
  Gauge,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Lock,
  Hand,
  Plus,
  Minus
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
    left: {
      rotate: boolean;
      zoomIn: boolean;
      zoomOut: boolean;
      lock: boolean;
    };
    right: {
      cycleBlocks: boolean;
      cycleSurfaces: boolean;
      place: boolean;
      delete: boolean;
    };
  };
  onConfigChange: (key: string, value: any) => void;
}

export function SettingsMenu({ onOpen, onSave, onReset, config, onConfigChange }: SettingsMenuProps) {
  const [activeTab, setActiveTab] = useState('file');

  const menuItems = [
    { id: 'file', label: 'File', icon: FileUp },
    { id: 'config', label: 'Configurations', icon: Settings2 },
  ];

  const updateHandConfig = (hand: 'left' | 'right', feature: string, value: boolean) => {
    onConfigChange(hand, { ...config[hand], [feature]: value });
  };

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
      <SheetContent className="glass-strong border-l border-primary/20 text-foreground flex flex-col p-0 w-full sm:max-w-md">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="text-primary font-display text-2xl">Settings</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Menu */}
          <div className="w-16 sm:w-20 border-r border-primary/10 flex flex-col py-4 bg-black/20">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center py-4 transition-colors relative ${
                    activeTab === item.id 
                      ? 'text-primary bg-primary/5' 
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-[10px] uppercase tracking-tighter font-medium">{item.label.split(' ')[0]}</span>
                  {activeTab === item.id && (
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'file' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary/80">
                    <FileUp className="w-4 h-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">File Operations</h3>
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
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary/80">
                    <Settings2 className="w-4 h-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Control Configuration</h3>
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

                    <Separator className="bg-primary/10" />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Hand className="w-4 h-4 text-primary" />
                          <Label className="font-bold">Left Hand (View)</Label>
                        </div>
                        <Switch 
                          checked={config.leftHandEnabled}
                          onCheckedChange={(val) => onConfigChange('leftHandEnabled', val)}
                        />
                      </div>
                      
                      {config.leftHandEnabled && (
                        <div className="grid gap-3 pl-6 border-l border-primary/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <RotateCw className="w-3 h-3 text-muted-foreground" />
                              <Label className="text-xs">Rotation</Label>
                            </div>
                            <Switch 
                              checked={config.left.rotate}
                              onCheckedChange={(val) => updateHandConfig('left', 'rotate', val)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ZoomIn className="w-3 h-3 text-muted-foreground" />
                              <Label className="text-xs">Zoom In</Label>
                            </div>
                            <Switch 
                              checked={config.left.zoomIn}
                              onCheckedChange={(val) => updateHandConfig('left', 'zoomIn', val)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ZoomOut className="w-3 h-3 text-muted-foreground" />
                              <Label className="text-xs">Zoom Out</Label>
                            </div>
                            <Switch 
                              checked={config.left.zoomOut}
                              onCheckedChange={(val) => updateHandConfig('left', 'zoomOut', val)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Lock className="w-3 h-3 text-muted-foreground" />
                              <Label className="text-xs">Lock View</Label>
                            </div>
                            <Switch 
                              checked={config.left.lock}
                              onCheckedChange={(val) => updateHandConfig('left', 'lock', val)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="bg-primary/10" />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Hand className="w-4 h-4 text-secondary" />
                          <Label className="font-bold">Right Hand (Build)</Label>
                        </div>
                        <Switch 
                          checked={config.rightHandEnabled}
                          onCheckedChange={(val) => onConfigChange('rightHandEnabled', val)}
                        />
                      </div>

                      {config.rightHandEnabled && (
                        <div className="grid gap-3 pl-6 border-l border-secondary/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Hand className="w-3 h-3 text-muted-foreground" />
                              <Label className="text-xs">Cycle Blocks</Label>
                            </div>
                            <Switch 
                              checked={config.right.cycleBlocks}
                              onCheckedChange={(val) => updateHandConfig('right', 'cycleBlocks', val)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Hand className="w-3 h-3 text-muted-foreground" />
                              <Label className="text-xs">Cycle Surfaces</Label>
                            </div>
                            <Switch 
                              checked={config.right.cycleSurfaces}
                              onCheckedChange={(val) => updateHandConfig('right', 'cycleSurfaces', val)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Plus className="w-3 h-3 text-green-400" />
                              <Label className="text-xs">Place Cube</Label>
                            </div>
                            <Switch 
                              checked={config.right.place}
                              onCheckedChange={(val) => updateHandConfig('right', 'place', val)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Minus className="w-3 h-3 text-red-400" />
                              <Label className="text-xs">Delete Cube</Label>
                            </div>
                            <Switch 
                              checked={config.right.delete}
                              onCheckedChange={(val) => updateHandConfig('right', 'delete', val)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="p-6 pt-2">
          <p className="text-[10px] text-center text-muted-foreground/50 w-full uppercase tracking-widest">
            VoxelCraft v1.0.0
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
