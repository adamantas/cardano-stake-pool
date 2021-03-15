# cardano-stake-pool
"1-click" launch of Cardano stake pool in AWS
## Architecture
![Cardano Stake Pool Architecture](https://github.com/adamantas/cardano-stake-pool/blob/dev/images/cardano-stake-pool-architecture.png?raw=true)

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
```

### Session Manager Plugin
```
$ curl https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip -o /tmp/sessionmanager-bundle.zip
$ unzip /tmp/sessionmanager-bundle.zip -d /tmp
$ sudo /tmp/sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin
$ rm -rf /tmp/sessionmanager*
```

### Connect to instance
```

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
