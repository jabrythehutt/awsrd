import { ExtensionContext, commands, window, Uri, workspace } from "vscode";
import packageJson from "./package.json";
import { Ec2InstanceTreeProvider } from "./Ec2InstanceTreeProvider";
import { EC2Client, Instance } from "@aws-sdk/client-ec2";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir, homedir } from "node:os";
import { createKeyPair } from "./createKeyPair";
import { toSshConfig } from "./toSshConfig";
import { fromIni } from "@aws-sdk/credential-providers";

export async function activate(context: ExtensionContext) {
    const explorerViews = packageJson.contributes.views["ec2-explorer"];
    const profile = "default"
    const explorerView = explorerViews[0];
    const credentials = fromIni({
        profile,
      })
      const clientConfig = {
        credentials
      }
    const ec2 = new EC2Client(clientConfig);
    const treeView = window.createTreeView(explorerView.id, { treeDataProvider: new Ec2InstanceTreeProvider(ec2) });
    context.subscriptions.push(treeView);
    const openItemCommand = packageJson.contributes.commands[0].command;

    commands.registerCommand(openItemCommand, async (ec2Instance: Instance) => {
        const destination = resolve(tmpdir(), context.extension.id)
        if (!existsSync(destination)) {
            await mkdir(destination)
        }
        console.log("Storage path:", destination);
        const proxyScriptPath = resolve(__dirname, process.env.PROXY_SCRIPT_FILENAME as string);
        const sessionManagerBinPath = resolve(__dirname, process.env.SESSION_MANAGER_BIN as string)
        const region = await ec2.config.region();
        
        const keyPairPaths = await generateKeyPair(destination);
        const sshConfig = toSshConfig({ ...keyPairPaths, proxyScriptPath, region, profile, sessionManagerBinPath })
        const sshConfigPath = workspace.getConfiguration().get("remote.SSH.configFile") as string || resolve(homedir(), ".ssh", "config")
        await writeFile(sshConfigPath, sshConfig)

        const user = await window.showInputBox({
            placeHolder: "Username",
            prompt: `The username for the instance: ${ec2Instance.InstanceId}`,
            value: "ec2-user"
          });
        if (user) {
            const uri = Uri.parse(`vscode-remote://ssh-remote+${user}@${ec2Instance.InstanceId}/`)
            await commands.executeCommand('vscode.openFolder', uri);
        }

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
