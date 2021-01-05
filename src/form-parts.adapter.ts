import { ALL_FILTER, ApplicationData, CurrentSelection, CurrentSelectionPart, WHOLE_PART } from "./data/application.data";
import { Orientation, SpriteData } from "./data/sprite.data";
import { site } from "./site";
import { LoggerManager } from 'typescript-logger';
import { DataObserver, DataSubject } from './observer';
import { AnyFlagConfig } from './data/flag-config.data';
import { FlagData } from "./data/flag.data";
import { LIST_JS_PAGINATION, PAGINATION_CLASS } from "./site.value";
import List from 'list.js';
import 'select2';
import cache from 'memory-cache';

const FLAG_NAME_NONE_DEFAULT = 'None';
const SELECTABLE_PARTS_LIST_ITEMS_PER_PAGE = 8;

export class FormPartsAdapter {
    private _appData: ApplicationData;
    private _cacheFlagData: cache.CacheClass<string, FlagData> = new cache.Cache<string, FlagData>();
    private _cacheSpriteMetaData: cache.CacheClass<string, SpriteData[]> = new cache.Cache<string, SpriteData[]>();
    private _cacheFlagNames: cache.CacheClass<string, string> = new cache.Cache<string, string>();
    private _parts_lists: Record<string, List> = {};
    private _last_value: Record<string, string> = {};

    private log = LoggerManager.create('FormPartsAdapter');

    private readonly DEFAULT_FLAG_NAME_KEY = 'default_flag_name';
    private readonly MASK_SPRITE_KEY = 'mask_sprite';
    private readonly DEFAULT_SPRITE_KEY = 'default_sprite';
    private readonly SELECTABLE_SPRITES_KEY = 'selectable_sprites';
    private readonly SELECTABLE_PARTS_KEY = 'selectable_parts';
    private readonly FLAG_DATA_KEY = 'flag_data';

    constructor(appData: ApplicationData) {
        this._appData = appData;
        this.initDefaultValues();
    }
    public initDefaultValues() {
        for(const part of this.parts_list) {
            if (!(part in this.currentSelection.parts) || !this.currentSelection.parts[part].flag_name) {
                this.currentSelection.parts[part] = new CurrentSelectionPart();
                this.currentSelection.parts[part].filter = ALL_FILTER;
                this.currentSelection.parts[part].flag_name = this.getDefaultFlagName(this.current_form);
                this.currentSelection.parts[part].orientation = Orientation.Vertical;
            }
        }
    }

    public init() {
        this.initObservers();

        if (!this.current_form && site.data.flags_config.forms.length > 0) {
            const form = site.data.flags_config.forms[0];
            this._appData.setForm(form, this.parts_list, this.getDefaultFlagName(form));
        } else {
            this.updateUI();
        }

        this.warmUpCache();
    }

    private warmUpCache() {
        for(const part of this.parts_list) {
            this.getSelectableSpritesParts(this.current_form, part);
        }
    }

    private initObservers() {
        var that = this;
        this._appData.currentSelectionObservable.attach(new class implements DataObserver<CurrentSelection>{
            update(subject: DataSubject<CurrentSelection>): void {
                const form = subject.data.form;
                const form_key = 'form';

                that.log.debug('update currentSelection', subject.data, that._last_value);

                if (that._last_value[form_key] !== form) {
                    that.initDefaultValues();
                    that._last_value = {};
                    that.updateUI();
                } else {
                    for (const part of that.parts_list) {
                        const part_filter_key = `part_filter_${part}`;

                        const sprite_data = that.getCurrentSelectedSprite(form, part) ?? that.getDefaultSprite(form);
                        if (part in subject.data.parts && that._last_value[part_filter_key] !== subject.data.parts[part].filter) {
                            that.updateFilter(part, subject.data.parts[part].filter);
                        }

                        if (sprite_data !== undefined) {
                            $('#'+that.getCurrentSelectedPartId(form, part)).replaceWith(that.getSelectedPartHTML(form, part, sprite_data));
                        }
                        that._parts_lists[part]?.update();
                    }
                }


                that._last_value[form_key] = subject.data.form;
                for (const part of that.parts_list) {
                    const part_filter_key = `part_filter_${part}`;
                    const part_flag_name_key = `part_flag_name_${part}`;
                    const part_orientation_key = `part_orientation_${part}`;

                    if (part in subject.data.parts) {
                        that._last_value[part_filter_key] = subject.data.parts[part].filter ?? ALL_FILTER;
                        that._last_value[part_flag_name_key] = subject.data.parts[part].flag_name;
                        that._last_value[part_orientation_key] = subject.data.parts[part].orientation;
                    }
                }
            }
        });
    }

