import { EC2Client, DescribeInstanceStatusCommand } from "@aws-sdk/client-ec2";

export class InstanceStateResolver {
    constructor(private ec2Client: EC2Client) {
    }

    async getInstanceState(instanceId: string): Promise<"running" | string | undefined> {
        const response = await this.ec2Client.send(new DescribeInstanceStatusCommand({
            InstanceIds: [
                instanceId
            ]
        }))
    
        const instanceInfo = response.InstanceStatuses?.find(info => info.InstanceId === instanceId);
        if (!instanceInfo) {
            const errorString = `Instance information not found for instance with ID: ${instanceId}`
            throw new Error(errorString);
        }

        return instanceInfo?.InstanceState?.Name;

    }

    async isOnline(instanceId: string): Promise<boolean> {
        const response = await this.getInstanceState(instanceId);
        return response === "running"
    }
}