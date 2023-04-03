import {
  EC2Client,
  DescribeInstanceStatusCommand,
  InstanceStateName,
} from "@aws-sdk/client-ec2";
import {
  DescribeInstanceInformationCommand,
  PingStatus,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { AwsServiceFactory } from "./AwsServiceFactory";

export class InstanceStateResolver {
  constructor(private serviceFactory: AwsServiceFactory) {}

  async ping(instanceId: string): Promise<PingStatus | undefined> {
    const client = await this.serviceFactory.createAwsClientPromise(SSMClient);
    const response = await client.send(
      new DescribeInstanceInformationCommand({
        Filters: [
          {
            Key: "InstanceIds",
            Values: [instanceId],
          },
        ],
      })
    );
    const instanceInfo = response?.InstanceInformationList?.find(
      (info) => info.InstanceId === instanceId
    );
    return instanceInfo?.PingStatus as PingStatus;
  }

  async isOnline(instanceId: string): Promise<boolean> {
    const pingStatus = await this.ping(instanceId);
    return pingStatus === PingStatus.ONLINE;
  }

  async isRunning(instanceId: string): Promise<boolean> {
    const client = await this.serviceFactory.createAwsClientPromise(EC2Client);
    const instanceStatusResponse = await client.send(
      new DescribeInstanceStatusCommand({
        InstanceIds: [instanceId],
        IncludeAllInstances: true,
      })
    );
    const status = instanceStatusResponse.InstanceStatuses?.find(
      (s) => s.InstanceId === instanceId
    );
    if (!status) {
      throw new Error(
        `Couldn't find instance status for instance with ID: ${instanceId}`
      );
    }
    return status.InstanceState?.Name === InstanceStateName.running;
  }
}
