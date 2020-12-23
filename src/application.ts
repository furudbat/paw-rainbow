import { ApplicationData, Theme } from './application.data'
import { LoggerManager } from 'typescript-logger';

export class Application {

    private _appData: ApplicationData = new ApplicationData();

    private log = LoggerManager.create('Application');

    public init() {
        var that = this;
        this._appData.loadFromStorage().then(function () {
            that.initSite();
        });
    }

    private async initSite() {
        //this.log.debug('init items', this._appData.items);

        this.initTheme();

        this.initSettings();

        this.initObservers();
    }

    private initTheme() {
        $('body').removeAttr('data-theme');
        switch (this._appData.theme) {
            case Theme.Dark:
                $('#chbDarkTheme').bootstrapToggle('on');
                $('body').attr('data-theme', 'dark');
                break;
            case Theme.Light:
            default:
                $('#chbDarkTheme').bootstrapToggle('off');
                $('body').attr('data-theme', 'light');
                break;
        }
    }

    private async initSettings() {
        var that = this;
        $('#btnClearSession').on('click', function () {
            that._appData.clearSessionStorage();
        });

        $('#chbDarkTheme').on('change', function () {
            $('body').removeAttr('data-theme');
            if ($(this).prop('checked')) {
                $('body').attr('data-theme', 'dark');
                that._appData.theme = Theme.Dark;
            } else {
                $('body').attr('data-theme', 'light');
                that._appData.theme = Theme.Light;
            }
        })
    }

    private initObservers() {

    }
}