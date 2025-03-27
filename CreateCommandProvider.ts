import { _InstanceType } from "@aws-sdk/client-ec2";
import { CommandProvider } from "./CommandProvider";
import { CommandSuffix } from "./CommandSuffix";
import { window } from "vscode";
import validator from "validator";
import { executeTerminalCommands } from "./executeTerminalCommands";
import { InstanceCreator } from "./InstanceCreator";
import { InstanceStore } from "./InstanceStore";
import { StackArg } from "./StackArg";
import { CreateInstanceRequest } from "./CreateInstanceRequest";
import { defaultRootVolumeSizeGb } from "./defaultRootVolumeSizeGb";

export class CreateCommandProvider
  implements CommandProvider<CommandSuffix.Create>
{
  pickers: Record<StackArg, () => Promise<string | undefined>> = {
    [StackArg.InstanceType]: () => this.requestInstanceType(),
    [StackArg.RootVolumeSizeGb]: () => this.requestRootVolumeSize(),
    [StackArg.StackName]: () => this.requestStackName(),
    [StackArg.ImageId]: () => this.requestImageId(),
  };

  constructor(
    private instanceCreator: InstanceCreator,
    private instanceStore: InstanceStore,
  ) {}

  protected async requestImageId(): Promise<string | undefined> {
    return window.showInputBox({
      value: "",
      title: "Enter an AMI ID (optional)",
    });
  }

  protected async requestInstanceType(): Promise<string | undefined> {
    return window.showQuickPick(Object.values(_InstanceType), {
      title: "Select an instance type",
    });
  }
  protected async requestRootVolumeSize(): Promise<string | undefined> {
    const maxSize = 16000;
    return window.showInputBox({
      title: "Set the size of the root volume (GB)",
      value: `${defaultRootVolumeSizeGb}`,
      validateInput: (v) => {
        if (!v) {
          return "Must not be empty";
        } else if (
          !validator.isInt(v, {
            min: 1,
            max: maxSize,
          })
        ) {
          return `Must be between 1GB and 16TB`;
        }
      },
    });
  }

  protected async requestStackName(): Promise<string | undefined> {
    return window.showInputBox({
      title: "Enter a CloudFormation stack name",
      validateInput: (v) => {
        const parts = v.split("-");
        if (!parts.every((p) => validator.isAlphanumeric(p))) {
          return "Only alphanumeric and hyphens are allowed";
        } else if (!validator.isAlpha(v.substring(0, 1))) {
          return "Must start with an alphabetic character";
        } else if (v.length > 128) {
          return "Must be 128 characters at most";
        } else if (!v) {
          return "Must not be empty";
        }
      },
    });
  }

  async *requestArgs(): AsyncIterable<[StackArg, string | undefined]> {
    for (const [stackArg, picker] of Object.entries(this.pickers)) {
      const result = await picker();
      yield [stackArg as StackArg, result];
    }
  }

  parse(request: Record<StackArg, string>): CreateInstanceRequest {
    return {
      stackName: request.stackName,
      rootVolumeSizeGb: parseInt(request.rootVolumeSizeGb),
      instanceType: request.instanceType as _InstanceType,
      imageId: request.imageId,
    };
  }

  async execute(): Promise<void> {
    const request = {} as Record<StackArg, string>;
    for await (const [stackArg, response] of this.requestArgs()) {
      if (response === undefined) {
        return;
      }
      request[stackArg] = response as string;
    }
    const stackName = request.stackName;
    const terminalCommands = await this.instanceCreator.toTerminalCommands(
      this.parse(request),
    );
    const terminal = window.createTerminal(
      `Create developer instance ${stackName}`,
    );
    terminal.show();
    await executeTerminalCommands(terminal, terminalCommands);
    this.instanceStore.refresh();
  }
}
