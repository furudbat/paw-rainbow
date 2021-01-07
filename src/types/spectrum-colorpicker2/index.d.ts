// Type definitions for spectrum-colorpicker2
// Project: https://github.com/seballot/spectrum, https://seballot.github.io/spectrum/
// Definitions by: furudbat <https://github.com/furudbat>
// TypeScript Version: 2.3

/// <reference types="jquery"/>

import tinycolor from "tinycolor2";

export as namespace SpectrumColorPicker2;

export type Color = tinycolor.Instance;

export type ChangeEvent = "change";
export type MoveEvent = "move.spectrum";
export type ShowEvent = "show.spectrum";
export type HideEvent = "hide.spectrum";
export type BeforeShowEvent = "beforeShow.spectrum";
export type DragStartEvent = "dragstart.spectrum";
export type DragStopEvent = "dragstop.spectrum";

export interface SpectrumOptions {
    color?: Color | string,
    type?: "text" | "component" | "color" | "flat",
    showInput?: boolean,
    showInitial?: boolean,
    allowEmpty?: boolean,
    showAlpha?: boolean,
    disabled?: boolean,
    localStorageKey?: string,
    showPalette?: boolean,
    showPaletteOnly?: boolean,
    togglePaletteOnly?: boolean,
    showSelectionPalette?: boolean,
    clickoutFiresChange?: boolean,
    containerClassName?: string,
    replacerClassName?: string,
    preferredFormat?: string,
    maxSelectionSize?: number,
    palette?: string[][],
    selectionPalette?: string[],
    // specify locale
    locale?: string,
    // or directly change the translations
    cancelText?: string,
    chooseText?: string,
    togglePaletteMoreText?: string,
    togglePaletteLessText?: string,
    clearText?: string,
    noColorSelectedText?: string,
    
    change?: (tinycolor: Color) => void,
    move?: (tinycolor: Color) => void,
    show?: (tinycolor: Color) => void,
    hide?: (tinycolor: Color) => void,
    beforeShow?: (tinycolor: Color) => void
}

// --------------------------------------------------------------------------------------
// jQuery
// --------------------------------------------------------------------------------------

declare global {
    interface JQuery<TElement = HTMLElement> {
        spectrum(options?: SpectrumOptions): this;
        spectrum(methode: "show" | "hide" | "toggle" | "container" | "reflow" | "destroy" | "enable" | "disable" | "option"): this;
        spectrum(methode: "get"): Color;
        spectrum(methode: "set", colorString: string): this;
        spectrum(methode: "option", optionName: string, newOptionValue?: any): this;

        on(
            events: ChangeEvent | MoveEvent | ShowEvent | HideEvent | BeforeShowEvent | DragStartEvent | DragStopEvent,
            handler: JQuery.EventHandler<TElement, Color>
        ): this;
    }
}