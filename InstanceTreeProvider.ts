import {
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  Event,
} from "vscode";
import { Instance, InstanceStateName } from "@aws-sdk/client-ec2";
import { join } from "path";
import { toPromise } from "./toPromise";
import { InstanceStore } from "./InstanceStore";
import { existsSync } from "node:fs";
import { instanceTagName } from "./instanceTagName";
import { instanceTagValue } from "./instanceTagValue";
import { toInstanceName } from "./toInstanceName";
import { IconPaths } from "./IconPaths";
import { DisplayMode } from "./DisplayMode";

export class InstanceTreeProvider implements TreeDataProvider<string> {
  readonly eventEmitter = new EventEmitter<string | undefined>();
  readonly onDidChangeTreeData: Event<string | undefined>;
  protected iconPaths: Record<InstanceStateName, IconPaths>;

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
    const states: Record<InstanceStateName, undefined> = {
      pending: undefined,
      running: undefined,
      "shutting-down": undefined,
      stopped: undefined,
      stopping: undefined,
      terminated: undefined,
    };
    const stateNames = Object.keys(states) as InstanceStateName[];
    this.iconPaths = this.toIconPaths(stateNames);
  }

  protected toIconPaths(
    states: InstanceStateName[]
  ): Record<InstanceStateName, IconPaths> {
    return states.reduce(
      (result, instanceStateName) => ({
        ...result,
        [instanceStateName]: Object.values(DisplayMode).reduce(
          (iconPaths, iconType) => ({
            ...iconPaths,
            [iconType]: this.toIconPath(iconType, instanceStateName),
          }),
          {} as IconPaths
        ),
      }),
      {} as Record<InstanceStateName, IconPaths>
    );
  }

  protected toIconPath(
    type: keyof IconPaths,
    instanceStateName: InstanceStateName
  ): string {
    const mediaDir = join(__dirname, "media");
    const iconPrefix = "vm_";
    const iconPath = join(
      mediaDir,
      `${iconPrefix}${instanceStateName}_${type}.svg`
    );
    if (!existsSync(iconPath)) {
      return join(mediaDir, `${iconPrefix}${type}.svg`);
    }
    return iconPath;
  }

  async getTreeItem(id: string): Promise<TreeItem> {
    const instance = (await this.instanceStore.describe(id)) as Instance;
    const tags = instance.Tags || [];
    const managedTag = tags.find(
      (t) => t.Key === instanceTagName && t.Value === instanceTagValue
    );
    const instanceStateName = instance.State?.Name as InstanceStateName;
    const contextValue = instanceStateName + (managedTag ? ".managed" : "");
    return {
      label: instance.InstanceId,
      description: toInstanceName(instance),
      id,
      tooltip: this.toTooltip(instance),
      iconPath: this.iconPaths[instanceStateName],
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
