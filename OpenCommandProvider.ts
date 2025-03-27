import {
  DescribeInstanceInformationCommand,
  InstanceInformation,
  PingStatus,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { AwsClientFactory } from "./AwsClientFactory";
import { CommandProvider } from "./CommandProvider";
import { toPromise } from "./toPromise";
import { InstanceStore } from "./InstanceStore";
import { Observable } from "rxjs";
import { toInstanceLabel } from "./toInstanceLabel";
import {
  ConfigurationTarget,
  ExtensionContext,
  ProgressLocation,
  Uri,
  commands,
  window,
  workspace,
} from "vscode";
import { CommandName } from "./CommandName";
import { Instance } from "@aws-sdk/client-ec2";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { guessUsernames } from "./guessUsernames";
import { createKeyPair } from "./createKeyPair";
import { toSshConfig } from "./toSshConfig";
import { InstanceStarter } from "./InstanceStarter";
import { AwsContextResolver } from "./AwsContextResolver";

export class OpenCommandProvider implements CommandProvider<string> {
  constructor(
    private serviceFactory: AwsClientFactory,
    private instanceStore: InstanceStore,
    private profileStore: Observable<string>,
    private context: ExtensionContext,
    private instanceStarter: InstanceStarter,
    private awsContextResolver: AwsContextResolver,
  ) {}

  protected async createSshConfig(storageDir: string): Promise<string> {
    const proxyScriptPath = resolve(
      __dirname,
      process.env.PROXY_SCRIPT_FILENAME as string,
    );
    const sessionManagerBinPath = resolve(
      __dirname,
      process.env.SESSION_MANAGER_BIN as string,
    );

    const keyPairPaths = await this.generateKeyPair(storageDir);
    const profile = await toPromise(this.profileStore);
    const region = await toPromise(this.awsContextResolver.region$);
    return toSshConfig({
      ...keyPairPaths,
      proxyScriptPath,
      region,
      profile,
      sessionManagerBinPath,
    });
  }

  protected async generateKeyPair(
    destinationDir: string,
  ): Promise<{ privateKeyPath: string; publicKeyPath: string }> {
    const keyPair = createKeyPair();
    const privateKeyFileName = "id_rsa";
    const privateKeyPath = resolve(destinationDir, privateKeyFileName);
    const destinations = {
      privateKeyPath,
      publicKeyPath: `${privateKeyPath}.pub`,
    };
    if (
      !existsSync(privateKeyPath) ||
      !existsSync(destinations.publicKeyPath)
    ) {
      await writeFile(destinations.publicKeyPath, keyPair.publicKey);
      await writeFile(privateKeyPath, keyPair.privateKey, { mode: 0o600 });
    }
    return destinations;
  }

  async requestInstanceInfo(
    instanceId: string,
  ): Promise<InstanceInformation | undefined> {
    const ssmClient =
      await this.serviceFactory.createAwsClientPromise(SSMClient);
    const instanceInfoResponse = await ssmClient.send(
      new DescribeInstanceInformationCommand({
        Filters: [
          {
            Key: "InstanceIds",
            Values: [instanceId],
          },
        ],
      }),
    );
    return instanceInfoResponse.InstanceInformationList?.find(
      (info) => info.InstanceId === instanceId,
    );
  }

  protected async requestUsername(
    instanceInfo: InstanceInformation | undefined,
    label: string,
  ): Promise<string | undefined> {
    const options = instanceInfo ? guessUsernames(instanceInfo) : [];
    const guess = options[0];
    return window.showInputBox({
      placeHolder: guess || "Username",
      prompt: `The username for ${label}`,
      value: guess,
    });
  }

  /**
   * Implementation based on: https://github.com/microsoft/vscode/issues/187202#issuecomment-1631660447
   */
  toConnectionString(request: {
    hostName: string;
    user: string;
    port: number;
  }): string {
    const encodedhost = Buffer.from(JSON.stringify(request), "utf8").toString(
      "hex",
    );
    return `vscode-remote://ssh-remote+${encodedhost}/home/${request.user}`;
  }

  async execute(instanceId: string): Promise<void> {
    const instance = await this.instanceStore.describe(instanceId);
    const label = toInstanceLabel(instance as Instance);
    await commands.executeCommand(CommandName.start, instanceId);
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: `Starting a connection to ${label}`,
        cancellable: true,
      },
      async (progress, token) => {
        const destination = this.context.globalStorageUri.path;
        if (!existsSync(destination)) {
          await mkdir(destination);
        }
        const sshConfig = await this.createSshConfig(destination);
        const sshConfigPath = resolve(destination, "config");
        await writeFile(sshConfigPath, sshConfig);
        await workspace
          .getConfiguration()
          .update(
            "remote.SSH.configFile",
            sshConfigPath,
            ConfigurationTarget.Global,
          );
        progress.report({ message: "Waiting for instance to be reachable..." });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of this.instanceStarter.waitForStatus(
          instanceId,
          PingStatus.ONLINE,
        )) {
          if (token.isCancellationRequested) {
            return;
          }
        }
        const instanceInfo = await this.requestInstanceInfo(instanceId);
        progress.report({ message: "" });
        this.instanceStore.refresh();
        if (token.isCancellationRequested) {
          return;
        }
        const user = await this.requestUsername(instanceInfo, label);
        if (user) {
          const uri = Uri.parse(
            this.toConnectionString({ hostName: instanceId, user, port: 22 }),
          );
          await commands.executeCommand("vscode.openFolder", uri, {
            forceNewWindow: true,
          });
        }
      },
    );
  }
}
