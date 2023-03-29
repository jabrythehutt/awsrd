import {
  SSMClient,
  StartSessionCommand,
  StartSessionCommandInput,
} from "@aws-sdk/client-ssm";
import { ChildProcess, spawn } from "node:child_process";
import { resolve } from "path";
import { toSessionManagerArgs } from "./toSessionManagerArgs";

export class SessionStarter {
  constructor(
    private ssmClient: SSMClient,
    private sessionManagerBinPath: string
  ) {}

  async start(request: {
    instanceId: string;
    port: number;
    profile: string;
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

    const profile = request.profile;
    const region = await this.ssmClient.config.region();
    const ssmPluginArgs: string[] = toSessionManagerArgs({
      region,
      profile,
      request: startSessionParams,
      response,
    });

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
    return resolve(this.sessionManagerBinPath, "session-manager-plugin");
  }
}
