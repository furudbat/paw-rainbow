import { Container, Sprite, Application as PixiApplication, LoaderResource } from 'pixi.js';
import { LoggerManager } from 'typescript-logger';
import { ApplicationData, CurrentSelectionPart, Settings, WHOLE_PART, DEFAULT_FLAG_NAME_NONE, DEFAULT_CRAWS_COLOR, DEFAULT_OUTLINE_COLOR, CurrentSelectionForm } from './data/application.data';
import { Orientation, SpriteData } from "./data/sprite.data";
import { DataObserver, DataSubject } from './observer';
import { site } from './site';
import tinycolor from "tinycolor2";
import { SpriteDataHelper } from './sprites.data.helper';

type SpriteParts = Record<string, Sprite>;
export class SpriteAdapter {
    private _appData: ApplicationData;
    private _resources?: Partial<Record<string, LoaderResource>>;
    private _sprites: SpriteParts = {};
    private _parts_container: Container = new Container();
    private _pixiApp: PixiApplication;
    private _downloadButton?: string;
    private _downloadFullButton?: string;
    private _grid_in: PixiJSGrid = new PixiJSGrid(0);
    private _grid_out: PixiJSGrid = new PixiJSGrid(0);
    private _grids: Container = new Container();
    private _currentForm = new CurrentSelectionForm();
    private _show_grid: boolean = false;

    private log = LoggerManager.create('SpritePawPartsAdapter');

    private readonly OUTLINE_SPRITE_NAME = 'outline';
    private readonly CRAWS_SPRITE_NAME = 'craws';

    constructor(pixiApp: PixiApplication, appData: ApplicationData, downloadButton: string | undefined = undefined, downloadFullButton: string | undefined = undefined) {
        this._pixiApp = pixiApp;
        this._appData = appData;
        this._downloadButton = downloadButton;
        this._downloadFullButton = downloadFullButton;
        this._currentForm = this._appData.currentSelectionFormData;
        this._show_grid = this._appData.settings.show_grid;
    }

    public init(current_form: CurrentSelectionForm, resources: Partial<Record<string, LoaderResource>>) {
        const form = current_form.form;
        const parts = current_form.parts;
        this._resources = resources;
        this.updateParts(form, parts);

        this._grid_out = new PixiJSGrid(this._parts_container.width);
        this._grid_in = new PixiJSGrid(this._parts_container.width);
        this._grids.addChild(this._grid_out);
        this._grids.addChild(this._grid_in);

        this._pixiApp.stage.addChild(this._parts_container);
        this._pixiApp.stage.addChild(this._grids);

        this._pixiApp.ticker.add(() => {
            this._pixiApp.renderer.render(this._parts_container);
            if (this._appData.settings.show_grid) {
                this._grid_out.drawGrid();
                this._grid_in.drawGrid();
            } else {
                this._grid_in.clearGrid();
                this._grid_out.clearGrid();
            }
        });

        var that = this;
        window.addEventListener('resize', function() {
            that.log.debug('resize');
            that.updateSprite();
        });
        
        this.updateSprite();

        this.initObservers();
    }

    public updatePart(form: string, part: string, part_data: CurrentSelectionPart) {
        this.setPart(form, part_data.flag_name ?? DEFAULT_FLAG_NAME_NONE, part, part_data.orientation ?? Orientation.Vertical, false);

        this.updateSprite();
        this.updateDownloadButton();
    }

    public updateParts(form: string, parts: Record<string, CurrentSelectionPart>) {
        this._parts_container.removeChildren();
        for(const part of Object.keys(parts)) {
            const part_data = (part in parts)? parts[part] : undefined;
            const orientation = part_data?.orientation ?? Orientation.Vertical;

            if (part_data !== undefined) {
                this.setPart(form, part_data.flag_name ?? DEFAULT_FLAG_NAME_NONE, part, orientation, false);
                if (part in this._sprites && (part !== WHOLE_PART && !this._appData.currentSelectionShowWhole) || (part == WHOLE_PART && this._appData.currentSelectionShowWhole)) {
                    this._parts_container.addChild(this._sprites[part]);
                }
            } else {
                this.log.warn('updateParts', `no sprite data for ${part}`);
            }

            if (this._appData.settings.craws_color) {
                const craws_sprite = this.setCraws(form, part, orientation, this._appData.settings.craws_color);
                if (craws_sprite) {
                    this._parts_container.addChild(craws_sprite);
                }
            }

            if (this._appData.settings.outline_color) {
                const outline_sprite = this.setOutline(form, part, orientation, this._appData.settings.outline_color);
                if (outline_sprite) {
                    this._parts_container.addChild(outline_sprite);
                }
            }
        }

        this.updateSprite();
        this.updateDownloadButton();
    }

