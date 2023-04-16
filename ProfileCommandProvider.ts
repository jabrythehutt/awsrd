import { CommandName } from "./CommandName";
import { CommandProvider } from "./CommandProvider";
import { CommandSuffix } from "./CommandSuffix";
import { listProfiles } from "./listProfiles";
import { name } from "./package.json";
import { ConfigurationTarget, commands, window, workspace } from "vscode"

export class ProfileCommandProvider implements CommandProvider<CommandSuffix.SelectProfile>{
    async execute(): Promise<void> {
        const configPath = `${name}.profile`;
        const profiles = await listProfiles();
        const profile = await window.showQuickPick(profiles, {
            title: "Select an AWS profile",
        });
        await workspace
            .getConfiguration()
            .update(configPath, profile, ConfigurationTarget.Global);
        await commands.executeCommand(CommandName.refresh);
    }

}