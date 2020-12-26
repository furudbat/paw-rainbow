import { ApplicationData, Theme } from './application.data'
import { LoggerManager } from 'typescript-logger';
import { Loader, Application as PixiApplication } from 'pixi.js';
import { site } from './site';

export class Application {

    private _appData: ApplicationData = new ApplicationData();
    private _pixiApp: PixiApplication = new PixiApplication();
    private _loader = new Loader();

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

        this.initCanvas();

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

    private initCanvas() {
        this._pixiApp = new PixiApplication({ 
            width: 512, 
            height: 512,                       
            antialias: false, 
            transparent: true, 
            resolution: 1
        });

        const selectable_sprites_flags = site.data.sprites.filter(it => it.form == 'pride_paws' || it.form == 'gender_paws')
        let selectable_flags_filenames = selectable_sprites_flags.map(it => it.filename);
        selectable_flags_filenames = selectable_flags_filenames.filter((filename: string, index: number) => {
            return selectable_flags_filenames.indexOf(filename) === index;
        });

        this._loader.baseUrl = site.data.base_url
        this._loader.add(selectable_flags_filenames).load(this.setupSprites);

        $('#spriteViewContainer').html(this._pixiApp.view);
    }

    private setupSprites() {

    }
}