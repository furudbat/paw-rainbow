import { FlagsConfigData } from "./data/flag-config.data";
import { FlagInfoData } from "./data/flag-info.data";
import { FlagData } from "./data/flag.data";
import { SpriteData } from "./data/sprite.data";

export interface SiteValue {
    base_url: string,
    assets_url: string,

    data: {
        flags: FlagData[],
        sprites: SpriteData[],
        flags_config: FlagsConfigData;
        flags_info: FlagInfoData[];

        strings: any
    },
    
    version: string;
};