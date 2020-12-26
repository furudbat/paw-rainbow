export interface FlagMetaData {
    name: string;
    
    colors: string[];
    line: string;
    triangle: string[];

    default?: boolean;
}

export enum Orienration {
    Horizontal = "horizontal",
    Vertical = "vertical"
}

interface SpriteRect {
    x: number;
    y: number;
    w: number;
    h: number;
}
interface SpriteSize {
    w: number;
    h: number;
}
export interface SpriteFlagMetaData {
    id: string;
    filename: string;
    sheet: string;
    
    form: string;
    flag_name: string;
    orientation: Orienration;
    part: string;

    frame: SpriteRect;
    sourceSize: SpriteSize;
    trimmed: boolean;
    rotated: boolean;

    flags_fits?: boolean;
    flags_fits_perfect?: boolean;
}

