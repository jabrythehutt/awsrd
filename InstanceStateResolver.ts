import {
  EC2Client,
  DescribeInstanceStatusCommand,
  InstanceStatus,
} from "@aws-sdk/client-ec2";
import {
  DescribeInstanceInformationCommand,
  PingStatus,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { AwsClientFactory } from "./AwsClientFactory";

export class InstanceStateResolver {
  constructor(private serviceFactory: AwsClientFactory) {}

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

  async describeInstance(instanceId: string): Promise<InstanceStatus> {
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
    return status;
  }
}
