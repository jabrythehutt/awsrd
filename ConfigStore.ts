import { Observable, ReplaySubject, Subject } from "rxjs";
import { workspace } from "vscode";
import { ConfigurationKey } from "./ConfigurationKey";

export class ConfigStore<T> {
  public readonly value: Observable<T>;
  constructor(
    protected readonly configKey: ConfigurationKey,
    protected readonly valueSource: Subject<T> = new ReplaySubject(1)
  ) {
    this.value = this.valueSource.asObservable();
    this.valueSource.next(this.currentValue);
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(this.configKey)) {
        this.valueSource.next(this.currentValue);
      }
    });
  }

  get currentValue(): T {
    return workspace.getConfiguration().get<T>(this.configKey) as T;
  }
}
