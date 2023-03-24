import {
  SSMClient,
  StartSessionCommand,
  StartSessionCommandInput,
} from "@aws-sdk/client-ssm";
import { ChildProcess, spawn } from "node:child_process";
import { arch, platform } from "node:os";
import { resolve } from "path";

export class SessionStarter {
  constructor(
    private ssmClient: SSMClient,
    private sessionManagerBinPath: string
  ) {}

  async start(request: {
    instanceId: string;
    port: number;
  }): Promise<ChildProcess> {
    const startSessionParams: StartSessionCommandInput = {
      DocumentName: "AWS-StartSSHSession",
      Target: request.instanceId,
      Parameters: {
        portNumber: [`${request.port}`],
      },
    };
    const response = await this.ssmClient.send(
      new StartSessionCommand(startSessionParams)
    );

    const region = await this.ssmClient.config.region();
    const ssmPluginArgs: string[] = [
      JSON.stringify(response),
      region,
      "StartSession",
      "", // AWS CLI profile name goes here
      JSON.stringify(startSessionParams),
      `https://ssm.${region}.amazonaws.com`,
    ];

    process.stdin.pause();
    const child = spawn(this.sessionManagerPath, ssmPluginArgs, {
      stdio: "inherit",
    });

    child.on("exit", () => {
      process.stdin.resume();
    });
    return child;
  }

  get sessionManagerPath(): string {
    const nodeArch = arch();
    const architecture = nodeArch === "x64" ? "amd64" : nodeArch;
    return resolve(
      this.sessionManagerBinPath,
      `${platform()}_${architecture}_plugin/session-manager-plugin`
    );
  }
}
