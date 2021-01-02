import { FlagMetaData, FlagsConfig, SpriteFlagMetaData } from "./flags.data";

export interface SiteValue {
    data: {
        base_url: string,
        assets_url: string,

        flags: FlagMetaData[],
        sprites: SpriteFlagMetaData[],
        flags_config: FlagsConfig;

        strings: any
    },
    version: string;
};