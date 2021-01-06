import { DataListSubject } from './../../_site/src/observer';
import localForage from "localforage";
import { DataSubject } from "../observer";
import { site } from "../site";
import { Orientation } from "./sprite.data";
import { AnyFlagConfig } from './flag-config.data';

const STORAGE_KEY_SETTINGS = 'settings';
const STORAGE_KEY_THEME = 'theme';
const STORAGE_KEY_VERSION = 'version';
const STORAGE_KEY_CURRENT_SELECTION_FORM = 'current_selection_form';
const STORAGE_KEY_CURRENT_SELECTION_SHOW_WHOLE = 'current_selection_show_whole';
const STORAGE_KEY_CURRENT_SELECTION_PART = 'current_selection_part';
const STORAGE_KEY_CURRENT_SELECTION_PART_FILTER = 'current_selection_part_filter';
const STORAGE_KEY_LAST_FLAG = 'last_flag';

export const DEFAULT_FLAG_NAME_NONE = 'None';
export const ALL_FILTER = 'all';
export const WHOLE_PART = 'whole';

export enum Theme {
    Light = "light",
    Dark = "dark"
}
export class Settings {
    show_grid: boolean = false
}

export class CurrentSelectionPart {
    flag_name: string = DEFAULT_FLAG_NAME_NONE;
    orientation: Orientation = Orientation.Vertical;
}
export class ApplicationData {

    private _settings: DataSubject<Settings> = new DataSubject<Settings>(new Settings());
    private _theme: Theme = Theme.Dark;
    private _version: string = site.version;
    private _currentSelectionForm: DataSubject<string> = new DataSubject<string>('');
    private _currentSelectionShowWhole: DataSubject<boolean> = new DataSubject<boolean>(false);
    private _currentSelectionPartsFilter: Record<string, Record<string, DataSubject<string>>> = {};
    private _currentSelectionParts: Record<string, Record<string, DataSubject<CurrentSelectionPart>>> = {};
    private _lastFlag: DataSubject<string> = new DataSubject<string>('');

    private _storeSession = localForage.createInstance({
        name: "session"
    });

    private static getStorageKeyCurrentSelectionPart(form: string, part: string) {
        return `${STORAGE_KEY_CURRENT_SELECTION_PART}_${form}_${part}`;
    }
    private static getStorageKeyCurrentSelectionPartFilter(form: string, part: string) {
        return `${STORAGE_KEY_CURRENT_SELECTION_PART_FILTER}_${form}_${part}`;
    }

    constructor() {
        for (const form of this.forms) {
            this._currentSelectionPartsFilter[form] = {};
            this._currentSelectionParts[form] = {};
            for (const part of this.getPartsList(form)) {
                this._currentSelectionPartsFilter[form][part] = new DataSubject<string>(ALL_FILTER);
                this._currentSelectionParts[form][part] = new DataSubject<CurrentSelectionPart>(new CurrentSelectionPart());
            }
        }
    }

    async loadFromStorage() {
        try {
            this._version = await this._storeSession.getItem(STORAGE_KEY_VERSION) ?? '';

            if (this._version !== '') {
                this._settings.data = await this._storeSession.getItem<Settings>(STORAGE_KEY_SETTINGS) ?? this._settings.data;

                this._theme = await this._storeSession.getItem(STORAGE_KEY_THEME) ?? this._theme;
            }

            this._version = site.version;
            this._storeSession.setItem(STORAGE_KEY_VERSION, this._version);

            this._lastFlag.data = await this._storeSession.getItem<string>(STORAGE_KEY_LAST_FLAG) ?? this._lastFlag.data;

            this._currentSelectionForm.data = await this._storeSession.getItem<string>(STORAGE_KEY_CURRENT_SELECTION_FORM) ?? this._currentSelectionForm.data;
            this._currentSelectionShowWhole.data = await this._storeSession.getItem<boolean>(STORAGE_KEY_CURRENT_SELECTION_SHOW_WHOLE) ?? this._currentSelectionShowWhole.data;

            for (const form of this.forms) {
                for (const part of this.getPartsList(form)) {
                    const part_key = ApplicationData.getStorageKeyCurrentSelectionPart(form, part);
                    const part_filter_key = ApplicationData.getStorageKeyCurrentSelectionPartFilter(form, part);
    
                    this._currentSelectionParts[form][part].data = await this._storeSession.getItem<CurrentSelectionPart>(part_key) ?? this._currentSelectionParts[form][part].data;
                    this._currentSelectionPartsFilter[form][part].data = await this._storeSession.getItem<string>(part_filter_key) ?? this._currentSelectionPartsFilter[form][part].data;
                }
            }

            this.saveCurrentSelection();
        } catch (err) {
            // This code runs if there were any errors.
            console.error('loadFromStorage', err);
        }
    }

    clearSessionStorage() {
        this._storeSession.clear();
    }

    get theme() {
        return this._theme;
    }

    set theme(value: Theme) {
        this._theme = value;
        this._storeSession.setItem(STORAGE_KEY_THEME, value);
        this._storeSession.setItem(STORAGE_KEY_VERSION, this._version);
    }

    get lastFlagObservable() {
        return this._lastFlag;
    }

    get lastFlag() {
        return this._lastFlag.data;
    }

    set lastFlag(value: string) {
        this._storeSession.setItem(STORAGE_KEY_LAST_FLAG, value);
        this._storeSession.setItem(STORAGE_KEY_VERSION, this._version);
        this._lastFlag.data = value;
    }

    get settingsObservable() {
        return this._settings;
    }

