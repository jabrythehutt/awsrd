import { AwsClientFactory } from "./AwsClientFactory";
import { CreateInstanceRequest } from "./CreateInstanceRequest";
import { join } from "path";
import { Observable } from "rxjs";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { toPromise } from "./toPromise";

export class InstanceCreator {
  constructor(
    private serviceFactory: AwsClientFactory,
    private profileStore: Observable<string>,
    private cdkAppPath: string
  ) {}

  get cdkBinaryPath(): string {
    return join(__dirname, "node_modules", "aws-cdk", "bin", "cdk");
  }

  protected toArgs(params: Record<string, string>): string[] {
    return Object.entries(params).map(([key, value]) => `--${key} "${value}"`);
  }

  protected async resolveAccountId(stsClient: STSClient): Promise<string> {
    const response = await stsClient.send(new GetCallerIdentityCommand({}));
    return response.Account as string;
  }

  async toTerminalCommands(request: CreateInstanceRequest): Promise<string[]> {
    const optionArgs = Object.entries(request).map(
      ([key, value]) => `-c ${key}="${value}"`
    );
    const stsClient = await this.serviceFactory.createAwsClientPromise(
      STSClient
    );
    const region = await stsClient.config.region();
    const account = await this.resolveAccountId(stsClient);
    const profile = await toPromise(this.profileStore);
    const extraArgs = this.toArgs({ profile, region });
    const appArgs = `-a "node ${this.cdkAppPath}"`;
    const bootstrapCommand = [
      this.cdkBinaryPath,
      "bootstrap",
      `aws://${account}/${region}`,
      ...extraArgs,
    ].join(" ");
    const deployAppCommand = [
      this.cdkBinaryPath,
      "deploy",
      appArgs,
      ...optionArgs,
      ...extraArgs,
    ].join(" ");
    const commands = [bootstrapCommand, deployAppCommand]
    return commands;
  }
}
