import { ALL_FILTER, ApplicationData, CurrentSelectionForm, CurrentSelectionPart, ENABLE_FLIP_FEATURE, WHOLE_PART } from "./data/application.data";
import { Orientation, SpriteData } from "./data/sprite.data";
import { LoggerManager } from 'typescript-logger';
import { DataObserver, DataSubject } from './observer';
import { FlagData } from "./data/flag.data";
import { LIST_JS_PAGINATION, PAGINATION_CLASS } from "./site.value";
import { SpriteDataHelper } from "./sprites.data.helper";
import List from 'list.js';
import 'select2';
import { removeDuplicateObjectFromArray, site } from "./site";

const SELECTABLE_PARTS_LIST_ITEMS_PER_PAGE = 7;

export class FormPartsAdapter {
    private _appData: ApplicationData;
    private _parts_lists: Record<string, List> = {};
    private _sprite_data_helper: SpriteDataHelper;
    private _fallbackSetFormEnableButton: number | undefined = undefined;
    private _currentForm = new CurrentSelectionForm();

    private log = LoggerManager.create('FormPartsAdapter');

    constructor(appData: ApplicationData, _sprite_data_helper: SpriteDataHelper) {
        this._appData = appData;
        this._sprite_data_helper = _sprite_data_helper;
        this._currentForm = this._appData.currentSelectionFormData;
    }

    public init() {
        this.initObservers();
        this.updateUI(this._appData.currentSelectionFormData);
    }

    private initObservers() {
        var that = this;
        this._appData.currentSelectionFormObservable.attach(new class implements DataObserver<CurrentSelectionForm>{
            update(subject: DataSubject<CurrentSelectionForm>): void {
                that.updateUI(subject.data);
                $(this).prop('disabled', false);

                if (that._fallbackSetFormEnableButton) {
                    window.clearTimeout(that._fallbackSetFormEnableButton);
                    that._fallbackSetFormEnableButton = undefined;
                }
            }
        });

        for (const form of this._appData.forms) {
            this._appData.getCurrentSelectionPartsFilterObservables(form).forEach(obs => {
                const form = obs.form;
                const part = obs.part;
                const observable = obs.observable;
                observable.attach(new class implements DataObserver<string>{
                    update(subject: DataSubject<string>): void {
                        //that.log.debug('update currentSelection filter', form, part, subject.data, that._last_values);

                        if (that.current_form === form) {
                            that.updateFilter(part, subject.data);
                        }
                    }
                });
            });

            this._appData.getCurrentSelectionPartsObservables(form).forEach(obs => {
                const form = obs.form;
                const part = obs.part;
                const observable = obs.observable;
                observable.attach(new class implements DataObserver<CurrentSelectionPart>{
                    update(subject: DataSubject<CurrentSelectionPart>): void {
                        //that.log.debug('update currentSelection part', form, part, subject.data, that._last_values);

                        that.updateSelectedPartUI(form, part);
                        if (that.current_form === form) {
                            that._parts_lists[part]?.update();
                        }
                    }
                });
            });
        }

        this._appData.currentSelectionShowWholeObservable.attach(new class implements DataObserver<boolean>{
            update(subject: DataSubject<boolean>): void {
                const part = WHOLE_PART;
                //that.log.debug('update currentSelection show_whole', form, subject.data, that._last_values);

                that._parts_lists[part]?.update();
            }
        });
    }