    get settings() {
        return this._settings.data;
    }

    set settings(value: Settings) {
        this._storeSession.setItem(STORAGE_KEY_SETTINGS, value);
        this._storeSession.setItem(STORAGE_KEY_VERSION, this._version);
        this._settings.data = value;
    }


    /// add more getter and setter

    set currentSelectionForm(value: string) {
        this._storeSession.setItem(STORAGE_KEY_CURRENT_SELECTION_FORM, value);
        this._storeSession.setItem(STORAGE_KEY_VERSION, this._version);
        this._currentSelectionForm.data = value;
    }

    get currentSelectionFormObservable() {
        return this._currentSelectionForm;
    }

    get currentSelectionForm() {
        return this._currentSelectionForm.data;
    }


    set currentSelectionShowWhole(value: boolean) {
        this._storeSession.setItem(STORAGE_KEY_CURRENT_SELECTION_SHOW_WHOLE, value);
        this._storeSession.setItem(STORAGE_KEY_VERSION, this._version);
        this._currentSelectionShowWhole.data = value;
    }

    get currentSelectionShowWholeObservable() {
        return this._currentSelectionShowWhole;
    }

    get currentSelectionShowWhole() {
        return this._currentSelectionShowWhole.data;
    }


    public getCurrentSelectionPartsData(form: string) {
        return this.getPartsList(form).map(part => {
            return this._currentSelectionParts[form][part].data;
        });
    }

    public getCurrentSelectionPartsObservables(form: string) {
        return this.getPartsList(form).map(part => {
            return { form: form, part: part, observable: this._currentSelectionParts[form][part] };
        });
    }

    public getCurrentSelectionPartData(form: string, part: string) {
        return (form in this._currentSelectionParts && part in this._currentSelectionParts[form])? this._currentSelectionParts[form][part].data : undefined;
    }


    public getCurrentSelectionPartsFilterObservables(form: string) {
        return this.getPartsList(form).map(part => {
            return { form: form, part: part, observable: this._currentSelectionPartsFilter[form][part] };
        });
    }

    public getCurrentSelectionPartFilter(form: string, part: string) {
        return (form in this._currentSelectionPartsFilter && part in this._currentSelectionPartsFilter[form])? this._currentSelectionPartsFilter[form][part].data : undefined;
    }

    public saveCurrentSelection() {
        this._storeSession.setItem(STORAGE_KEY_CURRENT_SELECTION_FORM, this._currentSelectionForm.data);
        this._storeSession.setItem(STORAGE_KEY_CURRENT_SELECTION_SHOW_WHOLE, this._currentSelectionShowWhole.data);
        for(const form of this.forms) {
            for(const part of this.getPartsList(form)) {
                const part_key = ApplicationData.getStorageKeyCurrentSelectionPart(form, part);
                const part_filter_key = ApplicationData.getStorageKeyCurrentSelectionPart(form, part);

                this._storeSession.setItem(part_key, this._currentSelectionParts[form][part].data);
                this._storeSession.setItem(part_filter_key, this._currentSelectionPartsFilter[form][part].data);
            }
        }
        this._storeSession.setItem(STORAGE_KEY_VERSION, this._version);
    }

    public initDefaultValues(default_flag_name: string) {
        for(const form of this.forms) {
            for(const part of this.getPartsList(form)) {
                if (!this._currentSelectionParts[form][part].data.flag_name) {
                    this._currentSelectionParts[form][part] = new DataSubject<CurrentSelectionPart>({
                        flag_name: default_flag_name,
                        orientation: Orientation.Vertical
                    });
                }
            }
        }
        this.saveCurrentSelection();
    }

    public setPartFlagName(form: string, part: string, flag_name: string) {
        this._currentSelectionParts[form][part].data.flag_name = flag_name;

        this.saveCurrentSelection();
        this._currentSelectionParts[form][part].notify();
    }

    public setPartOrientation(form: string, part: string, orientation: Orientation) {
        this._currentSelectionParts[form][part].data.orientation = orientation;

        this.saveCurrentSelection();
        this._currentSelectionParts[form][part].notify();
    }

    public setPartFilter(form: string, part: string, filter: string) {
        this._currentSelectionPartsFilter[form][part].data = filter;
        this.saveCurrentSelection();
    }

    public setPart(form: string, part: string, flag_name: string, orientation: Orientation) {
        this._currentSelectionParts[form][part].data.flag_name = flag_name;
        this._currentSelectionParts[form][part].data.orientation = orientation;

        this.saveCurrentSelection();
        this._currentSelectionParts[form][part].notify();
    }

    public setForm(form: string, parts_list: string[], default_flag_name: string = '') {
        this._currentSelectionForm.data = form;
        this.saveCurrentSelection();
    }

    public setShowWhole(value: boolean) {
        this._currentSelectionShowWhole.data = value;
        this.saveCurrentSelection();
    }


    public getPartsList(form: string) {
        return (hasProperty(site.data.flags_config, form)) ? (getUnsafeProperty(site.data.flags_config, form) as AnyFlagConfig).parts : [];
    }

    get forms() {
        return site.data.flags_config.forms;
    }
}

export function hasProperty(obj: any, key: string) {
    return key in obj
}

export function getUnsafeProperty(obj: any, key: string) {
    return key in obj ? obj[key] : undefined; // Inferred type is T[K]
}

export function getProperty<T, K extends keyof T>(obj: T, key: K) {
    return obj[key]; // Inferred type is T[K]
}

export function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]) {
    obj[key] = value;
}