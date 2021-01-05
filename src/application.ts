import { ApplicationData, CurrentSelection, CurrentSelectionPart, Theme } from './data/application.data'
import { LoggerManager } from 'typescript-logger';
import { Loader, Application as PixiApplication, LoaderResource } from 'pixi.js';
import { site } from './site';
import { SpriteAdapter } from './sprite.adapter';
import { FormPartsAdapter } from './form-parts.adapter';
import { DataObserver, DataSubject } from './observer';
import { FlagInfoAdapter } from './flag-info.adapter';
import List from 'list.js';
import { LIST_JS_PAGINATION } from './site.value';

export const CANVAS_WIDTH = 720;
export const CANVAS_HEIGHT = 720;
export class Application {

    private _appData: ApplicationData = new ApplicationData();
    private _pixiApp?: PixiApplication;
    private _loader: Loader = new Loader();
    private _formPartsAdapter?: FormPartsAdapter;
    private _spriteAdapter?: SpriteAdapter;
    private _flagInfoAdapter?: FlagInfoAdapter;
    private _flagList?: List;

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

        this._formPartsAdapter = new FormPartsAdapter(this._appData);
        this._flagInfoAdapter = new FlagInfoAdapter(this._appData);
        this.initForm();
        this.initCanvas();
        this.initFlagList();

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

    private initObservers() {
        var that = this;
        this._appData.currentSelectionObservable.attach(new class implements DataObserver<CurrentSelection>{
            update(subject: DataSubject<CurrentSelection>): void {
                that._spriteAdapter?.updateParts();
            }
        });
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
        });

        $('#chbShowGrid').prop('checked', this._appData.settings.show_grid);
        $('#chbShowGrid').on('change', function() {
            const checked = $(this).is(':checked');
            
            that._appData.settings.show_grid = checked;
            that._appData.settings = that._appData.settings;
        });
    }

    private async initFlagList() {
        const options: any /*List.ListOptions*/ = {
            valueNames: [ 'flag_name' ],
            page: 6,
            pagination: LIST_JS_PAGINATION
        };
        const id = 'lstFlagInfo';
        this._flagList = new List(id, options);
    }

    private async initForm() {
        this.initFormParts();
        this.initFormInfo();
    }

    private async initFormParts() {
        this._formPartsAdapter?.init();
    }

    private async initFormInfo() {
        this._flagInfoAdapter?.init();
    }

    private async initCanvas() {
        var that = this;
        this._pixiApp = new PixiApplication({
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            antialias: false,
            transparent: true,
            resizeTo: $('#spriteViewContainer')[0]
        });
        $('#spriteViewContainer').html(this._pixiApp.view);
        this._spriteAdapter = new SpriteAdapter(this._pixiApp, this._appData, '#btnDownload', '#btnFullDownload');

        let sprite_sheet_filenames = site.data.sprites.map(it => it.sheet);
        sprite_sheet_filenames = sprite_sheet_filenames.filter((filename: string, index: number) => {
            return sprite_sheet_filenames.indexOf(filename) === index;
        });

        this._loader.baseUrl = site.base_url;
        this._loader.onProgress.add(function () {
            that.loadProgressHandler();
        });
        this._loader.add(sprite_sheet_filenames).load(function (loader, resources) {
            that.setupSpriteAdapters(loader, resources)
        });
    }

    private setupSpriteAdapters(loader: Loader, resources: Partial<Record<string, LoaderResource>>) {
        //this.log.debug('setupSpriteAdapters', loader, resources);
        this._spriteAdapter?.init(resources);
    }

    private loadProgressHandler() {

    }
      
}