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
import { Observable } from "rxjs";
import { toPromise } from "./toPromise";

export class Ec2InstanceTreeProvider implements TreeDataProvider<Instance> {
  readonly eventEmitter = new EventEmitter<Instance | undefined>();
  readonly onDidChangeTreeData: Event<Instance | undefined>;

  constructor(private ec2$: Observable<EC2Client>) {
    this.onDidChangeTreeData = this.eventEmitter.event;
    this.ec2$.subscribe(() => this.eventEmitter.fire(undefined));
  }

  getTreeItem(element: Instance): TreeItem | Thenable<TreeItem> {
    const name = element.Tags?.find((t) => t.Key === "Name")?.Value;
    const id = element.InstanceId;
    const label = name ? `${name} (${id})` : id;
    const mediaDir = join(__dirname, "media");
    return {
      label,
      id,
      iconPath: {
        light: join(mediaDir, "instance_light.svg"),
        dark: join(mediaDir, "instance_dark.svg"),
      },
    };
  }

  async getRootChildren(): Promise<Instance[] | null | undefined> {
    const instances: Instance[] = [];
    for await (const response of paginateDescribeInstances(
      { client: await toPromise(this.ec2$) },
      {}
    )) {
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
