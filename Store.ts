import { Observable, ReplaySubject, Subject } from "rxjs"
import { workspace } from "vscode";

export class Store<T> {
    public readonly value: Observable<T>;
    constructor(protected readonly section: string,
        protected readonly valueSource: Subject<T> = new ReplaySubject(1)) {
        this.value = this.valueSource.asObservable();
        this.valueSource.next(this.currentValue)
        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(section)) {
                this.valueSource.next(this.currentValue)
            }
        });
    }

    get currentValue(): T {
        return workspace.getConfiguration().get<T>(this.section) as T;
    }
}
