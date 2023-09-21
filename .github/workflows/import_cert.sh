#!/bin/bash
echo "Creating new keychain"

security create-keychain -p "$MAC_KEY_PASSWORD" build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p "$MAC_KEY_PASSWORD" build.keychain

echo "Importing key"
echo $MAC_KEY | base64 -d > key.cer
security import key.cer -P "$MAC_KEY_PASSWORD" -f pkcs12
rm key.cer

echo "Trusting Certificate"
# Using sudo because overwriting trust settings would require interactive password input
echo $MAC_CERT | base64 -d > cert.cer
sudo security authorizationdb write com.apple.trust-settings.admin allow
sudo security add-trusted-cert -d -r trustRoot -p codeSign -k build.keychain cert.cer
sudo security authorizationdb remove com.apple.trust-settings.admin

n_valid_certs=`security find-identity -v -p codesigning | grep 'valid identities found' | awk '{ print $1 }'`

if [ $n_valid_certs -lt 1 ]; then
    echo "Error, no valid codesigning certificate found"
    security find-identity -p codesigning
    exit 1
fi
