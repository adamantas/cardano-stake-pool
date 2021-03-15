# get protocol parameters
cardano-cli query protocol-parameters \
  --mary-era \
  --testnet-magic 1097911063 \
  --out-file protocol.json

# query the tip of the blockchain
cardano-cli query tip --testnet-magic 1097911063

# calculating ttl
expr <slotNo> + 1200



# query the balance on addr 1
cardano-cli query utxo \
--mary-era \
--address $(cat payment.addr) \
--testnet-magic 1097911063

# draft the transaction
cardano-cli transaction build-raw \
--tx-in ff9ab63ef507a0bf03ae6b1022b71990b4032a10df5c999d1d745e728fa5cf94#0 \
--tx-out $(cat payment2.addr)+100000000 \
--tx-out $(cat payment.addr)+0 \
--ttl 0 \
--fee 0 \
--out-file tx.raw

# calculate fee
cardano-cli transaction calculate-min-fee \
   --tx-body-file tx.raw \
   --tx-in-count 1 \
   --tx-out-count 2 \
   --witness-count 1 \
   --byron-witness-count 0 \
   --testnet-magic 1097911063 \
   --protocol-params-file protocol.json

expr 1000000000 - 100000000 - 174433

# build the transaction
cardano-cli transaction build-raw \
--tx-in ff9ab63ef507a0bf03ae6b1022b71990b4032a10df5c999d1d745e728fa5cf94#0 \
--tx-out $(cat payment2.addr)+100000000 \
--tx-out $(cat payment.addr)+899825567 \
--ttl 20693111 \
--fee 174433 \
--out-file tx.raw

# sign transaction
cardano-cli transaction sign \
--tx-body-file tx.raw \
--signing-key-file payment.skey \
--testnet-magic 1097911063 \
--out-file tx.signed

# submit transaction
cardano-cli transaction submit \
        --tx-file tx.signed \
        --testnet-magic 1097911063