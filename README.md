# AWS Remote Development

[![Maintainability](https://api.codeclimate.com/v1/badges/53f17e26baec16b7dd69/maintainability)](https://codeclimate.com/github/jabrythehutt/awsrd/maintainability)

## Why

Launching an [AWS EC2 instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html) and then connecting to it via the [Remote SSH plugin](https://code.visualstudio.com/docs/remote/ssh-tutorial) requires some cumbersome manual steps. Moreover, large parts of this process must be repeated for every machine you wish to connect from (i.e. generating SSH keys and authorising them on your instance).

This extension aims to make that experience quick and portable across machines that you already connect to AWS with.

## How

EC2 instances are provisioned on your behalf with [CloudFormation](https://aws.amazon.com/cloudformation/) and the connection is established via [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html) so all you have to do is set up your [AWS CLI credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) and decide what type of machine you wish to use.

## Features

The extension allows you to:

- Create remote development EC2 instances that shut down automatically when inactive
  ![Create remote development EC2 instance](./docs/create_instance.gif)
- Connect to your development instances via SSM
  ![Connect to EC2 instance](./docs/open_instance.gif)
- Start and stop your existing EC2s
  ![Start instance](./docs/start_instance.gif)
- Terminate your development environments when you no longer need them
  ![Terminate instance](./docs/terminate_instance.gif)
- Select alternative AWS profiles and regions

## Getting started

1. Make sure you have [Node.js](https://nodejs.org/en/download) >= 16 installed on your system

2. Make sure you have your [AWS CLI credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) set up, there are various extensions that can simplify this step for you such as the offical [AWS Toolkit](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/connect.html)

- Your credentials need administrative rights in order to provision infrastructure, you can reduce any possibility of interfering with your existing infrastructure by using a seperate AWS account for your remote development environment
- You can add the [AdministratorAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AdministratorAccess.html) managed policy to your associated IAM group or user in order to allow this extension to create and terminate your development machines

3. Make sure that your AWS Account has a [default VPC](https://docs.aws.amazon.com/vpc/latest/userguide/default-vpc.html) that your development instances can be launched in

4. (Optional) If you would like to connect to existing EC2s (not created by this extension) then you need to make sure that [Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started.html) is set up for them

## Examples

### Launching a GPU instance for Deep Learning

1. Decide which [GPU instance](https://docs.aws.amazon.com/dlami/latest/devguide/gpu.html) you wish to use, we'll select a `g4dn.xlarge` machine type in this example

2. Make sure that you have a sufficient [EC2 service quota](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-resource-limits.html) limit applied for running the instance, you'll find this under the "Amazon Elastic Compute Cloud (Amazon EC2) > Running On-Demand G and VT instances" section of the Service Quotas console
  ![Service quota section](./docs/service_quota_section.png)

3. Decide which [DLAMI](https://docs.aws.amazon.com/dlami/latest/devguide/appendix-ami-release-notes.html) you wish to use and find the corresponding image ID, we'll use [Amazon Linux 2 base DLAMI](https://aws.amazon.com/releasenotes/aws-deep-learning-base-ami-amazon-linux-2/) in this example and search for the image ID using the [AWS CLI](https://aws.amazon.com/cli/) command: 

`aws ec2 describe-images --region us-east-1 --owners amazon --filters 'Name=name,Values=Deep Learning Base AMI (Amazon Linux 2) Version ??.?' 'Name=state,Values=available' --query 'reverse(sort_by(Images, &CreationDate))[:1].ImageId' --output text`

4. Click the `+` icon at the top of the extension's EC2 explorer panel, fill in each of the sections according to steps 1-3 and start the process of creating the CloudFormation stack
  ![Select G4 instance type](./docs/select_g4.png)
  * The DLAMI we've selected requires a root volume size of at least 100GB
  ![100GB root volume size](./docs/100_root_volume.png)
  * Make sure that you enter the image ID from step 3 in the final box
  ![Enter DLAMI ID](./docs/gpu_image_id.png)

5. Once the process is complete, you'll see your GPU machine appear in the instances list, connect to the instance by clicking on the "Connect in a new window" button next to the machine name
![Connect to GPU instance](./docs/connect_to_gpu_instance.png)

6. You can verify that the NVIDIA driver is installed and working by running the `nvidia-smi` command in the terminal of your new machine
![NVIDIA driver](./docs/gpu_instance_driver.png)

## Configuration

Development machines are based on Amazon Linux machine images with docker pre-installed for compatibility with a wide range of EC2 instance types. The simplest way to customise your environment is to configure a [Dev Container](https://code.visualstudio.com/docs/devcontainers/containers) for your project and launch it once you're connected to the remote machine.

### Launching with alternative machine images

If you need greater control of the base machine image (e.g. to use a [DLAMI](https://docs.aws.amazon.com/dlami/latest/devguide/what-is-dlami.html) with a GPU instance) then you can simply specify the optional image ID when launching your development environment.

### Adjusting the auto-stop behaviour

The development environment includes a CloudWatch alarm to stop the instance if the CPU utilisation falls below a threshold for a certain period of time. The alarm name is set up as `${STACK_NAME}InactivityAlarm-Inactivity` and you can adjust it within the AWS console directly to suit your needs.

### Instance permissions

You can modify the permissions granted to the instance by editing the IAM role named `${STACK_NAME}InstanceRole`. Configuring access in this way removes the need to set up AWS access keys when working within the instance and any Dev Containers you run on it.
