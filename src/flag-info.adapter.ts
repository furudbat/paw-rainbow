import { LoggerManager } from "typescript-logger";
import { ApplicationData } from "./data/application.data";
import { DataObserver, DataSubject } from "./observer";
import { site } from "./site";

export class FlagInfoAdapter {
    private _appData: ApplicationData;

    private log = LoggerManager.create('FlagWikiAdapter');

    constructor(appData: ApplicationData) {
        this._appData = appData;
    }

    public init() {
        this.updateFlagInfos(this._appData.lastFlag);

        this.initObservers();
    }

    private initObservers() {
        var that = this;
        this._appData.lastFlagObservable.attach(new class implements DataObserver<string>{
            update(subject: DataSubject<string>): void {
                const flag_name = subject.data;
                that.updateFlagInfos(flag_name);
            }
        });
    }

    public updateFlagInfos(flag_name: string) {
        const flag_info = site.data.flags_info.find(it => it.name === flag_name);

        this.log.debug('updateFlagInfos', flag_name, flag_info);
        if (flag_info) {
            if (flag_info.img) {
                $('#flagInfoImage').attr('src', flag_info.img);
            }

            $('#flagInfoTitle').html(flag_info.name);
            $('#flagInfoDescription').html(flag_info.description ?? '');

            if (flag_info.link) {
                $('#flagInfoLink').attr('href', flag_info.link).html(site.data.strings.flag_info.source_label);
            }
        } else {
            $('#flagInfoImage').attr('src', site.data.strings.flag_info.unknown.img);

            $('#flagInfoTitle').html(site.data.strings.flag_info.unknown.title);
            $('#flagInfoDescription').html(site.data.strings.flag_info.unknown.description);
            
            $('#flagInfoLink').attr('href', '#').html('');
        }
    }
}