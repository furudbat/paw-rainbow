import localForage from "localforage";
import { DataSubject } from "./observer";
import { site } from "./site";

const STORAGE_KEY_SETTINGS = 'settings';
const STORAGE_KEY_THEME = 'theme';
const STORAGE_KEY_VERSION = 'version';

export enum Theme {
    Light = "light",
    Dark = "dark"
}
export class Settings {
    
}

export class ApplicationData {

    private _settings: DataSubject<Settings> = new DataSubject<Settings>(new Settings());
    private _theme: Theme = Theme.Dark;
    private _version: string = site.version;

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
}