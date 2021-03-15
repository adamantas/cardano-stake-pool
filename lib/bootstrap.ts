import cdk = require('@aws-cdk/core');
import { CardanoStakePoolStackProps } from './cardano-stake-pool-stack'

export function attachDataDrive(): Array<string> {
    
    return [
        'mkfs -t xfs /dev/sdb',
        'mkdir /cardano',
        'mount /dev/sdb /cardano',
        'cp /etc/fstab /etc/fstab.orig',
        'echo "UUID=$(sudo blkid -o value -s UUID /dev/sdb)  /cardano  xfs  defaults,nofail  0  2" >> /etc/fstab',
    ]
};
      
export function buildCardanoNodeBinaries (props: CardanoStakePoolStackProps): Array<string> {
    
    return [
        // install dev libs and compilers
        'yum update -y',
        'yum install git gcc gcc-c++ tmux gmp-devel make tar wget nmap -y',
        'yum install zlib-devel libtool autoconf -y',
        'yum install systemd-devel ncurses-devel ncurses-compat-libs -y',

        // install Cabal
        'cd ~',
        `wget https://downloads.haskell.org/~cabal/cabal-install-${props.cabalRelease}/cabal-install-${props.cabalRelease}-x86_64-unknown-linux.tar.xz`,
        `tar -xf cabal-install-${props.cabalRelease}-x86_64-unknown-linux.tar.xz`,
        `rm -f cabal-install-${props.cabalRelease}-x86_64-unknown-linux.tar.xz cabal.sig`,
        'mv cabal /usr/local/bin',
        'export PATH=/usr/local/bin:$PATH',
        'cabal update',

        // install GHC
        'cd /cardano',
        `wget https://downloads.haskell.org/~ghc/${props.ghcRelease}/ghc-${props.ghcRelease}-x86_64-centos7-linux.tar.xz`,
        `tar -xf ghc-${props.ghcRelease}-x86_64-centos7-linux.tar.xz`,
        `rm -f ghc-${props.ghcRelease}-x86_64-centos7-linux.tar.xz`,
        `cd ghc-${props.ghcRelease}`,
        './configure',
        'make install',
        'cd ..',

        // install Libsodium
        'export LD_LIBRARY_PATH="/usr/local/lib:$LD_LIBRARY_PATH"',
        'export PKG_CONFIG_PATH="/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH"',
        'git clone https://github.com/input-output-hk/libsodium',
        'cd libsodium',
        `git checkout ${props.libsodiumCommit}`,
        './autogen.sh',
        './configure',
        'make',
        'make install',
        'cd ..',

        // install Cardano node
        'git clone https://github.com/input-output-hk/cardano-node.git',
        'cd cardano-node',
        'git fetch --all --tags',
        `git checkout tags/${props.cardanoRelease}`,
        'export HOME="/root"',
        'cabal clean',
        'cabal update',
        'cabal build all',
        'cd ..',
        `cp -p cardano-node/dist-newstyle/build/x86_64-linux/ghc-${props.ghcRelease}/cardano-node-${props.cardanoRelease}/x/cardano-node/build/cardano-node/cardano-node /cardano/bin/`,
        `cp -p cardano-node/dist-newstyle/build/x86_64-linux/ghc-${props.ghcRelease}/cardano-cli-${props.cardanoRelease}/x/cardano-cli/build/cardano-cli/cardano-cli /cardano/bin/`,
    ]
} 

export function downloadCardanoBinaries(): Array<string> {
    return [
        'yum install tar wget -y',
        'wget -O /tmp/cardano-node.tar.gz https://hydra.iohk.io/job/Cardano/cardano-node/cardano-node-linux/latest/download-by-type/file/binary-dist',
        'mkdir -p /tmp/cardano',
        'tar -xzvf /tmp/cardano-node.tar.gz -C /tmp/cardano',
        'mkdir -p /cardano/bin',
        'cp /tmp/cardano/cardano-* /cardano/bin'
    ]
}

export function downloadConfiguration(network: string): Array<string> {
    
    return [
        `mkdir /cardano/config/${network}`,
        ...[
            'config',
            'shelley-genesis',
            'byron-genesis',
            'topology'
        ].map(
            (k: string) => { return `wget -P /cardano/config/${network} https://hydra.iohk.io/job/Cardano/cardano-node/cardano-deployment/latest-finished/download/1/${network}-${k}.json`}
        ),
        `sed -i /cardano/config/${network}/${network}-config.json -e "s/TraceBlockFetchDecisions\\": false/TraceBlockFetchDecisions\\": true/g"`,
    ];
}

export function createCardanoUser(): Array<string> {

    return [
        'useradd -m cardano',
        'sudo chown -R cardano /cardano',
        'echo "export PATH=/cardano/bin:$PATH" >> /home/cardano/.bashrc',
        'echo "export CARDANO_NODE_SOCKET_PATH=/cardano/db/node.socket" >> /home/cardano/.bashrc',
    ]
}

export function createStartupScript(network: string, port: number): Array<string> {

    return [
        `cat > /cardano/bin/start-node.sh << EOF 
#!/bin/bash
/cardano/bin/cardano-node run --topology /cardano/config/${network}/${network}-topology.json --database-path /cardano/db  --socket-path /cardano/db/node.socket  --host-addr 0.0.0.0 --port ${port} --config /cardano/config/${network}/${network}-config.json
EOF`,
        'chmod +x /cardano/bin/start-node.sh',
        `cat > /tmp/cardano-node.service << EOF 
# The Cardano node service (part of systemd)
# file: /etc/systemd/system/cardano-node.service 
[Unit]
Description = Cardano node service
Wants = network-online.target
After = network-online.target 

[Service]
User = cardano
Type = simple
WorkingDirectory = /cardano/bin
ExecStart = /bin/bash -c '/cardano/bin/start-node.sh'
KillSignal = SIGINT
RestartKillSignal = SIGINT
TimeoutStopSec = 2
LimitNOFILE = 32768
Restart = always
RestartSec = 5

[Install]
WantedBy = multi-user.target
EOF`,
        'mv /tmp/cardano-node.service /etc/systemd/system/cardano-node.service',
        'chmod 644 /etc/systemd/system/cardano-node.service',
        'systemctl daemon-reload',
        'systemctl enable cardano-node'
    ]
}
