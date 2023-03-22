import { Construct } from "constructs";
import { ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Instance } from "aws-cdk-lib/aws-ec2";
import { VscInstanceProps } from "./VscInstanceProps";
import { MetricStatistic, MonitoringFacade } from "cdk-monitoring-constructs";
import { Duration } from "aws-cdk-lib";
import { Ec2StopAlarmActionStrategy } from "./Ec2StopAlarmActionStrategy";
import { Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";

export class VscInstance extends Construct {
    public readonly instance: Instance;
    public readonly monitoring: MonitoringFacade;
    constructor(scope: Construct, id: string, props: VscInstanceProps) {
        super(scope, id);
        this.instance = new Instance(this, "Instance", props);
        this.monitoring = new MonitoringFacade(this, "Monitoring", {
            alarmFactoryDefaults: {
                actionsEnabled: true,
                alarmNamePrefix: "EC2",
                action: new Ec2StopAlarmActionStrategy()
            }
        }).monitorEC2Instances({
            instanceIds: [
                this.instance.instanceId
            ],
        });
        const alarmFactory = this.monitoring.createAlarmFactory("InactivityAlarm")
        const metricFactory = this.monitoring.createMetricFactory();
        const cpuUtilisationMetric = metricFactory.createMetric("CPUUtilization", MetricStatistic.MAX, undefined, {
            InstanceId: this.instance.instanceId
        }, undefined, "AWS/EC2", Duration.minutes(1))
        alarmFactory.addAlarm(cpuUtilisationMetric, {
            alarmDescription: "Instance inactivity",
            alarmNameSuffix: "Inactivity",
            threshold: 2,
            comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
            period: Duration.minutes(30),
            treatMissingData: TreatMissingData.NOT_BREACHING,
        });
        this.instance.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "ssmmessages:CreateControlChannel",
                "ssmmessages:CreateDataChannel",
                "ssmmessages:OpenControlChannel",
                "ssmmessages:OpenDataChannel"
            ],
            resources: [
                "*"
            ]
        }))
        this.instance.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "s3:GetEncryptionConfiguration"
            ],
            resources: [
                "*"
            ]
        }))
        this.instance.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));
    }
}