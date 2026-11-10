import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ThreeCanvas } from '../src/components/3d/ThreeCanvas';
import { PuzzleCube3D } from '../src/components/3d/PuzzleCube3D';
import { Pyraminx3D } from '../src/components/3d/Pyraminx3D';
import { getPuzzleEngine, getStandardMoveNotation } from '../src/puzzleEngine/puzzleEngine';
import { getNearestAcceptableCamera } from '../src/components/3d/CameraRig';
import { DEFAULT_PYRAMINX_SOLVED } from '../src/solvers/pyraminx/pyraminxFacelets';
import { getStandardSolved4x4State } from '../src/solvers/cube4x4/cube4x4Geometry';
import * as THREE from 'three';

const SOLVED_4X4 = getStandardSolved4x4State();
const MOVES_PER_SHEET = 12;

export default function GalleryScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ puzzle?: string; moves?: string }>();
  const initialPuzzle = searchParams.puzzle === 'pyraminx' ? 'pyraminx' : '4x4';
  const [puzzleType, setPuzzleType] = useState<'4x4' | 'pyraminx'>(initialPuzzle);
  const [sheetIndex, setSheetIndex] = useState(0);

  const eng = useMemo(() => getPuzzleEngine(puzzleType), [puzzleType]);
  const allMoves = useMemo(() => Array.from(eng.moves.values()), [eng]);
  const moves = useMemo(() => {
    if (!searchParams.moves) return allMoves;
    const req = searchParams.moves.split(',').map((s) => s.trim().toLowerCase());
    return allMoves.filter((m) => {
      const n = m.name.toLowerCase();
      const std = getStandardMoveNotation(puzzleType, m.name).toLowerCase();
      return req.includes(n) || req.includes(std);
    });
  }, [allMoves, searchParams.moves]);

  const totalSheets = Math.ceil(moves.length / MOVES_PER_SHEET);
  const currentSheetMoves = useMemo(() => {
    const start = sheetIndex * MOVES_PER_SHEET;
    return moves.slice(start, start + MOVES_PER_SHEET);
  }, [moves, sheetIndex]);

  // Compute camera angles for a move
  const getCameraPoseForMove = (moveName: string) => {
    const defaultCam = puzzleType === 'pyraminx'
      ? new THREE.Vector3(1, 1, 1).normalize()
      : new THREE.Vector3(1, 0.8, 1).normalize();
    const { targetDir } = getNearestAcceptableCamera(puzzleType, moveName, defaultCam, 'always');

    const az = Math.atan2(targetDir.x, targetDir.z);
    const el = Math.asin(Math.max(-1, Math.min(1, targetDir.y)));
    return { azimuth: az, elevation: el };
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Move Animation Gallery</Text>
          <Text style={styles.headerSubtitle}>
            Gate 2: 4-frame rows (Waiting, 25%, 50%, 100%) from Auto view camera
          </Text>
        </View>
      </View>

      {/* Puzzle Tabs */}
      <View style={styles.tabsRow}>
        {(['4x4', 'pyraminx'] as const).map((p) => {
          const isSelected = puzzleType === p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
              onPress={() => {
                setPuzzleType(p);
                setSheetIndex(0);
              }}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                {p === 'pyraminx' ? 'Pyraminx (16 moves)' : '4x4 Revenge (54 moves)'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sheet Pagination */}
      <View style={styles.paginationRow}>
        <Text style={styles.sheetInfo}>
          Sheet {sheetIndex + 1} of {totalSheets} ({currentSheetMoves.length} moves)
        </Text>
        <View style={styles.paginationBtns}>
          <TouchableOpacity
            style={[styles.pageBtn, sheetIndex === 0 && styles.pageBtnDisabled]}
            disabled={sheetIndex === 0}
            onPress={() => setSheetIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft size={16} color={sheetIndex === 0 ? '#64748B' : '#F8FAFC'} />
            <Text style={[styles.pageBtnText, sheetIndex === 0 && styles.pageBtnTextDisabled]}>Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pageBtn, sheetIndex >= totalSheets - 1 && styles.pageBtnDisabled]}
            disabled={sheetIndex >= totalSheets - 1}
            onPress={() => setSheetIndex((i) => Math.min(totalSheets - 1, i + 1))}
          >
            <Text style={[styles.pageBtnText, sheetIndex >= totalSheets - 1 && styles.pageBtnTextDisabled]}>Next</Text>
            <ChevronRight size={16} color={sheetIndex >= totalSheets - 1 ? '#64748B' : '#F8FAFC'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Moves List with 4-frame rows */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {currentSheetMoves.map((m) => {
          const cam = getCameraPoseForMove(m.name);
          const wording = eng.wording(m.name).fullInstruction;

          return (
            <View key={m.name} style={styles.moveRowCard}>
              {/* Row Header */}
              <View style={styles.rowHeader}>
                <View style={styles.moveBadge}>
                  <Text style={styles.moveBadgeText}>{m.name}</Text>
                </View>
                <Text style={styles.wordingText}>{wording}</Text>
              </View>

              {/* 4-Frame Columns: Waiting, 25%, 50%, 100% */}
              <View style={styles.framesGrid}>
                {/* 1. Waiting: arrow & highlight visible */}
                <View style={styles.frameBox}>
                  <Text style={styles.frameLabel}>Waiting (Arrow + Belt)</Text>
                  <View style={styles.canvasContainer}>
                    <ThreeCanvas
                      style={styles.canvas}
                      camera={{ fov: puzzleType === '4x4' ? 45 : 32 }}
                    >
                      {puzzleType === 'pyraminx' ? (
                        <Pyraminx3D
                          state={DEFAULT_PYRAMINX_SOLVED}
                          currentMoveNotation={m.name}
                          isAnimating={false}
                          cameraAzimuth={cam.azimuth}
                          cameraElevation={cam.elevation}
                          isSolved={false}
                        />
                      ) : (
                        <PuzzleCube3D
                          cubeState={SOLVED_4X4}
                          dimension={4}
                          currentMoveNotation={m.name}
                          isAnimating={false}
                          cameraAzimuth={cam.azimuth}
                          cameraElevation={cam.elevation}
                          isSolved={false}
                        />
                      )}
                    </ThreeCanvas>
                  </View>
                </View>

                {/* 2. 25% Progress */}
                <View style={styles.frameBox}>
                  <Text style={styles.frameLabel}>25% Turn</Text>
                  <View style={styles.canvasContainer}>
                    <ThreeCanvas
                      style={styles.canvas}
                      camera={{ fov: puzzleType === '4x4' ? 45 : 32 }}
                    >
                      {puzzleType === 'pyraminx' ? (
                        <Pyraminx3D
                          state={DEFAULT_PYRAMINX_SOLVED}
                          currentMoveNotation={m.name}
                          staticProgress={0.25}
                          cameraAzimuth={cam.azimuth}
                          cameraElevation={cam.elevation}
                          isSolved={false}
                        />
                      ) : (
                        <PuzzleCube3D
                          cubeState={SOLVED_4X4}
                          dimension={4}
                          currentMoveNotation={m.name}
                          staticProgress={0.25}
                          cameraAzimuth={cam.azimuth}
                          cameraElevation={cam.elevation}
                          isSolved={false}
                        />
                      )}
                    </ThreeCanvas>
                  </View>
                </View>

                {/* 3. 50% Progress */}
                <View style={styles.frameBox}>
                  <Text style={styles.frameLabel}>50% Turn</Text>
                  <View style={styles.canvasContainer}>
                    <ThreeCanvas
                      style={styles.canvas}
                      camera={{ fov: puzzleType === '4x4' ? 45 : 32 }}
                    >
                      {puzzleType === 'pyraminx' ? (
                        <Pyraminx3D
                          state={DEFAULT_PYRAMINX_SOLVED}
                          currentMoveNotation={m.name}
                          staticProgress={0.50}
                          cameraAzimuth={cam.azimuth}
                          cameraElevation={cam.elevation}
                          isSolved={false}
                        />
                      ) : (
                        <PuzzleCube3D
                          cubeState={SOLVED_4X4}
                          dimension={4}
                          currentMoveNotation={m.name}
                          staticProgress={0.50}
                          cameraAzimuth={cam.azimuth}
                          cameraElevation={cam.elevation}
                          isSolved={false}
                        />
                      )}
                    </ThreeCanvas>
                  </View>
                </View>

                {/* 4. 100% Progress */}
                <View style={styles.frameBox}>
                  <Text style={styles.frameLabel}>100% Turn</Text>
                  <View style={styles.canvasContainer}>
                    <ThreeCanvas
                      style={styles.canvas}
                      camera={{ fov: puzzleType === '4x4' ? 45 : 32 }}
                    >
                      {puzzleType === 'pyraminx' ? (
                        <Pyraminx3D
                          state={DEFAULT_PYRAMINX_SOLVED}
                          currentMoveNotation={m.name}
                          staticProgress={1.00}
                          cameraAzimuth={cam.azimuth}
                          cameraElevation={cam.elevation}
                          isSolved={false}
                        />
                      ) : (
                        <PuzzleCube3D
                          cubeState={SOLVED_4X4}
                          dimension={4}
                          currentMoveNotation={m.name}
                          staticProgress={1.00}
                          cameraAzimuth={cam.azimuth}
                          cameraElevation={cam.elevation}
                          isSolved={false}
                        />
                      )}
                    </ThreeCanvas>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070B14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderColor: '#22d3ee',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#22d3ee',
    fontWeight: '700',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetInfo: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
  },
  pageBtnTextDisabled: {
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  moveRowCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  moveBadge: {
    backgroundColor: '#22d3ee',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moveBadgeText: {
    color: '#070B14',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  wordingText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  framesGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  frameBox: {
    flex: 1,
    backgroundColor: '#0B1120',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  frameLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  canvasContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#070B14',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
});

