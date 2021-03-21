# Cardano Stake Pool AWS CDK App
## Overview
This AWS CDK (AWS Cloud Development Kit) to automate launching a Cardano stake pool in AWS. 

If you are not familiar with AWS CDK, you are welcome to read [this intro](https://docs.aws.amazon.com/cdk/latest/guide/home.html).



## Architecture
[Cardano Stake Pool Architecture](https://github.com/adamantas/cardano-stake-pool/blob/dev/images/cardano-stake-pool-architecture.png?raw=true)

Key highlights of the architecture:
* All infrastructure components reside in VPC (Virtual Private Cloud)

* All nodes reside in the private subnets shielded by network load balancers (NLB)
*  
## Prerequisites
### Node
```
$ brew install node
$ node --version
$ npm --version
```
### AWS CDK
```
$ npm install -g aws-cdk
$ npm install
```

### AWS CLI
```
$ curl https://awscli.amazonaws.com/AWSCLIV2.pkg -o /tmp/AWSCLIV2.pkg
$ sudo installer -pkg /tmp/AWSCLIV2.pkg -target /
$ rm /tmp/AWSCLIV2.pkg
```

### Configure AWS profile
```
$ aws configure --profile adamantas
$ export aws_profile=adamantas
```

### Session Manager Plugin
```
$ curl https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip -o /tmp/sessionmanager-bundle.zip
$ unzip /tmp/sessionmanager-bundle.zip -d /tmp
$ sudo /tmp/sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin
$ rm -rf /tmp/sessionmanager*
```

## Build Cardano binaries
This process is executed only once by launching `CardanoBinariesBuildStack`, which executes the following steps:
1. Launches an EC2 instance
2. Downloads Cardano binaries source code and their dependencies
3. Builds the binaries from the source code
4. Copies the binaries to S3 bucket
5. Stops the EC2 instance

### Launching binaris build stack
```
[local]$ cdk synth
[local]$ cdk cdk deploy CardanoBinariesBuildStack --profile ${aws_profile}
```

### Connect to binaries build EC2 instance
```
[local]$ aws ssm start-session --profile ${aws_profile} --target $(aws ec2 describe-instances --query "Reservations[?not_null(Instances[?State.Name == 'running' && Tags[?Value == 'binaries-build']])].Instances[*].InstanceId | []" --output text --profile ${aws_profile})

```

### Monitoring the build process
```
[binaries-build]$ sudo watch tail /var/log/cloud-init-output.log 
```

### Connect to relay instance
```
$ aws ssm start-session --profile ${aws_profile} --target $(aws ec2 describe-instances --query "Reservations[?not_null(Instances[?State.Name == 'running' && Tags[?Value == 'Relay']])].Instances[*].InstanceId | []" --output text --profile ${aws_profile})

```

### Monitor the sync process
```
$ journalctl --unit=cardano-node --follow
```

# Welcome to your CDK TypeScript project!

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
