import { Instance } from "@aws-sdk/client-ec2";
import { CommandProvider } from "./CommandProvider";
import { CommandSuffix } from "./CommandSuffix";
import { InstanceStore } from "./InstanceStore";
import { toInstanceLabel } from "./toInstanceLabel";
import { window } from "vscode";
import { InstanceDeleter } from "./InstanceDeleter";
import { executeTerminalCommands } from "./executeTerminalCommands";

export class DeleteCommandProvider
  implements CommandProvider<CommandSuffix.Delete, string>
{
  constructor(
    private instanceStore: InstanceStore,
    private instanceDeleter: InstanceDeleter,
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
      const terminalCommands =
        await this.instanceDeleter.toTerminalCommands(instanceId);
      const terminal = window.createTerminal(`Deleting ${label}`);
      terminal.show();
      await executeTerminalCommands(terminal, terminalCommands);
      this.instanceStore.refresh();
    }
  }
}
