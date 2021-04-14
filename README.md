# DDAY Cardano Stake Pool
DDAY Cardano stake pool was launched on March 31, 2021, the day known as D-DAY, or the day when Cardano network achieved 100% decentralization. 

Our mission is always remembering that decentralization is extremely important and we are committed to build projects, share resources and educate people, in order to contribute to the further decentralization of the internet. 

Using these instructions you will be able to launch  your own Cardano stake pool infrastructure on AWS in a fun and exciting way. Enjoy!

## Overview
This is an AWS CDK (AWS Cloud Development Kit) app to automate launching a Cardano stake pool in AWS using true IaC (Infrastructure-as-Code) principles.

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
![Cardano Stake Pool Architecture](https://github.com/adamantas/cardano-stake-pool/blob/dev/images/dday-cardano-stake-pool-architecture.png?raw=true)

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
[local $] npm install -g aws-cdk
```

#### AWS CLI
Check if AWS CLI is already installed: 
```
[local $] aws --version
```
If not:
```
[local $] curl https://awscli.amazonaws.com/AWSCLIV2.pkg -o /tmp/AWSCLIV2.pkg
[local $] sudo installer -pkg /tmp/AWSCLIV2.pkg -target /
[local $] rm /tmp/AWSCLIV2.pkg
```

#### JQ
Check if JQ is installed:
```
[local $] jq --version
```
If, not:
```
[local $] brew install jq
```


#### Session Manager Plugin
```
[local $] curl https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip -o /tmp/sessionmanager-bundle.zip
[local $] unzip /tmp/sessionmanager-bundle.zip -d /tmp
[local $] sudo /tmp/sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin
[local $] rm -rf /tmp/sessionmanager*
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

#### Configuring domain
You can [reserve](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html) a new domain name from AWS Route 53 or [transfer](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-transfer-to-route-53.html) the one you already have from another registrar. 

Whatever approach you choose, you should have a hosted zone created for your domain in AWS Route 53. 


### Cloning repo and modifying config
```
[local $] git clone https://github.com/adamantas/cardano-stake-pool.git
[local $] cd cardano-stake-pool
[local $] npm install
```

This should install all the required node modules. 

Modify `/bin/config.ts` file to configure your pool settings. Here is an overview of the config options:

* `downloads`: List of URLs for dependency binaries downloads by version
* `s3BucketArn`: ARN of the S3 bucket we created above in the format `arn:aws:s3:::<bucket-name>`
* `cabalRelease`: Release of Cabal (Haskell build system)
* `ghcRelease`: Release of GHC (Haskell itself)
* `libsodiumCommit`: Commit for Libsodium cryptography library
* `cardanoNodeRelease`: Version of the `cardano-node` 
* `network`: Cardano network, `mainnet` or `testnet`
* `publicDomainHostedZoneId`: Hosted zone ID of your Route 53 domain that you registered or transferred above
* `publicDomain`: your domain name
* `internalDomain`: can be something like `<your-domain>.internal`. It is only used for node connections within VPC. 
* `nodeGroups`: Block producer and relay autoscaling groups configuration
    * `nodeType`: Type of the node: `Relay` or `Producer`
    * `instanceClass`: Class of an EC2 instance, such as `t3a` or `m5`
    * `instanceSize`: Size of an EC2 instance, such as `large` or `xlarge`
    * `dataVolumeSizeGb`: Size in GB of an EBS volume containing Cardano ledger database. Currently 24Gb is appropriate, but increase for more when the ledger grows over time. 
    * `snapshotId`: Optional. Snapshot ID of EBS volume, which can be restored when EC2 instance gets launched to avoid ledger sync from the genesis, which is painfully long. Initially, should be removed from config and only added back once the first (and only) ledger sync is completed. 
    * `numInstances`: Number of desired instances in the autoscaling group. Minimum is 1, but can be made 2 for high availability scenario. 
    * `port`: TCP port the node will be listening to
    * `urlPrefix`: prefix that will be added to your domain name to form an endpoint URL of your node. 
    * `autoStart`: whether to start `cardano-node` process automatically once the instance is launched. By default is `true` for relay and `false` for block producer node.


### Synthesizing stacks
_(yes, this is how it's called: 'synthesizing')_

Once you are satisfied with your config options, execute:
```
[local $] cdk synth
```
You should see a list of the synthesized stacks in the output:
```
Successfully synthesized to /Users/dmitri/workplace/github/adamantas/cardano-stake-pool/cdk.out
Supply a stack id (mainnet-core, testnet-core, mainnet-bin-build, mainnet-stake-pool, testnet-bin-build, testnet-stake-pool) to display its template.

```

_Lyrical Sidenote:_
_Indeed, if you supply the name of a stack to the `cdk synth` command, you will get a long YAML template as an output. Try it:_
```
[local $] cdk synth testnet-core
```

_This is an AWS CloudFormation template that you'd have to write yourself (in YAML or JSON), if we didn't use AWS CDK. CDK makes it much more fun to code in TypeScript and has sensible defaults to shorten VPC launch code to just one line:_
```
this.vpc = new ec2.Vpc(this, 'VPC');
```
_and for people who think that it's fun to code in markup languages, there is a special place you know where._

### Deploying testnet core stack
Do: 
```
[local $] scripts/create core testnet
```
This will deploy the testnet VPC. 

_Note: CDK usually summarizes the changes it is about to make asking for confirmation. It's a good idea to review them and if everything looks alright, accept the changes with an almighty `'y'`_

_While stack launch is in progress, you can do a few things to keep yourself entertained. You can watch the progress in the terminal console, yes. But also you can go to AWS Console and then to Cloud Formation and see the stack being launched, and then also you can go to VPC to see how your VPC is launching. Fascinating stuffs._

_Note: peeking inside the scripts not only allowed, but encouraged_

### Deploying binaries build stack
Do:
```
[local $] scripts/create bb testnet
```
This will again ask you for your almighty `'y'` and it should be relatively quick to launch an EC2 instance that will be building Cardano binaries for us. 

_'Wait!' - you'll say. 'But how about the output from the compiler that we all love to stare at, watching it endlessly scrolling in front of our eyes?!!'_ 

Don't you worry. We've got some for you.

Connect to the EC2 instance:
```
[local $] scripts/connect bb testnet
```

and then just watch the tail of the log. There has to be an Irish tune with such a name: "Watching the Tail of the Log". If there is none, I should write one myself, or ain't I a true Irish? 

```
[bin-build $] sudo watch tail /var/log/cloud-init-output.log
```

_Are we happy, Vincent?_

So it will be compiling for about an hour and once it's done it will put the binaries in our S3 bucket and stop itself, so you don't have to worry about this instance hanging around and begging for money. 

You can check the compiled binaries on S3:
```
[local $] aws s3 ls s3://<your-bucket-name>/bin/<cardano-node-release-version>/
```

If it's there, we are happy campers. 

### Launch testnet stake pool
Do:
```
[local $] scripts/create sp testnet

```
Okey, you should get used to the drill already. You pressed your almighty `'y'`, you watched some stack launch progress in the terminal console and eventually it has finished. Now what? 

Well, what has happened behind the scenes, the two EC2 instances have been launched: one relay and one block producer (unless you did something funky in config and launched many more of them). We can go to AWS Console/EC2 to check them out, but it's much more fun to connect and see what's going on. 

In our config, we specified that the relay instance should autostart the `cardano-node` process, and block producer should not. So?

_-'Where are we going?'_ 

_- Relay!!!_

Do:
```
[local $] scripts/connect relay testnet
```

Okey, so now we are in really unfamiliar land, so let's explore. First of all we don't know even who we are and where we are. So, let's find out!
```
[relay $] whoami
ssm-user
[relay $] pwd
/usr/bin
```
And... It's totally boring. There is nothing more pathetic than be some noname in noland. That's not who we wanted to be when we grow up. Not some stupid `ssm-user` and not in `/usr/bin` directory. We wanted to be `cardano`! Okey, may be we should try something. May be some magic will happen?

Do:
```
[relay $] sudo su cardano
[relay $] cd /cardano
[relay $] whoami
cardano
[relay $] pwd
/cardano
```
OMG!!! It worked! We are `cardano` in `/cardano`! We are more Cardanian than Kim Cardanian! 

_Note: if you got a message that cardano user doesn't exist, yes it will feel like there is no more Christmas, but this is because you are too quick. Instance has not been able to fully go through the bootstrap scripts and create this user. Wait a few minutes and try to become Cardanian again. It's all about faith, you know._

Now let's explore some more. Do:
```
[relay $] ls
bin  config  db  glive-view  libsodium  simple-live-view
```
This is already looking like a pleasant scenary! We have `config`, `db` and even two views, one simple and one not so much. But first, let's see if our `cardano-node` process is running, as it supposed to. 

Do:
```
[relay $] sudo systemctl status cardano-node
```

You should see some text in the output, but what we are looking to see is one phrase: `Active: active (running)` It should be green. If it's there, we are good. 

Now let's see some output from this process. Do:
```
[relay $] journalctl --unit=cardano-node --follow
```

_Following the leader, the leader, the leader..._

And we see lots and lots of errors and warnings and then errors again! Feels like the house is on fire! What's going on?

According to some smart people, those are not critical issues, but rather messages that we fail to connect to some nodes, and it's totally normal. Even in life not everyone wants to be our friends. Same seems to be in Cardanoland. But what we really interested in is if our chain gets longer. So let's find out. Just do `Ctrl+C` to quit and then do:

```
[relay $] journalctl --unit=cardano-node --follow | grep 'Chain extended'
```

You might need to wait a little for the first message to appear, but it should be here soon. If you see at least one, then our process is working as expected and the chain adds blocks. 

Now let's expand our horizons a bit. Remember the views we've seen in the `/cardano` directory? So stop watching the chain grow, hit `Ctrl+C` and lets do this:

```
[relay $] glive-view/glive-view.sh
```

If you see what I see, you should be pretty excited! It's a very pretty view of overall stats about our relay node. What we need to pay attention to is where it says `Status: syncing (xx.xx%)`. We need to it to get to 100%, but that's going to take awhile. So let's get some wine, may be watch a good movie, may be go to bed if it's late and check for this process later. 

### Creating a snapshot of the cardano data volume
In our stake pool architecture, all cardano related data resides on it's own EBS volume that is attached to the EC2 instance. Which is very convenient, since we can take a snapshot of it and restore it during the instance launch with all the historical transactions already there and all that will be needed is to sync the ledger from the point the snapshot was taken to the current moment. 

First let's see if the ledger has been fully synced. Do:
```
[relay $] /cardano/glive-view/glive-view.sh
```

If you see that instead of `syncing` message there is `Tip (diff)` one, it means that the ledger is synced and now we can take the snapshot of it. 

Now do:
```
[local $] scripts/snapshot relay testnet
```

Give the script time to complete (about a minute for 24gb volume) and then copy the snapshot id (snap-xxxxxxxxxx) to your `config.ts` file under the `node_groups`, so it looks similar to this:

```
nodeGroups: [
        {
            nodeType: NodeType.Producer,
            instanceClass: ec2.InstanceClass.T3A,
            instanceSize: ec2.InstanceSize.LARGE,
            dataVolumeSizeGb: 24,
            snapshotId: 'snap-xxxxxxxxxxxxxx',
            numInstances: 1,
            port: 6000,
            urlPrefix: 'producer-test',
            autoStart: false

        },
        {
            nodeType: NodeType.Relay,
            instanceClass: ec2.InstanceClass.T3A,
            instanceSize: ec2.InstanceSize.LARGE,
            dataVolumeSizeGb: 24,
            snapshotId: 'snap-xxxxxxxxxxxxxxx',
            numInstances: 1,
            port: 3001,
            urlPrefix: 'relay-test',
            autoStart: true
        }
]
```

Now that you have a ledger snapshot, let's see how quickly you can recreate the whole stake pool in testnet once it gets deleted. Should be just a few minutes. 

### Deleting the stake pool
You can delete the stake pool by one command.
```
[local $] scripts/delete sp testnet
```

Now let's launch the stake pool in testnet again

### Restoring stake pool 
To restore the stake pool, you just need to redeploy the stack. It will take the compiled binaries from S3 and restore the EBS volume containing the ledger from the snapshot. 
```
[local $] scripts/create sp testnet
```
Once the pool is launched, follow the same instructions above to launch GLiveView and see if your relay node is performing fine. 

### Launching stake pool in mainnet
Once you got comfortable with launching/deleting/restoring stake pool in testnet, you might want to try the real thing. Launch it in mainnet. Ooo, scary, isn't it? But don't worry it's exactly the same as launching in testnet, you only should substitute the word `testnet` for `mainnet` in all your commands. Try it and see it how it works for you. 

### Musings about air-gapped server
If you hear this term for the first time in your life and thinking 'what the hell is 'air-gapped server?', you are not alone. I was thinking exactly the same thing. Apparently, it means that it's the server 'that has a gap of air around it', in a sense that it's not connected to any network. This is clearly a case of some geeky poetical metaphorism, because even you have a gap of air, it can still be connected (heard of Wi-Fi, hello?), and if you want to say that it's not connected to anything, why don't you just say so? Anyhow, it's called "air-gapped server", so we stick with this term. And what it is really needed for is to keep your cold keys and sign transactions. 

>  Keep your cold keys away from me, would you?
>  -  _Your hot server_

When I asked on the Telegram _where_ should I keep my cold keys, I got unequivocal answer 
>  on an air-gapped server enclosed in a _faraday cage_

Wow. Further it goes, more interesting it gets. Now we also need some cage, because apparently just having air gap is not enough. I googled it and it seems that even if your server is not connected to any network it's still possible, theoretically, to steal valuable information by monitoring electromagnetic fields. So next time you see a random dude hanging around your house with something looking like a metallodetector, you know what he is doing. Especially if it is Bill Gates, who recently got really crafty with this 5G stuff, you know. 

But I'll leave it up to you to find this practical fine edge between carelesness of sticking your cold keys into the hot environment and downright non-sensical paranoia of keeping servers in faraday cages, so swipers couldn't swipe them. 

As for me, I just took old gaming desktop computer my son didn't need anymore, disabled all network interfaces in BIOS, installed Ubuntu LTS with hard drive encryption option, and have been transferring all data between cold and hot environments on a USB flash drive. And installed video cameras and barbed wire perimeter all around the house to catch weirdos. (kidding)

### Configuring your stake pool
This part doesn't make sense to automate and script. It's impossible to do it end-to-end, since it envolves passing signed transactions between you air-gapped server and 'hot' server, and also, as a stake pool operator, you need to know all these commands by hand. I have followed excellent [CoinCashew Tutorial](https://www.coincashew.com/coins/overview-ada/guide-how-to-build-a-haskell-stakepool-node) and it worked well for me. 
