import {
  EC2Client,
  EC2ServiceException,
  StopInstancesCommand,
} from "@aws-sdk/client-ec2";

export async function stopInstance(
  client: EC2Client,
  instanceId: string,
): Promise<void> {
  const request = {
    InstanceIds: [instanceId],
  };
  try {
    await client.send(
      new StopInstancesCommand({
        ...request,
        Hibernate: true,
      }),
    );
  } catch (err) {
    if (
      (err as EC2ServiceException).name ===
      "UnsupportedHibernationConfiguration"
    ) {
      await client.send(new StopInstancesCommand(request));
    } else {
      throw err;
    }
  }
}