    public updateDownloadButton() {
        this._pixiApp.renderer.extract.canvas(this._parts_container).toBlob((b) => {
            if(this._downloadButton) {
                const form = this._appData.currentSelectionForm;

                const aDownload = $(this._downloadButton) as JQuery<HTMLAnchorElement>;
                aDownload.attr('download', form);
                aDownload.attr('href', URL.createObjectURL(b));
            }
        }, 'image/png');

        this._pixiApp.renderer.extract.canvas(this._pixiApp.stage).toBlob((b) => {
            if(this._downloadFullButton) {
                const form = this._appData.currentSelectionForm;

                const aDownload = $(this._downloadFullButton) as JQuery<HTMLAnchorElement>;
                aDownload.attr('download', form);
                aDownload.attr('href', URL.createObjectURL(b));
            }
        }, 'image/png');
    }

    public setPart(form: string, flag_name: string, part: string, orientation: Orientation, update_sprite: boolean = true) {
        if (this._resources !== undefined) {
            const sprite_data = site.data.sprites.find(it => it.flag_name == flag_name && it.form == form && it.part == part && it.orientation == orientation);
            this.setPartSprite(sprite_data, form, flag_name, part, orientation, update_sprite);
        }
    }

    public setCraws(form: string, part: string, orientation: Orientation, color: string = DEFAULT_CRAWS_COLOR, update_sprite: boolean = true) {
        if (this._resources !== undefined) {
            const craws_sprite_data = site.data.sprites.find(it => it.craws && it.form == form && it.part == part && it.orientation == orientation);
            if(craws_sprite_data !== undefined) {
                let ret = this.setSpriteTexture(this.CRAWS_SPRITE_NAME, craws_sprite_data, update_sprite);
                if (ret) {
                    ret.tint = parseInt("0x"+tinycolor(color).toHex());
                }
                return ret;
            } else {
                this.clearSpriteTexture(this.CRAWS_SPRITE_NAME);
            }
        }

        return undefined;
    }

    public setOutline(form: string, part: string, orientation: Orientation, color: string = DEFAULT_OUTLINE_COLOR, update_sprite: boolean = true) {
        if (this._resources !== undefined) {
            const outlines_sprite_data = site.data.sprites.find(it => it.outlines && it.form == form && it.part == part && it.orientation == orientation);
            if(outlines_sprite_data !== undefined) {
                let ret = this.setSpriteTexture(this.OUTLINE_SPRITE_NAME, outlines_sprite_data, update_sprite);
                if (ret) {
                    ret.tint = parseInt("0x"+tinycolor(color).toHex());
                }
                return ret;
            } else {
                this.clearSpriteTexture(this.OUTLINE_SPRITE_NAME);
            }
        }

        return undefined;
    }

    private initObservers() {
        var that = this;
        this._appData.currentSelectionFormObservable.attach(new class implements DataObserver<CurrentSelectionForm>{
            update(subject: DataSubject<CurrentSelectionForm>): void {
                that._currentForm = subject.data;
                that.updateParts(that._currentForm.form, that._currentForm.parts);
            }
        });
        for (const form of this._appData.forms) {
            this._appData.getCurrentSelectionPartsObservables(form).forEach(obs => {
                const form = obs.form;
                const part = obs.part;
                const observable = obs.observable;
                observable.attach(new class implements DataObserver<CurrentSelectionPart>{
                    update(subject: DataSubject<CurrentSelectionPart>): void {
                        that.updatePart(form, part, subject.data);
                    }
                });
            });
        }
        this._appData.settingsObservable.attach(new class implements DataObserver<Settings>{
            update(subject: DataSubject<Settings>): void {
                that._show_grid = subject.data.show_grid;
                that.updateParts(that._currentForm.form, that._currentForm.parts);
                that.updateGrid(subject.data.show_grid);
            }
        });

        this._appData.currentSelectionShowWholeObservable.attach(new class implements DataObserver<boolean>{
            update(subject: DataSubject<boolean>): void {
                that.updateParts(that._currentForm.form, that._currentForm.parts);
            }
        });
    }

