import {
  EC2Client,
  Instance,
  paginateDescribeInstances,
} from "@aws-sdk/client-ec2";
import { Observable, concatMap } from "rxjs";
import { AwsClientFactory } from "./AwsClientFactory";

export class InstanceStore {
  readonly instances: Observable<Instance[]>;
  private readonly ec2Client: Observable<EC2Client>;
  constructor(clientFactory: AwsClientFactory) {
    this.ec2Client = clientFactory.createAwsClient(EC2Client);
    this.instances = this.ec2Client.pipe(
      concatMap((client) => this.listAll(client))
    );
  }

  protected async listAll(client: EC2Client): Promise<Instance[]> {
    const instances: Instance[] = [];
    for await (const response of paginateDescribeInstances({ client }, {})) {
      for (const reservation of response.Reservations || []) {
        instances.push(...(reservation.Instances || []));
      }
    }
    return instances;
  }
}
