import { ApplicationData, CurrentSelection } from "./data/application.data";
import { Orientation, SpriteData } from "./data/sprite.data";
import { site } from "./site";
import { LoggerManager } from 'typescript-logger';
import { DataObserver, DataSubject } from './observer';
import 'select2';

const FLAG_NAME_NONE_DEFAULT = 'None';

export class FormPartsAdapter {
    private _appData: ApplicationData;
    private _cacheSpriteMetaData: Record<string, SpriteData[]> = {};
    private _cacheFlagNames: Record<string, string> = {};

    private log = LoggerManager.create('FormPartsAdapter');

    private readonly DEFAULT_FLAG_NAME_KEY = 'default_flag_name';
    private readonly SELECTED_FORM_SPRITES_KEY = 'selected_form_sprites';
    private readonly MASK_SPRITE_KEY = 'mask_sprite';
    private readonly DEFAULT_SPRITE_KEY = 'default_sprite';
    private readonly SELECTED_PART_KEY = 'selected_part';
    private readonly SELECTABLE_PARTS_KEY = 'selectable_parts';

    constructor(appData: ApplicationData) {
        this._appData = appData;
    }

    public init() {
        this.initObservers();

        if (!this.current_form) {
            this._appData.setForm(site.data.flags_config.forms[0], this.parts_list, this.default_flag_name);
        } else {
            this.updateUI();
        }
    }

    private initObservers() {
        var that = this;
        this._appData.currentSelectionObservable.attach(new class implements DataObserver<CurrentSelection>{
            update(subject: DataSubject<CurrentSelection>): void {
                that.updateUI();
            }
        });
    }

    public updateUI() {
        this.updateUISetForm();
        this.updateUISetParts();
    }

    get current_form() {
        return this._appData.currentSelection.form;
    }

    get parts_list() {
        return FormPartsAdapter.getUnsafeProperty(site.data.flags_config, this.current_form).parts;
    }

    get filter_list() {
        return site.data.flags_config.categories;
    }

    get default_flag_name() {
        if (this.DEFAULT_FLAG_NAME_KEY in this._cacheFlagNames) {
            return this._cacheFlagNames[this.DEFAULT_FLAG_NAME_KEY];
        }
        
        const ret = site.data.sprites.find(it => it.default)?.flag_name ?? FLAG_NAME_NONE_DEFAULT;
        this._cacheFlagNames[this.DEFAULT_FLAG_NAME_KEY] = ret;
        return ret;
    }

    get selected_form_sprites() {
        if (this.SELECTED_FORM_SPRITES_KEY in this._cacheSpriteMetaData) {
            return this._cacheSpriteMetaData[this.SELECTED_FORM_SPRITES_KEY];
        }
        
        const ret = site.data.sprites.filter(it => it.form == this.current_form && (it.mask === undefined || !it.mask));
        this._cacheSpriteMetaData[this.SELECTED_FORM_SPRITES_KEY] = ret;
        return ret;
    }

    get mask_sprite() {
        if (this.MASK_SPRITE_KEY in this._cacheSpriteMetaData && this._cacheSpriteMetaData[this.MASK_SPRITE_KEY].length > 0) {
            return this._cacheSpriteMetaData[this.MASK_SPRITE_KEY][0];
        }
        
        const ret = site.data.sprites.filter(it => it.form == this.current_form && it.mask !== undefined);
        this._cacheSpriteMetaData[this.MASK_SPRITE_KEY] = ret;
        return (ret.length)? ret[0] : undefined;
    }

    get default_sprite() {
        if (this.DEFAULT_SPRITE_KEY in this._cacheSpriteMetaData && this._cacheSpriteMetaData[this.DEFAULT_SPRITE_KEY].length > 0) {
            return this._cacheSpriteMetaData[this.DEFAULT_SPRITE_KEY][0];
        }
        
        const ret = site.data.sprites.filter(it => it.form == this.current_form && it.default !== undefined);
        this._cacheSpriteMetaData[this.DEFAULT_SPRITE_KEY] = ret;
        return (ret.length)? ret[0] : undefined;
    }

