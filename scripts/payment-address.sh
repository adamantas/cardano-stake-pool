#!/bin/bash

cardano-cli address build \
 --payment-verification-key-file payment.vkey \
 --out-file payment.addr \
 --testnet-magic 1097911063
