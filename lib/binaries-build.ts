import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import asc = require('@aws-cdk/aws-autoscaling');
import r53 = require('@aws-cdk/aws-route53');
import s3 = require('@aws-cdk/aws-s3');
import elb = require('@aws-cdk/aws-elasticloadbalancingv2');

import * as bootstrap from './bootstrap';

export interface CardanoBinariesBuildStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  instanceRole: iam.Role;
  cabalRelease: string;
  ghcRelease: string;
  libsodiumCommit: string;
  cardanoRelease: string;
  network: string;
  instanceClass: ec2.InstanceClass;
  instanceSize: ec2.InstanceSize;
  dataVolumeSizeGb?: number;
  s3BucketArn: string;
};

export class CardanoBinariesBuildStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: CardanoBinariesBuildStackProps) {

    super(scope, id, props);

    

    /**
     * Build Server Auto Scaling Group
     */

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      ...bootstrap.attachDataDrive(), 
      ...bootstrap.buildCardanoNodeBinaries(props)

    );

    const asg = new asc.AutoScalingGroup(this, 'ASG', {
      vpc: props.vpc,
      vpcSubnets: {
        subnets: props.vpc.privateSubnets.slice(1, 2)
      },
      instanceType: ec2.InstanceType.of(props.instanceClass, props.instanceSize),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.X86_64
      }),
      blockDevices: [
        {
          deviceName: '/dev/sdb', 
          volume: asc.BlockDeviceVolume.ebs(props.dataVolumeSizeGb || 30)
        }
      ],
      minCapacity: 0, 
      maxCapacity: 0,
      role: props.instanceRole,
      associatePublicIpAddress: false,
      userData: userData
    });

    const schedule = new asc.ScheduledAction(this, 'ScheduledAction', {
      autoScalingGroup: asg,
      minCapacity: 1,
      maxCapacity: 1,
      schedule: asc.Schedule.expression('* * * * *'),

    });
  }
}
