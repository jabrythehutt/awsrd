import { Construct } from "constructs";
import {
  ComparisonOperator,
  TreatMissingData,
} from "aws-cdk-lib/aws-cloudwatch";
import { Instance } from "aws-cdk-lib/aws-ec2";
import { VscInstanceProps } from "./VscInstanceProps";
import { MetricStatistic, MonitoringFacade } from "cdk-monitoring-constructs";
import { Duration } from "aws-cdk-lib";
import { StopAlarmActionStrategy } from "./StopAlarmActionStrategy";
export class VscInstance extends Construct {
  public readonly instance: Instance;
  public readonly monitoring: MonitoringFacade;
  constructor(scope: Construct, id: string, props: VscInstanceProps) {
    super(scope, id);
    this.instance = new Instance(this, "Instance", props);
    this.instance.instance.hibernationOptions = {
      configured: true
    };
    this.monitoring = new MonitoringFacade(
      this,
      `${props.alarmNamePrefix}Monitoring`,
      {
        alarmFactoryDefaults: {
          action: new StopAlarmActionStrategy(),
          alarmNamePrefix: props.alarmNamePrefix,
          actionsEnabled: true,
        },
      }
    ).monitorEC2Instances({
      instanceIds: [this.instance.instanceId],
    });
    const alarmFactory = this.monitoring.createAlarmFactory(`InactivityAlarm`);
    const metricFactory = this.monitoring.createMetricFactory();
    const cpuUtilisationMetric = metricFactory.createMetric(
      "CPUUtilization",
      MetricStatistic.MAX,
      undefined,
      {
        InstanceId: this.instance.instanceId,
      },
      undefined,
      "AWS/EC2",
      Duration.minutes(1)
    );
    alarmFactory.addAlarm(cpuUtilisationMetric, {
      alarmDescription: "Instance inactivity",
      alarmNameSuffix: "Inactivity",
      threshold: 2,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
      period: Duration.minutes(30),
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
  }
}
