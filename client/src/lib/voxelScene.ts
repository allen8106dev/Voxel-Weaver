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
  private highlightMesh: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private animationId: number | null = null;
  private lastPalmPosition: THREE.Vector3 | null = null;
  private isValid = true;
  private sensitivity = 1.5;

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
    this.scene.add(this.cursorMesh);

    // Face highlight mesh
    const highlightGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.FrontSide, // Only highlight front-facing surface
      depthWrite: false,
    });
    this.highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    this.highlightMesh.visible = false;
    this.worldGroup.add(this.highlightMesh);

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

  private placeInitialCube(): void {
    const pos = new THREE.Vector3(0, 0, 0);
    this.addVoxelAt(pos);
  }

  private addVoxelAt(position: THREE.Vector3): Voxel | null {
    const key = positionToKey(position);
    if (this.state.voxels.has(key)) return null;

    const geometry = new THREE.BoxGeometry(GRID_SIZE * 0.95, GRID_SIZE * 0.95, GRID_SIZE * 0.95);
    const material = new THREE.MeshStandardMaterial({
      color: VOXEL_COLOR,
      metalness: 0.3,
      roughness: 0.4,
      emissive: VOXEL_COLOR,
      emissiveIntensity: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
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

  updateCursor(palmPosition: THREE.Vector3): { hasTarget: boolean; canPlace: boolean; canDelete: boolean } {
    const cursorWorldPos = new THREE.Vector3(
      palmPosition.x * 5,
      palmPosition.y * 5,
      5
    );
    
    this.cursorMesh.position.copy(cursorWorldPos);
    this.cursorMesh.visible = true;

    const voxels = Array.from(this.state.voxels.values());
    if (voxels.length === 0) {
      return { hasTarget: false, canPlace: false, canDelete: false };
    }

    let closestVoxel: typeof voxels[0] | null = null;
    let closestFaceNormal: THREE.Vector3 | null = null;
    let closestFaceCenter: THREE.Vector3 | null = null;
    let closestDistance = Infinity;

    const faceNormals = [
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
    ];

    // Camera view direction in world space
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    // Transform camera direction to local group space to compare with normals
    const groupQuaternion = new THREE.Quaternion().setFromEuler(this.state.worldRotation);
    const localViewDirection = cameraDirection.clone().applyQuaternion(groupQuaternion.clone().invert());

    for (const voxel of voxels) {
      for (const normal of faceNormals) {
        // Only consider faces pointing towards the camera (dot product < 0)
        if (normal.dot(localViewDirection) >= 0) continue;

        const faceCenter = voxel.position.clone().add(normal.clone().multiplyScalar(GRID_SIZE * 0.5));
        const rotatedFaceCenter = faceCenter.clone().applyEuler(this.state.worldRotation);
        rotatedFaceCenter.z += this.state.zoom;
        
        const distance = cursorWorldPos.distanceTo(rotatedFaceCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestVoxel = voxel;
          closestFaceNormal = normal.clone();
          closestFaceCenter = faceCenter.clone();
        }
      }
    }

    const LATCH_DISTANCE = 2;

    if (closestVoxel && closestFaceNormal && closestFaceCenter && closestDistance < LATCH_DISTANCE) {
      this.state.targetVoxelId = closestVoxel.id;
      this.state.targetFace = closestFaceNormal;
      
      const newPos = closestVoxel.position.clone().add(closestFaceNormal.clone().multiplyScalar(GRID_SIZE));
      this.state.targetPosition = new THREE.Vector3(
        snapToGrid(newPos.x),
        snapToGrid(newPos.y),
        snapToGrid(newPos.z)
      );

      // Highlight only the specific face
      this.highlightMesh.position.copy(closestFaceCenter);
      this.highlightMesh.lookAt(closestFaceCenter.clone().add(closestFaceNormal));
      this.highlightMesh.position.add(closestFaceNormal.clone().multiplyScalar(0.01)); // Offset to prevent z-fighting
      this.highlightMesh.visible = true;

      // Position crosshair on a fixed plane relative to the camera to keep size constant
      this.cursorMesh.position.copy(cursorWorldPos);
      this.cursorMesh.visible = true;
      
      const canPlace = !this.state.voxels.has(positionToKey(this.state.targetPosition));
      return { hasTarget: true, canPlace, canDelete: true };
    }

    this.state.targetVoxelId = null;
    this.state.targetPosition = null;
    this.state.targetFace = null;
    this.highlightMesh.visible = false;
    
    return { hasTarget: false, canPlace: false, canDelete: false };
  }

  hideCursor(): void {
    this.cursorMesh.visible = false;
    this.highlightMesh.visible = false;
    this.state.targetVoxelId = null;
    this.state.targetPosition = null;
    this.state.targetFace = null;
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
    (voxel.mesh.material as THREE.Material).dispose();
    this.state.voxels.delete(this.state.targetVoxelId);
    this.state.targetVoxelId = null;
    this.highlightMesh.visible = false;

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
      (voxel.mesh.material as THREE.Material).dispose();
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
      (voxel.mesh.material as THREE.Material).dispose();
    });
    this.state.voxels.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}