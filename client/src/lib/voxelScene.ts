import * as THREE from 'three';

export interface Voxel {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
}

export interface VoxelSceneState {
  voxels: Map<string, Voxel>;
  targetPosition: THREE.Vector3 | null;
  targetVoxelId: string | null;
  targetFace: THREE.Vector3 | null;
  worldRotation: THREE.Euler;
  rotationVelocity: THREE.Vector2;
  zoom: number;
  zoomVelocity: number;
  isLocked: boolean;
  isRotating: boolean;
}

const GRID_SIZE = 1;
const VOXEL_COLOR = 0x00ffff;
const HIGHLIGHT_COLOR = 0xff0000;
const INERTIA_DAMPING = 0.95;
const ZOOM_SPEED = 0.03;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function positionToKey(pos: THREE.Vector3): string {
  return `${snapToGrid(pos.x)}_${snapToGrid(pos.y)}_${snapToGrid(pos.z)}`;
}

export class VoxelScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private state: VoxelSceneState;
  private worldGroup: THREE.Group;
  private cursorMesh: THREE.LineSegments;
  private raycaster: THREE.Raycaster;
  private animationId: number | null = null;
  private lastPalmPosition: THREE.Vector3 | null = null;
  private isValid = true;
  private sensitivity = 1.5;
  private currentVoxelIndex = -1;
  private currentFaceIndex = -1;
  private lastRingPinch = false;
  private lastPinkyPinch = false;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);

    try {
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false
      });
    } catch (e) {
      this.isValid = false;
      throw new Error('WebGL context creation failed. Please open this app in a new tab.');
    }

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a0f, 1);
    container.appendChild(this.renderer.domElement);

    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x6366f1, 0.4);
    backLight.position.set(-5, -5, -5);
    this.scene.add(backLight);

    // Small crosshair cursor
    const crosshairSize = 0.15;
    const cursorGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-crosshairSize, 0, 0), new THREE.Vector3(crosshairSize, 0, 0),
      new THREE.Vector3(0, -crosshairSize, 0), new THREE.Vector3(0, crosshairSize, 0),
    ]);
    const cursorMaterial = new THREE.LineBasicMaterial({
      color: 0xff00ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
    this.cursorMesh = new THREE.LineSegments(cursorGeometry, cursorMaterial);
    this.cursorMesh.visible = false;
    // this.scene.add(this.cursorMesh); // Removed visual cursor mesh

    this.raycaster = new THREE.Raycaster();

    this.state = {
      voxels: new Map(),
      targetPosition: null,
      targetVoxelId: null,
      targetFace: null,
      worldRotation: new THREE.Euler(0.3, 0.5, 0),
      rotationVelocity: new THREE.Vector2(0, 0),
      zoom: 8,
      zoomVelocity: 0,
      isLocked: false,
      isRotating: false,
    };

    this.placeInitialCube();

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    this.animate();
  }

  private createVoxelMaterials(): THREE.MeshStandardMaterial[] {
    return Array.from({ length: 6 }, () => new THREE.MeshStandardMaterial({
      color: VOXEL_COLOR,
      metalness: 0.3,
      roughness: 0.4,
      emissive: VOXEL_COLOR,
      emissiveIntensity: 0.1,
    }));
  }

  private placeInitialCube(): void {
    const pos = new THREE.Vector3(0, 0, 0);
    this.addVoxelAt(pos);
  }

  private addVoxelAt(position: THREE.Vector3): Voxel | null {
    const key = positionToKey(position);
    if (this.state.voxels.has(key)) return null;

    const geometry = new THREE.BoxGeometry(GRID_SIZE, GRID_SIZE, GRID_SIZE);
    const materials = this.createVoxelMaterials();

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.copy(position);
    this.worldGroup.add(mesh);

    const voxel: Voxel = {
      id: key,
      position: position.clone(),
      mesh,
    };
    this.state.voxels.set(key, voxel);
    return voxel;
  }

  private handleResize(): void {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    if (!this.state.isLocked) {
      if (!this.state.isRotating) {
        this.state.rotationVelocity.x *= INERTIA_DAMPING;
        this.state.rotationVelocity.y *= INERTIA_DAMPING;
      }
      
      this.state.worldRotation.y += this.state.rotationVelocity.x * 0.01;
      this.state.worldRotation.x += this.state.rotationVelocity.y * 0.01;
      this.state.worldRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.state.worldRotation.x));
      
      this.state.zoom += this.state.zoomVelocity;
      this.state.zoom = Math.max(3, Math.min(20, this.state.zoom));
      this.state.zoomVelocity *= INERTIA_DAMPING;
    }

    this.worldGroup.rotation.copy(this.state.worldRotation);
    this.camera.position.z = this.state.zoom;

    this.renderer.render(this.scene, this.camera);
  }

  updateLeftHand(
    palmPosition: THREE.Vector3,
    indexPinch: boolean,
    middlePinch: boolean,
    ringPinch: boolean,
    pinkyPinch: boolean
  ): void {
    if (pinkyPinch) {
      this.state.isLocked = true;
      this.state.rotationVelocity.set(0, 0);
      this.state.zoomVelocity = 0;
      this.lastPalmPosition = null;
      return;
    }
    
    this.state.isLocked = false;

    if (indexPinch) {
      this.state.isRotating = true;
      if (this.lastPalmPosition) {
        const deltaX = (palmPosition.x - this.lastPalmPosition.x) * this.sensitivity;
        const deltaY = (palmPosition.y - this.lastPalmPosition.y) * this.sensitivity;
        this.state.rotationVelocity.x = deltaX * 10;
        this.state.rotationVelocity.y = -deltaY * 10;
      }
      this.lastPalmPosition = palmPosition.clone();
    } else {
      this.state.isRotating = false;
      this.lastPalmPosition = null;
    }

    if (middlePinch) {
      this.state.zoomVelocity = -ZOOM_SPEED;
    } else if (ringPinch) {
      this.state.zoomVelocity = ZOOM_SPEED;
    }
  }

  updateCursor(palmPosition: THREE.Vector3, ringPinch: boolean): { hasTarget: boolean; canPlace: boolean; canDelete: boolean } {
    const cursorWorldPos = new THREE.Vector3(
      palmPosition.x * 5,
      palmPosition.y * 5,
      5
    );

    const voxels = Array.from(this.state.voxels.values());
    if (voxels.length === 0) {
      return { hasTarget: false, canPlace: false, canDelete: false };
    }

    // --- Block Selection (via hand movement) ---
    let closestVoxel: Voxel | null = null;
    let closestDistance = Infinity;

    for (const voxel of voxels) {
      const faceInWorldSpace = voxel.position.clone().applyEuler(this.state.worldRotation);
      const faceZ = faceInWorldSpace.z + this.state.zoom;
      const screenDistance = new THREE.Vector2(cursorWorldPos.x - faceInWorldSpace.x, cursorWorldPos.y - faceInWorldSpace.y).length();
      
      // Score: prioritizing front-facing blocks close to hand position
      const score = screenDistance + (faceZ * 0.5);
      
      if (score < closestDistance) {
        closestDistance = score;
        closestVoxel = voxel;
      }
    }

    if (closestVoxel) {
      // If we switched to a different voxel, reset the surface index to a reasonable default (front-facing)
      if (this.state.targetVoxelId !== closestVoxel.id) {
        this.state.targetVoxelId = closestVoxel.id;
        this.currentFaceIndex = 4; // Default to 'Front' face (index 4)
      }

      const faceNormals = [
        new THREE.Vector3(1, 0, 0),  // 0: Right
        new THREE.Vector3(-1, 0, 0), // 1: Left
        new THREE.Vector3(0, 1, 0),  // 2: Top
        new THREE.Vector3(0, -1, 0), // 3: Bottom
        new THREE.Vector3(0, 0, 1),  // 4: Front
        new THREE.Vector3(0, 0, -1), // 5: Back
      ];

      // --- Surface Cycling (via Thumb+Ring Pinch) ---
      if (ringPinch && !this.lastRingPinch) {
        const unconnectedFaces: number[] = [];
        faceNormals.forEach((normal, index) => {
          const neighborPos = closestVoxel!.position.clone().add(normal.clone().multiplyScalar(GRID_SIZE));
          if (!this.state.voxels.has(positionToKey(neighborPos))) {
            unconnectedFaces.push(index);
          }
        });

        if (unconnectedFaces.length > 0) {
          const currentIndex = unconnectedFaces.indexOf(this.currentFaceIndex);
          const nextIndex = (currentIndex + 1) % unconnectedFaces.length;
          this.currentFaceIndex = unconnectedFaces[nextIndex];
        }
      }

      const normal = faceNormals[this.currentFaceIndex];
      this.state.targetFace = normal;
      const newPos = closestVoxel.position.clone().add(normal.clone().multiplyScalar(GRID_SIZE));
      this.state.targetPosition = new THREE.Vector3(
        snapToGrid(newPos.x),
        snapToGrid(newPos.y),
        snapToGrid(newPos.z)
      );

      this.highlightVoxelFace(closestVoxel, this.currentFaceIndex);
      this.lastRingPinch = ringPinch;
      
      const canPlace = !this.state.voxels.has(positionToKey(this.state.targetPosition));
      return { hasTarget: true, canPlace, canDelete: true };
    }

    this.lastRingPinch = ringPinch;
    this.state.targetVoxelId = null;
    this.state.targetPosition = null;
    this.state.targetFace = null;
    this.clearAllHighlights();
    
    return { hasTarget: false, canPlace: false, canDelete: false };
  }

  private highlightVoxelFace(selectedVoxel: Voxel, faceIndex: number): void {
    const HIGHLIGHT_RED = 0xff0000;
    this.state.voxels.forEach((voxel) => {
      const materials = voxel.mesh.material as THREE.MeshStandardMaterial[];
      materials.forEach((material, index) => {
        if (voxel.id === selectedVoxel.id) {
          if (index === faceIndex) {
            // Selected face is red
            material.color.set(HIGHLIGHT_RED);
            material.emissive.set(HIGHLIGHT_RED);
            material.emissiveIntensity = 0.5;
          } else {
            // Other faces of the same cube are green/highlighted
            material.color.set(0x00ff00);
            material.emissive.set(0x00ff00);
            material.emissiveIntensity = 0.3;
          }
        } else {
          // Unselected cubes stay original color
          material.color.set(VOXEL_COLOR);
          material.emissive.set(VOXEL_COLOR);
          material.emissiveIntensity = 0.1;
        }
      });
    });
  }

  hideCursor(): void {
    this.cursorMesh.visible = false;
    this.state.targetVoxelId = null;
    this.state.targetPosition = null;
    this.state.targetFace = null;
    this.clearAllHighlights();
  }

  private clearAllHighlights(): void {
    this.state.voxels.forEach((voxel) => {
      const materials = voxel.mesh.material as THREE.MeshStandardMaterial[];
      materials.forEach((material) => {
        material.color.set(VOXEL_COLOR);
        material.emissive.set(VOXEL_COLOR);
        material.emissiveIntensity = 0.1;
      });
    });
  }

  placeCube(): boolean {
    if (!this.state.targetPosition) return false;
    const voxel = this.addVoxelAt(this.state.targetPosition);
    return voxel !== null;
  }

  deleteCube(): boolean {
    if (!this.state.targetVoxelId) return false;
    if (this.state.voxels.size <= 1) return false;

    const voxel = this.state.voxels.get(this.state.targetVoxelId);
    if (!voxel) return false;

    this.worldGroup.remove(voxel.mesh);
    voxel.mesh.geometry.dispose();
    (voxel.mesh.material as THREE.Material[]).forEach(m => m.dispose());
    this.state.voxels.delete(this.state.targetVoxelId);
    this.state.targetVoxelId = null;

    return true;
  }

  getVoxelCount(): number {
    return this.state.voxels.size;
  }

  getZoom(): number {
    return this.state.zoom;
  }

  isLockedState(): boolean {
    return this.state.isLocked;
  }

  setSensitivity(value: number): void {
    this.sensitivity = value;
  }

  getSensitivity(): number {
    return this.sensitivity;
  }

  clearAll(): void {
    this.state.voxels.forEach((voxel) => {
      this.worldGroup.remove(voxel.mesh);
      voxel.mesh.geometry.dispose();
      (voxel.mesh.material as THREE.Material[]).forEach(m => m.dispose());
    });
    this.state.voxels.clear();
    this.placeInitialCube();
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
    
    this.state.voxels.forEach((voxel) => {
      this.worldGroup.remove(voxel.mesh);
      voxel.mesh.geometry.dispose();
      (voxel.mesh.material as THREE.Material[]).forEach(m => m.dispose());
    });
    this.state.voxels.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}