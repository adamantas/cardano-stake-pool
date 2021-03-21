#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CardanoStakePoolStack } from '../lib/stake-pool-stack';

import ec2 = require('@aws-cdk/aws-ec2');
import { CardanoBinariesBuildStack } from '../lib/binaries-build-stack';
import { CardanoStakePoolCoreStack } from '../lib/core-stack';

import { config } from './config'

const app = new cdk.App();

const core = new CardanoStakePoolCoreStack(app, 'CardanoStakePoolCoreStack', {
   s3BucketArn: config.s3BucketArn
});

new CardanoStakePoolStack(app, 'CardanoStakePoolStack', {
   vpc: core.vpc,
   config
  
});

new CardanoBinariesBuildStack(app, 'CardanoBinariesBuildStack', {
   vpc: core.vpc,
   config,
   selfTerminate: true
});
