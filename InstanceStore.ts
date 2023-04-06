import {
    DescribeInstancesCommand,
    DescribeInstancesCommandOutput,
    EC2Client,
    Instance,
    paginateDescribeInstances,
} from "@aws-sdk/client-ec2";
import { Observable, concatMap, map } from "rxjs";
import { AwsClientFactory } from "./AwsClientFactory";
import { toPromise } from "./toPromise";
import { flatten } from "./flatten";

export class InstanceStore {
    public readonly instanceIds: Observable<string[]>;
    protected readonly instances: Observable<Instance[]>;
    protected readonly ec2Client: Observable<EC2Client>;
    constructor(clientFactory: AwsClientFactory) {
        this.ec2Client = clientFactory.createAwsClient(EC2Client);
        this.instances = this.ec2Client.pipe(
            concatMap((client) => this.listAll(client))
        );
        this.instanceIds = this.instances.pipe(map(instances => instances.map(i => i.InstanceId as string)));
    }

    protected async listAll(client: EC2Client): Promise<Instance[]> {
        const instances: Instance[] = [];
        for await (const response of paginateDescribeInstances({ client }, {})) {
            instances.push(...this.toInstances(response));
        }
        return instances;
    }

    toInstances(response: DescribeInstancesCommandOutput): Instance[] {
        return flatten(response.Reservations?.map(r => r.Instances) as Instance[][]);
    }

    protected async describeInstance(client: EC2Client, instanceId: string): Promise<Instance | undefined> {
        const response = await client.send(new DescribeInstancesCommand({
            InstanceIds: [
                instanceId
            ]
        }));
        const instances = this.toInstances(response);
        return instances.find((i: Instance) => i.InstanceId === instanceId) as Instance;
    }

    async describe(instanceId: string): Promise<Instance | undefined> {
        const client = await toPromise(this.ec2Client);
        const instances = await toPromise(this.instances);
        return instances.find(i => i.InstanceId === instanceId) || await this.describeInstance(client, instanceId);
    }
}
