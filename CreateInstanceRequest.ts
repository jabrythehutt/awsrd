import {_InstanceType} from "@aws-sdk/client-ec2";
export interface CreateInstanceRequest {
  rootVolumeSizeGb: number;
  user: string;
  instanceName: string;
  instanceType: _InstanceType;
}
