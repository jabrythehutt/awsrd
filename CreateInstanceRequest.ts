import { _InstanceType } from "@aws-sdk/client-ec2";
export interface CreateInstanceRequest {
  rootVolumeSizeGb: number;
  instanceName: string;
  instanceType: _InstanceType;
}
