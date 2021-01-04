import { ApplicationData, CurrentSelection } from "./data/application.data";
import { Orientation, SpriteData } from "./data/sprite.data";
import { site } from "./site";
import { LoggerManager } from 'typescript-logger';
import { DataObserver, DataSubject } from './observer';
import { AnyFlagConfig } from './data/flag-config.data';
import { FlagData } from "./data/flag.data";

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
        return (FormPartsAdapter.hasProperty(site.data.flags_config, this.current_form))? (FormPartsAdapter.getUnsafeProperty(site.data.flags_config, this.current_form) as AnyFlagConfig).parts : [];
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
        return (ret.length) ? ret[0] : undefined;
    }

    get default_sprite() {
        if (this.DEFAULT_SPRITE_KEY in this._cacheSpriteMetaData && this._cacheSpriteMetaData[this.DEFAULT_SPRITE_KEY].length > 0) {
            return this._cacheSpriteMetaData[this.DEFAULT_SPRITE_KEY][0];
        }

        const ret = site.data.sprites.filter(it => it.form == this.current_form && it.default !== undefined);
        this._cacheSpriteMetaData[this.DEFAULT_SPRITE_KEY] = ret;
        return (ret.length) ? ret[0] : undefined;
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
        return (ret.length) ? ret[0] : undefined;
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

    private getIconImgHTML(flag_info: FlagData, classstr: string = '') {
        const src = `${site.base_url}/${flag_info.filename}`;

        let srcset_arr: string[] = [];
        for (const key in flag_info.filename_set) {
            const filename = flag_info.filename_set[key];
            srcset_arr.push(`${site.base_url}/${filename} ${key}`);
        }
        const srcset = srcset_arr.join(',');

        return `<img srcset="${srcset}" class="img-fluid ${classstr}" src="${src}" alt="${flag_info.name} Icon">`;
    }

    private getSelectedOrientation(part: string) {
        return (part in this._appData.currentSelection.parts) ? this._appData.currentSelection.parts[part].orientation : Orientation.Vertical;
    }

    private async updateUISetForm() {
        $('#btnSelectForm').empty();
        for (const form of site.data.flags_config.forms) {
            const form_name = site.data.strings.select_form[form];
            const btn_class = (this._appData.currentSelection.form == form) ? 'btn-primary active' : 'btn-secondary';
            const btn = `<button type="button" class="btn ${btn_class} btn-select-form" data-form="${form}">${form_name}</button>`;
            $('#btnSelectForm').append(btn);
        }

        this.initEventSetForm();
    }

    private async updateUISetParts() {
        $('#lstSelectContainer').empty().html(this.getSelectablePartsHTML(this._appData.currentSelection.form));

        this.initEventSetParts();
    }

    private getSelectablePartsHTML(form: string) {
        const nav_tabs_id = `nav-tab-${form}-parts`;
        const nav_tab_content_id = `nav-tab-${form}-parts-tabContent`;
        const parts = this.parts_list;

        const get_nav_link_id = (part: string) => `nav-parts-${part}`;
        const get_nav_link_tab_id = (part: string) => `nav-parts-${part}-tab`;

        let nav_links = '';
        let tab_content_content = '';
        for (const part of parts) {
            const part_label = site.data.strings.select_parts[part] ?? site.data.strings.select_parts.unknown;
            const selected = part == 'whole';
            const active = (part == 'whole') ? 'show active' : '';
            const content = this.getSelectablePartsListHTML(form, part);

            const nav_link_id = get_nav_link_id(part);
            const nav_link_tab_id = get_nav_link_tab_id(part);

            nav_links += `<a class="nav-link" id="nav-parts-${part}-tab" data-toggle="tab" href="#${nav_link_id}" role="tab" aria-controls="${nav_link_id}" aria-selected="${selected}">
                ${part_label}
            </a>\n`;

            tab_content_content += `<div class="tab-pane fade ${active}" id="${nav_link_id}" role="tabpanel" aria-labelledby="${nav_link_tab_id}">
                ${content}
            </div>\n`;
        }


        const nav_tabs = `<div class="nav nav-tabs" id="${nav_tabs_id}" role="tablist">
            ${nav_links}
        <div>`;

        return `<nav>
                    ${nav_tabs}
                </nav>
                <div class="tab-content" id="${nav_tab_content_id}">
                    ${tab_content_content}
                </div>`;
    }

    private getSelectablePartsListHTML(form: string, part: string) {
        var that = this;

        const removeDuplicateObjectFromArray = function (array: any[], key: string) {
            let check = new Set();
            return array.filter(obj => !check.has(obj[key]) && check.add(obj[key]));
        }

        let selectable_parts = that.getSelectableParts(part).filter(it => it.flags_fits);
        selectable_parts = removeDuplicateObjectFromArray(selectable_parts, 'flag_name');
        const orientation = that.getSelectedOrientation(part);

        let list_elements: string[] = [];
        for (const selectable_part of selectable_parts) {
            const flag_info = site.data.flags.find(it => it.name == selectable_part.flag_name);
            if (flag_info !== undefined) {
                const active = selectable_part.flag_name === ((part in that._appData.currentSelection.parts) ? that._appData.currentSelection.parts[part].flag_name : undefined);
                list_elements.push(that.getListItemHTML(that.current_form, part, flag_info, orientation, active));
            }
        }
        const list_elements_str = list_elements.join('\n');

        const id = this.getListId(form, part);
        return `<div class="list-group">
            ${list_elements_str}
        </div>`;
    }

    private getListItemHTML(form: string, part: string, flag_info: FlagData, orientation: Orientation, active: boolean = false) {
        const icon = (flag_info !== undefined) ? this.getIconImgHTML(flag_info) : '';

        let orientationIcon = '';
        switch (orientation) {
            case Orientation.Horizontal:
                orientationIcon = `<i class="fas fa-bars"></i><span class="sr-only">${site.data.strings.orientation.horizontal}</span>`;
                break;
            case Orientation.Vertical:
                orientationIcon = `<i class="fas fa-bars fa-rotate-90"></i><span class="sr-only">${site.data.strings.orientation.vertical}</span>`;
                break;
        }

        const list_active = (active) ? 'active' : '';

        return `<button type="button" class="list-group-item list-group-item-action ${list_active}" data-form="${form}" data-part="${part}" data-flag-name="${flag_info.name}">
            <div class="row no-gutters">
                <div class="col-2 pr-2 part-list-item-icon">${icon}</div>
                <div class="col-8 mt-1 align-middle part-list-item-name">${flag_info.name}</div>
                <div class="col-2 mt-1 px-2 text-right align-middle part-list-item-orientation">${orientationIcon}</div>
            </div>
        </button>`;
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

    private initEventSetParts() {

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