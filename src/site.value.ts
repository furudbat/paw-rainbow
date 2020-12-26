import { FlagMetaData, SpriteFlagMetaData } from "./flags.data";

export interface SiteValue {
    data: {
        base_url: string,
        assets_url: string,

        flags: FlagMetaData[],
        sprites: SpriteFlagMetaData[],

        strings: any
    },
    version: string;
};