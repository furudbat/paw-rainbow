

export enum Orientation {
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

export interface SpriteSheetData {
    frame: SpriteRect;
    trimmed: boolean;
    rotated: boolean;
    spriteSourceSize: SpriteRect;
    sourceSize: SpriteSize;
}

export interface SpriteData extends SpriteSheetData {
    id: string;
    filename: string;
    sheet: string;

    mask_filename: string;
    mask_key: string;
    
    category: string;
    form: string;
    flag_name: string;
    orientation: Orientation;
    part: string;

    flags_fits?: boolean;
    flags_fits_perfect?: boolean;
    default?: boolean;
    mask?: boolean;
}
