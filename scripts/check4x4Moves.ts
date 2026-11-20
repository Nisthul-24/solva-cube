import { getPuzzleEngine } from '../src/puzzleEngine/puzzleEngine';

const eng = getPuzzleEngine('4x4');
for (const m of ['R', "R'", 'R2', 'Rw', 'r', '2R']) {
  const info = eng.getMove(m);
  console.log(m, {
    layerName: info?.layerName,
    fullInstruction: info?.fullInstruction,
    isDouble: info?.isDouble,
    isCCW: info?.isCCW,
    isWide: info?.isWide,
    isSlice: info?.isSlice,
  });
}
