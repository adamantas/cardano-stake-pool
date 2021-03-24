#!/bin/bash
volume_id=$(aws ec2 describe-instances --query "Reservations[?not_null(Instances[?State.Name == 'running' && Tags[?Value == 'Relay'] && Tags[?Value == '$1']])].Instances[*].BlockDeviceMappings[?DeviceName == '/dev/sdb'].Ebs.VolumeId | []" --output text)
echo "Taking a snapshot of EBS volume: ${volume_id}"
snapshot_id=$(aws ec2 create-snapshot --volume-id ${volume_id} --description "cardano-$1" | jq '.SnapshotId' | sed 's/\"//g')
state="pending"
while [ ${state} != "completed" ]
do
    echo -e ".\c"
    state=$(aws ec2 describe-snapshots --snapshot-id ${snapshot_id} | jq '.Snapshots[0].State' | sed 's/\"//g')
    sleep 10
done

echo -e "\nCreated snapshot of EBS volume with id: ${snapshot_id}"
