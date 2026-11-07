import React, { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AutoViewOption } from '../../store/settingsStore';
import { Vec3, normalize, dot } from '../../solvers/pyraminx/pyraminxGeometry';
import { getPuzzleTurnInfo } from './puzzleTurnInfo';

// Global mount counter tracking Canvas/scene mounts across the app
if (typeof window !== 'undefined') {
  if ((window as any).__mountCounter === undefined) {
    (window as any).__mountCounter = 0;
  }
  if ((window as any).__camLog === undefined) {
    (window as any).__camLog = [];
  }
}

export const MIN_POLAR_RAD = (15 * Math.PI) / 180; // 15 degrees
export const MAX_POLAR_RAD = (165 * Math.PI) / 180; // 165 degrees
export const MAX_STEP_ROTATION_RAD = (60 * Math.PI) / 180; // 60 degrees

/**
 * Clamps a direction vector so its polar angle with (0,1,0) stays within [15°, 165°].
 */
export function clampPolarAngle(dir: THREE.Vector3): THREE.Vector3 {
  const d = dir.clone().normalize();
  const cosPolar = d.y; // dot with (0,1,0)
  const polar = Math.acos(Math.max(-1, Math.min(1, cosPolar)));

  if (polar < MIN_POLAR_RAD) {
    const sinTarget = Math.sin(MIN_POLAR_RAD);
    const cosTarget = Math.cos(MIN_POLAR_RAD);
    const xzLen = Math.hypot(d.x, d.z);
    if (xzLen < 1e-5) {
      d.x = sinTarget;
      d.z = 0;
    } else {
      d.x = (d.x / xzLen) * sinTarget;
      d.z = (d.z / xzLen) * sinTarget;
    }
    d.y = cosTarget;
  } else if (polar > MAX_POLAR_RAD) {
    const sinTarget = Math.sin(MAX_POLAR_RAD);
    const cosTarget = Math.cos(MAX_POLAR_RAD);
    const xzLen = Math.hypot(d.x, d.z);
    if (xzLen < 1e-5) {
      d.x = sinTarget;
      d.z = 0;
    } else {
      d.x = (d.x / xzLen) * sinTarget;
      d.z = (d.z / xzLen) * sinTarget;
    }
    d.y = cosTarget;
  }
  return d.normalize();
}

/**
 * Finds the nearest acceptable camera unit direction for a move:
 * - Satisfies |dot(a, c)| >= 0.5 and the turning layer is on the visible side.
 * - In Minimal mode, if current view already satisfies it, returns current view unchanged.
 * - Rotates at most 60° along the great circle toward the layer axis.
 * - Clamps polar angle strictly inside [15°, 165°].
 */
export function getNearestAcceptableCamera(
  puzzleId: '3x3' | '2x2' | '4x4' | 'pyraminx',
  move: string | null,
  currentDir: THREE.Vector3,
  autoViewMode: AutoViewOption
): { targetDir: THREE.Vector3; changed: boolean } {
  const cur = clampPolarAngle(currentDir);
  if (!move || autoViewMode === 'off') {
    return { targetDir: cur, changed: false };
  }

  let axisVec: THREE.Vector3;
  let layerSign = 1;

  try {
    const info = getPuzzleTurnInfo(puzzleId, move);
    axisVec = new THREE.Vector3(...info.axis).normalize();
    // In our turnInfo, info.axis points toward the viewer's side of the turning layer
    // (i.e. +1 for U/R/F, -1 for D/L/B)
    layerSign = 1;
  } catch (e) {
    return { targetDir: cur, changed: false };
  }

  // Desired direction on the visible side
  const desiredAxis = axisVec.clone().multiplyScalar(layerSign).normalize();
  const curDot = cur.dot(desiredAxis);
  const minRequiredDot = puzzleId === 'pyraminx' ? 0.56 : 0.50;

  // In Minimal mode, if current view already shows the turning layer with |dot| >= minRequiredDot on visible side:
  if (autoViewMode === 'minimal' && curDot >= minRequiredDot) {
    return { targetDir: cur, changed: false };
  }

  // If already at or above minRequiredDot and not in always mode:
  if (curDot >= minRequiredDot && autoViewMode !== 'always') {
    return { targetDir: cur, changed: false };
  }

  // Nearest point on the sphere where dot(c, desiredAxis) >= minRequiredDot:
  // Along the great circle between cur and desiredAxis:
  // Angle between cur and desiredAxis:
  const angle = Math.acos(Math.max(-1, Math.min(1, curDot)));
  const targetAngleFromAxis = Math.acos(minRequiredDot);

  let neededRotation = angle - targetAngleFromAxis;
  if (neededRotation <= 0 && autoViewMode !== 'always') {
    return { targetDir: cur, changed: false };
  }

  if (autoViewMode === 'always') {
    // In always mode, rotate toward a clear 45° - 55° perspective view
    neededRotation = Math.max(0, angle - (48 * Math.PI) / 180);
  }

  // Never rotate more than 60 degrees per step
  const rotationToApply = Math.min(neededRotation, (58 * Math.PI) / 180);

  if (rotationToApply <= 0.005) {
    return { targetDir: cur, changed: false };
  }

  // Slerp cur toward desiredAxis by rotationToApply / angle
  const t = Math.min(1, rotationToApply / Math.max(1e-4, angle));
  const q0 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), cur);
  const q1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), desiredAxis);
  const qTarget = q0.clone().slerp(q1, t);
  const target = new THREE.Vector3(0, 0, 1).applyQuaternion(qTarget);

  let finalDir = clampPolarAngle(target);
  const finalRot = Math.acos(Math.max(-1, Math.min(1, cur.dot(finalDir))));
  if (finalRot > MAX_STEP_ROTATION_RAD) {
    const qCur = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), cur);
    const qFin = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), finalDir);
    const qClamped = qCur.clone().slerp(qFin, (MAX_STEP_ROTATION_RAD * 0.99) / finalRot);
    finalDir = new THREE.Vector3(0, 0, 1).applyQuaternion(qClamped).normalize();
  }

  return { targetDir: finalDir, changed: true };
}

