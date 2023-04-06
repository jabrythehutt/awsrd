import {
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  Event,
} from "vscode";
import {
  Instance,
} from "@aws-sdk/client-ec2";
import { join } from "path";
import { toPromise } from "./toPromise";
import { toInstanceLabel } from "./toInstanceLabel";
import { InstanceStore } from "./InstanceStore";

export class Ec2InstanceTreeProvider implements TreeDataProvider<string> {
  readonly eventEmitter = new EventEmitter<string | undefined>();
  readonly onDidChangeTreeData: Event<string | undefined>;

  constructor(private instanceStore: InstanceStore) {
    this.onDidChangeTreeData = this.eventEmitter.event;
    instanceStore.instanceIds.subscribe(() => this.eventEmitter.fire(undefined));
    instanceStore.changes.subscribe(async changes => {
      for (const change of changes) {
        this.eventEmitter.fire(change)
      }
    });
  }

  async getTreeItem(id: string): Promise<TreeItem> {
    const instance = (await this.instanceStore.describe(id)) as Instance;
    const label = toInstanceLabel(instance);
    const mediaDir = join(__dirname, "media");
    return {
      label,
      id,
      iconPath: {
        light: join(mediaDir, "instance_light.svg"),
        dark: join(mediaDir, "instance_dark.svg"),
      },
      contextValue: instance.State?.Name,
    };
  }

  getRootChildren(): Promise<string[] | null | undefined> {
    return toPromise(this.instanceStore.instanceIds)
  }

  getChildren(element: string): ProviderResult<string[]> {
    return element ? [] : this.getRootChildren();
  }

  getParent?(element: string): ProviderResult<string> {
    return undefined;
  }
}
