import { CdkCommander } from "../command";
import { CreateInstanceRequest, defaultRootVolumeSizeGb } from "../create";
import { InstanceStore } from "../ec2";
import { defaultInstanceType } from "./defaultInstanceType";

export class InstanceDeleter {
  constructor(
    private instanceStore: InstanceStore,
    private cdkCommander: CdkCommander,
  ) {}

  async toTerminalCommands(instanceId: string): Promise<string[]> {
    const stackName = await this.resolveStackName(instanceId);
    if (!stackName) {
      throw new Error(
        `No associated stack was found for instance: ${instanceId}`,
      );
    }
    const context = this.toContext(stackName);
    const destroyCommand = await this.cdkCommander.toDefaultCommand(
      "destroy",
      context,
    );
    return [await this.cdkCommander.resolveBootstrapCommand(), destroyCommand];
  }

  async resolveStackName(instanceId: string): Promise<string | undefined> {
    const instance = await this.instanceStore.describe(instanceId);
    return instance?.Tags?.find(
      (tag) => tag.Key === "aws:cloudformation:stack-name",
    )?.Value;
  }

  toContext(stackName: string): CreateInstanceRequest {
    return {
      stackName,
      // The instance request values don't matter since we're attempting to delete the stack
      imageId: "",
      instanceType: defaultInstanceType,
      rootVolumeSizeGb: defaultRootVolumeSizeGb,
    };
  }
}
