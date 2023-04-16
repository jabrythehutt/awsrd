import { ConfigurationTarget, commands, workspace, window } from "vscode";
import { CommandProvider } from "./CommandProvider";
import { CommandSuffix } from "./CommandSuffix";
import { contributes } from "./package.json";
import { CommandName } from "./CommandName";

export class RegionCommandProvider
  implements CommandProvider<CommandSuffix.SelectRegion>
{
  async execute(): Promise<void> {
    const configPath = `ec2vsc.region`;
    const regionsList =
      contributes.configuration.properties[configPath].type.enum;
    const region = await window.showQuickPick(regionsList, {
      title: "Select an AWS region",
    });
    await workspace
      .getConfiguration()
      .update(configPath, region, ConfigurationTarget.Global);
    await commands.executeCommand(CommandName.refresh);
  }
}