    public updateUI() {
        this.updateUISetForm();
        this.updateUISetParts();
    }

    public updateFilter(part: string, filter: string) {
        if (filter === ALL_FILTER) {
            this._parts_lists[part].filter();
            this._parts_lists[part].update();
        } else {
            this._parts_lists[part].filter(item => (item.values() as PartsListItemValue).category === filter);
            this._parts_lists[part].update();
        }
    }

    get currentSelection() {
        return this._appData.currentSelection;
    }

    get current_form() {
        return this._appData.currentSelection.form;
    }

    get parts_list() {
        return (FormPartsAdapter.hasProperty(site.data.flags_config, this.current_form)) ? (FormPartsAdapter.getUnsafeProperty(site.data.flags_config, this.current_form) as AnyFlagConfig).parts : [];
    }

    get filter_list() {
        let ret = [ALL_FILTER];
        return ret.concat(site.data.flags_config.categories);
    }

    public getListId(form: string, part: string) {
        return `lstSelect${form}${part}`;
    }

    private getIconImgHTML(flag: FlagData, classstr: string = '') {
        const src = `${site.base_url}/${flag.filename}`;

        let srcset_arr: string[] = [];
        for (const key in flag.filename_set) {
            const filename = flag.filename_set[key];
            srcset_arr.push(`${site.base_url}/${filename} ${key}`);
        }
        const srcset = srcset_arr.join(',');

        return `<img srcset="${srcset}" class="img-fluid ${classstr}" src="${src}" alt="${flag.name} Icon">`;
    }


    private getDefaultFlagName(form: string) {
        const key = `${this.DEFAULT_FLAG_NAME_KEY}_${form}`;
        let ret = this._cacheFlagNames.get(key);
        if (ret) {
            return ret;
        }

        ret = site.data.sprites.find(it => it.default)?.flag_name ?? FLAG_NAME_NONE_DEFAULT;
        this._cacheFlagNames.put(key, ret);
        return ret;
    }

    private getSelectableSprites(form: string) {
        const key = `${this.SELECTABLE_SPRITES_KEY}_${form}`;
        let ret = this._cacheSpriteMetaData.get(key);
        if (ret) {
            return ret;
        }

        ret = site.data.sprites.filter(it => it.form == form && (it.mask === undefined || !it.mask)).sort((a, b) => {
            if (a.flag_name > b.flag_name) { return -1; }
            if (a.flag_name < b.flag_name) { return 1; }
            return 0;
        }).reverse();
        this._cacheSpriteMetaData.put(key, ret);
        return ret;
    }

    private getSelectableSpritesParts(form: string, part: string) {
        const key = `${this.SELECTABLE_PARTS_KEY}_${form}_${part}`;
        let ret = this._cacheSpriteMetaData.get(key);
        if (ret) {
            return ret;
        }

        ret = this.getSelectableSprites(form).filter(it => it.part == part);
        this._cacheSpriteMetaData.put(key, ret);
        return ret;
    }

    private getSelectableSpritesFlag(form: string, part: string, flag_name: string) {
        const key = `${this.SELECTABLE_PARTS_KEY}_${form}_${part}_${flag_name}`;
        let ret = this._cacheSpriteMetaData.get(key);
        if (ret) {
            return ret;
        }

        ret = this.getSelectableSpritesParts(form, part).filter(it => it.flag_name == flag_name);
        this._cacheSpriteMetaData.put(key, ret);
        return ret;
    }

