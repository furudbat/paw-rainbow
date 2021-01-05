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
import { SpriteDataHelper } from "./sprites.data.helper";

const SELECTABLE_PARTS_LIST_ITEMS_PER_PAGE = 8;

export class FormPartsAdapter {
    private _appData: ApplicationData;
    private _parts_lists: Record<string, List> = {};
    private _last_values: LastSelectedValues = new LastSelectedValues();
    private _sprite_data_helper: SpriteDataHelper = new SpriteDataHelper();

    private log = LoggerManager.create('FormPartsAdapter');

    constructor(appData: ApplicationData) {
        this._appData = appData;
    }
    public initDefaultValues() {
        return this._sprite_data_helper.setup(this.current_form, this.parts_list).then(() => {
            for(const part of this.parts_list) {
                if (!(part in this.currentSelection.parts) || !this.currentSelection.parts[part].flag_name) {
                    this.currentSelection.parts[part] = new CurrentSelectionPart();
                    this.currentSelection.parts[part].filter = ALL_FILTER;
                    this.currentSelection.parts[part].flag_name = this._sprite_data_helper.getDefaultFlagName(this.current_form);
                    this.currentSelection.parts[part].orientation = Orientation.Vertical;
                }
            }
            this._appData.saveCurrentSelection();
        });
    }

    public init() {
        this.initObservers();

        if (!this.current_form && site.data.flags_config.forms.length > 0) {
            const form = site.data.flags_config.forms[0];

            this.initDefaultValues().then(() => {
                this._appData.setForm(form, this.parts_list, this._sprite_data_helper.getDefaultFlagName(form));
            });
        } else {
            this.initDefaultValues().then(() => {
                this.updateUI();
            });
        }
    }

    private async updateLastValues(value: CurrentSelection) {
        this._last_values.form = value.form;
        this._last_values.show_whole = value.show_whole;
        for (const part of this.parts_list) {
            this._last_values.parts[part] = {
                filter: value.parts[part].filter ?? ALL_FILTER,
                flag_name: value.parts[part].flag_name,
                orientation: value.parts[part].orientation
            };
        }
    };

    private initObservers() {
        var that = this;
        this._appData.currentSelectionObservable.attach(new class implements DataObserver<CurrentSelection>{
            update(subject: DataSubject<CurrentSelection>): void {
                const new_form = subject.data.form;
                const old_form = that._last_values.form;

                //that.log.debug('update currentSelection', form, subject.data, that._last_values);

                if (old_form !== new_form) {
                    that._last_values.clear();
                    that.initDefaultValues().then(() => {
                        that.updateUI().then(() => that.updateLastValues(subject.data));
                    });
                } else {
                    that.parts_list.map( part => {
                        return new Promise((resolve, reject) => {
                            const new_filter = (part in subject.data.parts)? subject.data.parts[part].filter : undefined;
                            const new_flag_name = (part in subject.data.parts)? subject.data.parts[part].flag_name : undefined;
                            const new_orientation = (part in subject.data.parts)? subject.data.parts[part].orientation : undefined;
                            const new_show_whole = subject.data.show_whole;

                            const old_filter = (part in that._last_values.parts)? that._last_values.parts[part].filter : undefined;
                            const old_flag_name = (part in that._last_values.parts)? that._last_values.parts[part].flag_name : undefined;
                            const old_orientation = (part in that._last_values.parts)? that._last_values.parts[part].orientation : undefined;
                            const old_show_whole = that._last_values.show_whole;
                            
                            if (old_filter !== new_filter) {
                                that.updateFilter(part, subject.data.parts[part].filter);
                            }
                            if (old_flag_name !== new_flag_name || old_orientation !== new_orientation) {
                                that.updateSelectedPartUI(old_form, part);
                            }
                            if (old_show_whole !== new_show_whole) {
                                that._parts_lists[part]?.update();
                            }
    
                            resolve(that.updateLastValues(subject.data));
                        });
                    });
                }
            }
        });
    }

    public updateUI() {
        return Promise.all([
            this.updateUISetForm(),
            this.updateUISetParts()
        ]);
    }

