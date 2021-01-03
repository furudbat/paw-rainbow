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
    parts: PawParts[];
}

export interface PawFlagConfig extends BaseFlagConfig, Record<PawParts, FlagConfigColorsPart> {}

export interface FlagsConfigData {
    categories: string[];
    forms: Forms[];
    transparent_colors: string[];

    paw: PawFlagConfig;
}
