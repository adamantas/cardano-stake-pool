#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CardanoStakePoolStack } from '../lib/stake-pool-stack';

import ec2 = require('@aws-cdk/aws-ec2');
import { CardanoBinariesBuildStack } from '../lib/binaries-build-stack';
import { CardanoStakePoolCoreStack } from '../lib/core-stack';

import { testnetConfig, mainnetConfig } from './config'

const app = new cdk.App();

/**
 * Mainnet 
 */
const mainnetCore = new CardanoStakePoolCoreStack(app, 'mainnet-core', {
   s3BucketArn: mainnetConfig.s3BucketArn,
   terminationProtection: true
});

new CardanoStakePoolStack(app, 'mainnet-stake-pool', {
   vpc: mainnetCore.vpc,
   config: mainnetConfig,
   terminationProtection: true
});

new CardanoBinariesBuildStack(app, 'mainnet-bin-build', {
   vpc: mainnetCore.vpc,
   config: mainnetConfig,
   stopInstance: true,
   terminationProtection: false
});

/**
 * Testnet
 */

const testnetCore = new CardanoStakePoolCoreStack(app, 'testnet-core', {
   s3BucketArn: testnetConfig.s3BucketArn,
   terminationProtection: false
});

new CardanoStakePoolStack(app, 'testnet-stake-pool', {
   vpc: testnetCore.vpc,
   config: testnetConfig,
   terminationProtection: false
});

new CardanoBinariesBuildStack(app, 'testnet-bin-build', {
   vpc: testnetCore.vpc,
   config: testnetConfig,
   stopInstance: true,
   terminationProtection: false
});
