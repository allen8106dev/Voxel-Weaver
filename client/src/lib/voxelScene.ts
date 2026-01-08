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
  worldRotation: THREE.Euler;
  worldPosition: THREE.Vector3;
  zoom: number;
}

const GRID_SIZE = 0.5;
const VOXEL_COLORS = [
  0x00ffff, // Cyan
  0xa855f7, // Purple
  0xec4899, // Pink
  0x10b981, // Green
  0xf59e0b, // Amber
  0x3b82f6, // Blue
];

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
  private gridHelper: THREE.GridHelper;
  private targetIndicator: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private animationId: number | null = null;
  private currentColorIndex = 0;
  private isValid = true;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        throw new Error('WebGL not supported');
      }
    } catch (e) {
      console.warn('WebGL check failed, attempting fallback');
    }

    try {
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false
      });
    } catch (e) {
      this.isValid = false;
      this.renderer = null as any;
      this.worldGroup = new THREE.Group();
      this.gridHelper = null as any;
      this.targetIndicator = null as any;
      this.raycaster = new THREE.Raycaster();
      this.state = {
        voxels: new Map(),
        targetPosition: null,
        targetVoxelId: null,
        worldRotation: new THREE.Euler(0, 0, 0),
        worldPosition: new THREE.Vector3(0, 0, 0),
        zoom: 1,
      };
      throw new Error('WebGL context creation failed. Please open this app in a new tab or ensure your browser supports WebGL.');
    }

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    this.gridHelper = new THREE.GridHelper(10, 20, 0x00ffff, 0x003333);
    this.gridHelper.position.y = -0.01;
    this.worldGroup.add(this.gridHelper);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x00ffff, 0.5, 20);
    pointLight1.position.set(-5, 5, -5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xa855f7, 0.3, 20);
    pointLight2.position.set(5, 3, 5);
    this.scene.add(pointLight2);

    const targetGeometry = new THREE.BoxGeometry(GRID_SIZE * 0.95, GRID_SIZE * 0.95, GRID_SIZE * 0.95);
    const targetMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
    this.targetIndicator = new THREE.Mesh(targetGeometry, targetMaterial);
    this.targetIndicator.visible = false;
    this.worldGroup.add(this.targetIndicator);

    this.raycaster = new THREE.Raycaster();

    this.state = {
      voxels: new Map(),
      targetPosition: null,
      targetVoxelId: null,
      worldRotation: new THREE.Euler(0, 0, 0),
      worldPosition: new THREE.Vector3(0, 0, 0),
      zoom: 1,
    };

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    this.animate();
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
    
    this.worldGroup.rotation.copy(this.state.worldRotation);
    this.worldGroup.position.copy(this.state.worldPosition);
    
    const targetZoom = 5 / this.state.zoom;
    this.camera.position.z += (targetZoom - this.camera.position.z) * 0.1;

    this.renderer.render(this.scene, this.camera);
  }

  updateWorldTransform(position: THREE.Vector3, rotation: THREE.Quaternion): void {
    const euler = new THREE.Euler().setFromQuaternion(rotation);
    
    this.state.worldRotation.x += (euler.x - this.state.worldRotation.x) * 0.1;
    this.state.worldRotation.y += (-euler.y - this.state.worldRotation.y) * 0.1;
    
    this.state.worldPosition.x += (-position.x * 2 - this.state.worldPosition.x) * 0.1;
    this.state.worldPosition.y += (position.y * 2 - this.state.worldPosition.y) * 0.1;
  }

  zoomIn(): void {
    this.state.zoom = Math.min(3, this.state.zoom + 0.02);
  }

  zoomOut(): void {
    this.state.zoom = Math.max(0.3, this.state.zoom - 0.02);
  }

  updateTargetFromRay(origin: THREE.Vector3, direction: THREE.Vector3): void {
    const worldOrigin = origin.clone().applyEuler(this.state.worldRotation);
    const worldDirection = direction.clone().applyEuler(this.state.worldRotation);
    
    this.raycaster.set(
      new THREE.Vector3(worldOrigin.x * 3, worldOrigin.y * 3 + 2, 3),
      worldDirection.normalize()
    );

    const voxelMeshes = Array.from(this.state.voxels.values()).map(v => v.mesh);
    const intersects = this.raycaster.intersectObjects(voxelMeshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitMesh = hit.object as THREE.Mesh;
      
      const voxel = Array.from(this.state.voxels.values()).find(v => v.mesh === hitMesh);
      if (voxel) {
        this.state.targetVoxelId = voxel.id;
        
        const normal = hit.face?.normal || new THREE.Vector3(0, 1, 0);
        const newPos = voxel.position.clone().add(normal.multiplyScalar(GRID_SIZE));
        this.state.targetPosition = new THREE.Vector3(
          snapToGrid(newPos.x),
          snapToGrid(newPos.y),
          snapToGrid(newPos.z)
        );
        
        this.targetIndicator.position.copy(this.state.targetPosition);
        this.targetIndicator.visible = true;

        this.highlightVoxel(voxel.id);
        return;
      }
    }

    this.state.targetVoxelId = null;
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const rayOrigin = new THREE.Vector3(origin.x * 3, origin.y * 3 + 2, 3);
    const ray = new THREE.Ray(rayOrigin, direction.normalize());
    const groundHit = new THREE.Vector3();
    
    if (ray.intersectPlane(groundPlane, groundHit)) {
      this.state.targetPosition = new THREE.Vector3(
        snapToGrid(groundHit.x),
        snapToGrid(GRID_SIZE / 2),
        snapToGrid(groundHit.z)
      );
      this.targetIndicator.position.copy(this.state.targetPosition);
      this.targetIndicator.visible = true;
    } else {
      this.state.targetPosition = new THREE.Vector3(
        snapToGrid(direction.x * 2),
        snapToGrid(GRID_SIZE / 2),
        snapToGrid(direction.z * 2)
      );
      this.targetIndicator.position.copy(this.state.targetPosition);
      this.targetIndicator.visible = true;
    }

    this.clearHighlights();
  }

  private highlightVoxel(id: string): void {
    this.state.voxels.forEach((voxel, voxelId) => {
      const material = voxel.mesh.material as THREE.MeshStandardMaterial;
      if (voxelId === id) {
        material.emissiveIntensity = 0.5;
      } else {
        material.emissiveIntensity = 0.1;
      }
    });
  }

  private clearHighlights(): void {
    this.state.voxels.forEach((voxel) => {
      const material = voxel.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.1;
    });
  }

  placeCube(): boolean {
    if (!this.state.targetPosition) return false;

    const key = positionToKey(this.state.targetPosition);
    if (this.state.voxels.has(key)) return false;

    const geometry = new THREE.BoxGeometry(GRID_SIZE * 0.9, GRID_SIZE * 0.9, GRID_SIZE * 0.9);
    const color = VOXEL_COLORS[this.currentColorIndex % VOXEL_COLORS.length];
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.4,
      emissive: color,
      emissiveIntensity: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.state.targetPosition);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.worldGroup.add(mesh);

    const voxel: Voxel = {
      id: key,
      position: this.state.targetPosition.clone(),
      mesh,
    };
    this.state.voxels.set(key, voxel);
    this.currentColorIndex++;

    return true;
  }

  deleteCube(): boolean {
    if (!this.state.targetVoxelId) return false;

    const voxel = this.state.voxels.get(this.state.targetVoxelId);
    if (!voxel) return false;

    this.worldGroup.remove(voxel.mesh);
    voxel.mesh.geometry.dispose();
    (voxel.mesh.material as THREE.Material).dispose();
    this.state.voxels.delete(this.state.targetVoxelId);
    this.state.targetVoxelId = null;

    return true;
  }

  hideTarget(): void {
    this.targetIndicator.visible = false;
    this.state.targetPosition = null;
    this.state.targetVoxelId = null;
    this.clearHighlights();
  }

  getVoxelCount(): number {
    return this.state.voxels.size;
  }

  getZoom(): number {
    return this.state.zoom;
  }

  clearAll(): void {
    this.state.voxels.forEach((voxel) => {
      this.worldGroup.remove(voxel.mesh);
      voxel.mesh.geometry.dispose();
      (voxel.mesh.material as THREE.Material).dispose();
    });
    this.state.voxels.clear();
    this.currentColorIndex = 0;
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
    
    this.clearAll();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}