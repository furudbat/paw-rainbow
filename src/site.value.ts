import { FlagMetaData, FlagsConfig, FlagWikiData, SpriteFlagMetaData } from "./flags.data";

export interface SiteValue {
    base_url: string,
    assets_url: string,
    data: {
        flags: FlagMetaData[],
        sprites: SpriteFlagMetaData[],
        flags_config: FlagsConfig;
        flags_wiki: FlagWikiData[];

        strings: any
    },
    version: string;
};