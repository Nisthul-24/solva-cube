import React from 'react';
import { PUZZLE_LEARN_CONTENT } from '../src/constants/learnContent';
import { getPuzzle } from '../src/solvers';

describe('Problem 4: Route Smoke Tests & Learn Content Integrity', () => {
  const puzzleIds = ['3x3', '2x2', 'pyraminx'] as const;

  test.each(puzzleIds)('Learn content exists and is complete for puzzle "%s"', (id) => {
    const content = PUZZLE_LEARN_CONTENT[id];
    expect(content).toBeDefined();
    expect(content.title).toBeTruthy();
    expect(content.howToHold).toBeDefined();
    expect(content.howToHold.bullets.length).toBeGreaterThan(0);
    expect(content.notations.length).toBeGreaterThan(0);
    for (const notif of content.notations) {
      expect(notif.move).toBeTruthy();
      expect(notif.desc).toBeTruthy();
    }
    expect(content.tips.length).toBeGreaterThan(0);
  });

  test.each(puzzleIds)('Puzzle solver "%s" instantiates and provides valid faces and solved state', (id) => {
    const puzzle = getPuzzle(id);
    expect(puzzle).toBeDefined();
    expect(puzzle.id).toBe(id);

    const faces = puzzle.getFaces();
    expect(faces.length).toBeGreaterThanOrEqual(4);

    const solved = puzzle.getSolvedState();
    expect(solved).toBeDefined();

    const isSolved = puzzle.isSolved(solved);
    expect(isSolved).toBe(true);

    const validation = puzzle.validate(solved);
    expect(validation.valid).toBe(true);
  });
});
