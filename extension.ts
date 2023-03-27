import { ExtensionContext, commands, window, Uri, workspace } from "vscode";
import packageJson from "./package.json";
import { Ec2InstanceTreeProvider } from "./Ec2InstanceTreeProvider";
import { EC2Client, Instance } from "@aws-sdk/client-ec2";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { createKeyPair } from "./createKeyPair";
import { toSshConfig } from "./toSshConfig";

export async function activate(context: ExtensionContext) {
    const explorerViews = packageJson.contributes.views["ec2-explorer"];
    const explorerView = explorerViews[0];
    const ec2 = new EC2Client({});
    const treeView = window.createTreeView(explorerView.id, { treeDataProvider: new Ec2InstanceTreeProvider(ec2) });
    context.subscriptions.push(treeView);
    const openItemCommand = packageJson.contributes.commands[0].command;

    commands.registerCommand(openItemCommand, async (ec2Instance: Instance) => {
        const destination = resolve(tmpdir(), context.extension.id)
        if (!existsSync(destination)) {
            await mkdir(destination)
        }
        console.log("Storage path:", destination);
        const proxyScriptPath = "~/foo"
        const sessionManagerBinPath = "~/baz"
        const sshConfigPath = resolve(destination, "config");
        const region = await ec2.config.region();
        const profile = "default"
        const keyPairPaths = await generateKeyPair(destination);
        const sshConfig = toSshConfig({ ...keyPairPaths, proxyScriptPath, region, profile, sessionManagerBinPath })
        await writeFile(sshConfigPath, sshConfig)
        // await workspace.getConfiguration().update("remote.SSH.configFile", resolve(destination, sshConfigPath));
        const uri = Uri.parse(`vscode-remote://ssh-remote+${ec2Instance.InstanceId}/`)
        await commands.executeCommand('vscode.openFolder', uri);
    })
}

async function generateKeyPair(destinationDir: string): Promise<{ privateKeyPath: string, publicKeyPath: string }> {
    const keyPair = createKeyPair();
    const privateKeyFileName = "id_rsa"
    const privateKeyPath = resolve(destinationDir, privateKeyFileName);
    const destinations = {
        privateKeyPath,
        publicKeyPath: `${privateKeyPath}.pub`
    }
    if (!existsSync(privateKeyPath) || !existsSync(destinations.publicKeyPath)) {
        await writeFile(destinations.publicKeyPath, keyPair.publicKey);
        await writeFile(privateKeyPath, keyPair.privateKey, { mode: 0o600 });
    }

    return destinations
}
