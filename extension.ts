import {
  ExtensionContext,
  commands,
  window,
  Uri,
  workspace,
  ConfigurationTarget,
  ProgressLocation,
} from "vscode";
import packageJson from "./package.json";
import { Ec2InstanceTreeProvider } from "./Ec2InstanceTreeProvider";
import { EC2Client, Instance } from "@aws-sdk/client-ec2";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createKeyPair } from "./createKeyPair";
import { toSshConfig } from "./toSshConfig";
import { fromIni } from "@aws-sdk/credential-providers";
import { InstanceStarter } from "./InstanceStarter";
import { InstanceStateResolver } from "./InstanceStateResolver";
import {
  DescribeInstanceInformationCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { guessUsernames } from "./guessUsernames";
import { ProfileStore } from "./ProfileStore";
import { RegionStore } from "./RegionStore";
import { combineLatest, map } from "rxjs";

export async function activate(context: ExtensionContext) {
  const explorerViews = packageJson.contributes.views["ec2-explorer"];

  const profileStore = new ProfileStore();
  const regionStore = new RegionStore();
  const credentials$ = combineLatest([
    profileStore.value,
    regionStore.value,
  ]).pipe(
    map(([profile, region]) =>
      fromIni({
        profile,
        clientConfig: {
          region,
        },
      })
    )
  );

  const profile = "default";
  const explorerView = explorerViews[0];
  const credentials = fromIni({
    profile,
  });
  const clientConfig = {
    credentials,
  };
  const ec2 = new EC2Client(clientConfig);
  const ssmClient = new SSMClient(clientConfig);
  const treeView = window.createTreeView(explorerView.id, {
    treeDataProvider: new Ec2InstanceTreeProvider(ec2),
  });
  context.subscriptions.push(treeView);
  const openItemCommand = packageJson.contributes.commands[0].command;

  commands.registerCommand(openItemCommand, async (ec2Instance: Instance) => {
    window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: `Starting a connection to the EC2 instance: ${ec2Instance.InstanceId}`,
        cancellable: true,
      },
      async (progress, token) => {
        const destination = context.globalStorageUri.path;
        if (!existsSync(destination)) {
          await mkdir(destination);
        }
        console.log("Storage path:", destination);
        const proxyScriptPath = resolve(
          __dirname,
          process.env.PROXY_SCRIPT_FILENAME as string
        );
        const sessionManagerBinPath = resolve(
          __dirname,
          process.env.SESSION_MANAGER_BIN as string
        );
        const region = await ec2.config.region();

        const keyPairPaths = await generateKeyPair(destination);
        const sshConfig = toSshConfig({
          ...keyPairPaths,
          proxyScriptPath,
          region,
          profile,
          sessionManagerBinPath,
        });
        const sshConfigPath = resolve(destination, "config");
        await writeFile(sshConfigPath, sshConfig);
        await workspace
          .getConfiguration()
          .update(
            "remote.SSH.configFile",
            sshConfigPath,
            ConfigurationTarget.Global
          );
        const stateResolver = new InstanceStateResolver(ssmClient, ec2);
        const instanceStarter = new InstanceStarter(ec2, stateResolver);
        const instanceId = ec2Instance.InstanceId as string;
        progress.report({ message: "Waiting for instance to be online..." });
        await instanceStarter.start(instanceId, 1000);
        const instanceInfoResponse = await ssmClient.send(
          new DescribeInstanceInformationCommand({
            Filters: [
              {
                Key: "InstanceIds",
                Values: [instanceId],
              },
            ],
          })
        );
        const instanceInfo = instanceInfoResponse.InstanceInformationList?.find(
          (info) => info.InstanceId === instanceId
        );
        const options = instanceInfo ? guessUsernames(instanceInfo) : [];
        const guess = options[0];
        progress.report({ message: "" });
        if (!token.isCancellationRequested) {
          const user = await window.showInputBox({
            placeHolder: guess || "Username",
            prompt: `The username for the instance: ${ec2Instance.InstanceId}`,
            value: guess,
          });
          if (user) {
            const uri = Uri.parse(
              `vscode-remote://ssh-remote+${user}@${ec2Instance.InstanceId}/home/${user}`
            );
            await commands.executeCommand("vscode.openFolder", uri);
          }
        }
      }
    );
  });
}

async function generateKeyPair(
  destinationDir: string
): Promise<{ privateKeyPath: string; publicKeyPath: string }> {
  const keyPair = createKeyPair();
  const privateKeyFileName = "id_rsa";
  const privateKeyPath = resolve(destinationDir, privateKeyFileName);
  const destinations = {
    privateKeyPath,
    publicKeyPath: `${privateKeyPath}.pub`,
  };
  if (!existsSync(privateKeyPath) || !existsSync(destinations.publicKeyPath)) {
    await writeFile(destinations.publicKeyPath, keyPair.publicKey);
    await writeFile(privateKeyPath, keyPair.privateKey, { mode: 0o600 });
  }

  return destinations;
}
