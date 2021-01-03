export interface FlagData {
    colors: string[];
    filename: string;
    filename_set: Record<string, string>;
    name: string;

    link?: string;

    triangle?: string[];
    line?: string;
    circle?: string;
    default?: boolean;
    mask?: boolean;
}