import { DataObserver, DataSubject } from './observer';
import { ApplicationData, CurrentSelection, CurrentSelectionPart } from "./application.data";
import { Orientation } from "./flags.data";
import { site } from "./site";
import { LoggerManager } from 'typescript-logger';
import { isRegExp } from 'util';

export class FormPartsAdapter {
    private _appData: ApplicationData;

    private log = LoggerManager.create('FormPartsAdapter');

    constructor(appData: ApplicationData) {
        this._appData = appData;
    }

    public init() {
        this.initObservers();
    }

    private initObservers() {
        var that = this;
        this._appData.currentSelectionObservable.attach(new class implements DataObserver<CurrentSelection>{
            update(subject: DataSubject<CurrentSelection>): void {
                //that.updateUI();
            }
        });
    }


    public setForm(form: string) {
        this._appData.currentSelection.form = form;
        this.log.debug('setForm', form, this._appData.currentSelection.parts);
        for (let part of this.parts_list) {
            if (this._appData.currentSelection.parts && !(part in this._appData.currentSelection.parts)) {
                this._appData.currentSelection.parts[part] = new CurrentSelectionPart();
                if (this.default_flag_name) {
                    this._appData.currentSelection.parts[part].flag_name = this.default_flag_name;
                }
            }
        }
        this._appData.currentSelection = this._appData.currentSelection;
        this.updateUI();
    }

    get current_form() {
        return this._appData.currentSelection.form;
    }

    get parts_list() {
        return FormPartsAdapter.getUnsafeProperty(site.data.flags_config, this.current_form).parts;
    }

    get filter_list() {
        let filters = ['all'];
        return filters.concat(site.data.flags_config.categories);
    }

    public updateUI() {
        $('#btnSelectForm').empty();
        for (let form of site.data.flags_config.forms) {
            const form_name = site.data.strings.select_form[form];
            const btn_class = (this._appData.currentSelection.form == form) ? 'btn-primary' : 'btn-secondary';
            const btn = `<button type="button" class="btn ${btn_class} btn-select-form" data-form="${form}">${form_name}</button>`;
            $('#btnSelectForm').append(btn);
        }

        $('#lstSelectContainer').empty();
        for (let part of this.parts_list) {
            const form_group = this.renderSelectElement(this.current_form, part);
            $('#lstSelectContainer').append(form_group);
        }

        this.initEvents();
    }

    get default_flag_name() {
        return site.data.sprites.find(it => it.default)?.flag_name ?? 'None';
    }

    get selected_form_sprites() {
        return site.data.sprites.filter(it => it.form == this.current_form && (it.mask === undefined || !it.mask));
    }

