import { _InstanceType } from "@aws-sdk/client-ec2";
import { CdkCommander } from "./CdkCommander";
import { CreateInstanceRequest } from "./CreateInstanceRequest";
import { InstanceStore } from "./InstanceStore";

export class InstanceDeleter {
  constructor(
    private instanceStore: InstanceStore,
    private cdkCommander: CdkCommander
  ) { }

  async toTerminalCommands(instanceId: string): Promise<string[]> {
    const stackName = await this.resolveStackName(instanceId);
    if (!stackName) {
      throw new Error(
        `No associated stack was found for instance: ${instanceId}`
      );
    }
    const context = this.toContext(stackName);
    return [await this.cdkCommander.toDefaultCommand("destroy", context)]
  }

  async resolveStackName(instanceId: string): Promise<string | undefined> {
    const instance = await this.instanceStore.describe(instanceId);
    return instance?.Tags?.find(
      (tag) => tag.Key === "aws:cloudformation:stack-name"
    )?.Value;
  }

  toContext(stackName: string): CreateInstanceRequest {
    return {
      stackName,
      // The instance request values don't matter since we're attempting to delete the stack
      instanceName: "foo",
      instanceType: _InstanceType.c7g_medium,
      rootVolumeSizeGb: 20
    }
  }
}
