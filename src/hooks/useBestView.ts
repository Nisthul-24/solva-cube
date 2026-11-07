import { useCallback } from 'react';
import { getBestViewCamera, CameraPose } from '../components/3d/puzzleTurnInfo';

export interface UseBestViewResult {
  handleBestView: () => void;
  getBestCamera: () => CameraPose | null;
}

export function useBestView(
  puzzleId: '3x3' | '2x2' | 'pyraminx' | '4x4' | string,
  move: string | null | undefined,
  currentCamera: { azimuth: number; elevation: number; polarAngle?: number; distance?: number },
  onCameraChange?: (pose: { azimuth: number; elevation: number }) => void
): UseBestViewResult {
  const getBestCamera = useCallback((): CameraPose | null => {
    if (!move) return null;
    return getBestViewCamera(puzzleId, move, currentCamera);
  }, [puzzleId, move, currentCamera]);

  const handleBestView = useCallback(() => {
    if (!move) return;
    const best = getBestViewCamera(puzzleId, move, currentCamera);
    onCameraChange?.({ azimuth: best.azimuth, elevation: best.elevation });
  }, [puzzleId, move, currentCamera, onCameraChange]);

  return { handleBestView, getBestCamera };
}

