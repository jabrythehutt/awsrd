import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  InstanceStateName,
} from "@aws-sdk/client-ec2";
import { InstanceStateResolver } from "./InstanceStateResolver";
import { AwsClientFactory } from "./AwsClientFactory";
import { defaultPollPeriod } from "./defaultPollPeriod";
import { sleep } from "./sleep";
import { PingStatus } from "@aws-sdk/client-ssm";

export class InstanceStarter {
  protected readonly commands: Partial<
    Record<InstanceStateName, (instanceId: string) => Promise<void>>
  > = {
    running: (instanceId) => this.startInstance(instanceId),
    stopped: (instanceId) => this.stopInstance(instanceId),
  };

  constructor(
    private serviceFactory: AwsClientFactory,
    private stateResolver: InstanceStateResolver,
    private pollPeriod: number = defaultPollPeriod
  ) {}

  async requestInstanceState(
    instanceId: string,
    targetState: InstanceStateName
  ): Promise<void> {
    const command = this.commands[targetState];
    if (!command) {
      throw new Error(`Can't request for EC2 instance to be ${targetState}`);
    }
    if ((await this.toCurrentState(instanceId)) !== targetState) {
      await command(instanceId);
    }
  }

  async toCurrentState(
    instanceId: string
  ): Promise<InstanceStateName | undefined> {
    const instanceState = await this.stateResolver.describeInstance(instanceId);
    return instanceState.InstanceState?.Name as InstanceStateName;
  }

  async *waitForState(
    instanceId: string,
    targetState: InstanceStateName
  ): AsyncIterable<InstanceStateName | undefined> {
    return this.waitFor<InstanceStateName | undefined>(targetState, () => this.toCurrentState(instanceId))
  }

  async startInstance(instanceId: string): Promise<void> {
    const client = await this.serviceFactory.createAwsClientPromise(EC2Client);
    await client.send(
      new StartInstancesCommand({
        InstanceIds: [instanceId],
      })
    );
  }

  async *waitForStatus(instanceId: string, targetStatus: PingStatus): AsyncIterable<PingStatus | undefined> {
    return this.waitFor<PingStatus | undefined>(targetStatus, () => this.stateResolver.ping(instanceId));
  }

  async *waitFor<T>(target: T, extractor: () => Promise<T>): AsyncIterable<T> {
    let value = await extractor();
    while (value !== target) {
      yield value;
      await sleep(this.pollPeriod);
      value = await extractor();
    }
    yield value;
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
