declare module 'cubejs' {
  class Cube {
    constructor();
    static initSolver(): void;
    static fromString(str: string): Cube;
    static random(): Cube;
    static inverse(move: string): string;

    move(moves: string): void;
    asString(): string;
    isSolved(): boolean;
    solve(maxDepth?: number): string;
    clone(): Cube;

    cp: number[];
    co: number[];
    ep: number[];
    eo: number[];
  }

  export = Cube;
}

