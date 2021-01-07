import { ApplicationData, Theme, DEFAULT_OUTLINE_COLOR, DEFAULT_CRAWS_COLOR } from './data/application.data';
import { LoggerManager } from 'typescript-logger';
import { Loader, Application as PixiApplication, LoaderResource } from 'pixi.js';
import { SpriteAdapter } from './sprite.adapter';
import { FormPartsAdapter } from './form-parts.adapter';
import { LIST_JS_PAGINATION } from './site.value';
import { SpriteDataHelper } from './sprites.data.helper';
import { site } from './site';
import List from 'list.js';

export const CANVAS_WIDTH = 720;
export const CANVAS_HEIGHT = 720;
export class Application {

    private _appData: ApplicationData = new ApplicationData();
    private _pixiApp?: PixiApplication;
    private _loader: Loader = new Loader();
    private _formPartsAdapter?: FormPartsAdapter;
    private _spriteAdapter?: SpriteAdapter;
    private _flagList?: List;
    private _sprite_data_helper: SpriteDataHelper = new SpriteDataHelper();

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

        if (!this._appData.currentSelectionForm) {
            this._appData.currentSelectionForm = (this._appData.forms.length > 0)? this._appData.forms[0] : '';
        }
        Promise.all(this._appData.forms.map( form => {
            return this._sprite_data_helper.setup(form, this._appData.getPartsList(form));
        })).then(() => {
            for (const form of this._appData.forms) {
                this._appData.initDefaultValues(form, this._sprite_data_helper.getDefaultFlagName(form));
            }
            this.initForm();
            this.initCanvas();
        });

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
            
            if (checked) {
                that._appData.showGrid();
            } else {
                that._appData.hideGrid();
            }
        });


        if (!this._appData.settings.outline_color) {
            this._appData.settings.outline_color = this._appData.getOutlineColor(this._appData.currentSelectionForm) ?? DEFAULT_OUTLINE_COLOR;
        }
        this._appData.settings.outline_color = this._appData.settings.outline_color ?? DEFAULT_CRAWS_COLOR;
        this._appData.saveSettings();

        $('#txtCrawsColor').spectrum({
            color: this._appData.settings.craws_color,
            showInput: true,
            showInitial: true,
            allowEmpty: true,
            showAlpha: false,
        }).on('hide.spectrum', function(e, color) {
            const color_str = color.toHexString();
            that._appData.setCrawsColor(color_str);
        }).on('move.spectrum', function(e, color) {
            const color_str = color.toHexString();
            that._appData.setCrawsColor(color_str);
        });

        $('#txtOutlinesColor').spectrum({
            color: this._appData.settings.outline_color,
            showInput: true,
            showInitial: true,
            allowEmpty: false,
            showAlpha: false,
        }).on('hide.spectrum', function(e, color) {
            const color_str = color.toHexString();
            that._appData.setOutlineColor(color_str);
        }).on('move.spectrum', function(e, color) {
            const color_str = color.toHexString();
            that._appData.setOutlineColor(color_str);
        });
    }

    private async initFlagList() {
        const options: any /*List.ListOptions*/ = {
            valueNames: [ 'flag_info_image', 'flag_info_name', 'flag_info_description' ],
            page: 8,
            pagination: LIST_JS_PAGINATION
        };
        const id = 'lstFlagInfo';
        this._flagList = new List(id, options);
    }

    private async initForm() {
        this.initFormParts();
    }

    private async initFormParts() {
        this._formPartsAdapter = new FormPartsAdapter(this._appData, this._sprite_data_helper);
        this._formPartsAdapter?.init();
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
        this._spriteAdapter?.init(this._appData.currentSelectionFormData, resources);
    }

    private loadProgressHandler() {

    }
}