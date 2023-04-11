import { InstanceStore } from "./InstanceStore";

export class InstanceDeleter {
  constructor(private instanceStore: InstanceStore) {}

  async toDeleteCommands(instanceId: string): Promise<string[]> {
    const instance = await this.instanceStore.describe(instanceId);
    const stackName = instance?.Tags?.find(
      (tag) => tag.Key === "aws:cloudformation:stack-name"
    )?.Value;
    if (!stackName) {
      throw new Error(
        `No associated stack was found for instance: ${instanceId}`
      );
    }
    throw new Error("Not implemented");
  }
}
