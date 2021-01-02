
import { Container, Sprite, Application as PixiApplication, LoaderResource } from 'pixi.js';
import { LoggerManager } from 'typescript-logger';
import { Orientation, SpriteFlagMetaData } from "./flags.data";

type SpritePawPart = 'left_part_1' | 'left_part_2' | 'right_part_1' | 'right_part_2' | 'center';

type SpritePawParts = Record<SpritePawPart, Sprite>;

export class SpritePawPartsAdapter {
    private _spritesMetaData: SpriteFlagMetaData[] = [];
    private _resources?: Partial<Record<string, LoaderResource>>;
    private _sprites: SpritePawParts = {
        left_part_1: new Sprite(),
        left_part_2: new Sprite(),
        right_part_1: new Sprite(),
        right_part_2: new Sprite(),
        center: new Sprite(),
    };
    private _parts_container: Container = new Container();
    private _pixiApp: PixiApplication;

    private log = LoggerManager.create('SpritePawPartsAdapter');

    constructor(pixiApp: PixiApplication, spritesMetaData: SpriteFlagMetaData[]) {
        this._pixiApp = pixiApp;
        this._spritesMetaData = spritesMetaData;
    }

    public init(resources: Partial<Record<string, LoaderResource>>) {
        this._resources = resources;

        const parts = <SpritePawParts>(name: keyof SpritePawParts) => name;
        for (let part of ['left_part_1', 'left_part_2', 'right_part_1', 'right_part_2', 'center']) {
            this.setPart('None', part, Orientation.Vertical, false);
        }
        this._parts_container.addChild(this._sprites.left_part_1);
        this._parts_container.addChild(this._sprites.left_part_2);
        this._parts_container.addChild(this._sprites.right_part_1);
        this._parts_container.addChild(this._sprites.right_part_2);
        this._parts_container.addChild(this._sprites.center);
        this.updateSprite();

        this._pixiApp.stage.addChild(this._sprites.left_part_1);
        var that = this;
        window.addEventListener('resize', function() {
            that.log.debug('resize');
            that.updateSprite();
        });
    }

    public setPart(flag_name: string, part: string, orienration: Orientation, update_sprite: boolean = true) {
        if (this._resources !== undefined) {
            const meta = this._spritesMetaData.find(it => it.flag_name == flag_name && it.orientation == orienration && it.part == part);
            if (meta !== undefined) {
                const ress = this._resources[meta.sheet];
                if (ress != undefined && ress.textures !== undefined) {
                    const texture = ress.textures[meta.id];

                    /// @TODO use hashmap 
                    switch (part) {
                        case 'left_part_1':
                            this._sprites.left_part_1.texture = texture;
                            break;
                        case 'left_part_2':
                            this._sprites.left_part_2.texture = texture;
                            break;
                        case 'right_part_1':
                            this._sprites.right_part_1.texture = texture;
                            break;
                        case 'right_part_2':
                            this._sprites.right_part_2.texture = texture;
                            break;
                        case 'center':
                            this._sprites.center.texture = texture;
                            break;
                    }
                    if (update_sprite) {
                        this.updateSprite();
                    }
                    
                    this.log.debug('setPart', `${flag_name} ${part} ${orienration}`, meta, texture);

                    return true;
                } else {
                    this.log.warn('setPart', `${meta.sheet} not found or no textures`, this._resources[meta.sheet]);
                }
            } else {
                this.log.warn('setPart', `${flag_name} ${part} ${orienration} not found in meta`, this._spritesMetaData);
            }
        }

        return false;
    }

    private updateSprite() {
        const offset_x = (this._pixiApp.screen.width >= 32)? 8 : 0;
        const offset_y = (this._pixiApp.screen.height >= 32)? 8 : 0;

        const display_width = this._pixiApp.screen.width - offset_x;
        const display_height = this._pixiApp.screen.height - offset_y;

        this._parts_container.width = display_width;
        this._parts_container.height = display_height;
        
        this._parts_container.position.set((this._pixiApp.screen.width/2 - this._parts_container.width/2) + offset_x,
                                            (this._pixiApp.screen.height/2 - this._parts_container.height/2) + offset_y);

        this._pixiApp.render();

        this.log.debug('updateSprite: window', display_width, display_height);
        this.log.debug('updateSprite: sprites', this._parts_container.x, this._parts_container.y, this._parts_container.width, this._parts_container.height, this._parts_container);
    }
}