    private getSelectableSprite(form: string, part: string, flag_name: string, orientation: Orientation) {
        const key = `${this.SELECTABLE_PARTS_KEY}_${form}_${part}_${flag_name}_${orientation}`;
        let rets = this._cacheSpriteMetaData.get(key);
        if (rets && rets.length > 0) {
            return rets[0];
        }

        rets = this.getSelectableSpritesFlag(form, part, flag_name).filter(it => it.orientation == orientation);
        this._cacheSpriteMetaData.put(key, rets);
        return (rets.length > 0) ? rets[0] : undefined;
    }

    private getMaskSprite(form: string) {
        const key = `${this.MASK_SPRITE_KEY}_${form}`;
        let rets = this._cacheSpriteMetaData.get(key);
        if (rets && rets.length > 0) {
            return rets[0];
        }

        rets = site.data.sprites.filter(it => it.form == form && it.mask !== undefined);
        this._cacheSpriteMetaData.put(key, rets);
        return (rets.length > 0) ? rets[0] : undefined;
    }

    private getDefaultSprite(form: string) {
        const key = `${this.DEFAULT_SPRITE_KEY}_${form}`;
        let rets = this._cacheSpriteMetaData.get(key);
        if (rets && rets.length > 0) {
            return rets[0];
        }

        rets = site.data.sprites.filter(it => it.form == form && it.default !== undefined);
        this._cacheSpriteMetaData.put(key, rets);
        return (rets.length > 0) ? rets[0] : undefined;
    }

