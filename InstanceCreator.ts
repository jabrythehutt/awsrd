import { CreateInstanceRequest } from "./CreateInstanceRequest";
import { Observable } from "rxjs";
import { toPromise } from "./toPromise";
import { AwsContextResolver } from "./AwsContextResolver";
import { CdkCommander } from "./CdkCommander";

export class InstanceCreator {
  constructor(
    private contextResolver: AwsContextResolver,
    private profileStore: Observable<string>,
    private cdkCommander: CdkCommander
  ) {}

  async toTerminalCommands(request: CreateInstanceRequest): Promise<string[]> {
    const region = await this.contextResolver.region();
    const account = await this.contextResolver.account();
    const profile = await toPromise(this.profileStore);
    const optionArgs = this.cdkCommander.toOptionArgs({
      profile,
      region,
      "require-approval": "never",
    });
    const bootstrapCommand = [
      this.cdkCommander.cdkBinPath,
      "bootstrap",
      `aws://${account}/${region}`,
      ...optionArgs,
    ].join(" ");
    const deployAppCommand = [
      this.cdkCommander.cdkBinPath,
      "deploy",
      ...this.cdkCommander.cdkAppArgs,
      ...this.cdkCommander.toContextArgs(request),
      ...optionArgs,
    ].join(" ");
    const commands = [bootstrapCommand, deployAppCommand];
    return commands;
  }
}
