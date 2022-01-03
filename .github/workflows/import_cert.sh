#!/bin/bash
echo "Creating new keychain"

security create-keychain -p "$MAC_CERTS_PASSWORD" build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p "$MAC_CERTS_PASSWORD" build.keychain

echo "Importing key"
security import <(echo $MAC_KEY | base64 -d) -P "$MAC_CERTS_PASSWORD" -f pkcs12

echo "Trusting Certificate"
# Using sudo because overwriting trust settings would require interactive password input
echo $MAC_CERT | base64 -d > cert.cer
sudo security add-trusted-cert -d -r trustRoot -p codeSign -k build.keychain cert.cer
