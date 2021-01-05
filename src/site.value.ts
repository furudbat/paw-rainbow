import { FlagsConfigData } from "./data/flag-config.data";
import { FlagInfoData } from "./data/flag-info.data";
import { FlagData } from "./data/flag.data";
import { SpriteData } from "./data/sprite.data";

export const PAGINATION_CLASS = 'paginationBottom';
export const LIST_JS_PAGINATION = [{
    paginationClass: PAGINATION_CLASS,
    innerWindow: 5,
    left: 2,
    right: 2,
    item: '<li class="page-item"><a class="page page-link" href="#/"></a></li>'
}];
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