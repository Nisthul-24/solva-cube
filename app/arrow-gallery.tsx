import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Play, Pause } from 'lucide-react-native';
import { ThreeCanvas } from '../src/components/3d/ThreeCanvas';
import { PuzzleCube3D } from '../src/components/3d/PuzzleCube3D';
import { Pyraminx3D } from '../src/components/3d/Pyraminx3D';
import { TurnDirectionIcon } from '../src/components/3d/TurnDirectionIcon';
import { getPuzzleTurnInfo } from '../src/components/3d/puzzleTurnInfo';
import { DEFAULT_3X3_SOLVED } from '../src/solvers/cube3x3/cube3x3Facelets';
import { DEFAULT_PYRAMINX_SOLVED } from '../src/solvers/pyraminx/pyraminxFacelets';
import { Vec3 } from '../src/solvers/pyraminx/pyraminxGeometry';

const DEFAULT_2X2_SOLVED = {
  U: ['white', 'white', 'white', 'white'],
  R: ['red', 'red', 'red', 'red'],
  F: ['green', 'green', 'green', 'green'],
  D: ['yellow', 'yellow', 'yellow', 'yellow'],
  L: ['orange', 'orange', 'orange', 'orange'],
  B: ['blue', 'blue', 'blue', 'blue'],
};

const MOVES_3X3 = [
  'R', "R'", 'R2',
  'L', "L'", 'L2',
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
];

const MOVES_2X2 = [
  'R', "R'", 'R2',
  'U', "U'", 'U2',
  'F', "F'", 'F2',
];

const MOVES_PYRAMINX = [
  'U', "U'", 'L', "L'", 'R', "R'", 'B', "B'",
  'u', "u'", 'l', "l'", 'r', "r'", 'b', "b'",
];

