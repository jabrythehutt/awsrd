import { ProviderResult, TreeDataProvider, TreeItem } from "vscode";
import {
  EC2Client,
  Instance,
  paginateDescribeInstances,
} from "@aws-sdk/client-ec2";

export class Ec2InstanceTreeProvider implements TreeDataProvider<Instance> {
  constructor(private ec2: EC2Client) {}

  // onDidChangeTreeData?: Event<Instance | null | undefined> | undefined;

  getTreeItem(element: Instance): TreeItem | Thenable<TreeItem> {
    return {
      label: element.InstanceId,
      id: element.InstanceId,
    };
  }

  async getRootChildren(): Promise<Instance[] | null | undefined> {
    const instances: Instance[] = [];
    for await (const response of paginateDescribeInstances(
      { client: this.ec2 },
      {}
    )) {
      for (const reservation of response.Reservations || []) {
        instances.push(...(reservation.Instances || []));
      }
    }
    return instances;
  }

  getChildren(element: Instance): ProviderResult<Instance[]> {
    console.log("Getting elements for", element);
    return element ? [] : this.getRootChildren();
  }

  getParent?(element: Instance): ProviderResult<Instance> {
    return undefined;
  }
}
