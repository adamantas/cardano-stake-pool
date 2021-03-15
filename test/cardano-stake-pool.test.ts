import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CardanoStakePool from '../lib/cardano-stake-pool-stack';

test('Empty Stack', () => {
    // const app = new cdk.App();
    // // WHEN
    // const stack = new CardanoStakePool.CardanoStakePoolStack(app, 'MyTestStack', {

    // });
    // // THEN
    // expectCDK(stack).to(matchTemplate({
    //   "Resources": {}
    // }, MatchStyle.EXACT))
});
