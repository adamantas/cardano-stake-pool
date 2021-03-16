#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CardanoStakePoolStack } from '../lib/stake-pool';

import ec2 = require('@aws-cdk/aws-ec2');
import { CardanoBinariesBuildStack } from '../lib/binaries-build';
import { CardanoStakePoolVpcStack } from '../lib/vpc';


const app = new cdk.App();

const vpc = new CardanoStakePoolVpcStack(app, 'CardanoStakePoolVpcStack', {});

new CardanoStakePoolStack(app, 'CardanoStakePoolStack', {
   cabalRelease: '3.2.0.0',
   ghcRelease: '8.10.2',
   libsodiumCommit: '66f017f1',
   cardanoRelease: '1.25.1',
   network: 'testnet',
   instanceClass: ec2.InstanceClass.T3A,
   instanceSize: ec2.InstanceSize.LARGE,
   dataVolumeSizeGb: 24,
   //snapshotId: 'snap-03fb944a38a71de13',
   relayPort: 3001,
   producerPort: 6000,
   numRelayInstances: 1,
   domain: 'adamantas.io',
   hostedZoneId: 'Z10226583C88D1ETXZRTV',
   relayUrlPrefix: 'relay'
});

new CardanoBinariesBuildStack(app, 'CardanoBinariesBuildStack', {
   vpc: vpc.vpc,
   cabalRelease: '3.4.0.0',
   ghcRelease: '8.10.2',
   libsodiumCommit: '66f017f1',
   cardanoRelease: '1.25.1',
   network: 'testnet',
   instanceClass: ec2.InstanceClass.T3A,
   instanceSize: ec2.InstanceSize.LARGE,
   dataVolumeSizeGb: 24,
   s3BucketArn: 'arn:aws:s3:::adamantas-stake-pool'
});
