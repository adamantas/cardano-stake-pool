# generate stake keys

cardano-cli stake-address key-gen \
 --verification-key-file stake.vkey \
 --signing-key-file stake.skey


# create stake address
cardano-cli stake-address build \
 --stake-verification-key-file stake.vkey \
 --out-file stake.addr \
 --testnet-magic 1097911063

 # regenerate payment address with stake
 cardano-cli address build \
 --payment-verification-key-file payment.vkey \
 --stake-verification-key-file stake.vkey \
 --out-file paymentwithstake.addr \
 --testnet-magic 1097911063

 # create transaction to move funds to the address with stake

 # query the balance on addr 2
cardano-cli query utxo \
--mary-era \
--address $(cat payment2.addr) \
--testnet-magic 1097911063


# draft the transaction
cardano-cli transaction build-raw \
--tx-in 15e4610f602086225f6fc3f3647b5481eeb88acdd002c903c9379c891b2080bf#0 \
--tx-in bd3e2c9de2dbae4b7fc2366cc3d03a3ece0f816e8864afd3b3715fc2c6c38e35#0 \
--tx-out $(cat paymentwithstake.addr)+999654214 \
--ttl 0 \
--fee 0 \
--out-file tx.raw

# calculate fee
cardano-cli transaction calculate-min-fee \
   --tx-body-file tx1.raw \
   --tx-in-count 2 \
   --tx-out-count 1 \
   --witness-count 1 \
   --byron-witness-count 0 \
   --testnet-magic 1097911063 \
   --protocol-params-file protocol.json

# determine TTL
cardano-cli query tip --testnet-magic 1097911063

# build the transaction
cardano-cli transaction build-raw \
--tx-in 15e4610f602086225f6fc3f3647b5481eeb88acdd002c903c9379c891b2080bf#0 \
--tx-in bd3e2c9de2dbae4b7fc2366cc3d03a3ece0f816e8864afd3b3715fc2c6c38e35#0 \
--tx-out $(cat paymentwithstake.addr)+999480749 \
--ttl 20697973 \
--fee 173465 \
--out-file tx.raw

# sign transaction
cardano-cli transaction sign \
--tx-body-file tx.raw \
--signing-key-file payment2.skey \
--testnet-magic 1097911063 \
--out-file tx.signed


# submit transaction
cardano-cli transaction submit \
        --tx-file tx.signed \
        --testnet-magic 1097911063


# create registration certificate
cardano-cli stake-address registration-certificate \
--stake-verification-key-file stake.vkey \
--out-file stake.cert

 # query the balance on paymentwithstake.addr
cardano-cli query utxo \
--mary-era \
--address $(cat paymentwithstake.addr) \
--testnet-magic 1097911063

# draft transaction
cardano-cli transaction build-raw \
--tx-in 50fb31bbb57e2908f80d239df9a93796e48e7f1bafd20a683760a4d9525dfd4a#0 \
--tx-out $(cat paymentwithstake.addr)+0 \
--ttl 0 \
--fee 0 \
--out-file tx.raw \
--certificate-file stake.cert

# calculate fees and deposit
cardano-cli transaction calculate-min-fee \
--tx-body-file tx.raw \
--tx-in-count 1 \
--tx-out-count 1 \
--witness-count 1 \
--byron-witness-count 0 \
--testnet-magic 1097911063 \
--protocol-params-file protocol.json

fee 172761 
deposit 2000000

# build transaction
cardano-cli transaction build-raw \
--tx-in 50fb31bbb57e2908f80d239df9a93796e48e7f1bafd20a683760a4d9525dfd4a#0 \
--tx-out $(cat paymentwithstake.addr)+997307988 \
--ttl 20699495 \
--fee 172761 \
--out-file tx.raw \
--certificate-file stake.cert

# sign transaction
cardano-cli transaction sign \
--tx-body-file tx.raw \
--signing-key-file payment.skey \
--signing-key-file stake.skey \
--testnet-magic 1097911063 \
--out-file tx.signed

# submit transaction
cardano-cli transaction submit \
--tx-file tx.signed \
--testnet-magic 1097911063