export default function ArrowGalleryScreen() {
  const router = useRouter();
  const [selectedPuzzle, setSelectedPuzzle] = useState<'3x3' | '2x2' | 'pyraminx'>('3x3');
  const [activePlayMove, setActivePlayMove] = useState<string | null>(null);
  const [subGroup, setSubGroup] = useState<string>('R');

  // Available sub-groups per puzzle to prevent browser WebGL context exhaustion (max 8-16)
  const subGroups = selectedPuzzle === '3x3'
    ? ['R', 'L', 'U', 'D', 'F', 'B']
    : selectedPuzzle === '2x2'
    ? ['R', 'U', 'F']
    : ['Corners', 'Tips'];

  const allMoves = selectedPuzzle === '3x3'
    ? MOVES_3X3
    : selectedPuzzle === '2x2'
    ? MOVES_2X2
    : MOVES_PYRAMINX;

  const moves = allMoves.filter((m) => {
    if (selectedPuzzle === 'pyraminx') {
      const isTip = m[0] === m[0].toLowerCase();
      return subGroup === 'Tips' ? isTip : !isTip;
    }
    return m.startsWith(subGroup);
  });

  // Fixed camera positions for gallery cards:
  const cubeCam = { az: 0.6, el: 0.45 };
  const pyraCam = { az: 0.4, el: 0.35 };

  const cubeCamPos: Vec3 = [
    4.8 * Math.cos(cubeCam.el) * Math.sin(cubeCam.az),
    4.8 * Math.sin(cubeCam.el),
    4.8 * Math.cos(cubeCam.el) * Math.cos(cubeCam.az),
  ];

  const pyraCamPos: Vec3 = [
    5.25 * Math.cos(pyraCam.el) * Math.sin(pyraCam.az),
    5.25 * Math.sin(pyraCam.el),
    5.25 * Math.cos(pyraCam.el) * Math.cos(pyraCam.az),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Move Arrow Gallery</Text>
          <Text style={styles.headerSubtitle}>
            Unified turnInfo single-source verification ({moves.length} moves)
          </Text>
        </View>
      </View>

      {/* Puzzle Tabs */}
      <View style={styles.tabsRow}>
        {(['3x3', '2x2', 'pyraminx'] as const).map((p) => {
          const isSelected = selectedPuzzle === p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
              onPress={() => {
                setSelectedPuzzle(p);
                setSubGroup(p === 'pyraminx' ? 'Corners' : 'R');
                setActivePlayMove(null);
              }}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                {p === 'pyraminx' ? 'Pyraminx' : `${p} Cube`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sub-group / Face Filter Row */}
      <View style={styles.subGroupsRow}>
        {subGroups.map((grp) => {
          const isSelected = subGroup === grp;
          return (
            <TouchableOpacity
              key={grp}
              style={[styles.subGroupChip, isSelected && styles.subGroupChipActive]}
              onPress={() => {
                setSubGroup(grp);
                setActivePlayMove(null);
              }}
            >
              <Text style={[styles.subGroupText, isSelected && styles.subGroupTextActive]}>
                {selectedPuzzle === 'pyraminx' ? grp : `${grp} Face`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Grid of Move Cards */}
      <ScrollView contentContainerStyle={styles.gridContent}>
        <View style={styles.gridContainer}>
          {moves.map((move) => {
            const turnInfo = getPuzzleTurnInfo(selectedPuzzle, move);
            const isPlaying = activePlayMove === move;
            const camPos = selectedPuzzle === 'pyraminx' ? pyraCamPos : cubeCamPos;

            return (
              <View key={move} style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.notationBadge}>
                    <Text style={styles.notationText}>{move}</Text>
                  </View>
                  <Text style={styles.layerNameText}>{turnInfo.layerName}</Text>

                  {/* Play / Ghost Button */}
                  <TouchableOpacity
                    style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                    onPress={() => setActivePlayMove(isPlaying ? null : move)}
                  >
                    {isPlaying ? (
                      <Pause size={12} color="#0B1120" />
                    ) : (
                      <Play size={12} color="#22d3ee" fill="#22d3ee" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* 3D Canvas Box */}
                <View style={styles.canvasWrap}>
                  <ThreeCanvas style={styles.canvas}>
                    {selectedPuzzle === 'pyraminx' ? (
                      <Pyraminx3D
                        state={DEFAULT_PYRAMINX_SOLVED}
                        currentMoveNotation={move}
                        isAnimating={false}
                        isGhostPreview={isPlaying}
                        cameraAzimuth={pyraCam.az}
                        cameraElevation={pyraCam.el}
                        isSolved={false}
                      />
                    ) : (
                      <PuzzleCube3D
                        cubeState={selectedPuzzle === '2x2' ? DEFAULT_2X2_SOLVED : DEFAULT_3X3_SOLVED}
                        dimension={selectedPuzzle === '2x2' ? 2 : 3}
                        currentMoveNotation={move}
                        isAnimating={false}
                        isGhostPreview={isPlaying}
                        cameraAzimuth={cubeCam.az}
                        cameraElevation={cubeCam.el}
                        isSolved={false}
                      />
                    )}
                  </ThreeCanvas>

                  {/* Turn Direction Circular Icon (56px) */}
                  <View style={styles.iconOverlay}>
                    <TurnDirectionIcon
                      axis={turnInfo.axis}
                      angleRad={turnInfo.angleRad}
                      cameraPos={camPos}
                      size={48}
                      showHint={false}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070a11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#22d3ee',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#0B1120',
  },
  subGroupsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  subGroupChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  subGroupChipActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderColor: '#22d3ee',
  },
  subGroupText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  subGroupTextActive: {
    color: '#22d3ee',
    fontWeight: '800',
  },
  gridContent: {
    padding: 12,
    paddingBottom: 40,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  card: {
    width: 280,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  notationBadge: {
    backgroundColor: '#22d3ee',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  notationText: {
    color: '#0B1120',
    fontWeight: '900',
    fontSize: 14,
  },
  layerNameText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderWidth: 1,
    borderColor: '#22d3ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: {
    backgroundColor: '#22d3ee',
  },
  canvasWrap: {
    width: 280,
    height: 240,
    position: 'relative',
    backgroundColor: '#0b1120',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
  iconOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
