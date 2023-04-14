import { CreateInstanceRequest } from "./CreateInstanceRequest";
import { AwsContextResolver } from "./AwsContextResolver";
import { CdkCommander } from "./CdkCommander";

export class InstanceCreator {
  constructor(
    private contextResolver: AwsContextResolver,
    private cdkCommander: CdkCommander
  ) {}

  async toTerminalCommands(request: CreateInstanceRequest): Promise<string[]> {
    const optionArgs = await this.cdkCommander.resolveCommonOptionArgs();
    const bootstrapCommand = this.toLine([
      this.cdkCommander.cdkBinPath,
      "bootstrap",
      `aws://${await this.contextResolver.account()}/${await this.contextResolver.region()}`,
      ...optionArgs,
    ]);
    const deployAppCommand = await this.cdkCommander.toDefaultCommand("deploy", request);
    return [bootstrapCommand, deployAppCommand];
  }

  toLine(commands: string[]): string {
    return commands.join(" ");
  }
}
