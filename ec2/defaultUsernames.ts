import { PlatformName } from "./PlatformName";

/**
 * Default usernames based on https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connection-prereqs.html
 */
export const defaultUsernames: Record<PlatformName, string[]> = {
  [PlatformName.Ubuntu]: ["ubuntu"],
  [PlatformName.AmazonLinux]: ["ec2-user"],
  [PlatformName.SuseLinux]: ["ec2-user", "root"],
  [PlatformName.Debian]: ["admin"],
  [PlatformName.Oracle]: ["ec2-user"],
  [PlatformName.Bitnami]: ["bitnami"],
  [PlatformName.CentOS]: ["centos", "ec2-user"],
  [PlatformName.Fedora]: ["fedora", "ec2-user"],
  [PlatformName.ReadhatLinux]: ["ec2-user", "root"],
};
