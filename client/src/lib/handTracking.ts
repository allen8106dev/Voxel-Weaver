import { Hands, Results, NormalizedLandmarkList } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface HandLandmarks {
  landmarks: NormalizedLandmarkList;
  handedness: 'Left' | 'Right';
}

export interface HandTrackingResult {
  leftHand: NormalizedLandmarkList | null;
  rightHand: NormalizedLandmarkList | null;
  rawResults?: Results;
}

export type HandTrackingCallback = (result: HandTrackingResult) => void;

export class HandTracker {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private callback: HandTrackingCallback | null = null;
  private isRunning = false;

  async initialize(videoElement: HTMLVideoElement, callback: HandTrackingCallback): Promise<void> {
    this.callback = callback;

    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results: Results) => {
      this.processResults(results);
    });

    await this.hands.initialize();

    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this.hands && this.isRunning) {
          await this.hands.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });
  }

  private processResults(results: Results): void {
    if (!this.callback) return;

    let leftHand: NormalizedLandmarkList | null = null;
    let rightHand: NormalizedLandmarkList | null = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];
        
        if (handedness.label === 'Left') {
          rightHand = landmarks;
        } else {
          leftHand = landmarks;
        }
      }
    }

    this.callback({ leftHand, rightHand, rawResults: results });
  }

  start(): void {
    if (this.camera && !this.isRunning) {
      this.isRunning = true;
      this.camera.start();
    }
  }

  stop(): void {
    if (this.camera && this.isRunning) {
      this.isRunning = false;
      this.camera.stop();
    }
  }

  destroy(): void {
    this.stop();
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    this.camera = null;
  }
}