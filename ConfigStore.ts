import { Observable, ReplaySubject, Subject } from "rxjs";
import { workspace } from "vscode";
import { ConfigurationKey } from "./ConfigurationKey";
import { ConfigurationSuffix } from "./ConfigurationSuffix";
import { ExtensionKey } from "./ExtensionKey";

export class ConfigStore<K extends ConfigurationSuffix, T> {
  public readonly value: Observable<T>;
  constructor(
    protected readonly configKeySuffix: K,
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

  get configKey(): ExtensionKey<K> {
    return ConfigurationKey[this.configKeySuffix] as ExtensionKey<K>;
  }

  get currentValue(): T {
    return workspace.getConfiguration().get<T>(this.configKey) as T;
  }
}
