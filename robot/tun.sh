#!/bin/bash

if [[ "$#" -ne 3 ]]; then
    echo "usage: $0 <server_ip> <student_id>"
    echo "Starts an SSH tunnel to the backend server via Informatics SSH."
    echo "Will interactively ask for your EASE password."
    exit 1
fi

ssh -fNnT -L 8000:$1:8000 "$2@student.ssh.inf.ed.ac.uk"

