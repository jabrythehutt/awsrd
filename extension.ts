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
import { InstanceTreeProvider } from "./InstanceTreeProvider";
import validator from "validator";
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
  PingStatus,
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
import { AwsContextResolver } from "./AwsContextResolver";
import { CdkCommander } from "./CdkCommander";
import { InstanceDeleter } from "./InstanceDeleter";
import { writeKeyPairToDir } from "./writeKeyPairToDir";

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
  const awsContextResolver = new AwsContextResolver(serviceFactory);
  const cdkCommander = new CdkCommander(awsContextResolver, profileStore.value);
  const treeView = window.createTreeView(explorerView.id, {
    treeDataProvider: new InstanceTreeProvider(instanceStore),
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
  const deleteCommand = commandDefs[7].command;

  commands.registerCommand(deleteCommand, async (instanceId: string) => {
    const instance = await instanceStore.describe(instanceId);
    const label = toInstanceLabel(instance as Instance);
    const accept = "Yes";
    const answer = await window.showInformationMessage(
      `Are you sure you want to delete ${label} and its associated CloudFormation stack?`,
      accept,
      "No"
    );
    if (answer === accept) {
      const instanceDeleter = new InstanceDeleter(instanceStore, cdkCommander);
      const terminalCommands = await instanceDeleter.toTerminalCommands(
        instanceId
      );
      const terminal = window.createTerminal(`Deleting ${label}`);
      terminal.show();
      await executeTerminalCommands(terminal, terminalCommands);
      instanceStore.refresh();
    }
  });

  commands.registerCommand(createCommand, async () => {
    const instanceCreator = new InstanceCreator(cdkCommander);
    const instanceType = await window.showQuickPick(
      Object.values(_InstanceType),
      {
        title: "Select an instance type",
      }
    );

    const maxSize = 16000;
    const rootVolumeSize = String(
      await window.showInputBox({
        title: "Set the size of the root volume (GB)",
        value: `${20}`,
        validateInput: (v) => {
          if (!v) {
            return "Must not be empty";
          } else if (
            !validator.isInt(v, {
              min: 1,
              max: maxSize,
            })
          ) {
            return `Must be between 1GB and 16TB`;
          }
        },
      })
    );

    const stackName = String(
      await window.showInputBox({
        title: "Enter a CloudFormation stack name",
        validateInput: (v) => {
          const parts = v.split("-");
          if (!parts.every((p) => validator.isAlphanumeric(p))) {
            return "Only alphanumeric and hyphens are allowed";
          } else if (!validator.isAlpha(v.substring(0, 1))) {
            return "Must start with an alphabetic character";
          } else if (v.length > 128) {
            return "Must be 128 characters at most";
          } else if (!v) {
            return "Must not be empty";
          }
        },
      })
    );

    const terminalCommands = await instanceCreator.toTerminalCommands({
      stackName,
      instanceName: stackName,
      instanceType: instanceType as _InstanceType,
      rootVolumeSizeGb: parseInt(rootVolumeSize),
    });
    const terminal = window.createTerminal(
      `Create developer instance ${stackName}`
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
          cancellable: true,
        },
        async (progress, token) => {
          await instanceStarter.requestInstanceState(instanceId, targetState);
          instanceStore.refresh();
          for await (const state of instanceStarter.waitForState(
            instanceId,
            targetState
          )) {
            progress.report({ message: state });
            if (token.isCancellationRequested) {
              break;
            }
          }
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
        for await (const _ of instanceStarter.waitForStatus(
          instanceId,
          PingStatus.ONLINE
        )) {
          if (token.isCancellationRequested) {
            return;
          }
        }
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
        if (token.isCancellationRequested) {
          return;
        }
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
    );
  });
}

async function generateKeyPair(
  destinationDir: string
): Promise<{ privateKeyPath: string; publicKeyPath: string }> {
  const keyPair = createKeyPair();
  return writeKeyPairToDir(keyPair, destinationDir);
}
