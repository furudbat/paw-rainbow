import { DataObserver, DataSubject } from './observer';
import { ApplicationData, CurrentSelection, CurrentSelectionPart } from "./application.data";
import { Orientation } from "./flags.data";
import { site } from "./site";
import { LoggerManager } from 'typescript-logger';

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

    public updateUI() {
        $('#btnSelectForm').empty();
        for (let form of site.data.flags_config.forms) {
            /// @TODO: use string names
            const form_name = form;
            const btn_class = (this._appData.currentSelection.form == form) ? 'btn-primary' : 'btn-secondary';
            const btn = `<button type="button" class="btn ${btn_class} btn-select-form" data-form="${form}">${form_name}</button>`;
            $('#btnSelectForm').append(btn);
        }

        $('#lstSelectContainer').empty();
        for (let part of this.parts_list) {
            const form_group = this.getSelectElement(this.current_form, part);
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
        const selected_part_orientation = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].orientation : Orientation.Vertical;
        const selected_part_flag_name = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].flag_name : this.default_flag_name;
        return this.selected_form_sprites.find(it => it.flag_name == selected_part_flag_name && it.orientation == selected_part_orientation);
    }

    public getSelectableParts(part: string) {
        return this.selected_form_sprites.filter(it => it.part == part);
    }

    public getSelectElement(form: string, part: string) {
        /// @TODO: use string names
        const part_name = part;
        const lstId = `lstSelect${part}`;
        const btnSelectOrientationHorizontalId = `btnSelectOrientationHorizontal${part}`;
        const btnSelectOrientationVerticalId = `btnSelectOrientationVertical${part}`;

        const selected_part_orientation = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].orientation : Orientation.Vertical;
        const selected_part_flag_name = (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].flag_name : this.default_flag_name;
        const selected_part = this.getSelectedPart(part);

        const selectable_parts = this.getSelectableParts(part);
        const selectable_horizontal_parts = selectable_parts.filter(it => it.orientation == Orientation.Horizontal);
        const selectable_vertical_parts = selectable_parts.filter(it => it.orientation == Orientation.Vertical);

        const select_orientation_horizontal_class = (selected_part_orientation == Orientation.Horizontal) ? 'btn-primary' : 'btn-outline-secondary';
        const select_orientation_vertical_class = (selected_part_orientation == Orientation.Vertical) ? 'btn-primary' : 'btn-outline-secondary';

        const select_orientation_horizontal_disabled = (selectable_horizontal_parts.find(it => it.flag_name == selected_part_flag_name && it.orientation == Orientation.Horizontal)) ? '' : 'disabled';
        const select_orientation_vertical_disabled = (selectable_vertical_parts.find(it => it.flag_name == selected_part_flag_name && it.orientation == Orientation.Vertical)) ? '' : 'disabled';

        let selectable_parts_flag_names = selectable_parts.map(it => it.flag_name);
        selectable_parts_flag_names = selectable_parts_flag_names.filter((element, i) => i === selectable_parts_flag_names.indexOf(element));
        let selects = '';
        for (let i = 0;i < selectable_parts_flag_names.length;i++) {
            const selectable_flag_name = selectable_parts_flag_names[i];
            const selected = (selectable_flag_name === selected_part_flag_name) ? 'selected' : '';
            selects += `<option class="select-part" value="${selectable_flag_name}" data-form="${form}" data-part="${part}" ${selected}>
                ${selectable_flag_name}
            </option>\n`;
        }

        /// @TODO: use URL builder
        const icon_filename = site.data.base_url + selected_part?.flag_filename;

        return `<div class="form-group">
            <label for="${lstId}">${part_name}</label>
            <div class="input-group">
                <div class="input-group-prepend text-center">
                    <img src="${icon_filename}" class="img-fluid clickable-flag select-part-icon" data-form="${form}" data-part="${part}" data-flag-name="${selected_part?.flag_name}" alt="Selected Icon ${selected_part?.flag_name}">
                </div>
                <select id="${lstId}" class="custom-select select-parts" data-form="${form}" data-part="${part}">
                    ${selects}
                </select>
                <div class="input-group-append">
                    <button class="btn ${select_orientation_vertical_class} select-orientation select-orientation-vertical" type="button" data-form="${form}" data-part="${part}" data-orientation="${Orientation.Vertical}" id="${btnSelectOrientationVerticalId}" ${select_orientation_vertical_disabled}>
                        <i class="fas fa-image"></i>
                        <span class="sr-only">Select Vertical</span>
                    </button>
                    <button class="btn ${select_orientation_horizontal_class} select-orientation select-orientation-horizontal" type="button" data-form="${form}" data-part="${part}" data-orientation="${Orientation.Horizontal}" id="${btnSelectOrientationHorizontalId}" ${select_orientation_horizontal_disabled}>
                        <i class="fas fa-image" data-fa-transform="rotate-90"></i>
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

        const updateOrientation = function(selected_flag_name: string, form: string, part: string){
            const selected_part = that.getSelectedPart(part);

            const selectable_parts = that.getSelectableParts(part);
            $('.select-orientation').each(function () {
                const btn_form = $(this).data('form');
                const btn_part = $(this).data('part');
                const btn_orientation = $(this).data('orientation');

                if (btn_form == form && btn_part == part) {
                    const select_orientation_horizontal_class = (selected_part?.orientation == Orientation.Horizontal) ? 'btn-primary' : 'btn-outline-secondary';
                    const select_orientation_vertical_class = (selected_part?.orientation == Orientation.Vertical) ? 'btn-primary' : 'btn-outline-secondary';
                    const select_orientation_horizontal_disabled = selectable_parts.find(it => it.flag_name == selected_flag_name && it.orientation == Orientation.Horizontal) === undefined;
                    const select_orientation_vertical_disabled = selectable_parts.find(it => it.flag_name == selected_flag_name && it.orientation == Orientation.Vertical) === undefined;

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

        $('.select-parts').off('change').on('change', function () {
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

        $('.select-orientation').off('click').on('click', function () {
            const form = $(this).data('form');
            const part = $(this).data('part');
            const orientation = $(this).data('orientation');

            that._appData.setPartOrientation(part, orientation);
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