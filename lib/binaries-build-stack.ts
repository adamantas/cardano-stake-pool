import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');


import * as bootstrap from './bootstrap';
import { StakePoolConfig } from './types';

export interface CardanoBinariesBuildStackProps extends cdk.StackProps {
  vpc: ec2.Vpc,
  config: StakePoolConfig, 
  stopInstance?: boolean 
};

export class CardanoBinariesBuildStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: CardanoBinariesBuildStackProps) {

    super(scope, id, props);

    /** 
     * Instance Role
    */
      
    const instanceRolePolicy = new iam.ManagedPolicy(this, 'InstanceRolePolicy', {
        statements: [
            new iam.PolicyStatement( {
                effect: iam.Effect.ALLOW,
                resources: [ 
                    props.config.s3BucketArn,  
                    `${props.config.s3BucketArn}/*`
                ] ,
                actions: [ 
                's3:PutObject',
                's3:GetObject',
                's3:DeleteObject',
                's3:ListBucket',
                's3:AbortMultipartUpload',
                's3:ListMultipartUploadParts',
                's3:ListBucketMultipartUploads' 
                ]
            }),
            new iam.PolicyStatement( {
              effect: iam.Effect.ALLOW,
              resources: ['arn:aws:ec2:*:*:instance/*'] ,
              actions: ['ec2:StopInstances'],
              conditions: {
                'StringEquals': {
                  'ec2:ResourceTag/InstanceType': `binaries-build-${props.config.network}`
                }
              },

          })
        ]
    });

    const instanceRole = new iam.Role(this, 'InstanceRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
          instanceRolePolicy
        ]
    });
  

    /**
     * Build Server Instance
     */

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      ...bootstrap.attachDataDrive(), 
      ...bootstrap.buildCardanoNodeBinaries(props.config),
      ...bootstrap.stopInstance(this.region, props.stopInstance) 
    );

    const instance = new ec2.Instance(this, 'BinariesBuild', {
      vpc: props.vpc,
      vpcSubnets: {
         subnets: props.vpc.privateSubnets.slice(1, 2)
      },
      instanceType: ec2.InstanceType.of(props.config.nodeGroups[0].instanceClass, props.config.nodeGroups[0].instanceSize),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.X86_64
      }),
      blockDevices: [
        {
          deviceName: '/dev/sdb', 
          volume: ec2.BlockDeviceVolume.ebs(props.config.nodeGroups[0].dataVolumeSizeGb)
        }
      ],
      userData: userData,
      role: instanceRole,
    });

    cdk.Tags.of(instance).add('NodeType', 'BinBuild');
    cdk.Tags.of(instance).add('CardanoNetwork', props.config.network);

  }
}
