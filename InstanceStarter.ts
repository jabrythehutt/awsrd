import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  InstanceStateName
} from "@aws-sdk/client-ec2";
import { InstanceStateResolver } from "./InstanceStateResolver";
import { AwsClientFactory } from "./AwsClientFactory";

export class InstanceStarter {

  protected readonly commands: Partial<Record<InstanceStateName, (instanceId: string) => Promise<void>>> = {
    running: instanceId => this.startInstance(instanceId),
    stopped: instanceId => this.stopInstance(instanceId)
  }

  constructor(
    private serviceFactory: AwsClientFactory,
    private stateResolver: InstanceStateResolver,
    private pollPeriod: number = 1000
  ) { }

  async waitFor(condition: () => Promise<boolean>): Promise<void> {
    while (!(await condition())) {
      await new Promise((resolve) => setTimeout(resolve, this.pollPeriod));
    }
  }

  async requestInstanceState(instanceId: string, targetState: InstanceStateName): Promise<void> {
    const command = this.commands[targetState];
    if (!command) {
      throw new Error(`Can't request for EC2 instance to be ${targetState}`);
    }
    if ((await this.toCurrentState(instanceId)) !== targetState) {
      await command(instanceId);
    }
  }

  async toCurrentState(instanceId: string): Promise<InstanceStateName | undefined> {
    const instanceState = await this.stateResolver.describeInstance(instanceId);
    return instanceState.InstanceState?.Name as InstanceStateName;
  }

  async waitForState(instanceId: string, targetState: InstanceStateName): Promise<void> {
    await this.waitFor(async () => (await this.toCurrentState(instanceId)) === targetState);
  }

  async startInstance(instanceId: string): Promise<void> {
    const client = await this.serviceFactory.createAwsClientPromise(EC2Client);
    await client.send(
      new StartInstancesCommand({
        InstanceIds: [instanceId],
      })
    );
  }

  async start(instanceId: string): Promise<void> {
    const targetState = "running";
    await this.requestInstanceState(instanceId, targetState);
    await this.waitForState(instanceId, targetState);
    console.log("Instance has started");
    await this.waitFor(() => this.stateResolver.isOnline(instanceId));
    console.log("Instance is online");
  }

  async stopInstance(instanceId: string): Promise<void> {
    const client = await this.serviceFactory.createAwsClientPromise(EC2Client);
    await client.send(
      new StopInstancesCommand({
        InstanceIds: [instanceId],
      })
    );
  }
}
