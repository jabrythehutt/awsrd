import {
  Ec2Action,
  Ec2InstanceAction,
} from "aws-cdk-lib/aws-cloudwatch-actions";
import {
  AlarmActionStrategyProps,
  IAlarmActionStrategy,
} from "cdk-monitoring-constructs";

export class StopAlarmActionStrategy implements IAlarmActionStrategy {
  addAlarmActions(props: AlarmActionStrategyProps): void {
    props.alarm.addAlarmAction(new Ec2Action(Ec2InstanceAction.STOP));
  }
}
