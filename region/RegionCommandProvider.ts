import { ConfigurationTarget, commands, workspace, window } from "vscode";
import { contributes } from "../package.json";
import { CommandName, CommandProvider } from "../command";

export class RegionCommandProvider implements CommandProvider {
  async execute(): Promise<void> {
    const configPath = `awsrd.region`;
    const regionsList =
      contributes.configuration.properties[configPath].type.enum;
    const region = await window.showQuickPick(regionsList, {
      title: "Select an AWS region",
    });
    if (region !== undefined) {
      await workspace
        .getConfiguration()
        .update(configPath, region, ConfigurationTarget.Global);
      await commands.executeCommand(CommandName.refresh);
    }
  }
}
