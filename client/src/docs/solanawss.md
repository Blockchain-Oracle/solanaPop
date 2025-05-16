How to Create Solana WebSocket Subscriptions
Updated on
May 07, 2025
All
Solana
WebSocket
JavaScript
Solana-Web3.js
Video
10 min read

Tools for Monitoring Real-Time Solana Data
There are several ways to monitor real-time changes on Solana. If you are not sure which approach is right for your use case, check out our Blog post for a comparison of the options. If you are ready to start building with WebSockets using Solana Web3js (version 1.x), keep reading (if you'd prefer version 2.x, check out our guide, here)!

Overview
Creating event listeners is an effective way to alert your app or your users that something you're monitoring has changed. Solana has several built-in handy event listeners, also known as subscriptions, that make listening for changes on the Solana Blockchain a breeze. Not sure how you would use that? Here are a couple of examples where this might come in handy: a Discord bot that looks for interactions with an on-chain Program (e.g., sales bot), a dApp that checks for errors with a user's transaction, or a phone notification when the balance of a user's wallet changes.

Prefer a video walkthrough? Follow along with Sahil to learn how to create Websocket subscriptions to Solana blockchain in 4 minutes.

Subscribe to our YouTube channel for more videos!
Subscribe
What You Will Do
In this guide, you will learn how to use several Solana event listener methods and QuickNode's Websocket endpoints (WSS://) to listen for changes on chain. Specifically, you will create a simple typescript application to track for changes in an Account (or Wallet). Then you will learn how to use Solana's unsubscribe methods to remove a listener from your application. We'll also cover basics about some of Solana's other listener methods.

What You Will Need
Nodejs installed (version 16.15 or higher)
npm or yarn installed (We will be using yarn to initialize our project and install the necessary packages. Feel free to use npm instead if that’s your preferred package manager)
Typescript experience and ts-node installed
Solana Web3
Set Up Your Environment
Create a new project directory in your terminal with:

mkdir solana-subscriptions
cd solana-subscriptions

Create a file, app.ts:

echo > app.ts

Initialize your project with the "yes" flag to use default values for your new package: 

yarn init --yes
#or
npm init --yes

Install Solana Web3 dependencies:
yarn add @solana/web3.js@1
#or
npm install @solana/web3.js@1

Open app.ts in your preferred code editor and on line 1, import Connection, PublicKey, and LAMPORTS_PER_SOL from the Solana Web3 library: 

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";


Logs for Simplified Debugging
You can now access Logs for your RPC endpoints, helping you troubleshoot issues more effectively. If you encounter an issue with your RPC calls, simply check the logs in your QuickNode dashboard to identify and resolve problems quickly. Learn more about log history limits on our pricing page.

Alright! We're all ready to go. 

Set Up Your Quicknode Endpoint
To build on Solana, you'll need an API endpoint to connect with the network. You're welcome to use public nodes or deploy and manage your own infrastructure; however, if you'd like 8x faster response times, you can leave the heavy lifting to us.


QuickNode Now Accepts Solana Payments 🚀
You can now pay for a QuickNode plan using USDC on Solana. As the first multi-chain provider to accept Solana payments, we're streamlining the process for developers — whether you're creating a new account or managing an existing one. Learn more about paying with Solana here.

See why over 50% of projects on Solana choose QuickNode and sign up for a free account here.

We're going to use a Solana Devnet node. Copy the HTTP Provider and WSS Provider links:

New Solana Endpoint

Create two new variables on lines 3 and 4 of app.js to store these URLs: 

const WSS_ENDPOINT = 'wss://example.solana-devnet.quiknode.pro/000/'; // replace with your URL
const HTTP_ENDPOINT = 'https://example.solana-devnet.quiknode.pro/000/'; // replace with your URL


Establish a Connection to Solana
On line 5, create a new Connection to Solana: 

const solanaConnection = new Connection(HTTP_ENDPOINT,{wsEndpoint:WSS_ENDPOINT});


If you've created Connection instances to Solana in the past, you may notice something different about our parameters, particularly the inclusion of {wsEndpoint:WSS\_ENDPOINT}. Let's dig in a little deeper. 

The Connection class constructor allows us to pass an optional commitmentOrConfig. There are a few interesting options we can include with the ConnectionConfig, but today we're going to hone in on the optional parameter, wsEndpoint. This is an option for you to provide an endpoint URL to the full node JSON RPC PubSub Websocket Endpoint. In our case, that's our WSS Endpoint we defined earlier, WSS_ENDPOINT.

What happens if you don't pass a wsEndpoint? Well, Solana accounts for that with a function, makeWebsocketUrl that replaces your endpoint URL's https with wss or http with ws (source). Because all QuickNode HTTP endpoints have a corresponding WSS endpoint with the same authentication token, it is fine for you to omit this parameter unless you'd like to use a separate endpoint for your Websocket queries.

Let's create some subscriptions!

Create an Account Subscription
To track a wallet on Solana, we'll need to call the onAccountChange method on our solanaConnection. We will pass ACCOUNT_TO_WATCH, the public key of the wallet we'd like to search, and a callback function. We've created a simple log that alerts us that an event has been detected and log the new account balance. Add this snippet to your code after your solanaConnection declaration on line 7: 

(async()=>{
    const ACCOUNT_TO_WATCH = new PublicKey('vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg'); // Replace with your own Wallet Address
    const subscriptionId = await solanaConnection.onAccountChange(
        ACCOUNT_TO_WATCH,
        (updatedAccountInfo) =>
            console.log(`---Event Notification for ${ACCOUNT_TO_WATCH.toString()}--- \nNew Account Balance:`, updatedAccountInfo.lamports / LAMPORTS_PER_SOL, ' SOL'),
        "confirmed"
    );
    console.log('Starting web socket, subscription ID: ', subscriptionId);
})()


Build a Simple Test
This code is ready to run as is, but we're going to add one more functionality to help us test that it's working properly. We'll do this by adding a sleep function (to add a time delay) and an airdrop request. Before your async code block on line 6, add: 

const sleep = (ms:number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}


And then, inside your async code block after the "Starting web socket" log, add this airdrop call:

    await sleep(10000); //Wait 10 seconds for Socket Testing
    await solanaConnection.requestAirdrop(ACCOUNT_TO_WATCH, LAMPORTS_PER_SOL);


Your code will effectively wait 10 seconds after the socket has initiated to request an airdrop to the wallet (note: this will only work on devnet and testnet). 

Our code now looks like this: 

import { Connection, PublicKey, LAMPORTS_PER_SOL, } from "@solana/web3.js";

const WSS_ENDPOINT = 'wss://example.solana-devnet.quiknode.pro/000/'; // replace with your URL
const HTTP_ENDPOINT = 'https://example.solana-devnet.quiknode.pro/000/'; // replace with your URL
const solanaConnection = new Connection(HTTP_ENDPOINT, { wsEndpoint: WSS_ENDPOINT });
const sleep = (ms:number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const ACCOUNT_TO_WATCH = new PublicKey('vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg');
    const subscriptionId = await solanaConnection.onAccountChange(
        ACCOUNT_TO_WATCH,
        (updatedAccountInfo) =>
            console.log(`---Event Notification for ${ACCOUNT_TO_WATCH.toString()}--- \nNew Account Balance:`, updatedAccountInfo.lamports / LAMPORTS_PER_SOL, ' SOL'),
        "confirmed"
    );
    console.log('Starting web socket, subscription ID: ', subscriptionId);
    await sleep(10000); //Wait 10 seconds for Socket Testing
    await solanaConnection.requestAirdrop(ACCOUNT_TO_WATCH, LAMPORTS_PER_SOL);
})()


