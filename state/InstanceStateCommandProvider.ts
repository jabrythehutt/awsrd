import { Instance, InstanceStateName } from "@aws-sdk/client-ec2";
import { ProgressLocation, window } from "vscode";
import { CommandProvider, CommandSuffix } from "../command";
import { InstanceStarter, InstanceStore, toInstanceLabel } from "../ec2";

export class InstanceStateCommandProvider<
  T extends CommandSuffix.Start | CommandSuffix.Stop,
> implements CommandProvider<string>
{
  constructor(
    private commandSuffix: T,
    private instanceStore: InstanceStore,
    private instanceStarter: InstanceStarter,
  ) {}

  get targetState(): InstanceStateName {
    return this.commandSuffix === CommandSuffix.Start ? "running" : "stopped";
  }

  async execute(instanceId: string): Promise<void> {
    const instance = await this.instanceStore.describe(instanceId);
    const label = toInstanceLabel(instance as Instance);
    const title = `${
      this.targetState === "running" ? "Starting" : "Stopping"
    } ${label}`;
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title,
        cancellable: true,
      },
      async (progress, token) => {
        await this.instanceStarter.requestInstanceState(
          instanceId,
          this.targetState,
        );
        this.instanceStore.refresh();
        for await (const state of this.instanceStarter.waitForState(
          instanceId,
          this.targetState,
        )) {
          progress.report({ message: state });
          if (token.isCancellationRequested) {
            break;
          }
        }
        this.instanceStore.refresh();
      },
    );
  }
}
