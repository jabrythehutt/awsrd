import { ProgressLocation, window } from "vscode";
import { CommandProvider } from "./CommandProvider";
import { InstanceStore } from "./InstanceStore";
import { toPromise } from "./toPromise";

export class RefreshCommandProvider implements CommandProvider {
  constructor(private instanceStore: InstanceStore) {}
  async execute(): Promise<void> {
    this.instanceStore.refresh();
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Refreshing EC2 list",
        cancellable: false,
      },
      async () => {
        await toPromise(this.instanceStore.instanceIds);
      },
    );
  }
}
