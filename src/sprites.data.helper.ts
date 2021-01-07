import { site } from './site';
import cache from 'memory-cache';
import { FlagData } from './data/flag.data';
import { Orientation, SpriteData } from './data/sprite.data';

export const FLAG_NAME_NONE_DEFAULT = 'None';

export class SpriteDataHelper {
    private _cacheFlagData: cache.CacheClass<string, FlagData> = new cache.Cache<string, FlagData>();
    private _cacheSpriteMetaData: cache.CacheClass<string, SpriteData[]> = new cache.Cache<string, SpriteData[]>();
    private _cacheFlagNames: cache.CacheClass<string, string> = new cache.Cache<string, string>();

    private readonly DEFAULT_FLAG_NAME_KEY = 'default_flag_name';
    private readonly MASK_SPRITE_KEY = 'mask_sprite';
    private readonly DEFAULT_SPRITE_KEY = 'default_sprite';
    private readonly SELECTABLE_SPRITES_KEY = 'selectable_sprites';
    private readonly SELECTABLE_PARTS_KEY = 'selectable_parts';
    private readonly FLAG_DATA_KEY = 'flag_data';

    public setup(form: string, parts: string[]) {
        return this.warmUpCache(form, parts);
    }

    public getDefaultFlagName(form: string) {
        const key = `${this.DEFAULT_FLAG_NAME_KEY}_${form}`;
        let ret = this._cacheFlagNames.get(key);
        if (ret) {
            return ret;
        }

        ret = site.data.sprites.find(it => it.default)?.flag_name ?? FLAG_NAME_NONE_DEFAULT;
        this._cacheFlagNames.put(key, ret);
        return ret;
    }

    public getSelectableSprites(form: string) {
        const key = `${this.SELECTABLE_SPRITES_KEY}_${form}`;
        let ret = this._cacheSpriteMetaData.get(key);
        if (ret) {
            return ret;
        }

        ret = site.data.sprites.filter(it => it.form == form && (it.mask === undefined || !it.mask) && (it.craws === undefined || !it.craws) && (it.outlines === undefined || !it.outlines)).sort((a, b) => {
            if (a.default) { return 1; }
            if (b.default) { return -1; }
            if (a.flag_name > b.flag_name) { return -1; }
            if (a.flag_name < b.flag_name) { return 1; }
            return 0;
        }).reverse();
        this._cacheSpriteMetaData.put(key, ret);
        return ret;
    }

    public getSelectableSpritesParts(form: string, part: string) {
        const key = `${this.SELECTABLE_PARTS_KEY}_${form}_${part}`;
        let ret = this._cacheSpriteMetaData.get(key);
        if (ret) {
            return ret;
        }

        ret = this.getSelectableSprites(form).filter(it => it.part == part);
        this._cacheSpriteMetaData.put(key, ret);
        return ret;
    }

    public getSelectableSpritesFlag(form: string, part: string, flag_name: string) {
        const key = `${this.SELECTABLE_PARTS_KEY}_${form}_${part}_${flag_name}`;
        let ret = this._cacheSpriteMetaData.get(key);
        if (ret) {
            return ret;
        }

        ret = this.getSelectableSpritesParts(form, part).filter(it => it.flag_name == flag_name);
        this._cacheSpriteMetaData.put(key, ret);
        return ret;
    }

    public getSelectableSprite(form: string, part: string, flag_name: string, orientation: Orientation) {
        const key = `${this.SELECTABLE_PARTS_KEY}_${form}_${part}_${flag_name}_${orientation}`;
        let rets = this._cacheSpriteMetaData.get(key);
        if (rets && rets.length > 0) {
            return rets[0];
        }

        rets = this.getSelectableSpritesFlag(form, part, flag_name).filter(it => it.orientation == orientation);
        this._cacheSpriteMetaData.put(key, rets);
        return (rets.length > 0) ? rets[0] : undefined;
    }

    public getMaskSprite(form: string, part: string) {
        const key = `${this.MASK_SPRITE_KEY}_${form}_${part}`;
        let rets = this._cacheSpriteMetaData.get(key);
        if (rets && rets.length > 0) {
            return rets[0];
        }

        rets = site.data.sprites.filter(it => it.form == form && it.part == part && it.mask !== undefined && it.mask);
        this._cacheSpriteMetaData.put(key, rets);
        return (rets.length > 0) ? rets[0] : undefined;
    }

    public getDefaultSprite(form: string, part: string) {
        const key = `${this.DEFAULT_SPRITE_KEY}_${form}_${part}`;
        let rets = this._cacheSpriteMetaData.get(key);
        if (rets && rets.length > 0) {
            return rets[0];
        }

        rets = site.data.sprites.filter(it => it.form == form && it.part == part && it.default !== undefined && it.default);
        this._cacheSpriteMetaData.put(key, rets);
        return (rets.length > 0) ? rets[0] : undefined;
    }

    public getFlagData(flag_name: string) {
        const key = `${this.FLAG_DATA_KEY}_${flag_name}`;
        let ret = this._cacheFlagData.get(key);
        if (ret) {
            return ret;
        }

        ret = site.data.flags.find(it => it.name == flag_name) ?? null;
        if (ret) {
            this._cacheFlagData.put(key, ret);
        }
        return ret;
    }

    private warmUpCache(form: string, parts: string[]) {
        let promises = parts.map(part => {
            return new Promise((resolve, reject) => {
                try {
                    this.getSelectableSpritesParts(form, part);
                    this.getDefaultSprite(form, part);
                    this.getMaskSprite(form, part);
                    for (const flag_name of site.data.flags.map(it => it.name)) {
                        this.getFlagData(flag_name);
                        this.getSelectableSpritesFlag(form, part, flag_name);

                        this.getSelectableSprite(form, part, flag_name, Orientation.Horizontal);
                        this.getSelectableSprite(form, part, flag_name, Orientation.Vertical);
                    }
                    resolve(true);
                } catch(e) {
                    reject(e);
                }
            });
        });

        return Promise.all(promises);
    }
}