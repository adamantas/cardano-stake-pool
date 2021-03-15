#!/bin/bash

cardano-node run \
 --topology /cardano/config/testnet/testnet-topology.json \
 --database-path /cardano/db \
 --socket-path /cardano/db/node.socket \
 --host-addr 0.0.0.0 \
 --port 3001 \
 --config /cardano/config/testnet/testnet-config.json &



cardano-node run \
 --topology /cardano/config/testnet-topology.json \
 --database-path /cardano/db \
 --socket-path /cardano/db/node.socket \
 --host-addr 0.0.0.0 \
 --port 6000 \
 --config /cardano/config/testnet-config.json &