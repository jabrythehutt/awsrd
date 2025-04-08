import { Instance } from "@aws-sdk/client-ec2";
import { CommandProvider } from "../command";
import { InstanceStore, toInstanceLabel } from "../ec2";
import { ProgressLocation, window } from "vscode";
import { InstanceDeleter } from "./InstanceDeleter";
import { Deployer } from "../deployer";
import { lastValueFrom, tap } from "rxjs";

export class DeleteCommandProvider implements CommandProvider<string> {
  constructor(
    private instanceStore: InstanceStore,
    private instanceDeleter: InstanceDeleter,
    private deployer: Deployer,
  ) {}
  async execute(instanceId: string): Promise<void> {
    const instance = await this.instanceStore.describe(instanceId);
    const label = toInstanceLabel(instance as Instance);
    const accept = "Yes";
    const answer = await window.showInformationMessage(
      `Are you sure you want to delete ${label} and its associated CloudFormation stack?`,
      accept,
      "No",
    );
    if (answer === accept) {
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: `Deleting ${label}`,
          cancellable: false,
        },
        async (progress) => {
          const request =
            await this.instanceDeleter.toDeleteRequest(instanceId);
          const messages = this.deployer.destroy(request);
          await lastValueFrom(
            messages.pipe(
              tap((m) =>
                progress.report({
                  message: m.message,
                }),
              ),
            ),
          );
          this.instanceStore.refresh();
        },
      );
    }
  }
}
