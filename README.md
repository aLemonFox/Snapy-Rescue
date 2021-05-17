# Snapy Rescue
Snapy Rescue is a fork of [superdarkbit/nano-bip32-ed25519](https://github.com/superdarkbit/nano-bip32-ed25519). It checks the balance of every address associated with the 24 word seed from beta.snapy.io.

## Step 1 - Seed
beta.snapy.io's wallet backup looks something like this:

    {
      "seed": "ring sunny close flash twenty ... ... ...",
      "extendedPublicKey": "eee0e4d94509b...",
      "walletId": ...,
      "status": "success"
    }
Copy the 24 words to your clipboard.

## Step 2 - Finding funds
Run this repo locally or go to https://alemonfox.github.io/Snapy-Rescue/ and enter your seed phrase. If needed, change the amount of indexes to search.
![enter seed phrase](https://i.imgur.com/o7flEot.png)

## Step 3 - Rescue Me
Click **Rescue Me** to start checking account balances. Accounts with funds will be shown in green, accounts without funds will be red. 
*Note: balances are fetched from api.nanos.cc.*
![addresses checked](https://i.imgur.com/rAAvI0n.png)

## Step 4 - Recovery
When you find an account with funds, copy the private key to your clipboard. Then, visit nault.cc. A popular web-based Nano wallet. On the sidebar, click **settings > configure new wallet**. Then click on **more options**. After that, select **import expanded private key** and paste your private key.
![import expanded private key](https://i.imgur.com/5u6Dr6N.png)

## Step 5 - Transfer to you own wallet
You have now succesfully recovered your lost Nano's. Make sure to **send everything to a wallet you own**.
