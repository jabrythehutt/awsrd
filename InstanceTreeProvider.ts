import {
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  Event,
} from "vscode";
import { Instance } from "@aws-sdk/client-ec2";
import { join } from "path";
import { toPromise } from "./toPromise";
import { InstanceStore } from "./InstanceStore";
import { existsSync } from "node:fs";
import { instanceTagName } from "./instanceTagName";
import { instanceTagValue } from "./instanceTagValue";
import { toInstanceName } from "./toInstanceName";

export class InstanceTreeProvider implements TreeDataProvider<string> {
  readonly eventEmitter = new EventEmitter<string | undefined>();
  readonly onDidChangeTreeData: Event<string | undefined>;

  constructor(private instanceStore: InstanceStore) {
    this.onDidChangeTreeData = this.eventEmitter.event;
    instanceStore.instanceIds.subscribe(() =>
      this.eventEmitter.fire(undefined)
    );
    instanceStore.changes.subscribe(async (changes) => {
      for (const change of changes) {
        this.eventEmitter.fire(change);
      }
    });
  }

  toIconPath(type: "light" | "dark", instance: Instance): string {
    const mediaDir = join(__dirname, "media");
    const iconPrefix = instance.State?.Name
      ? `vm_${instance.State?.Name}`
      : "instance";
    const iconPath = join(mediaDir, `${iconPrefix}_${type}.svg`);
    if (!existsSync(iconPath)) {
      return join(mediaDir, `vm_${type}.svg`);
    }
    return iconPath;
  }

  async getTreeItem(id: string): Promise<TreeItem> {
    const instance = (await this.instanceStore.describe(id)) as Instance;
    const tags = instance.Tags || [];
    const managedTag = tags.find(
      (t) => t.Key === instanceTagName && t.Value === instanceTagValue
    );
    const contextValue = instance.State?.Name + (managedTag ? ".managed" : "");
    return {
      label: instance.InstanceId,
      description: toInstanceName(instance),
      id,
      tooltip: this.toTooltip(instance),
      iconPath: {
        light: this.toIconPath("light", instance),
        dark: this.toIconPath("dark", instance),
      },
      contextValue,
    };
  }

  toTooltip(instance: Instance): string {
    return `${toInstanceName(instance) || instance.InstanceId} is ${
      instance.State?.Name
    }`;
  }

  getRootChildren(): Promise<string[] | null | undefined> {
    return toPromise(this.instanceStore.instanceIds);
  }

  getChildren(element: string): ProviderResult<string[]> {
    return element ? [] : this.getRootChildren();
  }

  getParent?(element: string): ProviderResult<string> {
    return undefined;
  }
}
