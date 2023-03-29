import { EC2Client, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { InstanceStateResolver } from "./InstanceStateResolver";

export class InstanceStarter {
  constructor(
    private ec2Client: EC2Client,
    private stateResolver: InstanceStateResolver
  ) {}

  async waitFor(
    condition: () => Promise<boolean>,
    pollPeriod: number
  ): Promise<void> {
    while (!(await condition())) {
      await new Promise((resolve) => setTimeout(resolve, pollPeriod));
    }
  }

  async start(instanceId: string, pollPeriod: number): Promise<void> {
    const isRunning = () => this.stateResolver.isRunning(instanceId);
    let online = await isRunning();
    if (!online) {
      console.log("Attempting to start EC2 instance:", instanceId);
      await this.ec2Client.send(
        new StartInstancesCommand({
          InstanceIds: [instanceId],
        })
      );
    }
    await this.waitFor(isRunning, pollPeriod);
    console.log("Instance has started");
    await this.waitFor(
      () => this.stateResolver.isOnline(instanceId),
      pollPeriod
    );
    console.log("Instance is online");
  }
}
