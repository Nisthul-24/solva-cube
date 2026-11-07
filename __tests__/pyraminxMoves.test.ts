import {
  DEFAULT_PYRAMINX_SOLVED,
  applyMoveToPyraminxState,
  isPyraminxSolved,
} from '../src/solvers/pyraminx/pyraminxFacelets';

describe('Pyraminx Facelet Moves', () => {
  const moves = ['u', 'l', 'r', 'b', 'U', 'L', 'R', 'B'];

  test.each(moves)('Move %s has order 3 (M^3 === id)', (m) => {
    let state = DEFAULT_PYRAMINX_SOLVED;
    state = applyMoveToPyraminxState(state, m);
    expect(isPyraminxSolved(state)).toBe(false);
    state = applyMoveToPyraminxState(state, m);
    expect(isPyraminxSolved(state)).toBe(false);
    state = applyMoveToPyraminxState(state, m);
    expect(isPyraminxSolved(state)).toBe(true);
  });

  test.each(moves)('Move %s inverted by %s\'', (m) => {
    let state = DEFAULT_PYRAMINX_SOLVED;
    state = applyMoveToPyraminxState(state, m);
    state = applyMoveToPyraminxState(state, `${m}'`);
    expect(isPyraminxSolved(state)).toBe(true);
  });
});

