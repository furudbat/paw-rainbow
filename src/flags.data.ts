export interface FlagMetaData {
    name: string;
    filename: string;
    
    colors: string[];
    triangle: string[];
    line: string;
    circle: string;

    default?: boolean;
    mask?: boolean;
}

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
export interface SpriteFlagMetaData {
    id: string;
    filename: string;
    flag_filename: string;
    sheet: string;

    mask_filename: string;
    mask_key: string;
    
    category: string;
    form: string;
    flag_name: string;
    orientation: Orientation;
    part: string;

    frame: SpriteRect;
    sourceSize: SpriteSize;
    trimmed: boolean;
    rotated: boolean;

    flags_fits?: boolean;
    flags_fits_perfect?: boolean;
    default?: boolean;
    mask?: boolean;
}


interface FlagConfigColors {
    horizontal: string[];
    vertical: string[];
}

interface FlagConfigColorsPart extends FlagConfigColors {
    circle?: FlagConfigColors;
    triangle?: FlagConfigColors;
}


export type Forms = 'paw';
export type PawParts = 'left_part_1' | 'left_part_2' | 'right_part_1' | 'right_part_2' | 'center';

export interface BaseFlagConfig {
    //base_filename: string;

    craws?: string[];
    outline? : string;
    extra_outline? : string;
    parts: string[];
}

export interface PawFlagConfig extends BaseFlagConfig, Record<PawParts, FlagConfigColorsPart> {

}

export interface FlagsConfig {
    categories: string[];
    forms: string[];
    transparent_colors: string[];
    paw: PawFlagConfig;
}

export interface FlagWikiData {
    name: string;
    link: string;
    description?: string;
    img?: string;
}