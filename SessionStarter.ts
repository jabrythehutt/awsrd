import {
  SSMClient,
  StartSessionCommand,
  StartSessionCommandInput,
} from "@aws-sdk/client-ssm";
import { ChildProcess, spawn } from "node:child_process";
import { toSessionManagerArgs } from "./toSessionManagerArgs";
import { AwsClientFactory } from "./AwsClientFactory";

export class SessionStarter {
  constructor(
    private serviceFactory: AwsClientFactory,
    private sessionManagerBinPath: string,
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
    const ssmClient =
      await this.serviceFactory.createAwsClientPromise(SSMClient);
    const response = await ssmClient.send(
      new StartSessionCommand(startSessionParams),
    );

    const profile = request.profile;
    const region = await ssmClient.config.region();
    const ssmPluginArgs: string[] = toSessionManagerArgs({
      region,
      profile,
      request: startSessionParams,
      response,
    });

    process.stdin.pause();
    const child = spawn(this.sessionManagerBinPath, ssmPluginArgs, {
      stdio: "inherit",
    });

    child.on("exit", () => {
      process.stdin.resume();
    });
    return child;
  }
}
