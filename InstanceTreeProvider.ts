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
import { toInstanceLabel } from "./toInstanceLabel";
import { InstanceStore } from "./InstanceStore";
import { existsSync } from "node:fs";
import { instanceTagName } from "./instanceTagName";
import { instanceTagValue } from "./instanceTagValue";

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
    const label = toInstanceLabel(instance);
    const tags = instance.Tags || [];
    console.log(tags)
    const managedTag = tags.find(t => t.Key === instanceTagName && t.Value === instanceTagValue);
    console.log("Found tag:", managedTag);
    const contextValue = instance.State?.Name + (managedTag ? ".managed" : "")
    return {
      label,
      id,
      iconPath: {
        light: this.toIconPath("light", instance),
        dark: this.toIconPath("dark", instance),
      },
      contextValue
    };
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