Start Your Socket!
Let's go ahead and test it out. In your terminal you can enter ts-node app.ts to start your web socket! After about 10 seconds, you should see a terminal callback log like this:

solana-subscriptions % ts-node app.ts
Starting web socket, subscription ID:  0
---Event Notification for vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg--- 
New Account Balance: 88790.51694709  SOL


Excellent! You should notice that your application remains open even after the event notification. That's because our subscription is still listening for changes to our account. We need a way to unsubscribe to the listener. Hit Ctrl^C to stop the process.

Unsubscribe from Account Change Listener
Solana has created a built-in method that we can use to unsubscribe from our Account Change listener, removeAccountChangeListener. The method accepts a valid subscriptionId (number) as its only parameter. Inside your async block, add another sleep after your airdrop to allow time for the transaction to process and then call removeAccountChangeListener:

    await sleep(10000); //Wait 10 for Socket Testing
    await solanaConnection.removeAccountChangeListener(subscriptionId);
    console.log(`Websocket ID: ${subscriptionId} closed.`);


Now run your code again, and you should see the same sequence followed by the closing of the Websocket: 

solana-subscriptions % ts-node app.ts
Starting web socket, subscription ID:  0
---Event Notification for vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg--- 
New Account Balance: 88791.51694709  SOL
Websocket ID: 0 closed.


Nice job! As you can see, this can be useful if you want to disable a listener after something has happened (e.g., time elapsed, certain threshold realized, number of notifications, etc.). 

We've published the final code for this script to our Github repo for your reference.

Other Solana Websocket Subscriptions
Solana has several other, similar Websocket subscribe/unsubscribe methods that are also useful. We'll describe them briefly in this section.

