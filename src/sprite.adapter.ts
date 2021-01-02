
import { Container, Sprite, Application as PixiApplication, LoaderResource, BaseRenderTexture, RenderTexture } from 'pixi.js';
import { LoggerManager } from 'typescript-logger';
import { ApplicationData } from './application.data';
import { Orientation } from "./flags.data";
import { site } from './site';

type SpriteParts = Record<string, Sprite>;

export class SpriteAdapter {
    private _appData: ApplicationData;
    private _resources?: Partial<Record<string, LoaderResource>>;
    private _sprites: SpriteParts = {};
    private _parts_container: Container = new Container();
    private _pixiApp: PixiApplication;
    private _downloadButton: string;

    private log = LoggerManager.create('SpritePawPartsAdapter');

    constructor(pixiApp: PixiApplication, appData: ApplicationData, downloadButton: string) {
        this._pixiApp = pixiApp;
        this._appData = appData;
        this._downloadButton = downloadButton;
    }

    public init(resources: Partial<Record<string, LoaderResource>>) {
        this._resources = resources;
        this.updateParts();

        this._pixiApp.stage.addChild(this._parts_container);
        this._pixiApp.ticker.add(() => {
            this._pixiApp.renderer.render(this._parts_container);
        });

        var that = this;
        window.addEventListener('resize', function() {
            that.log.debug('resize');
            that.updateSprite();
        });
        
        this.updateSprite();
        this.updateDownloadButton();
    }

    public updateParts() {
        this._parts_container.removeChildren();
        for(let part in this._appData.currentSelection.parts) {
            this.setPart(this._appData.currentSelection.form, this._appData.currentSelection.parts[part].flag_name ?? 'None', part, this._appData.currentSelection.parts[part].orientation ?? Orientation.Vertical, false);
            this._parts_container.addChild(this._sprites[part]);
        }

        this.updateSprite();
        this.updateDownloadButton();
    }

    public setPart(form: string, flag_name: string, part: string, orientation: Orientation, update_sprite: boolean = true) {
        if (this._resources !== undefined) {
            const sprite_data = site.data.sprites.find(it => it.flag_name == flag_name && it.form == form && it.part == part && it.orientation == orientation);
            if (sprite_data !== undefined) {
                const resource = this._resources[sprite_data.sheet];
                if (resource != undefined && resource.textures !== undefined) {
                    const texture = resource.textures[sprite_data.id];

                    if (!(part in this._sprites)) {
                        this._sprites[part] = new Sprite(texture);
                    } else {
                        this._sprites[part].texture = texture;
                    }
                    this._sprites[part].texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

                    if (update_sprite) {
                        this.updateSprite();
                    }
                    this._sprites[part].texture.baseTexture.update();
                    this._sprites[part].texture.update();
                    
                    //this.log.debug('setPart', `${flag_name} ${part} ${orientation}`, sprite_data, texture);

                    return true;
                } else {
                    this.log.warn('setPart', `${sprite_data.sheet} not found or no textures`, this._resources[sprite_data.sheet]);
                }
            } else {
                this.log.warn('setPart', `${flag_name} ${part} ${orientation} not found in meta`);
            }
        }

        return false;
    }

    private updateSprite() {
        const offset_x = (this._pixiApp.screen.width >= 32)? 16 : (this._pixiApp.screen.width >= 8)? 8 : 0;
        const offset_y = (this._pixiApp.screen.height >= 32)? 16 : (this._pixiApp.screen.height >= 8)? 8 : 0;

        const display_width = this._pixiApp.screen.width - offset_x;
        const display_height = this._pixiApp.screen.height - offset_y;

        this._parts_container.width = display_width;
        this._parts_container.height = display_height;
        
        this._parts_container.position.set(offset_x, offset_y);

        this.log.debug('updateSprite: window', display_width, display_height);
        this.log.debug('updateSprite: sprites', this._parts_container.x, this._parts_container.y, this._parts_container.width, this._parts_container.height, this._parts_container);
    }

    public updateDownloadButton() {
        this._pixiApp.renderer.extract.canvas(this._parts_container).toBlob((b) => {
            if(this._downloadButton) {
                const form = this._appData.currentSelection.form;

                const aDownload = $(this._downloadButton) as JQuery<HTMLAnchorElement>;
                aDownload.attr('download', form);
                aDownload.attr('href', URL.createObjectURL(b));
            }
        }, 'image/png');
    }
}