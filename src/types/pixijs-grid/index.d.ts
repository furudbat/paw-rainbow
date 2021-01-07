// Type definitions for pixijs-grid
// Project: https://github.com/LAG1996/pixijs-grid
// Definitions by: furudbat <https://github.com/furudbat>
// TypeScript Version: 2.3

/// <reference types="pixi.js"/>

declare interface PixiJSGridLineStyle {
    width: number;
    color: number;
    alpha: number;
    alignment: number;
    native: boolean;
}

declare const DEFAULT_LINE_STYLE: PixiJSGridLineStyle;

declare class PixiJSGrid extends PIXI.Graphics {
    set cellSize(cellSize: number | null);
    get cellSize(): number | null;

    get amtLines(): number | null;

    get bounds(): {
        x1: number,
        y1: number,
        x2: number,
        y2: number
    }

    set drawBoundaries(drawBoundaries: boolean);
    get drawBoundaries(): boolean;

    get originalWidth(): number;

    get correctedWidth(): number | null;
    get useCorrectedWidth(): boolean;

    get gridWidth(): number;

    constructor(
        width: number,
        cellSize?: number | null,
        lineConfig?: PixiJSGridLineStyle | null,
        useCorrectedWidth?: boolean,
        drawBoundaries?: boolean,
    );

    public drawGrid(): PixiJSGrid;
    public clearGrid(retainLineStyle?: boolean): PixiJSGrid;

    public getCellCoordinates(x: number, y: number): {
        x: number,
        y: number
    };

    public onMousemove(evt: PIXI.InteractionData, gridCoords: { x: number, y: number }): void;

    private _correctWidth(): void;
}