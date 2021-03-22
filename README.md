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

**[testnet]**

3. Deploy testnet VPC 
4. Deploy testnet binaries build instance stack
5. Monitor binaries build instance to complete the build (~1 hr)
6. Deploy stake pool stack to the testnet
7. Monitor until ledger fully syncs (~10 hrs)
8. Take snapshot of the EBS volume
9. Delete the stake pool stack 
10. Change stack configuration to use the EBS volume snapshot
11. Launch stake pool stack again using EBS volume snapshot (~5 min)
    * Use of EBS snapshot and pre-built binaries saves ~11 hrs
    * Now you can create/destroy the testnet stake pool infrastructure from scratch at your convenience

**[mainnet]**

12. Follow steps 3-11 for mainnet stacks
13. Follow best practices for configuring your air-gapped server
14. Create cold keys and hot keys 
15. Update relay and block producer configuration
16. Register your stake pool

### Conventions
For all the given commands we'll include location in brackets where these commands need to be executed:
```
[local $]         your local laptop
[bin-build $]     binary build instance
[relay $]         relay node instance
[producer $]      block producer node instance
```

### Prerequisites

#### Node
Check if Node is already installed:
```
[local $] node -v
[local $] npm -v
```
if not:
```
[local $] brew install node
```
If brew is not installed:
```
[local $] /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### AWS CDK
Check if AWS CDK is already installed:
```
[local $] cdk --version
```
If not:
```
$ npm install -g aws-cdk
```

#### AWS CLI
Check if AWS CLI is already installed: 
```
[local $] aws --version
```
If not:
```
$ curl https://awscli.amazonaws.com/AWSCLIV2.pkg -o /tmp/AWSCLIV2.pkg
$ sudo installer -pkg /tmp/AWSCLIV2.pkg -target /
$ rm /tmp/AWSCLIV2.pkg
```

#### Session Manager Plugin
```
$ curl https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip -o /tmp/sessionmanager-bundle.zip
$ unzip /tmp/sessionmanager-bundle.zip -d /tmp
$ sudo /tmp/sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin
$ rm -rf /tmp/sessionmanager*
```

#### Configure AWS profile
Read [this doc](https://docs.aws.amazon.com/general/latest/gr/aws-security-credentials.html) to understand how to create and admin account with AWS access keys. Here is the gist:
* Don't use your root credentials for accessing AWS Console
    * Even if you don't use it, secure it with MFA
* Create non-root admin account and configure it with MFA
    * Create AWS acces keys for this account and download them into a secure place. Never share them with anyone and periodically rotate. 
* Use an app with MFA features, such as 1Password to store your credentials. Look for documentation how to configure MFA 1-time codes. 
* For added security you can create non-admin account with a policy only sufficient for launching the stacks and resources in this guide

Give a cool name to your AWS profile, or use a ticket you are planning to have for your stake pool.  

Configure AWS profile, by following the steps in this command. Choose region closest to you from the [list of AWS regions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions), and use `json` for the default output format, unless you prefer something else. 
```
$ aws configure --profile <your-profile-name>
```

_Note: Though it's possible to create an AWS profile without specifying the profile name, it's not recommended, since you might have more than one AWS account and it's better always knowing which one is set as a default_

Set your AWS profile as default in your shell config
```
[local $] echo "export AWS_PROFILE=<your-profile-name>" >> ~/.zshrc
[local $] source ~/.zshrc
```
If your shell is not ZSH, then use `.bash_profile` for Bash, or whatever it is for something else you might have.

#### Create S3 buckets
Create two buckets in S3, for testnet and mainnet stacks. Keep in mind that S3 bucket names should be globally unique, so it's a good idea to prefix them with your cool profile name. 
```
[local $] aws s3 mb s3://<your-profile-name>-stake-pool-testnet
[local $] aws s3 mb s3://<your-profile-name>-stake-pool-mainnet
```
_Note: It doesn't matter what the names of the buckets are, so if you feel creative, be it. We just need these buckets to specify their ARNs in the config_



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
