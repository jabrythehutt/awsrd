import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { Topic } from "aws-cdk-lib/aws-sns";
import {
  AlarmActionStrategyProps,
  IAlarmActionStrategy,
} from "cdk-monitoring-constructs";

export class StopAlarmActionStrategy implements IAlarmActionStrategy {
  constructor(private topic: Topic) {}
  addAlarmActions(props: AlarmActionStrategyProps): void {
    props.alarm.addAlarmAction(new SnsAction(this.topic));
  }
}