export interface CameraRigProps {
  puzzleId: '3x3' | '2x2' | '4x4' | 'pyraminx';
  currentMoveNotation?: string | null;
  autoViewMode: AutoViewOption;
  isSlowSpeed?: boolean;
  isAnimatingLayer?: boolean;
  baseDistance?: number;
  userAzimuth?: number;
  userElevation?: number;
  onCameraGlideStart?: () => void;
  onCameraGlideComplete?: () => void;
}

export const CameraRig: React.FC<CameraRigProps> = ({
  puzzleId,
  currentMoveNotation,
  autoViewMode,
  isSlowSpeed = false,
  isAnimatingLayer = false,
  baseDistance = 4.8,
  userAzimuth,
  userElevation,
  onCameraGlideStart,
  onCameraGlideComplete,
}) => {
  const { camera } = useThree();

  // Pose representation: unit direction vector + distance
  const currentDir = useRef<THREE.Vector3>(
    clampPolarAngle(new THREE.Vector3(Math.sin(0.6) * Math.cos(0.5), Math.sin(0.5), Math.cos(0.6) * Math.cos(0.5)).normalize())
  );
  const currentDistance = useRef<number>(baseDistance);
  const angularVelocity = useRef<number>(0);

  // Motion state
  const glideState = useRef<{
    active: boolean;
    startDir: THREE.Vector3;
    targetDir: THREE.Vector3;
    startTime: number;
    duration: number;
    rotAxis: THREE.Vector3;
    totalAngle: number;
  }>({
    active: false,
    startDir: currentDir.current.clone(),
    targetDir: currentDir.current.clone(),
    startTime: 0,
    duration: 1000,
    rotAxis: new THREE.Vector3(0, 1, 0),
    totalAngle: 0,
  });

  const lastMoveRef = useRef<string | null>(null);
  const lastUserPoseRef = useRef<{ az?: number; el?: number }>({});
  const frameCounter = useRef(0);

  // Mount tracking: Canvas mounted once per screen
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__mountCounter = ((window as any).__mountCounter || 0) + 1;
    }
  }, []);

  // Update base distance if changed
  useEffect(() => {
    currentDistance.current = baseDistance;
  }, [baseDistance]);

  // Handle external user rotation (e.g. pan gesture)
  useEffect(() => {
    if (userAzimuth !== undefined && userElevation !== undefined) {
      if (
        userAzimuth !== lastUserPoseRef.current.az ||
        userElevation !== lastUserPoseRef.current.el
      ) {
        lastUserPoseRef.current = { az: userAzimuth, el: userElevation };
        // Cancel active auto-view glide when user directly drags
        if (!glideState.current.active) {
          const cx = Math.cos(userElevation) * Math.sin(userAzimuth);
          const cy = Math.sin(userElevation);
          const cz = Math.cos(userElevation) * Math.cos(userAzimuth);
          currentDir.current = clampPolarAngle(new THREE.Vector3(cx, cy, cz));
        }
      }
    }
  }, [userAzimuth, userElevation]);

  // Handle step change: calculate nearest acceptable view and start glide
  useEffect(() => {
    if (!currentMoveNotation || currentMoveNotation === lastMoveRef.current) {
      return;
    }
    lastMoveRef.current = currentMoveNotation;

    if (autoViewMode === 'off' || isAnimatingLayer) {
      return;
    }

    const { targetDir, changed } = getNearestAcceptableCamera(
      puzzleId,
      currentMoveNotation,
      currentDir.current,
      autoViewMode
    );

    if (!changed) {
      onCameraGlideComplete?.();
      return;
    }

    // Angular distance along great circle
    const dotProduct = Math.max(-1, Math.min(1, currentDir.current.dot(targetDir)));
    const totalAngle = Math.acos(dotProduct);

    if (totalAngle < 0.015) {
      // Less than ~1 degree change: finish immediately
      onCameraGlideComplete?.();
      return;
    }

    // Great circle rotation axis
    let rotAxis = new THREE.Vector3().crossVectors(currentDir.current, targetDir);
    if (rotAxis.lengthSq() < 1e-6) {
      rotAxis = new THREE.Vector3(0, 1, 0);
    } else {
      rotAxis.normalize();
    }

    // Duration scaling:
    // Minimum 700 ms for changes over 20° (0.35 rad), maximum 1500 ms (scaled linearly)
    // x2 on Slow / Very Slow
    const angleDeg = (totalAngle * 180) / Math.PI;
    let durationMs: number;
    if (angleDeg <= 20) {
      durationMs = Math.max(350, Math.round(700 * (angleDeg / 20)));
    } else {
      const tNorm = Math.min(1, (angleDeg - 20) / 40); // 20° to 60°
      durationMs = Math.round(700 + tNorm * (1500 - 700));
    }

    if (isSlowSpeed) {
      durationMs *= 2;
    }

    glideState.current = {
      active: true,
      startDir: currentDir.current.clone(),
      targetDir: targetDir.clone(),
      startTime: Date.now(),
      duration: durationMs,
      rotAxis,
      totalAngle,
    };

    onCameraGlideStart?.();
  }, [
    currentMoveNotation,
    puzzleId,
    autoViewMode,
    isSlowSpeed,
    isAnimatingLayer,
    onCameraGlideStart,
    onCameraGlideComplete,
  ]);

  // Frame loop: smooth-damp / critically damped spring along great circle
  useFrame(() => {
    frameCounter.current++;
    const prevDir = currentDir.current.clone();
    const prevDist = currentDistance.current;

    if (glideState.current.active && !isAnimatingLayer) {
      const { startDir, targetDir, startTime, duration, rotAxis, totalAngle } = glideState.current;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Critically damped / smooth-step curve (time constant ~0.35s)
      // Quintic smooth step for zero acceleration at boundaries: 6t^5 - 15t^4 + 10t^3
      const smoothT = progress * progress * progress * (progress * (progress * 6 - 15) + 10);

      // Rotate startDir around rotAxis by smoothT * totalAngle
      const q = new THREE.Quaternion().setFromAxisAngle(rotAxis, smoothT * totalAngle);
      const newDir = startDir.clone().applyQuaternion(q);
      currentDir.current = clampPolarAngle(newDir);

      if (progress >= 1) {
        glideState.current.active = false;
        currentDir.current = targetDir.clone();
        onCameraGlideComplete?.();
      }
    }

    // Set Three.js camera pose
    const pos = currentDir.current.clone().multiplyScalar(currentDistance.current);
    camera.position.copy(pos);
    camera.lookAt(0, 0, 0);

    // Compute metrics for window.__camLog assertions
    const dotStep = Math.max(-1, Math.min(1, prevDir.dot(currentDir.current)));
    const frameRotDeg = (Math.acos(dotStep) * 180) / Math.PI;
    const frameDistPct = (Math.abs(currentDistance.current - prevDist) / prevDist) * 100;
    const polarAngleDeg = (Math.acos(Math.max(-1, Math.min(1, currentDir.current.y))) * 180) / Math.PI;

    if (
      typeof window !== 'undefined' &&
      (window as any).__camLog !== undefined &&
      (window.location?.search?.includes('debug=1') || (window as any).__recordCamLog)
    ) {
      (window as any).__camLog.push({
        frame: frameCounter.current,
        time: Date.now(),
        rotDeltaDeg: frameRotDeg,
        distDeltaPct: frameDistPct,
        polarAngleDeg,
        mountCount: (window as any).__mountCounter || 1,
      });
      // Cap log size to prevent memory leaks
      if ((window as any).__camLog.length > 5000) {
        (window as any).__camLog.shift();
      }
    }
  });

  return null;
};