    private setPartSprite(sprite_data: SpriteData | undefined, form: string, flag_name: string, part: string, orientation: Orientation, update_sprite: boolean = true) {
        if (this._resources !== undefined) {
            if (sprite_data !== undefined) {
                return this.setSpriteTexture(part, sprite_data, update_sprite)
            } else {
                this.clearSpriteTexture(part);
                this.log.warn('setPart', `${flag_name} ${part} ${orientation} not found in meta`);
            }
        }

        return undefined;
    }

    private clearSpriteTexture(sprite_name: string) {
        if (sprite_name in this._sprites) {
            this._parts_container.removeChild(this._sprites[sprite_name]);
            delete this._sprites[sprite_name];
        }
    }

    private setSpriteTexture(sprite_name: string, sprite_data: SpriteData, update_sprite: boolean = true) {
        if (this._resources !== undefined) {
            const resource = this._resources[sprite_data.sheet];
            if (resource != undefined && resource.textures !== undefined) {
                const texture = resource.textures[sprite_data.id];

                if (!(sprite_name in this._sprites)) {
                    this._sprites[sprite_name] = new Sprite(texture);
                } else {
                    this._sprites[sprite_name].texture = texture;
                }
                this._sprites[sprite_name].texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

                if (update_sprite) {
                    this.updateSprite();
                }
                this._sprites[sprite_name].texture.baseTexture.update();
                this._sprites[sprite_name].texture.update();

                return this._sprites[sprite_name];
            } else {
                this.log.warn('setSpriteTexture', `${sprite_data.sheet} not found or no textures`, this._resources[sprite_data.sheet]);
            }
        }

        return undefined;
    }

    private updateSprite() {
        const offset_x = (this._pixiApp.screen.width >= 32)? 16 : (this._pixiApp.screen.width >= 8)? 8 : 0;
        const offset_y = (this._pixiApp.screen.height >= 32)? 16 : (this._pixiApp.screen.height >= 8)? 8 : 0;

        const display_width = this._pixiApp.screen.width - offset_x;
        const display_height = this._pixiApp.screen.height - offset_y;

        this._parts_container.width = Math.min(display_width, display_height);
        this._parts_container.height = Math.min(display_width, display_height);
        
        this._parts_container.position.set(this._pixiApp.screen.width /2 - this._parts_container.width/2, this._pixiApp.screen.height/2 - this._parts_container.height/2);

        this.log.debug('updateSprite: window', display_width, display_height);
        this.log.debug('updateSprite: sprites', this._parts_container.x, this._parts_container.y, this._parts_container.width, this._parts_container.height, this._parts_container);


        this._grid_in = new PixiJSGrid(this._parts_container.width);
        this._grid_out = new PixiJSGrid(this._parts_container.width);
        this.updateGrid(this._show_grid);
    }

    private updateGrid(show_grid: boolean) {
        this._show_grid = show_grid;
        this._grids.position = this._parts_container.position;
        this._grid_in.cellSize = this._parts_container.scale.x;
        this._grid_out.cellSize = this._parts_container.scale.x;

        this._grid_in.blendMode = PIXI.BLEND_MODES.SRC_OUT;
        this._grid_out.blendMode = PIXI.BLEND_MODES.SUBTRACT;

        this._grids.removeChildren();
        if (this._show_grid) {
            this._grids.addChild(this._grid_out);
            this._grids.addChild(this._grid_in);

            this._grid_out.drawGrid();
            this._grid_in.drawGrid();
        } else {
            this._grid_in.clearGrid();
            this._grid_out.clearGrid();
        }
    }
}