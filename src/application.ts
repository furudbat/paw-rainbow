import { ApplicationData, Theme } from './application.data'
import { LoggerManager } from 'typescript-logger';
import { Loader, Application as PixiApplication, LoaderResource } from 'pixi.js';
import { site } from './site';
import { SpritePawPartsAdapter } from './sprite.adapter';

export class Application {

    private _appData: ApplicationData = new ApplicationData();
    private _pixiApp: PixiApplication = new PixiApplication();
    private _loader: Loader = new Loader();
    private _spriteAdapter?: SpritePawPartsAdapter;

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

        const paw_sprites = site.data.sprites.filter(it => it.form == 'pride_paws' || it.form == 'gender_paws');
        this._spriteAdapter = new SpritePawPartsAdapter(this._pixiApp, paw_sprites);
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
        var that = this;
        this._pixiApp = new PixiApplication({
            width: 520,
            height: 520,
            antialias: false,
            transparent: true,
            resizeTo: $('#spriteViewContainer')[0]
        });
        $('#spriteViewContainer').html(this._pixiApp.view);

        let sprite_sheet_filenames = site.data.sprites.map(it => it.sheet);
        sprite_sheet_filenames = sprite_sheet_filenames.filter((filename: string, index: number) => {
            return sprite_sheet_filenames.indexOf(filename) === index;
        });

        this._loader.baseUrl = site.data.base_url;
        this._loader.onProgress.add(function () {
            that.loadProgressHandler();
        })
        this._loader.add(sprite_sheet_filenames).load(function (loader, resources) {
            that.setupAdapters(loader, resources)
        });
    }

    private setupAdapters(loader: Loader, resources: Partial<Record<string, LoaderResource>>) {
        this._spriteAdapter?.init(resources);
    }

    private loadProgressHandler() {

    }
}