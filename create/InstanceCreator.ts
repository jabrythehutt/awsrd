import { CreateInstanceRequest } from "./CreateInstanceRequest";
import { CdkCommander } from "../command";

export class InstanceCreator {
  constructor(private cdkCommander: CdkCommander) {}

  async toTerminalCommands(request: CreateInstanceRequest): Promise<string[]> {
    const bootstrapCommand = await this.cdkCommander.resolveBootstrapCommand();
    const deployAppCommand = await this.cdkCommander.toDefaultCommand(
      "deploy",
      request,
    );
    return [bootstrapCommand, deployAppCommand];
  }
}
