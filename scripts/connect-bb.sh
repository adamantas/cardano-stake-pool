#!/bin/bash
instance_id=$(aws ec2 describe-instances --query "Reservations[?not_null(Instances[?State.Name == 'running' && Tags[?Value == 'binaries-build-$1']])].Instances[*].InstanceId | []" --output text)
aws ssm start-session --target ${instance_id}