onProgramAccountChange: Register a callback to be invoked whenever accounts owned by the specified program change. Pass a Program's PublicKey and an optional array of account filters. Among other things, this can be handy for tracking changes to a user's Token Account. Unsubscribe with removeProgramAccountChangeListener.
onLogs: Registers a callback to be invoked whenever logs are emitted--can be used similar to onAccountChange by passing a valid PublicKey. The callback will return recent transaction ID. Unsubscribe with removeOnLogsListener.
onSlotChange: Register a callback to be invoked upon slot changes. Only a callback function is passed into this method. Unsubscribe with removeSlotChangeListener.
onSignature: Register a callback to be invoked upon signature updates by passing a valid Transaction Signature. The callback will return whether or not the transaction has experienced an error. Unsubscribe with removeSignatureListener. onRootChange: Register a callback to be invoked upon root changes. Only a callback function is passed into this method. Unsubscribe with removeRootChangeListener.
*Note: all unsubscribe methods require a subscriptionId (number) parameter. You can find more information on these methods in our documentation at quicknode.com/docs/solana. Feel free to experiment with each by making minor modifications to app.js to try some of these other subscriptions.

Billing and Optimization
Billing credits for Websocket methods are based on the number of responses received, not the number of subscriptions. For example, if you open an accountChange subscription and receive 100 responses, your account will be billed 5,000 credits (50 credits per response X 100 responses).

To optimize your subscriptions and ensure you are not being charged for unnecessary subscriptions or irrelevant responses, you should consider the following:

use unsubscribe methods to remove listeners when you are no longer interested in receiving data and
utilize filters for applicable methods to receive only relevant data.
Unsubscribe Methods
The following methods are used to remove listeners from subscriptions:

accountUnsubscribe: Unsubscribes an account from receiving updates on the account.
logsUnsubscribe: Unsubscribes from receiving logs.
programUnsubscribe: Unsubscribes from receiving program account updates.
slotUnsubscribe: Unsubscribes from receiving slot updates.
signatureUnsubscribe: Unsubscribes from receiving signature updates.
rootUnsubscribe: Unsubscribes from receiving root updates.
Using Filters with logsSubscribe
The logsSubscribe method allows you to filter transaction logs, which can significantly reduce the number of responses you receive. Here's an example:

// To subscribe to all logs (expensive and not recommended):
const subscriptionId = await connection.onLogs(
  'all',
  (logs) => {
    console.log('New log:', logs);
  }
);

// To subscribe only to logs mentioning a specific address:
const EXAMPLE_PUBLIC_KEY = new PublicKey('YOUR_ADDRESS_HERE');
const specificAddressSubscriptionId = await connection.onLogs(
  EXAMPLE_PUBLIC_KEY,
  (logs) => {
    console.log('Log mentioning specific address:', logs);
  }
);


Using Filters with programSubscribe
The programSubscribe method is powerful but can generate many responses. Use filters to narrow down the data you receive:

const filters = [
  {
    memcmp: {
      offset: 0, // Specify the offset in the account data
      bytes: 'base58_encoded_bytes_here' // Specify the bytes to compare
    }
  },
  {
    dataSize: 128 // If your account data is fixed, you can filter by data size - update this value to match your account's data size
  }
];

const subscriptionId = await connection.onProgramAccountChange(
  new PublicKey('Your_Program_ID_Here'),
  (accountInfo) => {
    console.log('Account changed:', accountInfo);
  },
  'confirmed',
  filters
);


In this example, we're using both memcmp and dataSize filters. The memcmp filter compares a series of bytes at a specific offset in the account data, while dataSize filters accounts based on their data size. This combination can significantly reduce the number of responses you receive, focusing only on the accounts that match your specific criteria. For more information on using GetProgramAccountsFilter, see the Solana RPC documentation.

Best Practices for Optimization
Be specific with your filters: The more specific your filters are, the fewer irrelevant responses you'll receive.

Use appropriate commitment levels for your use case: Higher commitment levels (like 'finalized') may result in fewer, but more certain, updates.

Regularly review and remove unused subscriptions: Audit your active subscriptions and remove any that are no longer needed.

Monitor your usage: Keep track of the number of responses you're receiving and adjust your filters or subscription strategy if necessary (QuickNode Dashboard).

By implementing these optimization strategies, you can ensure that you're only receiving the data you need, thereby minimizing unnecessary billing credit usage while maintaining the effectiveness of your Solana application.

Alternative Solutions
QuickNode offers several solutions for getting real-time data from Solana. Check out the following options to find the right tool for your use case:

WebSockets: As discussed in this guide, WebSockets offer direct connections to Solana nodes for real-time updates--these are ideal for simple applications and rapid development. If you want to use Solana WebSockets with Solana Kit, check out our Guide: Monitor Solana Accounts Using WebSockets and Solana Kit on how to set up a WebSocket subscription in Solana using Solana Kit.
Yellowstone gRPC Geyser Plugin: Yellowstone gRPC Geyser Plugin provides a powerful gRPC interface for streaming Solana data, with built-in filtering and historical data support.
Streams: Managed solution for processing and routing Solana data to multiple destinations, with built-in filtering and historical data support.
