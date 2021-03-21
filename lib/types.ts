import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');

export enum NodeType {
    Producer = 1,
    Relay = 2
}

export interface StakePoolNodeConfig {
    nodeType: NodeType,
    instanceClass: ec2.InstanceClass,
    instanceSize: ec2.InstanceSize,
    dataVolumeSizeGb: number,
    snapshotId?: string,
    numInstances: number,
    port: number,
    urlPrefix: string
}

export interface StakePoolConfig {
    s3BucketArn: string,
    cabalRelease: string,
    ghcRelease: string,
    libsodiumCommit: string,
    cardanoNodeRelease: string,
    downloads: {[key:string]:{[key: string]: string}},
    network: string,
    publicDomainHostedZoneId: string,
    publicDomain: string,
    internalDomain: string,
    nodeGroups: [StakePoolNodeConfig, StakePoolNodeConfig]
}