    private getFlagData(flag_name: string) {
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

    private getCurrentSelectedSprite(form: string, part: string) {
        const flag_name = this.getSelectedFlagName(part);
        const orientation = this.getSelectedOrientation(part);
        return (flag_name !== undefined && orientation !== undefined)? this.getSelectableSprite(form, part, flag_name, orientation) : undefined;
    }

    private getSelectedOrientation(part: string) {
        return (part in this.currentSelection.parts) ? this.currentSelection.parts[part].orientation : undefined;
    }
    private getSelectedFlagName(part: string) {
        return (part in this.currentSelection.parts) ? this.currentSelection.parts[part].flag_name : undefined;
    }
    private getSelectedFilter(part: string) {
        return (part in this.currentSelection.parts) ? this.currentSelection.parts[part].filter : undefined;
    }

    private async updateUISetForm() {
        $('#lstSelectForm').empty();

        for (const form of site.data.flags_config.forms) {
            const form_name = site.data.strings.select_form[form];
            const active = (this.currentSelection.form == form) ? 'active' : '';

            const btn = `<button type="button" class="list-group-item list-group-item-action ${active}" data-form="${form}">
                ${form_name}
            </button>`;

            $('#lstSelectForm').append(btn);
        }

        this.initEventSetForm();
    }

    private async updateUISetParts() {
        const form = this.current_form;
        $('#lstSelectContainer').empty().html(this.getSelectablePartsHTML(form));
        for (const part of this.parts_list) {
            const id = this.getListId(form, part);
            this._parts_lists[part] = this.getSelectablePartsList(form, part);
        }

        this.initEventSetParts();
        for (const part of this.parts_list) {
            this._parts_lists[part].update();
        }
    }

    private getSelectFilterId(form: string, part: string) {
        return `lstSelectFilter${form}_${part}`;
    }

    private getSelectablePartsHTML(form: string) {
        const nav_tabs_id = `pills-tab-${form}-parts`;
        const nav_tab_content_id = `pills-${form}-parts-tabContent`;

        const get_nav_link_id = (part: string) => `pills-parts-${part}`;
        const get_nav_link_tab_id = (part: string) => `pills-parts-${part}-tab`;

        const default_selected_part = (this.parts_list.length > 0)? this.parts_list[0] : WHOLE_PART;

        let nav_links = '';
        let tab_content_content = '';
        for (const part of this.parts_list) {

            const part_label = site.data.strings.select_parts[part] ?? site.data.strings.select_parts.unknown;
            const selected = part == default_selected_part;
            const active = (selected) ? 'active' : '';
            const show_active = (selected) ? 'show active' : '';

            const nav_link_id = get_nav_link_id(part);
            const nav_link_tab_id = get_nav_link_tab_id(part);

            const sprite_data = this.getCurrentSelectedSprite(form, part);
            const current_part = (sprite_data !== undefined)? this.getSelectedPartHTML(form, part, sprite_data) : '';

            let partSettings = '';
            if (part == WHOLE_PART) {
                partSettings = `<div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="chbShowWholePart" value="${this.currentSelection.show_whole}">
                    <label class="form-check-label" for="chbShowWholePart">${site.data.strings.parts_list.show_whole_label}</label>
                </div>`;
            }
            
            const filters_id = this.getSelectFilterId(form, part);
            let filters = `<select class="custom-select" id="${filters_id}" data-placeholder="${site.data.strings.parts_list.filter_label}">`;
            for(const filter of this.filter_list) {
                const filter_label = site.data.strings.select_filter[filter];
                if (filter_label) {
                    const filter_selected = (this.getSelectedFilter(part) == filter)? 'selected' : '';

                    const filter_option = `<option ${filter_selected}" data-form="${form}" data-part="${part}" data-filter="${filter}" value="${filter}">
                        ${filter_label}
                    </option>`;

                    filters += filter_option;
                }
            }
            filters += `</select>`;

            const id = this.getListId(form, part);
            tab_content_content += `<div class="tab-pane fade ${show_active}" id="${nav_link_id}" role="tabpanel" aria-labelledby="${nav_link_tab_id}">
                <ul class="list-group mt-2 mb-4">
                    ${current_part}
                </ul>
                <div class="my-1 part-settings">
                    ${partSettings}
                </div>
                <div class="mt-2" id="${id}">
                    <div class="row mt-2">
                        <div class="col-12">
                            <div class="input-group">
                                ${filters}
                            </div>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-12">
                            <div class="input-group">
                                <div class="input-group-prepend">
                                    <span class="input-group-text" id="searchHelp${id}"><i class="fas fa-search d-inline"></i></span>
                                </div>
                                <input type="text" class="form-control fuzzy-search" aria-label="${site.data.strings.parts_list.search_label}" aria-describedby="searchHelp${id}" placeholder="${site.data.strings.parts_list.search_label}">
                            </div>
                        </div>
                    </div>

                    <div class="row mt-2">
                        <div class="col-12">
                            <div class="list-group list"></div>

                            <nav class="my-2" aria-label="${site.data.strings.parts_list.pagination_label}">
                                <ul class="pagination ${PAGINATION_CLASS} justify-content-center">
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>\n`;

            nav_links += `<li class="nav-item" role="presentation">
                <a class="nav-link ${active}" id="${nav_link_tab_id}" data-toggle="pill" href="#${nav_link_id}" role="tab" aria-controls="${nav_link_id}" aria-selected="${selected}">
                    ${part_label}
                </a>
            </li>\n`;
        }


        const nav_tabs = `<ul class="nav nav-pills" id="${nav_tabs_id}" role="tablist">
            ${nav_links}
        </ul>`;

        return `${nav_tabs}
                <div class="tab-content" id="${nav_tab_content_id}">
                    ${tab_content_content}
                </div>`;
    }

    private getCurrentSelectedPartId(form: string, part: string) {
        return `btnCurrentPart${form}_${part}`;
    }

    private getSelectedPartHTML(form: string, part: string, selected_part: SpriteData) {
        const orientation = selected_part.orientation;
        const orientationIcon = (orientation)? this.getListItemValueOrientationHTML(orientation) : '';
        const flag_name = selected_part.flag_name;
        const id = this.getCurrentSelectedPartId(form, part);

        const icon = `<img class="img-fluid select-part-icon" src="${site.base_url}/${selected_part.filename}" alt="${flag_name} Part Icon">`;

        let disabled = '';
        let aria_disabled = '';
        if (part == WHOLE_PART) {
            disabled = (!this.currentSelection.show_whole)? 'disabled' : '';
            aria_disabled = (!this.currentSelection.show_whole)? 'aria-disabled="true"' : '';
        }

        return `<li class="list-group-item list-group-item-action current-selected-part active form part flag_name ${disabled}" ${aria_disabled} data-form="${form}" data-part="${part}" data-flag-name="${flag_name}" data-orientation="${orientation}" id="${id}">
            <div class="row no-gutters">
                <div class="col-1 icon select-part-icon-container">${icon}</div>
                <div class="col-9 pl-2 mt-1 align-middle name">${flag_name}</div>
                <div class="col-2 mt-1 px-2 text-right orientation_icon">${orientationIcon}</div>
            </div>
        </li>`;
    }

    private getSelectablePartsList(form: string, part: string) {
        const item = `<button type="button" class="list-group-item list-group-item-action form part flag_name orientation index">
            <div class="row no-gutters">
                <div class="col-2 pr-2 icon"></div>
                <div class="col-8 mt-1 align-middle name"></div>
            </div>
        </button>`;
        const valueNames = [
            'icon', 'name',
            { data: ['form', 'part', 'flag_name', 'orientation', 'index']}
        ];
        const options: any /*List.ListOptions*/ = {
            valueNames: valueNames,
            item: item,
            page: SELECTABLE_PARTS_LIST_ITEMS_PER_PAGE,
            pagination: LIST_JS_PAGINATION
        };
        const values = this.getSelectablePartListValues(form, part);
        this.log.debug('getSelectablePartsList', form, part, values);

        const id = this.getListId(form, part);
        return new List(id, options, values);
    }

    private getSelectablePartListValues(form: string, part: string) {
        const removeDuplicateObjectFromArray = function (array: any[], key: string) {
            let check = new Set();
            return array.filter(obj => !check.has(obj[key]) && check.add(obj[key]));
        };

        const selectable_parts = removeDuplicateObjectFromArray(this.getSelectableSpritesParts(form, part).filter(it => it.flags_fits), 'flag_name') as SpriteData[];
        const selected_orientation = this.getSelectedOrientation(part) ?? Orientation.Vertical;

        return selectable_parts.map((selectable_part, index) => this.getListItemPart(part, selectable_part, selected_orientation, index)).filter(it => it !== undefined) as PartsListItemValue[];
    }

    private getListItemPart(part: string, selectable_part: SpriteData, selected_orientation: Orientation, index: number) {
        const selectable_flag = site.data.flags.find(it => it.name == selectable_part.flag_name);

        if (selectable_flag !== undefined) {
            return this.getListItemValue(this.current_form, part, selectable_flag, selected_orientation, index);
        }

        return undefined;
    }

    private getListItemValueOrientationHTML(orientation: Orientation) {
        switch (orientation) {
            case Orientation.Horizontal:
                return `<span class="orientation-container">
                    <i class="fas fa-bars"></i><span class="sr-only">${site.data.strings.orientation.horizontal}</span>
                </span>`;
            case Orientation.Vertical:
                return `<span class="orientation-container">
                    <i class="fas fa-bars fa-rotate-90"></i><span class="sr-only">${site.data.strings.orientation.vertical}</span>
                </span>`;
        }
    }

    private getListItemValue(form: string, part: string, flag: FlagData, orientation: Orientation, index: number): PartsListItemValue {

        const icon = (flag !== undefined) ? this.getIconImgHTML(flag) : '';
        const flag_name = flag.name;
        const name = flag.name;
        const orientationIcon = this.getListItemValueOrientationHTML(orientation);
        const category = flag.category;

        return {
            icon: icon,
            name: name,
            orientation_icon: orientationIcon,
            orientation: orientation,
            form: form,
            part: part,
            flag_name: flag_name,
            index: index,
            category: category
        };
    }

    private initEventSetForm() {
        var that = this;
        $('#lstSelectForm').find('.list-group-item').off('click').on('click', function () {
            const form = $(this).data('form');
            $(this).prop('disabled', true);

            that._appData.setForm(form, that.parts_list, that.getDefaultFlagName(form));

            $(this).prop('disabled', false);
        });
    }

    private initEventSetParts() {
        var that = this;
        for (const part of this.parts_list) {
            const form = this.current_form;

            this._parts_lists[part].on('updated', function(list) {
                const selected_flag_name = that.getSelectedFlagName(part);

                list.items.forEach(function (it: any, index: number) {
                    const item = it.values() as PartsListItemValue;
                    const flag_name = item.flag_name;
                    const item_element = $(list.list).find(`[data-index="${index}"]`);

                    item_element.removeAttr('data-flag_name');
                    item_element.data('flag-name', flag_name);

                    //that.log.debug('list items forEach', flag_name, item_element);

                    const disable = part === WHOLE_PART && !that.currentSelection.show_whole;
                    item_element.attr('aria-disabled', disable.toString());
                    item_element.prop('disabled', disable);

                    item_element.removeClass('active');
                    if (selected_flag_name === flag_name) {
                        item_element.addClass('active');
                    }

                    item_element.off('click').on('click', function() {
                        const index = parseInt($(this).data('index'));
                        const item = list.get('index', index)[0];
                        const item_value = item.values() as PartsListItemValue;
                        const form = item_value.form;
                        const flag_name = item_value.flag_name;
                        const part = item_value.part;
                        const orientation = item_value.orientation;

                        const selectable_flags = that.getSelectableSpritesFlag(form, part, flag_name).filter(it => it.flags_fits);
                        const selectable_flag_horizontal = selectable_flags.find(it => it.orientation == Orientation.Horizontal);
                        const selectable_flag_vertical = selectable_flags.find(it => it.orientation == Orientation.Vertical);

                        let new_orientation = orientation;
                        if (that.getSelectedFlagName(part) !== flag_name) {
                            if (selectable_flag_horizontal && orientation === Orientation.Horizontal) {
                                new_orientation = Orientation.Horizontal;
                            } else if (selectable_flag_vertical && orientation === Orientation.Vertical) {
                                new_orientation = Orientation.Vertical;
                            } else if (selectable_flag_horizontal) {
                                new_orientation = Orientation.Horizontal;
                            } else if (selectable_flag_vertical) {
                                new_orientation = Orientation.Vertical;
                            } 
                            
                            that._appData.setPart(part, flag_name, new_orientation);
                        } else {
                            if (selectable_flag_horizontal && orientation === Orientation.Vertical) {
                                new_orientation = Orientation.Horizontal;
                            } else if (selectable_flag_vertical && orientation === Orientation.Horizontal) {
                                new_orientation = Orientation.Vertical;
                            } else if (selectable_flag_horizontal) {
                                new_orientation = Orientation.Horizontal;
                            } else if (selectable_flag_vertical) {
                                new_orientation = Orientation.Vertical;
                            }
                            if (orientation !== new_orientation) {                            
                                that._appData.setPart(part, flag_name, new_orientation);
                            }
                        }

                        item_value.orientation = new_orientation;
                        item_value.orientation_icon = that.getListItemValueOrientationHTML(new_orientation);
                        item.values(item_value);
                        
                        that._appData.lastFlag = flag_name;
                    });
                });
            });

            $('#'+this.getSelectFilterId(form, part)).select2({
                theme: "bootstrap4"
            }).off('select2:select').on('select2:select', function() {
                const part = $(this).data('part');
                const filter = $(this).val() as string ?? ALL_FILTER;
                that.log.debug('select filter', part, $(this).val());
                that._appData.setPartFilter(part, filter);
            });
        }

        $('#chbShowWholePart').on('change', function() {
            const value = $(this).is(":checked");
            that._appData.setShowWhole(value);
        });
    }

    static hasProperty(obj: any, key: string) {
        return key in obj
    }

    static getUnsafeProperty(obj: any, key: string) {
        return key in obj ? obj[key] : undefined; // Inferred type is T[K]
    }

    static getProperty<T, K extends keyof T>(obj: T, key: K) {
        return obj[key]; // Inferred type is T[K]
    }

    static setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]) {
        obj[key] = value;
    }
}

interface PartsListItemValue {
    icon: string;
    name: string;
    orientation_icon: string;
    orientation: Orientation;
    form: string;
    part: string;
    flag_name: string;
    index: number;
    category: string;
};