import React from 'react';
// @ts-ignore
import ReactDOMServer from 'react-dom/server';
import HomeScreen from '../app/index';
import InputScreen from '../app/input';
import PlayerScreen from '../app/player';
import LearnScreen from '../app/learn';
import SettingsScreen from '../app/settings';
import ColourCheckScreen from '../app/colour-check';
import ArrowGalleryScreen from '../app/arrow-gallery';
import { usePuzzleStore } from '../src/store/puzzleStore';
import { PuzzleId } from '../src/types/puzzle';

describe('Problem 1: Screen Remount & No Red Error Toast Test', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const screens = [
    { name: 'HomeScreen', component: HomeScreen },
    { name: 'LearnScreen', component: LearnScreen },
    { name: 'SettingsScreen', component: SettingsScreen },
    { name: 'ColourCheckScreen', component: ColourCheckScreen },
    { name: 'ArrowGalleryScreen', component: ArrowGalleryScreen },
  ];

  test.each(screens)('$name mounts twice without throwing or logging errors', ({ component: Component }) => {
    // First mount
    const html1 = ReactDOMServer.renderToString(React.createElement(Component));
    expect(html1).toBeTruthy();
    expect(html1).not.toContain('Something went wrong');

    // Remount (second mount to simulate React 18 strict mode / fast refresh)
    const html2 = ReactDOMServer.renderToString(React.createElement(Component));
    expect(html2).toBeTruthy();
    expect(html2).not.toContain('Something went wrong');

    // Assert zero genuine errors or crashes occurred
    const realErrors = consoleErrorSpy.mock.calls.filter((call) => {
      const msg = call.join(' ');
      return !msg.startsWith('Warning: ');
    });

    expect(realErrors).toHaveLength(0);
  });

  const puzzles: PuzzleId[] = ['4x4', 'pyraminx', '3x3', '2x2'];

  test.each(puzzles)('InputScreen and PlayerScreen mount twice for puzzle "%s" with zero errors', async (puzzleId) => {
    await usePuzzleStore.getState().setActivePuzzle(puzzleId);

    // InputScreen mount 1 & 2
    const inputHtml1 = ReactDOMServer.renderToString(React.createElement(InputScreen));
    expect(inputHtml1).not.toContain('Something went wrong');
    const inputHtml2 = ReactDOMServer.renderToString(React.createElement(InputScreen));
    expect(inputHtml2).not.toContain('Something went wrong');

    // PlayerScreen mount 1 & 2
    const playerHtml1 = ReactDOMServer.renderToString(React.createElement(PlayerScreen));
    expect(playerHtml1).not.toContain('Something went wrong');
    const playerHtml2 = ReactDOMServer.renderToString(React.createElement(PlayerScreen));
    expect(playerHtml2).not.toContain('Something went wrong');

    // Assert zero "Cannot redefine property" or unhandled errors
    const realErrors = consoleErrorSpy.mock.calls.filter((call) => {
      const msg = call.join(' ');
      return !msg.startsWith('Warning: ');
    });
    expect(realErrors).toHaveLength(0);
  });
});

