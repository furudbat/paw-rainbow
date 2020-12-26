export interface FlagMetaData {
    name: string;
    
    colors: string[];
    line: string;
    triangle: string[];

    default?: boolean;
}
export interface SpriteFlagMetaData {
    form: string;
    flag_name: string;
    orientation: string;
    part: string;

    filename: string;
    coord: number[];

    flags_fits?: boolean;
    flags_fits_perfect?: boolean;
}

