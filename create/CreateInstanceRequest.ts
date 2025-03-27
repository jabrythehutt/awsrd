import { _InstanceType } from "@aws-sdk/client-ec2";
import { StackArg } from "./StackArg";
export interface CreateInstanceRequest {
  [StackArg.StackName]: string;
  [StackArg.RootVolumeSizeGb]: number;
  [StackArg.InstanceType]: _InstanceType;
  [StackArg.ImageId]: string;
}
