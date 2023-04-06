import {
  DescribeInstancesCommandOutput,
  EC2Client,
  Instance,
  paginateDescribeInstances,
} from "@aws-sdk/client-ec2";
import {
  Observable,
  ReplaySubject,
  Subject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  pairwise,
  shareReplay,
  switchMap,
} from "rxjs";
import { AwsClientFactory } from "./AwsClientFactory";
import { toPromise } from "./toPromise";
import { flatten } from "./flatten";
import { isEqual } from "lodash";

export class InstanceStore {
  public readonly changes: Observable<string[]>;
  public readonly instanceIds: Observable<string[]>;
  protected readonly instances: Observable<Instance[]>;
  protected readonly ec2Client: Observable<EC2Client>;
  protected readonly refreshSubject: Subject<void> = new ReplaySubject(1);
  constructor(clientFactory: AwsClientFactory) {
    this.ec2Client = clientFactory.createAwsClient(EC2Client);
    this.instances = combineLatest([this.ec2Client, this.refreshSubject]).pipe(
      switchMap(([client]) => this.listAll(client)),
      shareReplay(1)
    );
    const toInstanceId = (instance: Instance) => instance.InstanceId as string;

    this.instanceIds = this.instances.pipe(
      map((instances) => instances.map(toInstanceId)),
      map((instanceIds) => instanceIds.sort()),
      distinctUntilChanged(isEqual)
    );
    this.changes = this.instances.pipe(
      map((instances) =>
        instances.sort((i1, i2) =>
          toInstanceId(i1).localeCompare(toInstanceId(i2))
        )
      ),
      pairwise(),
      filter(([previous, current]) =>
        isEqual(previous.map(toInstanceId), current.map(toInstanceId))
      ),
      map(([previous, current]) =>
        current.filter((instance, index) => !isEqual(instance, previous[index]))
      ),
      map((instances) => instances.map(toInstanceId)),
      filter((changes) => changes.length > 0)
    );
    this.refresh();
  }

  protected async listAll(client: EC2Client): Promise<Instance[]> {
    const instances: Instance[] = [];
    for await (const response of paginateDescribeInstances({ client }, {})) {
      instances.push(...this.toInstances(response));
    }
    return instances;
  }

  protected toInstances(response: DescribeInstancesCommandOutput): Instance[] {
    return flatten(
      response.Reservations?.map((r) => r.Instances) as Instance[][]
    );
  }

  async describe(instanceId: string): Promise<Instance | undefined> {
    const instances = await toPromise(this.instances);
    return instances.find((i) => i.InstanceId === instanceId);
  }

  refresh() {
    this.refreshSubject.next();
  }
}
