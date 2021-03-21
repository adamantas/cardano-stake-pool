import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

export interface CardanoStakePoolCoreStackProps extends cdk.StackProps {
    s3BucketArn: string;
};

export class CardanoStakePoolCoreStack extends cdk.Stack {

    public readonly vpc: ec2.Vpc;

    constructor(scope: cdk.Construct, id: string, props: CardanoStakePoolCoreStackProps ) {

        super(scope, id, props);

        /**
         * VPC
         */

        this.vpc = new ec2.Vpc(this, 'VPC');

    }  
}
