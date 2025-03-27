import { CfnInstance, InstanceProps } from "aws-cdk-lib/aws-ec2";

export interface VscInstanceProps extends InstanceProps {
  alarmNamePrefix: string;
  hibernationOptions: CfnInstance.HibernationOptionsProperty;
}