    public updateUI(current_form: CurrentSelectionForm) {
        this._currentForm = current_form;
        return Promise.all([
            this.updateUISetForm(current_form.form),
            this.updateUISetParts(current_form),
            this.updateUIToolbox(current_form.form)
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

    get filter_list() {
        let ret = [ALL_FILTER];
        return ret.concat(site.data.flags_config.categories);
    }

    get current_form() {
        return this._currentForm.form;
    }

    get parts_list() {
        return Object.keys(this._currentForm.parts);
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

    private getCurrentSelectedSprite(form: string, part: string) {
        const flag_name = this.getSelectedFlagName(form, part);
        const orientation = this.getSelectedOrientation(form, part);
        return (flag_name !== undefined && orientation !== undefined) ? this._sprite_data_helper.getSelectableSprite(form, part, flag_name, orientation) : undefined;
    }

    private getSelectedOrientation(form: string, part: string) {
        return this._appData.getCurrentSelectionPartData(form, part)?.orientation;
    }
    private getSelectedFlagName(form: string, part: string) {
        return this._appData.getCurrentSelectionPartData(form, part)?.flag_name;
    }
    private getSelectedFlip(form: string, part: string) {
        return this._appData.getCurrentSelectionPartData(form, part)?.flip;
    }
    private getSelectedFilter(form: string, part: string) {
        return this._appData.getCurrentSelectionPartFilter(form, part);
    }


    private async updateUIToolbox(form: string) {
        if (this._appData.getOutlineColor(form)) {
            $('form-group-outlines-color').removeClass('d-none');
        } else {
            $('form-group-outlines-color').addClass('d-none');
        }

        if (this._appData.getCrawColors(form)) {
            $('form-group-craws-color').removeClass('d-none');
        } else {
            $('form-group-craws-color').addClass('d-none');
        }
    }

    private async updateUISetForm(current_form: string) {
        $('#lstSelectForm').empty();

        for (const form of site.data.flags_config.forms) {
            const form_name = site.data.strings.select_form[form];
            const active = (current_form == form) ? 'active' : '';

            const btn = `<button type="button" class="list-group-item ${active}" data-form="${form}">
                ${form_name}
            </button>`;

            $('#lstSelectForm').append(btn);
        }

        this.initEventSetForm();
    }

    private async updateUISetParts(current_form: CurrentSelectionForm) {
        const form = current_form.form;
        $('#lstSelectContainer').empty().html(this.getSelectablePartsHTML(form));
        for (const part of Object.keys(current_form.parts)) {
            const id = this.getListId(form, part);
            this._parts_lists[part] = this.getSelectablePartsList(form, part);
            this.initSelectedPartEvents(form, part);
        }

        this.initEventSetParts();
        for (const part of Object.keys(current_form.parts)) {
            this._parts_lists[part].update();
        }

        $('#chbShowWholePart').prop('checked', this._appData.currentSelectionShowWhole);
    }

    static getSelectFilterId(form: string, part: string) {
        return `lstSelectFilter${form}_${part}`;
    }
    static getPartNavLinkId(part: string) {
        return `pills-parts-${part}`;
    }
    static getPartNavLinkTabId(part: string) {
        return `pills-parts-${part}-tab`;
    }
    static getPartTabId(form: string) {
        return `pills-tab-${form}-parts`;
    }
    static getPartTabContentId(form: string) {
        return `pills-${form}-parts-tabContent`;
    }

    private getSelectablePartsHTML(form: string) {
        const nav_tabs_id = FormPartsAdapter.getPartTabId(form);
        const nav_tab_content_id = FormPartsAdapter.getPartTabContentId(form);

        const default_selected_part = (this.parts_list.length > 0) ? this.parts_list[0] : WHOLE_PART;

        let nav_links = '';
        let tab_content_content = '';
        for (const part of this.parts_list) {
            nav_links += this.getNavLinkHTML(form, part);
            tab_content_content += this.genNavTabContent(form, part);
        }


        const nav_tabs = `<ul class="nav nav-pills mb-2" id="${nav_tabs_id}" role="tablist">
            ${nav_links}
        </ul>`;

        return `${nav_tabs}
                <div class="tab-content" id="${nav_tab_content_id}">
                    ${tab_content_content}
                </div>`;
    }

    private getNavLinkHTML(form: string, part: string) {
        const default_selected_part = (this.parts_list.length > 0) ? this.parts_list[0] : WHOLE_PART;

        const part_label = site.data.strings.select_parts[part] ?? site.data.strings.select_parts.unknown;
        const selected = part == default_selected_part;
        const active = (selected) ? 'active' : '';
        const part_border = (selected) ? 'border border-light rounded' : 'border border-dark rounded';
        const nav_link_id = FormPartsAdapter.getPartNavLinkId(part);
        const nav_link_tab_id = FormPartsAdapter.getPartNavLinkTabId(part);
        const default_sprite_data = this._sprite_data_helper.getDefaultSprite(form, part);
        const part_icon = (default_sprite_data !== undefined) ? FormPartsAdapter.getSelectPartIconHTML(default_sprite_data) : '';

        return `<li class="nav-item ${part_border}" role="presentation">
            <a class="nav-link nav-link-parts text-center ${active}" id="${nav_link_tab_id}" data-toggle="pill" href="#${nav_link_id}" role="tab" aria-controls="${nav_link_id}" aria-selected="${selected}">
                <span class="select-part-icon-container">${part_icon}</span>
                ${part_label}
            </a>
        </li>\n`;
    }

    private genNavTabContent(form: string, part: string) {
        const default_selected_part = (this.parts_list.length > 0) ? this.parts_list[0] : WHOLE_PART;

        const selected = part == default_selected_part;
        const show_active = (selected) ? 'show active' : '';

        const nav_link_id = FormPartsAdapter.getPartNavLinkId(part);
        const nav_link_tab_id = FormPartsAdapter.getPartNavLinkTabId(part);

        const sprite_data = this.getCurrentSelectedSprite(form, part);
        const flip = this.getSelectedFlip(form, part) ?? false;
        const current_part = (sprite_data !== undefined) ? this.getSelectedPartHTML(form, part, sprite_data, flip) : '';

        const id = this.getListId(form, part);

        let partSettings = '';
        if (part == WHOLE_PART) {
            partSettings = `<div class="form-check form-check-inline">
                <input class="form-check-input" type="checkbox" id="chbShowWholePart" value="${this._appData.currentSelectionShowWhole}">
                <label class="form-check-label" for="chbShowWholePart">${site.data.strings.parts_list.show_whole_label}</label>
            </div>`;
        }

        const filters_id = FormPartsAdapter.getSelectFilterId(form, part);
        let filters = `<select class="custom-select" id="${filters_id}" data-placeholder="${site.data.strings.parts_list.filter_label}" data-form="${form}" data-part="${part}">`;
        for (const filter of this.filter_list) {
            const filter_label = site.data.strings.select_filter[filter];
            if (filter_label) {
                const filter_selected = (this.getSelectedFilter(form, part) == filter) ? 'selected' : '';

                const filter_option = `<option ${filter_selected}" data-form="${form}" data-part="${part}" data-filter="${filter}" value="${filter}">
                    ${filter_label}
                </option>`;

                filters += filter_option;
            }
        }
        filters += `</select>`;

        return `<div class="tab-pane fade ${show_active}" id="${nav_link_id}" role="tabpanel" aria-labelledby="${nav_link_tab_id}">
                <ul class="list-group mb-4">
                    ${current_part}
                </ul>
                <div class="my-1 mb-2 part-settings">
                    ${partSettings}
                </div>
                <div id="${id}">
                    <div class="row mb-2">
                        <div class="col-12">
                            <div class="input-group">
                                ${filters}
                            </div>
                        </div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-12">
                            <div class="input-group">
                                <div class="input-group-prepend">
                                    <span class="input-group-text" id="searchHelp${id}"><i class="fas fa-search d-inline"></i></span>
                                </div>
                                <input type="text" class="form-control fuzzy-search" id="search${id}" aria-label="${site.data.strings.parts_list.search_label}" aria-describedby="searchHelp${id}" placeholder="${site.data.strings.parts_list.search_label}">
                            </div>
                        </div>
                    </div>

                    <div class="row">
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
    }

    private getCurrentSelectedPartId(form: string, part: string) {
        return `btnCurrentPart${form}_${part}`;
    }

    static getSelectPartIconHTML(sprite_data: SpriteData) {
        return `<img class="img-fluid select-part-icon mx-auto d-block" src="${site.base_url}/${sprite_data.filename}" alt="${sprite_data.flag_name} Part Icon">`;
    }

    private getSelectablePartsList(form: string, part: string) {
        const item = function (values: PartsListItemValue) {
            return `<button type="button" class="list-group-item" data-form="${values.form}" data-part="${values.part}" data-flag-name="${values.flag_name}" data-index="${values.index}">
                <div class="row no-gutters">
                    <div class="col-2 my-auto"><span class="align-middle">${values.icon}</span></div>
                    <div class="col-7 mx-2 my-auto text-left"><span class="align-middle">${values.name}</span></div>
                </div>
            </button>`;
        };
        const options: any /*List.ListOptions*/ = {
            item: item,
            page: SELECTABLE_PARTS_LIST_ITEMS_PER_PAGE,
            pagination: LIST_JS_PAGINATION
        };
        const values = this.getSelectablePartListValues(form, part);

        const id = this.getListId(form, part);
        return new List(id, options, values);
    }

    private getSelectablePartListValues(form: string, part: string) {
        const selectable_parts = removeDuplicateObjectFromArray(this._sprite_data_helper.getSelectableSpritesParts(form, part).filter(it => it.flags_fits), 'flag_name');
        return selectable_parts.map((selectable_part, index) => this.getListItemPart(form, part, selectable_part, index)).filter(it => it !== undefined) as PartsListItemValue[];
    }

    private getListItemPart(form: string, part: string, selectable_part: SpriteData, index: number) {
        const selectable_flag = site.data.flags.find(it => it.name == selectable_part.flag_name);

        if (selectable_flag !== undefined) {
            return this.getListItemValue(form, part, selectable_flag, index);
        }

        return undefined;
    }

    private getListItemValueOrientationHTML(orientation: Orientation) {
        switch (orientation) {
            case Orientation.Horizontal:
                return `<span class="orientation-container">
                    ${site.data.strings.orientation.horizontal_icon}
                </span>`;
            case Orientation.Vertical:
                return `<span class="orientation-container">
                    ${site.data.strings.orientation.vertical_icon}
                </span>`;
        }
    }

    private getListItemValueFlipHTML(flip: boolean, orientation: Orientation) {
        const flip_class = (flip)? 'flipped' : '';
        switch (orientation) {
            case Orientation.Horizontal:
                return `<span class="flip-container ${flip_class}">
                    ${site.data.strings.orientation.horizontal_flip_icon}
                </span>`;
            case Orientation.Vertical:
                return `<span class="flip-container ${flip_class}">
                    ${site.data.strings.orientation.vertical_flip_icon}
                </span>`;
        }
    }

    private getSelectedPartHTML(form: string, part: string, selected_part: SpriteData, flip: boolean) {
        const orientation = selected_part.orientation;
        const flag_name = selected_part.flag_name;
        const id = this.getCurrentSelectedPartId(form, part);
        const orientationIcon = this.getListItemValueOrientationHTML(orientation);
        const flipIcon = this.getListItemValueFlipHTML(flip, orientation);

        let disabled = '';
        let aria_disabled = '';
        if (part == WHOLE_PART) {
            disabled = (!this._appData.currentSelectionShowWhole) ? 'disabled' : '';
            aria_disabled = (!this._appData.currentSelectionShowWhole) ? 'aria-disabled="true"' : '';
        }

        let flipButton = '';
        if (ENABLE_FLIP_FEATURE) {
            flipButton = `<button type="button" class="btn btn-link mx-2 current-selected-part-flip" data-form="${form}" data-part="${part}" data-flag-name="${flag_name}" data-orientation="${orientation}" data-flip="${flip}">
                <span class="flip_icon">${flipIcon}</span>
            </button>`;
        }

        return `<li class="list-group-item current-selected-part active form part flag_name ${disabled}" ${aria_disabled} data-form="${form}" data-part="${part}" data-flag-name="${flag_name}" data-orientation="${orientation}" data-flip="${flip}" id="${id}">
            <div class="row no-gutters">
                <div class="col-10 my-auto text-left"><span class="name mx-2">${flag_name}</span></div>
                <div class="col-1 my-auto text-right">
                    ${flipButton}
                </div>
                <div class="col-1 my-auto text-right">
                    <button type="button" class="btn btn-link mx-2 current-selected-part-orientation" data-form="${form}" data-part="${part}" data-flag-name="${flag_name}" data-orientation="${orientation}" data-flip="${flip}">
                        <span class="orientation_icon">${orientationIcon}</span>
                    </button>
                </div>
            </div>
        </li>`;
    }

    private async updateSelectedPartUI(form: string, part: string) {
        const sprite_data = this.getCurrentSelectedSprite(form, part) ?? this._sprite_data_helper.getDefaultSprite(form, part);
        const flip = this.getSelectedFlip(form, part) ?? false;

        if (sprite_data !== undefined) {
            $('#' + this.getCurrentSelectedPartId(form, part)).replaceWith(this.getSelectedPartHTML(form, part, sprite_data, flip));
            this.initSelectedPartEvents(form, part);
        }
    }

    private initSelectedPartEvents(form: string, part: string) {
        const id_selector = '#' + this.getCurrentSelectedPartId(form, part);

        var that = this;
        if (ENABLE_FLIP_FEATURE) {
            $(id_selector).find('.current-selected-part-flip').on('click', function() {
                const form = $(this).data('form');
                const part = $(this).data('part');
                const flag_name = $(this).data('flag-name');
                const orientation = $(this).data('orientation');

                const new_flip = that.setNewFlip(form, part, flag_name);
                const flipIcon = that.getListItemValueFlipHTML(new_flip, orientation);
                $(this).data('flip', new_flip);
                $(this).find('.flip_icon').html(flipIcon);
            });
        }
        $(id_selector).find('.current-selected-part-orientation').on('click', function() {
            const form = $(this).data('form');
            const part = $(this).data('part');
            const flag_name = $(this).data('flag-name');

            const new_orientation = that.setNewOrientation(form, part, flag_name);
            const orientationIcon = that.getListItemValueOrientationHTML(new_orientation);
            $(this).data('orientation', new_orientation);
            $(this).find('.orientation_icon').html(orientationIcon);
        });
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
            if (that._appData.currentSelectionForm !== form) {
                $(this).prop('disabled', true);

                that._appData.setForm(form);
                // enable button in observer handle

                // fallback enable button
                that._fallbackSetFormEnableButton = window.setTimeout(() => {
                    $(this).prop('disabled', false);
                    that._fallbackSetFormEnableButton = undefined;
                }, 10000);
            }
        });
    }

    private initEventSetParts() {
        var that = this;
        for (const part of this.parts_list) {
            this._parts_lists[part].on('updated', function (list) {
                const form = that._appData.currentSelectionForm;
                const selected_flag_name = that.getSelectedFlagName(form, part);

                list.items.forEach(function (it: any, index: number) {
                    const item = it.values() as PartsListItemValue;
                    const flag_name = item.flag_name;
                    const item_element = $(list.list).find(`[data-index="${index}"]`);

                    item_element.data('flag-name', flag_name);

                    //that.log.debug('list items forEach', flag_name, item_element);

                    const disable = part === WHOLE_PART && !that._appData.currentSelectionShowWhole;
                    item_element.attr('aria-disabled', disable.toString());
                    item_element.prop('disabled', disable);

                    item_element.removeClass('active');
                    if (selected_flag_name === flag_name) {
                        item_element.addClass('active');
                    }

                    item_element.off('click').on('click', function () {
                        const index = parseInt($(this).data('index'));
                        const item = list.get('index', index)[0];
                        const item_value = item.values() as PartsListItemValue;
                        const form = item_value.form;
                        const flag_name = item_value.flag_name;
                        const part = item_value.part;

                        that.log.debug('click item', {form, part, flag_name, item, item_value});

                        that.setNewPart(form, part, flag_name);

                        that._appData.lastFlag = flag_name;
                    });
                });
            });

            $('#' + FormPartsAdapter.getSelectFilterId(this.current_form, part)).select2({
                theme: "bootstrap4"
            }).off('select2:select').on('select2:select', function () {
                const part = $(this).data('part');
                const filter = $(this).val() as string ?? ALL_FILTER;
                that.log.debug('select filter', {part}, $(this).val());
                that._appData.setPartFilter(that.current_form, part, filter);
            });
        }

        $('#chbShowWholePart').on('change', function () {
            const value = $(this).is(":checked");
            that._appData.setShowWhole(value);
        });

        $('#' + FormPartsAdapter.getPartTabId(this.current_form)).on('shown.bs.tab', function (e) {
            const new_tab = $(e.target);
            const prev_tab = $(e.relatedTarget);

            new_tab.parent('.nav-item.border').addClass('border-light').removeClass('border-dark');
            prev_tab.parent('.nav-item.border').removeClass('border-light').addClass('border-dark');
        });
    }


    private setNewPart(form: string, part: string, flag_name: string) {
        const selectable_flags = this._sprite_data_helper.getSelectableSpritesFlag(form, part, flag_name).filter(it => it.flags_fits);
        const selectable_flag_horizontal = selectable_flags.find(it => it.orientation == Orientation.Horizontal);
        const selectable_flag_vertical = selectable_flags.find(it => it.orientation == Orientation.Vertical);
        const orientation = this.getSelectedOrientation(form, part) ?? Orientation.Vertical;
        let new_orientation = orientation;

        if (this.getSelectedFlagName(form, part) !== flag_name) {
            if (selectable_flag_horizontal && orientation === Orientation.Horizontal) {
                new_orientation = Orientation.Horizontal;
            } else if (selectable_flag_vertical && orientation === Orientation.Vertical) {
                new_orientation = Orientation.Vertical;
            } else if (selectable_flag_horizontal) {
                new_orientation = Orientation.Horizontal;
            } else if (selectable_flag_vertical) {
                new_orientation = Orientation.Vertical;
            }

            this._appData.setPart(form, part, flag_name, new_orientation);
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
                this._appData.setPart(form, part, flag_name, new_orientation);
            }
        }

        return new_orientation;
    }

    private setNewOrientation(form: string, part: string, flag_name: string) {
        const selectable_flags = this._sprite_data_helper.getSelectableSpritesFlag(form, part, flag_name).filter(it => it.flags_fits);
        const selectable_flag_horizontal = selectable_flags.find(it => it.orientation == Orientation.Horizontal);
        const selectable_flag_vertical = selectable_flags.find(it => it.orientation == Orientation.Vertical);
        const orientation = this.getSelectedOrientation(form, part) ?? Orientation.Vertical;
        let new_orientation = orientation;

        if (this.getSelectedFlagName(form, part) !== flag_name) {
            if (selectable_flag_horizontal && orientation === Orientation.Horizontal) {
                new_orientation = Orientation.Horizontal;
            } else if (selectable_flag_vertical && orientation === Orientation.Vertical) {
                new_orientation = Orientation.Vertical;
            } else if (selectable_flag_horizontal) {
                new_orientation = Orientation.Horizontal;
            } else if (selectable_flag_vertical) {
                new_orientation = Orientation.Vertical;
            }

            this._appData.setPartOrientation(form, part, new_orientation);
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
                this._appData.setPartOrientation(form, part, new_orientation);
            }
        }

        return new_orientation;
    }

    private setNewFlip(form: string, part: string, flag_name: string) {
        const flip = this.getSelectedFlip(form, part) ?? false;

        const new_flip = !flip;
        
        this._appData.setPartFlip(form, part, new_flip);

        return new_flip; 
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
