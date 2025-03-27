import { listProfiles } from "./listProfiles";
import { name } from "../package.json";
import { ConfigurationTarget, commands, window, workspace } from "vscode";
import { CommandName, CommandProvider } from "../command";

export class ProfileCommandProvider implements CommandProvider {
  async execute(): Promise<void> {
    const configPath = `${name}.profile`;
    const profiles = await listProfiles();
    const profile = await window.showQuickPick(profiles, {
      title: "Select an AWS profile",
    });

    if (profile) {
      await workspace
        .getConfiguration()
        .update(configPath, profile, ConfigurationTarget.Global);
      await commands.executeCommand(CommandName.refresh);
    }
  }
}
