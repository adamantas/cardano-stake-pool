import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import asc = require('@aws-cdk/aws-autoscaling');
import r53 = require('@aws-cdk/aws-route53');
import elb = require('@aws-cdk/aws-elasticloadbalancingv2');

import * as bootstrap from './bootstrap'

export interface CardanoStakePoolStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  instanceRole: iam.Role;
  s3BucketArn: string;
  cabalRelease: string;
  ghcRelease: string;
  libsodiumCommit: string;
  cardanoRelease: string;
  network: string;
  instanceClass: ec2.InstanceClass;
  instanceSize: ec2.InstanceSize;
  dataVolumeSizeGb?: number;
  snapshotId?: string;
  relayPort: number;
  producerPort: number;
  numRelayInstances: number;
  domain: string;
  hostedZoneId: string;
  relayUrlPrefix: string;
};

export class CardanoStakePoolStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: CardanoStakePoolStackProps) {

    super(scope, id, props);

    /**
     * Block Producer and Relay Configuration
     */

    const nodes: Array<{type: string; port: number; internetFacing: boolean, numInstances: number, urlPrefix?: string}> = [
      {
        type: 'Relay',
        port: props.relayPort,
        internetFacing: true,
        numInstances: props.numRelayInstances,
        urlPrefix: props.relayUrlPrefix

      },
      // {
      //   type: 'Producer',
      //   port: props.producerPort,
      //   internetFacing: false,
      //   numInstances: 1
      // }
    ];

    nodes.map((node: {type: string; port: number; internetFacing: boolean, numInstances: number, urlPrefix?: string}) => {

      /**
       * Security Group
       */

      const sg = new ec2.SecurityGroup(this, `${node.type}SG`, {
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
         ...bootstrap.buildLibsodium(props),
         ...bootstrap.downloadCompiledCardanoBinaries(props.s3BucketArn),
         ...bootstrap.downloadConfiguration(props.network),
         ...bootstrap.createCardanoUser(),
         ...bootstrap.createStartupScript(props.network, node.port),
         ...bootstrap.installGLiveView(props.network),
         ...bootstrap.installSimpleLiveView()
       );

      /**
      * Auto Scaling Group
      */
    
      const asg = new asc.AutoScalingGroup(this, `${node.type}ASG`, {
        vpc: props.vpc,
        vpcSubnets: {
          subnets: props.vpc.privateSubnets.slice(0,2)
        },
        
        instanceType: ec2.InstanceType.of(props.instanceClass, props.instanceSize),
        machineImage: new ec2.AmazonLinuxImage({
          generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
          cpuType: ec2.AmazonLinuxCpuType.X86_64
        }),
        blockDevices: [
          {
            deviceName: '/dev/sdb', 
            volume: props.snapshotId 
              ? { ebsDevice: { snapshotId: props.snapshotId} } 
              : asc.BlockDeviceVolume.ebs(props.dataVolumeSizeGb || 30)
          }
        ],
        minCapacity: 1,
        role: props.instanceRole,
        userData: userData,
        securityGroup: sg
      });

      /**
       * Network Load Balancer
       */

      const nlb = new elb.NetworkLoadBalancer(this, `${node.type}NLB`, {
        vpc: props.vpc,
        internetFacing: node.internetFacing
      });

      const listener = nlb.addListener(`${node.type}Listener`, {
        port: node.port
      });

      listener.addTargets(`${node.type}Fleet`, {
        port: props.relayPort,
        targets: [asg]
      });

      if (node.internetFacing) {

        /**
         * Domain Record
         */

        const zone = r53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
          zoneName: props.domain,
          hostedZoneId: props.hostedZoneId,
        });

        new r53.CnameRecord(this, `${node.type}CnameRecord`, {
          zone: zone,
          recordName: node.urlPrefix,
          domainName: nlb.loadBalancerDnsName
        });
      }

    });
  }
}
