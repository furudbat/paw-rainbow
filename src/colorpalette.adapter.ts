import { utils, applyPalette, buildPalette } from 'image-q';
import { LoggerManager } from 'typescript-logger';
import { DataObserver, DataSubject } from './observer';
import List from 'list.js';
import { LIST_JS_PAGINATION } from './site.value';
import tinycolor from 'tinycolor2';
import { ImagePaletteData } from './data/application.data';
import { filters } from 'pixi.js';
import { site } from './site';

export class ColorPaletteAdapter {
    private _canvas: DataSubject<ImagePaletteData>;
    private _colorPaletteList?: List;

    private log = LoggerManager.create('ColorPaletteAdapter');


    constructor(canvas: DataSubject<ImagePaletteData>) {
        this._canvas = canvas;
    }

    public init() {
        this.updatePalette(this._canvas.data);

        this.initObservers();

        const options: any /*List.ListOptions*/ = {
            page: 8,
            pagination: LIST_JS_PAGINATION,
            item: function (values: ColorPaletteListValue) {
                return `<li class="list-group-item color-palette-item" data-color="${values.color}" data-index="${values.index}">
                    <div class="input-group">
                        <input type="text" class="form-control color-palette-item-input" value="${values.color}">
                        <div class="input-group-append">
                            <button type="button" class="btn btn-danger color-palette-item-delete" data-color="${values.color}" data-index="${values.index}">
                                <i class="fas fa-minus"></i><span class="sr-only">${site.data.strings.color_palette.delete_label}</span>
                            </button>
                        </div>
                    </div>
                </li>`;
            }
        };
        const id = 'lstColorPalette';
        var that = this;
        this._colorPaletteList = new List(id, options).on('updated', function (list) {
            $(list.list).find('.color-palette-item-input').spectrum({
                showInput: true,
                showInitial: true,
                allowEmpty: false,
                showAlpha: false,
            });
            $(list.list).find('.color-palette-item-delete').off('click').on('click', function() {
                that._colorPaletteList?.remove('index', $(this).data('index'));
            });
        });
    }

    private initObservers() {
        var that = this;
        this._canvas.attach(new class implements DataObserver<ImagePaletteData>{
            update(subject: DataSubject<ImagePaletteData>): void {
                that.updatePalette(subject.data);
            }
        });
    }

    private async updatePalette(data: ImagePaletteData) {
        const pointContainer = utils.PointContainer.fromUint8Array(data.uint8Array, data.width, data.height);
        const palette = await buildPalette([pointContainer]);

        const values: ColorPaletteListValue[] = palette.getPointContainer().getPointArray().map((point, index) => {
            const color = tinycolor({ r: point.r, g: point.g, b: point.b }).toHexString();
            return {
                color: color,
                index: index
            };
        });

        this.log.debug('updatePalette', palette, palette.getPointContainer(), palette.getPointContainer().getPointArray(), values);

        if (this._colorPaletteList) {
            this._colorPaletteList.clear();
            this._colorPaletteList.add(values);
        }
    }
}

interface ColorPaletteListValue {
    color: string;
    index: number;
}