import { EC2Client, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { InstanceStateResolver } from "./InstanceStateResolver";
import { AwsClientFactory } from "./AwsClientFactory";

export class InstanceStarter {
  constructor(
    private serviceFactory: AwsClientFactory,
    private stateResolver: InstanceStateResolver,
    private pollPeriod: number = 1000
  ) {}

  async waitFor(condition: () => Promise<boolean>): Promise<void> {
    while (!(await condition())) {
      await new Promise((resolve) => setTimeout(resolve, this.pollPeriod));
    }
  }

  async start(instanceId: string): Promise<void> {
    const isRunning = () => this.stateResolver.isRunning(instanceId);
    let online = await isRunning();
    if (!online) {
      console.log("Attempting to start EC2 instance:", instanceId);
      const client = await this.serviceFactory.createAwsClientPromise(
        EC2Client
      );
      await client.send(
        new StartInstancesCommand({
          InstanceIds: [instanceId],
        })
      );
    }
    await this.waitFor(isRunning);
    console.log("Instance has started");
    await this.waitFor(() => this.stateResolver.isOnline(instanceId));
    console.log("Instance is online");
  }

  async stop(instanceId: string): Promise<void> {
    const isStopped = () => this.stateResolver.isStopped(instanceId);
    await this.waitFor(isStopped);
  }
}
