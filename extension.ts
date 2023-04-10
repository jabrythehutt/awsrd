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
import {
  Instance,
  InstanceStateName,
  _InstanceType,
} from "@aws-sdk/client-ec2";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createKeyPair } from "./createKeyPair";
import { toSshConfig } from "./toSshConfig";
import { InstanceStarter } from "./InstanceStarter";
import { InstanceStateResolver } from "./InstanceStateResolver";
import {
  DescribeInstanceInformationCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { guessUsernames } from "./guessUsernames";
import { ProfileStore } from "./ProfileStore";
import { RegionStore } from "./RegionStore";
import { toPromise } from "./toPromise";
import { toInstanceLabel } from "./toInstanceLabel";
import { createCredentialStore } from "./createCredentialStore";
import { AwsClientFactory } from "./AwsClientFactory";
import { InstanceStore } from "./InstanceStore";
import { listProfiles } from "./listProfiles";
import { InstanceCreator } from "./InstanceCreator";
import { executeTerminalCommands } from "./executeTerminalCommands";

export async function activate(context: ExtensionContext) {
  const explorerViews = packageJson.contributes.views["ec2-explorer"];
  const profileStore = new ProfileStore();
  const regionStore = new RegionStore();
  const credentials$ = createCredentialStore(profileStore.value);
  const serviceFactory = new AwsClientFactory(credentials$, regionStore.value);
  const stateResolver = new InstanceStateResolver(serviceFactory);
  const instanceStarter = new InstanceStarter(serviceFactory, stateResolver);
  const explorerView = explorerViews[0];
  const instanceStore = new InstanceStore(serviceFactory);
  const treeView = window.createTreeView(explorerView.id, {
    treeDataProvider: new Ec2InstanceTreeProvider(instanceStore),
  });
  context.subscriptions.push(treeView);
  const commandDefs = packageJson.contributes.commands;
  const openItemCommand = commandDefs[0].command;
  const stopItemCommand = commandDefs[1].command;
  const startItemCommand = commandDefs[2].command;
  const selectProfileCommand = commandDefs[3].command;
  const selectRegionCommand = commandDefs[4].command;
  const refreshCommand = commandDefs[5].command;
  const createCommand = commandDefs[6].command;

  commands.registerCommand(createCommand, async () => {
    const cdkAppPath = resolve(
      __dirname,
      process.env.CDK_APP_FILENAME as string
    );
    const instanceCreator = new InstanceCreator(
      serviceFactory,
      profileStore.value,
      cdkAppPath
    );
    const instanceType = await window.showQuickPick(
      Object.values(_InstanceType),
      {
        title: "Select an instance type",
      }
    );

    const instanceName = await window.showInputBox({
      title: "Enter a name for the instance",
    });

    const maxSize = 100000;
    const rootVolumeSize = await window.showInputBox({
      title: "Set the size of the root volume (GB)",
      value: `${100}`,
      validateInput: (v) => {
        if (!v) {
          return "No value entered";
        } else if (!(parseInt(v) > 0 && parseInt(v) < maxSize)) {
          return `Value needs to be greater than 0 and less than ${maxSize}`;
        }
      },
    });
    const terminalCommands = await instanceCreator.toTerminalCommands({
      instanceName: instanceName as string,
      instanceType: instanceType as _InstanceType,
      rootVolumeSizeGb: parseInt(rootVolumeSize as string),
    });
    const terminal = window.createTerminal(
      `Create developer instance ${instanceName}`
    );
    terminal.show();
    await executeTerminalCommands(terminal, terminalCommands);
    instanceStore.refresh();
  });

  commands.registerCommand(selectRegionCommand, async () => {
    const configPath = "ec2vsc.region";
    const regionsList =
      packageJson.contributes.configuration.properties[configPath].type.enum;
    const region = await window.showQuickPick(regionsList, {
      title: "Select an AWS region",
    });
    await workspace
      .getConfiguration()
      .update(configPath, region, ConfigurationTarget.Global);
    await commands.executeCommand(refreshCommand);
  });

  commands.registerCommand(selectProfileCommand, async () => {
    const configPath = "ec2vsc.profile";
    const profiles = await listProfiles();
    const profile = await window.showQuickPick(profiles, {
      title: "Select an AWS profile",
    });
    await workspace
      .getConfiguration()
      .update(configPath, profile, ConfigurationTarget.Global);
    await commands.executeCommand(refreshCommand);
  });

  commands.registerCommand(refreshCommand, async () => {
    instanceStore.refresh();
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Refreshing EC2 list",
        cancellable: false,
      },
      async (progress, token) => {
        await toPromise(instanceStore.instanceIds);
      }
    );
  });

  function registerInstanceStateCommand(
    commandName: string,
    targetState: InstanceStateName
  ) {
    commands.registerCommand(commandName, async (instanceId: string) => {
      const instance = await instanceStore.describe(instanceId);
      const label = toInstanceLabel(instance as Instance);
      const title = `${
        targetState === "running" ? "Starting" : "Stopping"
      } ${label}`;
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title,
          cancellable: false,
        },
        async (progress, token) => {
          await instanceStarter.requestInstanceState(instanceId, targetState);
          instanceStore.refresh();
          await instanceStarter.waitForState(instanceId, targetState);
          instanceStore.refresh();
        }
      );
    });
  }

  registerInstanceStateCommand(startItemCommand, "running");
  registerInstanceStateCommand(stopItemCommand, "stopped");

  commands.registerCommand(openItemCommand, async (instanceId: string) => {
    const ssmClient = await serviceFactory.createAwsClientPromise(SSMClient);
    const region = await ssmClient.config.region();
    const profile = await toPromise(profileStore.value);
    const instance = await instanceStore.describe(instanceId);
    const label = toInstanceLabel(instance as Instance);
    await commands.executeCommand(startItemCommand, instanceId);
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: `Starting a connection to ${label}`,
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
        progress.report({ message: "Waiting for instance to be reachable..." });
        await instanceStarter.start(instanceId);
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
        instanceStore.refresh();
        if (!token.isCancellationRequested) {
          const user = await window.showInputBox({
            placeHolder: guess || "Username",
            prompt: `The username for ${label}`,
            value: guess,
          });
          if (user) {
            const uri = Uri.parse(
              `vscode-remote://ssh-remote+${user}@${instanceId}/home/${user}`
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
