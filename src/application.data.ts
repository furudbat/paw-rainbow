import { Orientation } from './../_site/src/flags.data';
import localForage from "localforage";
import { DataSubject } from "./observer";
import { site } from "./site";

const STORAGE_KEY_SETTINGS = 'settings';
const STORAGE_KEY_THEME = 'theme';
const STORAGE_KEY_VERSION = 'version';
const STORAGE_KEY_CURRENT_SELECTION = 'current_selection';
const STORAGE_KEY_LAST_FLAG = 'last_flag';

export enum Theme {
    Light = "light",
    Dark = "dark"
}
export class Settings {
    
}

export class CurrentSelectionPart {
    flag_name: string = "None";
    orientation: Orientation = Orientation.Vertical;
}
export class CurrentSelection {
    form: string = "";
    parts: Record<string, CurrentSelectionPart> = {};
}

export class ApplicationData {

    private _settings: DataSubject<Settings> = new DataSubject<Settings>(new Settings());
    private _theme: Theme = Theme.Dark;
    private _version: string = site.version;
    private _currentSelection: DataSubject<CurrentSelection> = new DataSubject<CurrentSelection>(new CurrentSelection());
    private _lastFlag: DataSubject<string> = new DataSubject<string>("");

    private _storeSession = localForage.createInstance({
        name: "session"
    });

    constructor() {
    }

    async loadFromStorage() {
        try {
            this._version = await this._storeSession.getItem(STORAGE_KEY_VERSION) || '';

            if (this._version !== '') {
                this._settings.data = await this._storeSession.getItem<Settings>(STORAGE_KEY_SETTINGS) || this._settings.data;

                this._theme = await this._storeSession.getItem(STORAGE_KEY_THEME) || this._theme;
            }

            this._version = site.version;
            this._storeSession.setItem(STORAGE_KEY_VERSION, this._version);

            this._currentSelection.data = await this._storeSession.getItem<CurrentSelection>(STORAGE_KEY_CURRENT_SELECTION) || this._currentSelection.data;
            this._lastFlag.data = await this._storeSession.getItem<string>(STORAGE_KEY_LAST_FLAG) || this._lastFlag.data;
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

    set currentSelection(value: CurrentSelection) {
        this._storeSession.setItem(STORAGE_KEY_CURRENT_SELECTION, value);
        this._storeSession.setItem(STORAGE_KEY_VERSION, this._version);
        this._currentSelection.data = value;
    }

    get currentSelectionObservable() {
        return this._currentSelection;
    }

    get currentSelection() {
        return this._currentSelection.data;
    }

    public saveCurrentSelection() {
        this._storeSession.setItem(STORAGE_KEY_CURRENT_SELECTION, this._currentSelection.data);
        this._storeSession.setItem(STORAGE_KEY_VERSION, this._version);
    }


    public setPartFlagName(part: string, flag_name: string) {
        if (!(part in this._currentSelection.data.parts)) {
            this._currentSelection.data.parts[part] = new CurrentSelectionPart();
        }

        this._currentSelection.data.parts[part].flag_name = flag_name;

        this.currentSelection = this.currentSelection;
    }

    public setPartOrientation(part: string, orientation: Orientation) {
        if (!(part in this._currentSelection.data.parts)) {
            this._currentSelection.data.parts[part] = new CurrentSelectionPart();
        }

        this._currentSelection.data.parts[part].orientation = orientation;

        this.currentSelection = this.currentSelection;
    }
}