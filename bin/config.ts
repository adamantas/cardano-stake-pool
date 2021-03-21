
import ec2 = require('@aws-cdk/aws-ec2');
import { NodeType, StakePoolConfig } from '../lib/types';

const downloads: {[key:string]:{[key: string]: string}} = {
    'cabal': {
        '3.4.0.0': 'https://downloads.haskell.org/~cabal/cabal-install-3.4.0.0/cabal-install-3.4.0.0-x86_64-ubuntu-16.04.tar.xz'
    },
    'ghc': {
        '8.10.2': 'https://downloads.haskell.org/~ghc/8.10.2/ghc-8.10.2-x86_64-centos7-linux.tar.xz'
    }
}

const snapshotId = 'snap-02d290dcc0c3ecab6';

export const config: StakePoolConfig = {
    s3BucketArn: 'arn:aws:s3:::adamantas-stake-pool',
    cabalRelease: '3.4.0.0',
    ghcRelease: '8.10.2',
    libsodiumCommit: '66f017f1',
    cardanoNodeRelease: '1.25.1',
    downloads,
    network: 'testnet',
    publicDomainHostedZoneId: 'Z10226583C88D1ETXZRTV',
    publicDomain: 'adamantas.io',
    internalDomain: 'adamantas.internal',
    nodeGroups: [
        {
            nodeType: NodeType.Producer,
            instanceClass: ec2.InstanceClass.T3A,
            instanceSize: ec2.InstanceSize.LARGE,
            dataVolumeSizeGb: 24,
            snapshotId: snapshotId,
            numInstances: 1,
            port: 6000,
            urlPrefix: 'producer'

        },
        {
            nodeType: NodeType.Relay,
            instanceClass: ec2.InstanceClass.T3A,
            instanceSize: ec2.InstanceSize.LARGE,
            dataVolumeSizeGb: 24,
            snapshotId: snapshotId,
            numInstances: 1,
            port: 3001,
            urlPrefix: 'relay'
        }
    ]
}
