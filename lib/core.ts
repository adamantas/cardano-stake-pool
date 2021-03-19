import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

export interface CardanoStakePoolCoreStackProps extends cdk.StackProps {
    s3BucketArn: string;
};

export class CardanoStakePoolCoreStack extends cdk.Stack {

    public readonly vpc: ec2.Vpc;
    public readonly instanceRole: iam.Role;

    constructor(scope: cdk.Construct, id: string, props: CardanoStakePoolCoreStackProps ) {

        super(scope, id, props);

        /**
         * VPC
         */

        this.vpc = new ec2.Vpc(this, 'VPC');


        /**
         * Instance Role
         */

    
        const instanceRolePolicy = new iam.ManagedPolicy(this, 'InstanceRolePolicy', {
            statements: [
                new iam.PolicyStatement( {
                    effect: iam.Effect.ALLOW,
                    resources: [ 
                        props.s3BucketArn,  
                        `${props.s3BucketArn}/*`
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
                })
            ]
        });
  
        this.instanceRole = new iam.Role(this, 'InstanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
            instanceRolePolicy
            ]
        });
    }

}
