import { Instance } from "@aws-sdk/client-ec2";
import { CommandProvider, executeTerminalCommands } from "../command";
import { InstanceStore, toInstanceLabel } from "../ec2";
import { window } from "vscode";
import { InstanceDeleter } from "./InstanceDeleter";

export class DeleteCommandProvider implements CommandProvider<string> {
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
