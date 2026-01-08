import { NormalizedLandmarkList } from '@mediapipe/hands';
import * as THREE from 'three';

export interface GestureState {
  indexThumbPinch: boolean;
  middleThumbPinch: boolean;
  indexDirection: THREE.Vector3;
  palmPosition: THREE.Vector3;
  palmRotation: THREE.Quaternion;
  handOpen: boolean;
}

export interface HandGestures {
  left: GestureState | null;
  right: GestureState | null;
}

const PINCH_THRESHOLD = 0.06;
const HAND_OPEN_THRESHOLD = 0.15;

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const INDEX_MCP = 5;
const WRIST = 0;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;

function distance3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)
  );
}

function landmarkToVector3(landmark: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(
    (landmark.x - 0.5) * 2,
    -(landmark.y - 0.5) * 2,
    -landmark.z * 2
  );
}

function computePalmRotation(landmarks: NormalizedLandmarkList): THREE.Quaternion {
  const wrist = landmarkToVector3(landmarks[WRIST]);
  const middleMcp = landmarkToVector3(landmarks[MIDDLE_MCP]);
  const indexMcp = landmarkToVector3(landmarks[INDEX_MCP]);
  const pinkyMcp = landmarkToVector3(landmarks[PINKY_MCP]);

  const forward = new THREE.Vector3().subVectors(middleMcp, wrist).normalize();
  
  const left = new THREE.Vector3().subVectors(indexMcp, pinkyMcp).normalize();
  
  const up = new THREE.Vector3().crossVectors(forward, left).normalize();
  
  const adjustedLeft = new THREE.Vector3().crossVectors(up, forward).normalize();

  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeBasis(adjustedLeft, up, forward);

  const quaternion = new THREE.Quaternion();
  quaternion.setFromRotationMatrix(rotationMatrix);

  return quaternion;
}

function isHandOpen(landmarks: NormalizedLandmarkList): boolean {
  const wrist = landmarks[WRIST];
  const indexTip = landmarks[INDEX_TIP];
  const middleTip = landmarks[MIDDLE_TIP];
  
  const indexDist = distance3D(wrist, indexTip);
  const middleDist = distance3D(wrist, middleTip);
  
  return indexDist > HAND_OPEN_THRESHOLD && middleDist > HAND_OPEN_THRESHOLD;
}

export function analyzeGestures(landmarks: NormalizedLandmarkList): GestureState {
  const thumbTip = landmarks[THUMB_TIP];
  const indexTip = landmarks[INDEX_TIP];
  const middleTip = landmarks[MIDDLE_TIP];
  const indexMcp = landmarks[INDEX_MCP];
  const wrist = landmarks[WRIST];

  const indexThumbDistance = distance3D(thumbTip, indexTip);
  const middleThumbDistance = distance3D(thumbTip, middleTip);

  const indexThumbPinch = indexThumbDistance < PINCH_THRESHOLD;
  const middleThumbPinch = middleThumbDistance < PINCH_THRESHOLD;

  const indexDirection = new THREE.Vector3(
    indexTip.x - indexMcp.x,
    -(indexTip.y - indexMcp.y),
    -(indexTip.z - indexMcp.z)
  ).normalize();

  const palmPosition = landmarkToVector3(wrist);
  const palmRotation = computePalmRotation(landmarks);
  const handOpen = isHandOpen(landmarks);

  return {
    indexThumbPinch,
    middleThumbPinch,
    indexDirection,
    palmPosition,
    palmRotation,
    handOpen,
  };
}

export function processHandGestures(
  leftHand: NormalizedLandmarkList | null,
  rightHand: NormalizedLandmarkList | null
): HandGestures {
  return {
    left: leftHand ? analyzeGestures(leftHand) : null,
    right: rightHand ? analyzeGestures(rightHand) : null,
  };
}