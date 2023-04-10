import { _InstanceType } from "@aws-sdk/client-ec2";
import { StackArg } from "./StackArg";
export interface CreateInstanceRequest {
  [StackArg.RootVolumeSizeGb]: number;
  [StackArg.InstanceName]: string;
  [StackArg.InstanceType]: _InstanceType;
}
