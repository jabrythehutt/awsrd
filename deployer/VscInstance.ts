import { Construct } from "constructs";
import {
  ComparisonOperator,
  TreatMissingData,
} from "aws-cdk-lib/aws-cloudwatch";
import { Instance } from "aws-cdk-lib/aws-ec2";
import { VscInstanceProps } from "./VscInstanceProps";
import { MetricStatistic, MonitoringFacade } from "cdk-monitoring-constructs";
import { Duration, Stack } from "aws-cdk-lib";
import { StopAlarmActionStrategy } from "./StopAlarmActionStrategy";
import { Topic } from "aws-cdk-lib/aws-sns";
import { StopperEnvVar } from "./StopperEnvVar";
import { Runtime, Function, Code } from "aws-cdk-lib/aws-lambda";
import { SnsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { LambdaProps } from "./LambdaProps";
export class VscInstance extends Construct {
  public readonly topic: Topic;
  public readonly instance: Instance;
  public readonly monitoring: MonitoringFacade;
  public readonly stopper: Function;
  public readonly stopperSource: SnsEventSource;
  constructor(
    scope: Construct,
    id: string,
    props: VscInstanceProps & { lambdaProps: LambdaProps },
  ) {
    super(scope, id);
    this.instance = new Instance(this, "Instance", props);
    this.topic = new Topic(this, "InactivityTopic", {
      displayName: `Inactivity topic for ${this.instance.instanceId}`,
    });
    this.instance.instance.hibernationOptions = props.hibernationOptions;
    this.monitoring = new MonitoringFacade(
      this,
      `${props.alarmNamePrefix}Monitoring`,
      {
        alarmFactoryDefaults: {
          action: new StopAlarmActionStrategy(this.topic),
          alarmNamePrefix: props.alarmNamePrefix,
          actionsEnabled: true,
        },
      },
    ).monitorEC2Instances({
      instanceIds: [this.instance.instanceId],
    });
    const alarmFactory = this.monitoring.createAlarmFactory(`InactivityAlarm`);
    const stopperEnv: Record<StopperEnvVar, string> = {
      [StopperEnvVar.InstanceId]: this.instance.instanceId,
    };
    this.stopper = new Function(this, "Stopper", {
      runtime: Runtime.NODEJS_22_X,
      environment: stopperEnv,
      code: Code.fromAsset(props.lambdaProps.bundlePath),
      handler: "handler.handler",
    });
    this.stopperSource = new SnsEventSource(this.topic);
    this.stopper.addEventSource(this.stopperSource);
    this.stopper.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ec2:StopInstances"],
        resources: [this.toArn(this.instance.instanceId)],
      }),
    );

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
      Duration.minutes(1),
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

  toArn(instanceId: string): string {
    const stack = Stack.of(this);
    return `arn:aws:ec2:${stack.region}:${stack.account}:instance/${instanceId}`;
  }
}
