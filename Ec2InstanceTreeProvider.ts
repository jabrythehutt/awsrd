import {
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  Event,
} from "vscode";
import {
  EC2Client,
  Instance,
  paginateDescribeInstances,
} from "@aws-sdk/client-ec2";
import { join } from "path";
import { toPromise } from "./toPromise";
import { toInstanceLabel } from "./toInstanceLabel";
import { AwsClientFactory } from "./AwsClientFactory";
import { Observable } from "rxjs";

export class Ec2InstanceTreeProvider implements TreeDataProvider<Instance> {
  readonly eventEmitter = new EventEmitter<Instance | undefined>();
  readonly onDidChangeTreeData: Event<Instance | undefined>;
  private readonly client: Observable<EC2Client>;

  constructor(serviceFactory: AwsClientFactory) {
    this.onDidChangeTreeData = this.eventEmitter.event;
    this.client = serviceFactory.createAwsClient(EC2Client);
    this.client.subscribe(() => this.eventEmitter.fire(undefined));
  }

  getTreeItem(element: Instance): TreeItem | Thenable<TreeItem> {
    const label = toInstanceLabel(element);
    const id = element.InstanceId;
    const mediaDir = join(__dirname, "media");
    return {
      label,
      id,
      iconPath: {
        light: join(mediaDir, "instance_light.svg"),
        dark: join(mediaDir, "instance_dark.svg"),
      },
      contextValue: element.State?.Name,
    };
  }

  async getRootChildren(): Promise<Instance[] | null | undefined> {
    const instances: Instance[] = [];
    const client = await toPromise(this.client);
    for await (const response of paginateDescribeInstances({ client }, {})) {
      for (const reservation of response.Reservations || []) {
        instances.push(...(reservation.Instances || []));
      }
    }
    return instances;
  }

  getChildren(element: Instance): ProviderResult<Instance[]> {
    return element ? [] : this.getRootChildren();
  }

  getParent?(element: Instance): ProviderResult<Instance> {
    return undefined;
  }
}