    public updateFilter(part: string, filter: string) {
        if (filter === ALL_FILTER) {
            this._parts_lists[part].filter();
        } else {
            this._parts_lists[part].filter(item => (item.values() as PartsListItemValue).category === filter);
        }
        this._parts_lists[part]?.update();
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

    private async updateSelectedPartUI(form: string, part: string) {
        const sprite_data = this.getCurrentSelectedSprite(form, part) ?? this._sprite_data_helper.getDefaultSprite(form, part);
        if (sprite_data !== undefined) {
            $('#'+this.getCurrentSelectedPartId(form, part)).replaceWith(this.getSelectedPartHTML(form, part, sprite_data));
        }
    }

    private getCurrentSelectedSprite(form: string, part: string) {
        const flag_name = this.getSelectedFlagName(part);
        const orientation = this.getSelectedOrientation(part);
        return (flag_name !== undefined && orientation !== undefined)? this._sprite_data_helper.getSelectableSprite(form, part, flag_name, orientation) : undefined;
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

            const btn = `<button type="button" class="list-group-item ${active}" data-form="${form}">
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

    static getSelectFilterId(form: string, part: string) {
        return `lstSelectFilter${form}_${part}`;
    }
    static getPartNavLinkId(part: string) { 
        return `pills-parts-${part}`;
    }
    static getPartNavLinkTabId(part: string) { 
        return`pills-parts-${part}-tab`;
    }

    private getSelectablePartsHTML(form: string) {
        const nav_tabs_id = `pills-tab-${form}-parts`;
        const nav_tab_content_id = `pills-${form}-parts-tabContent`;

        const default_selected_part = (this.parts_list.length > 0)? this.parts_list[0] : WHOLE_PART;

        let nav_links = '';
        let tab_content_content = '';
        for (const part of this.parts_list) {

            const part_label = site.data.strings.select_parts[part] ?? site.data.strings.select_parts.unknown;
            const selected = part == default_selected_part;
            const active = (selected) ? 'active' : '';
            const show_active = (selected) ? 'show active' : '';

            const nav_link_id = FormPartsAdapter.getPartNavLinkId(part);
            const nav_link_tab_id = FormPartsAdapter.getPartNavLinkTabId(part);

            const sprite_data = this.getCurrentSelectedSprite(form, part);
            const current_part = (sprite_data !== undefined)? this.getSelectedPartHTML(form, part, sprite_data) : '';

            let partSettings = '';
            if (part == WHOLE_PART) {
                partSettings = `<div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="chbShowWholePart" value="${this.currentSelection.show_whole}">
                    <label class="form-check-label" for="chbShowWholePart">${site.data.strings.parts_list.show_whole_label}</label>
                </div>`;
            }
            
            const filters_id = FormPartsAdapter.getSelectFilterId(form, part);
            let filters = `<select class="custom-select" id="${filters_id}" data-placeholder="${site.data.strings.parts_list.filter_label}" data-form="${form}" data-part="${part}">`;
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

            const default_sprite_data = this._sprite_data_helper.getDefaultSprite(form, part);
            const part_icon = (default_sprite_data !== undefined)? FormPartsAdapter.getSelectPartIconHTML(default_sprite_data) : '';
            nav_links += `<li class="nav-item" role="presentation">
                <a class="nav-link ${active}" id="${nav_link_tab_id}" data-toggle="pill" href="#${nav_link_id}" role="tab" aria-controls="${nav_link_id}" aria-selected="${selected}">
                    <span class="select-part-icon-container">${part_icon}</span>
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

    static getSelectPartIconHTML(sprite_data: SpriteData){
        return `<img class="img-fluid select-part-icon mx-auto d-block" src="${site.base_url}/${sprite_data.filename}" alt="${sprite_data.flag_name} Part Icon">`;
    }

    private getSelectedPartHTML(form: string, part: string, selected_part: SpriteData) {
        const orientation = selected_part.orientation;
        const orientationIcon = (orientation)? this.getListItemValueOrientationHTML(orientation) : '';
        const flag_name = selected_part.flag_name;
        const id = this.getCurrentSelectedPartId(form, part);

        let disabled = '';
        let aria_disabled = '';
        if (part == WHOLE_PART) {
            disabled = (!this.currentSelection.show_whole)? 'disabled' : '';
            aria_disabled = (!this.currentSelection.show_whole)? 'aria-disabled="true"' : '';
        }

        return `<li class="list-group-item current-selected-part active form part flag_name ${disabled}" ${aria_disabled} data-form="${form}" data-part="${part}" data-flag-name="${flag_name}" data-orientation="${orientation}" id="${id}">
            <div class="row no-gutters">
                <div class="col-9 mx-2 my-auto text-left"><span class="name">${flag_name}</span></div>
                <div class="col-1 mx-2 my-auto float-right text-right"><span class="orientation_icon">${orientationIcon}</span></div>
            </div>
        </li>`;
    }

    private getSelectablePartsList(form: string, part: string) {
        const item = `<button type="button" class="list-group-item form part flag_name index">
            <div class="row no-gutters">
                <div class="col-2 my-auto"><span class="align-middle icon"></span></div>
                <div class="col-7 mx-2 my-auto text-left"><span class="align-middle name"></span></div>
            </div>
        </button>`;
        const valueNames = [
            'icon', 'name',
            { data: ['form', 'part', 'flag_name', 'index']}
        ];
        const options: any /*List.ListOptions*/ = {
            valueNames: valueNames,
            item: item,
            page: SELECTABLE_PARTS_LIST_ITEMS_PER_PAGE,
            pagination: LIST_JS_PAGINATION
        };
        const values = this.getSelectablePartListValues(form, part);

        const id = this.getListId(form, part);
        return new List(id, options, values);
    }

    private getSelectablePartListValues(form: string, part: string) {
        const removeDuplicateObjectFromArray = function (array: any[], key: string) {
            let check = new Set();
            return array.filter(obj => !check.has(obj[key]) && check.add(obj[key]));
        };

        const selectable_parts = removeDuplicateObjectFromArray(this._sprite_data_helper.getSelectableSpritesParts(form, part).filter(it => it.flags_fits), 'flag_name') as SpriteData[];

        return selectable_parts.map((selectable_part, index) => this.getListItemPart(part, selectable_part, index)).filter(it => it !== undefined) as PartsListItemValue[];
    }

    private getListItemPart(part: string, selectable_part: SpriteData, index: number) {
        const selectable_flag = site.data.flags.find(it => it.name == selectable_part.flag_name);

        if (selectable_flag !== undefined) {
            return this.getListItemValue(this.current_form, part, selectable_flag, index);
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

    private getListItemValue(form: string, part: string, flag: FlagData, index: number): PartsListItemValue {

        const icon = (flag !== undefined) ? this.getIconImgHTML(flag) : '';
        const flag_name = flag.name;
        const name = flag.name;
        const category = flag.category;

        return {
            icon: icon,
            name: name,
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

            that._appData.setForm(form, that.parts_list, that._sprite_data_helper.getDefaultFlagName(form));

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

                        const selectable_flags = that._sprite_data_helper.getSelectableSpritesFlag(form, part, flag_name).filter(it => it.flags_fits);
                        const selectable_flag_horizontal = selectable_flags.find(it => it.orientation == Orientation.Horizontal);
                        const selectable_flag_vertical = selectable_flags.find(it => it.orientation == Orientation.Vertical);

                        const orientation = that.getSelectedOrientation(part) ?? Orientation.Vertical;
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
                        
                        //that._appData.lastFlag = flag_name;
                    });
                });
            });

            $('#'+FormPartsAdapter.getSelectFilterId(form, part)).select2({
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
    form: string;
    part: string;
    flag_name: string;
    index: number;
    category: string;
};

class LastSelectedValues {
    public form: string | undefined = undefined;
    public show_whole: boolean | undefined = undefined;
    public parts: Record<string, {
        filter: string;
        flag_name: string;
        orientation: Orientation;
    }> = {};

    public clear() {
        this.form = undefined;
        this.parts = {};
        this.show_whole = undefined;
    }
}