import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import asc = require('@aws-cdk/aws-autoscaling');
import r53 = require('@aws-cdk/aws-route53');
import elb = require('@aws-cdk/aws-elasticloadbalancingv2');

import * as bootstrap from './bootstrap'
import { NodeType, StakePoolConfig, StakePoolNodeConfig } from './types';

export interface CardanoStakePoolStackProps extends cdk.StackProps {
  vpc: ec2.Vpc,
  config: StakePoolConfig
};

export class CardanoStakePoolStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: CardanoStakePoolStackProps) {

    super(scope, id, props);

    /** 
     * Instance Role
    */
      
    const instanceRolePolicy = new iam.ManagedPolicy(this, 'InstanceRolePolicy', {
      statements: [
          new iam.PolicyStatement( {
              effect: iam.Effect.ALLOW,
              resources: [ 
                  `${props.config.s3BucketArn}/*`
              ] ,
              actions: [ 
                's3:GetObject'
              ]
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

    props.config.nodeGroups.map((node: StakePoolNodeConfig) => {

      /**
       * Security Group
       */

      const sg = new ec2.SecurityGroup(this, `${NodeType[node.nodeType]}SG`, {
        vpc: props.vpc,
        allowAllOutbound: true
      });
  
      sg.addIngressRule(
        ec2.Peer.anyIpv4(), 
        ec2.Port.tcp(node.port)
      );

      /**
       * Bootstrap Script (User Data)
       */

       const userData = ec2.UserData.forLinux();
       userData.addCommands(
         ...bootstrap.attachDataDrive(), 
         ...bootstrap.buildLibsodium(props.config.libsodiumCommit),
         ...bootstrap.downloadCompiledCardanoBinaries(props.config.s3BucketArn, props.config.cardanoNodeRelease, node.snapshotId),
         ...bootstrap.downloadConfiguration(props.config.network, node.snapshotId),
         ...bootstrap.createCardanoUser(),
         ...bootstrap.createStartupScript(props.config.network, node.port, node.nodeType),
         ...bootstrap.installGLiveView(props.config.network),
         ...bootstrap.installSimpleLiveView(),
         ...bootstrap.startNode(node.autoStart)
       );

      /**
      * Auto Scaling Group
      */
    
      const asg = new asc.AutoScalingGroup(this, `${NodeType[node.nodeType]}ASG`, {
        vpc: props.vpc,
        vpcSubnets: {
          subnets: props.vpc.privateSubnets.slice(0,2)
        },
        
        instanceType: ec2.InstanceType.of(node.instanceClass, node.instanceSize),
        machineImage: new ec2.AmazonLinuxImage({
          generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
          cpuType: ec2.AmazonLinuxCpuType.X86_64
        }),
        blockDevices: [
          {
            deviceName: '/dev/sdb', 
            volume: node.snapshotId 
              ? { ebsDevice: { snapshotId: node.snapshotId} } 
              : asc.BlockDeviceVolume.ebs(node.dataVolumeSizeGb)
          }
        ],
        minCapacity: 1,
        role: instanceRole,
        userData: userData,
        
        securityGroup: sg
      });

      cdk.Tags.of(asg).add('NodeType', NodeType[node.nodeType]);
      cdk.Tags.of(asg).add('CardanoNetwork', props.config.network);

      /**
       * Network Load Balancer
       */

      const nlb = new elb.NetworkLoadBalancer(this, `${NodeType[node.nodeType]}NLB`, {
        vpc: props.vpc,
        internetFacing: (node.nodeType == NodeType.Relay)
      });

      const listener = nlb.addListener(`${NodeType[node.nodeType]}Listener`, {
        port: node.port
      });

      listener.addTargets(`${NodeType[node.nodeType]}Fleet`, {
        port: node.port,
        targets: [asg]
      });

      /**
      * Domain Record
      */
      const zone = (node.nodeType == NodeType.Relay) 
        ? r53.HostedZone.fromHostedZoneAttributes(this, `${NodeType[node.nodeType]}HostedZone`, {
          zoneName: props.config.publicDomain,
          hostedZoneId: props.config.publicDomainHostedZoneId 
        }) 
        : new r53.PrivateHostedZone(this, `${NodeType[node.nodeType]}HostedZone`, {
          vpc: props.vpc,
          zoneName: props.config.internalDomain
        });

        new r53.CnameRecord(this, `${NodeType[node.nodeType]}CnameRecord`, {
          zone: zone,
          recordName: `${node.urlPrefix}`,
          domainName: nlb.loadBalancerDnsName
        });
    });
  }
}