    public getSelectedPart(part: string) {
        const selected_part_orientation = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].orientation : undefined;
        const selected_part_flag_name = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].flag_name : undefined;
        return this.selected_form_sprites.find(it => it.flag_name === selected_part_flag_name && it.orientation === selected_part_orientation);
    }

    public getSelectableParts(part: string) {
        return this.selected_form_sprites.filter(it => it.part == part);
    }

    public getListId(form: string, part: string) {
        return `lstSelect${form}${part}`;
    }

    public renderSelectElement(form: string, part: string) {
        const part_name = site.data.strings.select_parts[part];
        const lstId = this.getListId(form, part);
        const btnSelectOrientationHorizontalId = `btnSelectOrientationHorizontal${part}`;
        const btnSelectOrientationVerticalId = `btnSelectOrientationVertical${part}`;

        const selected_part_filter = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].filter : 'All';
        const selected_part_orientation = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].orientation : Orientation.Vertical;
        const selected_part_flag_name = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].flag_name : this.default_flag_name;
        const selected_part = this.getSelectedPart(part);

        const selectable_parts = this.getSelectableParts(part);
        const selectable_horizontal_parts = selectable_parts.filter(it => it.orientation == Orientation.Horizontal);
        const selectable_vertical_parts = selectable_parts.filter(it => it.orientation == Orientation.Vertical);

        const select_orientation_horizontal_class = (selected_part_orientation === Orientation.Horizontal) ? 'btn-primary' : 'btn-outline-secondary';
        const select_orientation_vertical_class = (selected_part_orientation === Orientation.Vertical) ? 'btn-primary' : 'btn-outline-secondary';
        const select_orientation_horizontal_disabled = (selectable_horizontal_parts.find(it => it.flag_name === selected_part_flag_name && it.orientation === Orientation.Horizontal && it.flags_fits)) ? '' : 'disabled';
        const select_orientation_vertical_disabled = (selectable_vertical_parts.find(it => it.flag_name === selected_part_flag_name && it.orientation === Orientation.Vertical && it.flags_fits)) ? '' : 'disabled';


        let filters = '';
        for (let filter of this.filter_list) {
            const filter_name = site.data.strings.select_filter[filter];
            const selected = (selected_part_filter === filter) ? 'selected' : '';
            filters += `<option class="select-part" value="${filter}" data-form="${form}" data-part="${part}" ${selected}>
                ${filter_name}
            </option>\n`;
        }

        let selectable_parts_flag_names = selectable_parts.filter(it => it.default || selected_part_filter === 'All' || selected_part_filter === it.category).map(it => it.flag_name);
        selectable_parts_flag_names = selectable_parts_flag_names.filter((element, i) => i === selectable_parts_flag_names.indexOf(element));
        let selects = '';
        for (let selectable_flag_name of selectable_parts_flag_names) {
            const selected = (selectable_flag_name === selected_part_flag_name) ? 'selected' : '';

            selects += `<option class="select-part" value="${selectable_flag_name}" data-form="${form}" data-part="${part}" ${selected}>
                ${selectable_flag_name}
            </option>\n`;
        }

        /// @TODO: use URL builder
        const icon_filename = site.data.base_url + selected_part?.flag_filename;

        return `<div class="form-group">
            <label for="${lstId}" class="select-part-label">${part_name}</label>
            <div class="input-group">
                <div class="input-group-prepend text-center">
                    <img src="${icon_filename}" class="img-fluid clickable-flag select-part-icon flag-item-icon" data-form="${form}" data-part="${part}" data-flag-name="${selected_part?.flag_name}" alt="Selected Icon ${selected_part?.flag_name}">
                </div>
                <select id="${lstId}Filter" class="custom-select select-part-filter" data-form="${form}" data-part="${part}" data-list-id="${lstId}">
                    ${filters}
                </select>
                <select id="${lstId}" class="custom-select select-part" data-form="${form}" data-part="${part}" data-list-id="${lstId}">
                    ${selects}
                </select>
                <div class="input-group-append">
                    <button class="btn ${select_orientation_vertical_class} select-part-orientation select-part-orientation-vertical" type="button" data-form="${form}" data-part="${part}" data-orientation="${Orientation.Vertical}" data-list-id="${lstId}" id="${btnSelectOrientationVerticalId}" ${select_orientation_vertical_disabled}>
                        <i class="fas fa-bars"></i>
                        <span class="sr-only">Select Vertical</span>
                    </button>
                    <button class="btn ${select_orientation_horizontal_class} select-part-orientation select-part-orientation-horizontal" type="button" data-form="${form}" data-part="${part}" data-orientation="${Orientation.Horizontal}" data-list-id="${lstId}" id="${btnSelectOrientationHorizontalId}" ${select_orientation_horizontal_disabled}>
                        <i class="fas fa-bars" data-fa-transform="rotate-90"></i>
                        <span class="sr-only">Select Horizontal</span>
                    </button>
                </div>
            </div>
        </div>`;
    }

    private initEvents() {
        var that = this;
        $('.btn-select-form').off('click').on('click', function () {
            const form = $(this).data('form');
            that.setForm(form);
        });

        const updateOrientation = function(selected_flag_name: string, form: string, part: string) {
            const selectable_parts = that.getSelectableParts(part);
            const selected_part = that.getSelectedPart(part);

            $('.select-part-orientation').each(function () {
                const btn_form = $(this).data('form');
                const btn_part = $(this).data('part');
                const btn_orientation = $(this).data('orientation');

                if (btn_form == form && btn_part == part) {
                    const select_orientation_horizontal_class = (selected_part?.orientation == Orientation.Horizontal) ? 'btn-primary' : 'btn-outline-secondary';
                    const select_orientation_vertical_class = (selected_part?.orientation == Orientation.Vertical) ? 'btn-primary' : 'btn-outline-secondary';
                    const select_orientation_horizontal_disabled = selectable_parts.find(it => it.flag_name === selected_flag_name && it.orientation === Orientation.Horizontal && it.flags_fits) === undefined;
                    const select_orientation_vertical_disabled = selectable_parts.find(it => it.flag_name === selected_flag_name && it.orientation === Orientation.Vertical && it.flags_fits) === undefined;

                    $(this).removeClass('btn-primary').removeClass('btn-outline-secondary');

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

        $('.select-part').off('change').on('change', function () {
            const selected_flag_name = $(this).val() as string;
            const form = $(this).data('form');
            const part = $(this).data('part');

            that.log.debug('initEvents select-parts change', that._appData.currentSelection);

            that._appData.setPartFlagName(part, selected_flag_name);

            /// @TODO: use URL builder
            const selected_part = that.getSelectedPart(part);
            const icon_filename = site.data.base_url + selected_part?.flag_filename;

            $('.select-part-icon').each(function () {
                const icon_form = $(this).data('form');
                const icon_part = $(this).data('part');

                if (icon_form == form && icon_part == part) {
                    $(this).data('flag-name', selected_part?.flag_name ?? '');
                    $(this).attr('src', icon_filename);
                }
            });

            updateOrientation(selected_flag_name, form, part);
        });

        $('.select-part-filter').off('change').on('change', function () {
            const filter = $(this).val() as string;
            const form = $(this).data('form');
            const part = $(this).data('part');
            const listId = that.getListId(form, part);

            that._appData.setPartFilter(part, filter);

            that.updateUI();
        });

        $('.select-part-orientation').off('click').on('click', function () {
            const form = $(this).data('form');
            const part = $(this).data('part');
            const orientation = $(this).data('orientation');
            const listId = that.getListId(form, part);
            const selected_flag_name = $(`#${listId}`).find('.select-part').val() as string;

            that._appData.setPartOrientation(part, orientation);

            updateOrientation(selected_flag_name, form, part);
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