    public getSelectedPart(part: string) {
        const selected_part_orientation = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].orientation : undefined;
        const selected_part_flag_name = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].flag_name : undefined;
        if (selected_part_orientation === undefined || selected_part_flag_name === undefined) {
            return undefined;
        }
        const key = `${this.SELECTED_PART_KEY}_${selected_part_flag_name}_${selected_part_orientation}`;

        if (key in this._cacheSpriteMetaData && this._cacheSpriteMetaData[key].length > 0) {
            return this._cacheSpriteMetaData[key][0];
        }
        
        const ret = this.selected_form_sprites.filter(it => it.flag_name === selected_part_flag_name && it.orientation === selected_part_orientation && it.part === part);
        this._cacheSpriteMetaData[key] = ret;
        return (ret.length)? ret[0] : undefined;
    }

    public getSelectableParts(part: string) {
        const key = `${this.SELECTABLE_PARTS_KEY}_${part}`;

        if (key in this._cacheSpriteMetaData) {
            return this._cacheSpriteMetaData[key];
        }
        
        const ret = this.selected_form_sprites.filter(it => it.part == part).sort((a, b) => {  
            if (a.flag_name > b.flag_name) { return -1; }  
            if (a.flag_name < b.flag_name) { return 1; }  
            return 0;  
        }).reverse();
        this._cacheSpriteMetaData[key] = ret;
        return ret;
    }

    public getListId(form: string, part: string) {
        return `lstSelect${form}${part}`;
    }

    public getIconURL(sprite_data: SpriteData) {
        /// @TODO: use URL builder
        return site.base_url + sprite_data.filename;
    }

    public getSelectedOrientation(part: string) {
        return (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].orientation : Orientation.Vertical;
    }

    public getSelectedFlagName(part: string) {
        return (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].flag_name : this.default_flag_name;
    }


    private async updateUISetForm() {
        $('#btnSelectForm').empty();
        for (const form of site.data.flags_config.forms) {
            const form_name = site.data.strings.select_form[form];
            const btn_class = (this._appData.currentSelection.form == form) ? 'btn-primary' : 'btn-secondary';
            const btn = `<button type="button" class="btn ${btn_class} btn-select-form" data-form="${form}">${form_name}</button>`;
            $('#btnSelectForm').append(btn);
        }

        this.initEventSetForm();
    }

    private async updateUISetParts() {
        var that = this;
        const formGroupGenerator = function*() {
            for (const part of that.parts_list) {
                yield that.renderSelectElement(that.current_form, part, false);
            }
        }

        const formGroupIter = formGroupGenerator();
        $('#lstSelectContainer').empty();
        while (true) {
            const formGroupIt = formGroupIter.next();
            this.log.debug('updateUI formGroupGenerator', formGroupIt);
            if (formGroupIt.done) {
                break;
            }
            $('#lstSelectContainer').append(formGroupIt.value);
        }

        $('#lstSelectContainer').find('.select-part').each(function() {
            //const selected_flag_name = $(this).val() as string;
            //const form = $(this).data('form');

            const part = $(this).data('part');
            const label = site.data.strings.select_parts[part];
            $(this).select2({
                theme: 'bootstrap4',
                placeholder: label
            });
        });

        this.initEventsSetParts();
    }

    private renderSelectElement(form: string, part: string, show_label: boolean = true) {
        const part_name = site.data.strings.select_parts[part];
        const lstId = this.getListId(form, part);
        const btnSelectOrientationHorizontalId = `btnSelectOrientationHorizontal${part}`;
        const btnSelectOrientationVerticalId = `btnSelectOrientationVertical${part}`;

        const selected_part = this.getSelectedPart(part);
        const selected_part_orientation = this.getSelectedOrientation(part);
        const selected_part_flag_name = this.getSelectedFlagName(part);

        const selectable_parts = this.getSelectableParts(part).filter(it => it.flags_fits);
        const selectable_horizontal_parts = selectable_parts.filter(it => it.orientation == Orientation.Horizontal);
        const selectable_vertical_parts = selectable_parts.filter(it => it.orientation == Orientation.Vertical);

        const select_orientation_horizontal_class = (selected_part_orientation === Orientation.Horizontal) ? 'btn-primary' : 'btn-outline-secondary';
        const select_orientation_vertical_class = (selected_part_orientation === Orientation.Vertical) ? 'btn-primary' : 'btn-outline-secondary';
        const select_orientation_horizontal_disabled = (selectable_horizontal_parts.find(it => it.flag_name === selected_part_flag_name && it.orientation === Orientation.Horizontal && it.flags_fits)) ? '' : 'disabled';
        const select_orientation_vertical_disabled = (selectable_vertical_parts.find(it => it.flag_name === selected_part_flag_name && it.orientation === Orientation.Vertical && it.flags_fits)) ? '' : 'disabled';

        let selects = '';
        for (const filter of this.filter_list) {
            const filter_name = site.data.strings.select_filter[filter];
            selects += `<optgroup class="select-part" value="${filter}" data-form="${form}" data-part="${part}" label="${filter_name}">\n`;

            let selectable_parts_flag_names = selectable_parts.filter(it => filter === it.category).map(it => it.flag_name);
            selectable_parts_flag_names = selectable_parts_flag_names.filter((element, i) => i === selectable_parts_flag_names.indexOf(element));
            
            for (const selectable_flag_name of selectable_parts_flag_names) {
                const selected = (selectable_flag_name === selected_part_flag_name) ? 'selected' : '';

                selects += `<option class="select-part" value="${selectable_flag_name}" data-form="${form}" data-part="${part}" ${selected}>
                    ${selectable_flag_name}
                </option>\n`;
            }

            selects += `</optgroup>\n`;
        }

        /// @TODO: use URL builder
        const icon_filename = (selected_part !== undefined)? this.getIconURL(selected_part) : '';

        const label = (show_label)? `<label for="${lstId}" class="select-part-label">${part_name}</label>` : '';
        return `<div class="form-group">
            ${label}
            <div class="input-group">
                <div class="input-group-prepend select-part-icon-container d-flex align-items-center justify-content-center" data-form="${form}" data-part="${part}" data-flag-name="${selected_part?.flag_name}">
                    <img src="${icon_filename}" class="img-fluid clickable-flag select-part-icon flag-item-icon" data-form="${form}" data-part="${part}" data-flag-name="${selected_part?.flag_name}" alt="Selected Icon ${selected_part?.flag_name}">
                </div>
                <select id="${lstId}" class="custom-select select-part" data-form="${form}" data-part="${part}" data-list-id="${lstId}">
                    ${selects}
                </select>
                <div class="input-group-append">
                    <button class="btn ${select_orientation_vertical_class} select-part-orientation select-part-orientation-vertical" type="button" data-form="${form}" data-part="${part}" data-orientation="${Orientation.Vertical}" data-list-id="${lstId}" data-flag-name="${selected_part_flag_name}" id="${btnSelectOrientationVerticalId}" ${select_orientation_vertical_disabled}>
                        <i class="fas fa-bars" data-fa-transform="rotate-90"></i>
                        <span class="sr-only">Select Vertical</span>
                    </button>
                    <button class="btn ${select_orientation_horizontal_class} select-part-orientation select-part-orientation-horizontal" type="button" data-form="${form}" data-part="${part}" data-orientation="${Orientation.Horizontal}" data-list-id="${lstId}" data-flag-name="${selected_part_flag_name}" id="${btnSelectOrientationHorizontalId}" ${select_orientation_horizontal_disabled}>
                        <i class="fas fa-bars"></i>
                        <span class="sr-only">Select Horizontal</span>
                    </button>
                </div>
            </div>
        </div>`;
    }

    private initEventSetForm() {
        var that = this;
        $('.btn-select-form').off('click').on('click', function () {
            const form = $(this).data('form');
            $(this).prop('disabled', true);

            that._appData.setForm(form, that.parts_list, that.default_flag_name);

            $(this).prop('disabled', false);
        });

    }

    private initEventsSetParts() {
        var that = this;
        const updateOrientation = async function (selected_flag_name: string, orientation: string, form: string, part: string) {
            const selectable_parts = that.getSelectableParts(part);
            const selectable_horizontal_parts = selectable_parts.filter(it => it.orientation == Orientation.Horizontal);
            const selectable_vertical_parts = selectable_parts.filter(it => it.orientation == Orientation.Vertical);

            $('.select-part-orientation').each(function () {
                const btn_form = $(this).data('form');
                const btn_part = $(this).data('part');
                const btn_orientation = $(this).data('orientation');

                if (btn_form == form && btn_part == part) {
                    const select_orientation_horizontal_class = (orientation === Orientation.Horizontal) ? 'btn-primary' : 'btn-outline-secondary';
                    const select_orientation_vertical_class = (orientation === Orientation.Vertical) ? 'btn-primary' : 'btn-outline-secondary';
                    const select_orientation_horizontal_disabled = selectable_horizontal_parts.find(it => it.flag_name === selected_flag_name && it.orientation === Orientation.Horizontal && it.flags_fits) === undefined;
                    const select_orientation_vertical_disabled = selectable_vertical_parts.find(it => it.flag_name === selected_flag_name && it.orientation === Orientation.Vertical && it.flags_fits) === undefined;

                    $(this).removeClass('btn-primary').removeClass('btn-outline-secondary');

                    $(this).data('flag-name', selected_flag_name);
                    switch (btn_orientation) {
                        case Orientation.Horizontal:
                            $(this).addClass(select_orientation_horizontal_class);
                            $(this).prop('disabled', select_orientation_horizontal_disabled);
                            break;
                        case Orientation.Vertical:
                            $(this).addClass(select_orientation_vertical_class);
                            $(this).prop('disabled', select_orientation_vertical_disabled);
                            break;
                    }
                }
            });
        }

        $('.select-part').off('select2:select').on('select2:select', function () {
            const selected_flag_name = $(this).val() as string;
            const form = $(this).data('form');
            const part = $(this).data('part');

            that._appData.setPartFlagName(part, selected_flag_name);
            if (selected_flag_name) {
                that._appData.lastFlag = selected_flag_name;
            }

            const selected_part = that.getSelectedPart(part);
            const selected_orientation = that.getSelectedOrientation(part);
            const icon_filename = (selected_part)? that.getIconURL(selected_part) : '';

            $('.select-part-icon').each(function () {
                const icon_form = $(this).data('form');
                const icon_part = $(this).data('part');

                if (icon_form == form && icon_part == part) {
                    $(this).data('flag-name', selected_part?.flag_name ?? '');
                    $(this).attr('src', icon_filename);
                }
            });
            $('.select-part-icon-container').each(function () {
                const icon_form = $(this).data('form');
                const icon_part = $(this).data('part');

                if (icon_form == form && icon_part == part) {
                    $(this).data('flag-name', selected_part?.flag_name ?? '');
                }
            });

            updateOrientation(selected_flag_name, selected_orientation, form, part);

        });

        $('.select-part-orientation').off('click').on('click', function () {
            const form = $(this).data('form');
            const part = $(this).data('part');
            const orientation = $(this).data('orientation');
            const selected_flag_name = $(this).data('flag-name');

            that._appData.setPartOrientation(part, orientation);

            updateOrientation(selected_flag_name, orientation, form, part);
        });

        $('.select-part-icon-container').off('click').on('click', function() {
            //const form = $(this).data('form');
            //const part = $(this).data('part');
            //const orientation = $(this).data('orientation');
            const selected_flag_name = $(this).data('flag-name');
            if (selected_flag_name) {
                that._appData.lastFlag = selected_flag_name;
            }
        });
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