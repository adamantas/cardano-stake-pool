# Manta Project (Cardano Stake Pool)
## Overview
This AWS CDK (AWS Cloud Development Kit) to automate launching a Cardano stake pool in AWS using true IaaS (Infrastructure-as-a-Code) principles.

If you are not familiar with AWS CDK, you are welcome to read [this intro](https://docs.aws.amazon.com/cdk/latest/guide/home.html).

The rationale behind the Manta Project can be summarized by the following points:

### Dev Ops Perspective (mainnet)
* Standard and predictable way of launching Cardano stake pool on AWS
* Hands-free deployment at minimal time
* 99.99% availability 
* Painless rollout of upgrades
* Pre-configured state of the art monitoring

### Developer Perspective (testnet)
* Launch infrastructure in minutes only when needed and terminate when done
* Pre-compile the latest binaries
* Experiment with decentralized topology for the new features 
    * Many instances of full functioning stake pools can be launched and functioning in minutes 

### Security Perspective
* Peer-reviewed infrastructure code, scanned for security loopholes
* Best practices for cold-keys management

### Community Benefit Perspective
* Minimize time for new stake pool operators to be operational, which will further help decentralization of Cardano network
* Predictable cost estimates
    * Ways of optimizing the running costs
    * Transparency in what it takes to run a stake pool
* Raising the bar of quality for the stake pools launched in AWS 

### Educational Perspective
* Promoting AWS CDK as a standard for provisioning resources on AWS
* Introduction to TypeScript for anyone unfamiliar with it


## Architecture
![Cardano Stake Pool Architecture](https://github.com/adamantas/cardano-stake-pool/blob/dev/images/cardano-stake-pool-architecture.png?raw=true)

### Key highlights of the architecture:
* All infrastructure components reside in VPC (Virtual Private Cloud)
    * Separate VPCs for mainnet and testnet stacks
* All nodes reside in the private subnets shielded by network load balancers (NLBs)
*  Access to the node instances provided by Systems Manager (SSM) using AWS access keys. No SSH and no private keys are required.
* EBS volume snapshots for quick node instances launch without full sync of the ledger
* Dedicated instance for building Cardano node binaries which are placed to central location in S3 and used by all launched node instances
    * Auto-stopped when done to save costs
* Static relay endpoint with a custom domain name
* Autoscaling with minimum configuration of 1 relay and 1 block producer.      
    * Launching more instances for high availability is only a change of parameter. 

## Launching your own Cardano stake pool
_This guide has been tested only on MacOS (Catalina 10.15.7)_

Here is a brief summary of the steps required to launch your own Cardano stake pool using Manta Project AWS CDK application. 

1. Complete pre-requisites
2. Clone repository

[testnet]

3. Deploy testnet VPC 
4. Deploy testnet binaries build instance stack
5. Monitor binaries build instance to complete the build (~1 hr)
6. Deploy stake pool stack to the testnet
7. Monitor until ledger fully syncs (~10 hrs)
8. Take snapshot of the EBS volume
9. Delete the stake pool stack 
10. Change stack configuration to use the EBS volume snapshot
11. Launch stake pool stack again with EBS volume snapshot (~5 min)
    * Use of EBS snapshot and pre-built binaries saves ~ 11 hrs
    * Now you can create/destroy the testnet stake pool infrastructure at your convenience

[mainnet]



### Prerequisites

#### Node
```
$ brew install node
$ node --version
$ npm --version
```
#### AWS CDK
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
