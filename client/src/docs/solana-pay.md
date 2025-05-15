```md
What is Solana Pay and How to Use It
Updated on
Mar 18, 2025
All
Solana
JavaScript
TypeScript
Solana-Web3.js
Solana Pay
13 min read

Overview
Solana Pay is a fast, easy-to-use, secure payment solution built on the Solana blockchain. In this guide, you'll learn how to use Solana Pay to create a simple payment application, process payments, and verify transactions.

What You Will Do
Create a simple simulation using Solana Pay:

Simulate a checkout experience and generate a payment URL.
Process a payment.
Verify the transaction.
Stay tuned for a bonus section at the end!

What You Will Need
Nodejs (version 16.15 or higher) installed
TypeScript experience and ts-node installed
A Solana Paper wallet (.json) with Devnet SOL (Example script)
What is Solana Pay?
Solana Pay is a powerful and flexible JavaScript library that enables seamless commerce on the Solana blockchain. By utilizing a token transfer URL scheme, Solana Pay ensures interoperability across wallets and services, making it easy for businesses and developers to accept payments in SOL or any SPL token without intermediaries. Because Solana offers near-instant settlements and low transaction fees, Solana Pay is a great tool to reduce friction between buyers and sellers.

How Solana Pay Works
Solana Pay DiagramSource: docs.solanapay.com

The diagram above illustrates the process of a Solana Pay transaction between a client (user's wallet) and a server (merchant's website or application).

User Creates an Order: The user visits the merchant's website or application and selects the product or service they wish to purchase.
Merchant Creates a Payment Link: The website generates a Solana Pay transaction request URL, which may include payment links, "Pay Now" buttons, or QR codes.
User Scans and Approves Transaction: The transaction request URL is parsed by the user's wallet using the Solana Pay JavaScript library, which extracts the necessary parameters from the URL. The wallet send's the Solana transaction to the cluster for processing.
Server Finds and Validates the Transaction: The merchant's server verifies that the on-chain transaction details (such as amount, token, and recipient address) match the specified request. This process ensures that the payment is processed quickly, the transaction is secured by the Solana blockchain, and the merchant receives the correct payment amount.
Let's try it out!

Build a Solana Pay App
Set up Environment
Before you can start building your Solana Pay application, you need to set up your environment and install the required dependencies. Open your terminal and run the following commands:

# Create a new directory for your project
mkdir solana-pay-demo
cd solana-pay-demo

# Create a **tsconfig.json** with .json importing enabled:
tsc -init --resolveJsonModule true

# Initiate a new Node.js project and install the dependencies
npm init -y
npm install --save @solana/web3.js@1 @solana/pay bignumber.js
## or if you prefer yarn
yarn init -y
yarn add @solana/web3.js@1 @solana/pay bignumber.js


This will create a new directory for your project, initialize it with a package.json and tsconfig, and install the necessary dependencies.

Create a new file named index.ts in your project directory. In your terminal, enter:

echo > index.ts

When you are ready, your environment should look something like this:

Environment

Get a QuickNode Endpoint
Connect to a Solana Cluster with Your QuickNode Endpoint
To build on Solana, you'll need an API endpoint to connect with the network. You're welcome to use public nodes or deploy and manage your own infrastructure; however, if you'd like 8x faster response times, you can leave the heavy lifting to us.

See why over 50% of projects on Solana choose QuickNode and sign up for a free account here. We're going to use a Solana Devnet endpoint.

Copy the HTTP Provider link:

Install Dependencies
At the top of your index.ts file, import the required dependencies:

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { encodeURL, validateTransfer, parseURL, TransferRequestURL, findReference } from '@solana/pay';
import BigNumber from 'bignumber.js';


Logs for Simplified Debugging
You can now access Logs for your RPC endpoints, helping you troubleshoot issues more effectively. If you encounter an issue with your RPC calls, simply check the logs in your QuickNode dashboard to identify and resolve problems quickly. Learn more about log history limits on our pricing page.

Define Key Constants
The first task we'll need to accomplish is creating an account with a wallet and funding it. We'll be using the handy tool below to automatically generate a new wallet and airdrop 1 SOL to it. (You can also achieve this with the Keypair.generate() and requestAirdrop() functions if you prefer a more manual approach).

🔑Generate a new wallet with Devnet SOL
Once you've successfully generated your keypair, you'll notice two new constants: secret and payer, a Keypair. The secret is a 32-byte array that is used to generate the public and private keys. The payer is a Keypair instance that is used to sign transactions (we've airdropped some devnet SOL to cover the gas fees). Make sure to add it to your code below your imports if you haven't yet:

const secret = [0,...,0]; // Replace with your secret key
const payer = Keypair.fromSecretKey(new Uint8Array(secret));


You'll also need to define some constants that we will use in the application. Add the following code below your payer constant:

// CONSTANTS
const myWallet = 'DemoKMZWkk483hX4mUrcJoo3zVvsKhm8XXs28TuwZw9H'; // Replace with your wallet address (this is the destination where the payment will be sent)
const recipient = new PublicKey(myWallet);
const quickNodeEndpoint = 'https://example.solana-devnet.quiknode.pro/123456/'; // Replace with your QuickNode endpoint
const connection = new Connection(quickNodeEndpoint, 'confirmed');
const amount = new BigNumber(0.1); // 0.1 SOL
const reference = new Keypair().publicKey;
const label = 'QuickNode Guide Store';
const message = `QuickNode Demo - Order ID #0${Math.floor(Math.random() * 999999) + 1}`;
const memo = 'QN Solana Pay Demo Public Memo';


Replace myWallet and quickNodeEndpoint with your wallet address and QuickNode endpoint from the previous step.

Here's a summary of what each constant does:

myWallet is the destination address for the payment.
recipient is the destination public key where the payment will be sent.
quickNodeEndpoint is the QuickNode endpoint you created in the previous step.
connection is the connection to the Solana network.
amount is the amount of SOL that will be sent (in SOL, not lamports).
reference (optional) is a random key that will be used to verify the transaction on-chain (can be used as client IDs) - additional information about reference keys is available here.
label (optional) describes the source of the transfer request (e.g., the store's name, brand, application) - this may be used by the wallet to display information to the buyer before approving the transaction.
message (optional) is a message that describes the nature of the transfer request (e.g., name of an item, order ID, or a thank you note) - this may be used by the wallet to display information to the buyer before approving the transaction.
memo (optional) is a public memo that will be included in the on-chain transaction.
Here's an example of the message and label being displayed in a buyer's approval flow in their Phantom Wallet:

Phantom Wallet

Now that you have set up your environment, you can build your application.

Simulate a Checkout Experience
In this step, you'll create a function, generateUrl that simulates a checkout experience by generating a payment request URL:

async function generateUrl(
    recipient: PublicKey,
    amount: BigNumber,
    reference: PublicKey,
    label: string,
    message: string,
    memo: string
) {
    console.log('1. Create a payment request link');
    const url: URL = encodeURL({ recipient, amount, reference, label, message, memo });
    console.log('Payment request link:', url);
    return url;
}


Typically you should generate the payment request URL on your backend server to ensure the security and integrity of the data. By handling sensitive data and transaction details on the server side, you can reduce the risk of exposing critical information to malicious users or third parties. This approach also allows you to better control and manage transaction data, making it easier to implement additional security measures, such as validating transactions or monitoring for fraudulent activities.

For the purposes of this guide, however, we will simplify this process by running the function on the client side.

At this stage, you should be able to generate a payment request URL. To test this, call your function:

(async () => {
    try {
        const url = await generateUrl(recipient, amount, reference, label, message, memo);
        console.log('Success');
    } catch (err) {
        console.error(err);
    }
})();


And in your terminal, enter:

ts-node index.ts

You should see a URL object in your terminal. Pay attention to the href property, which is the actual URL that you will use to send the payment. It should look something like this solana:DemoKMZWkk483hX4mUrcJoo3zVvsKhm8XXs28TuwZw9H?amount=0.1&reference=BurHXKwdNbcnShxWXL1khovANkYY6FWS4yTdN6FWCDsX&label=QuickNode+Guide+Store&message=QuickNode+Demo+-+Order+ID+%230405909&memo=QN+Solana+Pay+Demo+Public+Memo8.

You can remove or comment out your console.log('Payment request link:', url); line if you would like to clean up your terminal output.

Nice work. You have successfully generated a payment request URL. If you were building an actual application, you would likely now send this URL to the buyer (typically through a QR code), who would then use it to send the payment. We will cover building a front end and QR code in a future guide, but you can pass your URL's href into a QR code generator (e.g., qr-code-generator.com) to test it out.

Let's continue with processing the payment request URL.

Process Payment
Next, you'll create the processPayment function, which parses the payment request link to extract the payment details, creates a new Solana transaction, and sends it to the Solana blockchain. Typically this will be handled by a user's wallet app or a decentralized application (dApp) using a wallet adapter. The front-end component would parse the payment request link and initiate the transfer of funds through the user's wallet. Let's see how to do that.

In your index.ts file, add the following code:

async function processPayment(url: URL, payer: Keypair) {
    // Parse the payment request link
    console.log('2. Parse the payment request link');
    const { recipient, amount, reference, label, message, memo } = parseURL(url) as TransferRequestURL;
    if (!recipient || !amount || !reference) throw new Error('Invalid payment request link');
    
    console.log('3. Assemble the transaction');
    const tx = new Transaction();

    // Append the memo instruction if a memo is provided
    if (memo != null) {
        tx.add(
            new TransactionInstruction({
                programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
                keys: [],
                data: Buffer.from(memo, 'utf8'),
            })
        );
    }
    // Create a transfer instruction
    const ix = SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient,
        lamports: amount.multipliedBy(LAMPORTS_PER_SOL).integerValue(BigNumber.ROUND_FLOOR).toNumber()
    });
    // Add the reference key to the instruction, if provided
    if (reference) {
        const ref = Array.isArray(reference) ? reference : [reference];
        for (const pubkey of ref) {
            ix.keys.push({ pubkey, isWritable: false, isSigner: false });
        }
    }
    // Add the transfer instruction to the transaction
    tx.add(ix);

    // Send the transaction to the Solana network and confirm it has been processed
    console.log('4. 🚀 Send and Confirm Transaction');
    const txId = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`      Tx: https://explorer.solana.com/tx/${txId}?cluster=devnet`);
}


Let's break down what's happening here:

First, we parse the payment request link using the parseURL function from the @solana/pay library. This function returns an object with the payment details, including the recipient, amount, reference, label, message, and memo, which we destructure for easy access.
Next, we create a new, empty Solana Transaction.
If a memo is provided, we add a memo instruction to the transaction using the Solana Memo Program. If you are unfamiliar with the Solana Memo Program, you can read more about it in our Guide: here. In short, it will encode and store our memo in the on-chain transaction data.
Next, we create and add a transfer instruction using the SystemProgram.transfer function. We also add the reference key to the instruction, if provided.
Note: As demonstrated here, the transfer instruction must come after the memo instruction. Solana Pay's validation function expects the transfer to be in the last position (see Solana Pay Specification).
So far, we have created a simulated environment where a seller can generate a payment request link, and a buyer can respond to that request and pay the vendor. Finally, we need a way to verify that the vendor has received the payment and that the payment details are correct.

Verify Payment
To verify that the payment has been received, you'll create the verifyPayment function, which will query the Solana blockchain to check that the payment has been received and that the payment details match the original request. In a typical environment, this type of function would be called by the seller's backend. For this simplified example, we will also process it from our client. In your index.ts file, add the following code:

async function verifyTx(
    recipient: PublicKey,
    amount: BigNumber,
    reference: PublicKey,
    memo: string
) {
    console.log(`5. Verifying the payment`);
    // Merchant app locates the transaction signature from the unique reference address it provided in the transfer link
    const found = await findReference(connection, reference);

    // Merchant app should always validate that the transaction transferred the expected amount to the recipient
    const response = await validateTransfer(
        connection,
        found.signature,
        {
            recipient,
            amount,
            splToken: undefined,
            reference,
            memo
        },
        { commitment: 'confirmed' }
    );
    return response;
}


Let's break down what's happening here:

First, we use the findReference function from the @solana/pay library to locate the transaction signature from the cluster. The method runs a getSignaturesForAddress RPC call for the provided reference address.
Next, we use the validateTransfer function from the @solana/pay library to validate that the transaction transferred the expected amount to the recipient. The method runs a getTransaction RPC call for the provided transaction signature. It then checks that the recipient received the correct amount and that the memo match the expected values.
Pay Day!
Finally, let's run the app. In your index.ts file, replace your async block from earlier with the following:

(async () => {
    try {
        console.log(`⚡️ Solana Pay Demo ⚡️`);
        console.log(`  Processing payment:`);
        console.log(`   - of ${amount} SOL`);
        console.log(`   - from ${payer.publicKey.toBase58()}`);
        console.log(`   - to ${recipient.toBase58()}`);
        const url = await generateUrl(recipient, amount, reference, label, message, memo);
        await processPayment(url, payer);
        const response = await verifyTx(recipient, amount, reference, memo);
        if (!response || response.meta?.err) throw new Error('Not verified');
        console.log('🎉 Payment Confirmed!');
    } catch (err) {
        console.error(err);
    }
})();


Now, run the app. In your terminal, enter:

ts-node index

You should see the following output in your terminal:

Results

You should be able to follow the Explorer URL from your terminal to see the transaction on the Solana blockchain (and see both the memo and transfer instructions):

Transaction on Solana Explorer

Great work!

Extra Credit: SPL Tokens
This exercise has been helpful for creating and sending SOL payments, but what if you want to send SPL tokens (e.g., USDC)? Solana Pay makes it easy to send SPL tokens as well. For a bonus assignment, try to modify the generateUrl, processPayment, and verifyTx functions to send SPL tokens instead of SOL.

Hints:

Add an splToken parameter to the generateUrl function.
Replace the SystemProgram.transfer instruction with a createTransferCheckedInstruction instruction (you'll need to getOrCreateAssociatedTokenAccount for both the payer and recipient).
You will need to add a splToken parameter to the validateTransfer function.
Putting It All Together
In this guide, you learned the fundamentals of how to use Solana Pay to create a simple payment application, process payments, and verify transactions. By leveraging Solana Pay, you can easily build fast, secure, and user-friendly payment solutions on the Solana blockchain.

Keep in mind that this guide provided a simplified example, and in a real-world application, you would need to consider additional security measures, user experience, and error handling. It is crucial to separate sensitive data and transaction handling between the client and server sides to minimize the risk of exposing critical information.

If you need help or want to share what you are building with Solana Pay, let us know on Discord or Twitter.

We ❤️ Feedback!
If you have any feedback or questions on this guide, let us know. We'd love to hear from you!

Resources
Solana Pay Homepage
Solana Pay GitHub
Solana Pay Docs


How to Build a Payment Portal with Solana Pay in Your Web App
Updated on
Mar 18, 2025
All
Solana
JavaScript
TypeScript
Solana-Web3.js
Solana Pay
React
NextJS
19 min read

Overview
Have an online store that you'd like add payments to powered by Solana? Solana Pay is a fast, easy-to-use, secure payment solution built on the Solana blockchain. In this step-by-step guide, we will show you how to levarage Solana Pay to accept payments via a QR code. You will be able to generate a custom QR-code for a customer's order, and customers will be able to scan it to check out!

What You Will Do
Create a Solana Pay payment portal with a QR code using Next.js 13 and React:

The steps we'll follow:

Create a new Next.js project.
Build a simple UI with React.
Use Next API routes to generate a terminal backend that generates payment requests and verifies successful payments.
Render a QR code for the payment request.
Test it with your Phantom wallet on your phone!
What You Will Need
Nodejs (version 16.15 or higher) installed
TypeScript experience and ts-node installed
Experience with Next.js and React
Experience with Solana Pay will be helpful: review our Guide to Getting Started with Solana Pay
A mobile wallet that supports Solana Pay (e.g., Phantom)
Create a New Next.js Project
To get started, open your terminal and run the following command to create a new Next.js project:

npx create-next-app@latest solana-pay-store
## or
yarn create next-app solana-pay-store

You will be prompted with about 5 questions on how you want to configure your project. For this guide, you can accept the default values for all of them. This will create a new directory, solana-pay-store, for your project and initialize it with the latest version of Next.js. Navigate to your new project directory:

cd solana-pay-store

Run yarn dev to start the development server and make sure the installation was successful. This will open up the project in your default browser (usually localhost:3000). You should see the default Next.js landing page:

Next.js Landing Page

Great job. Go ahead and close the browser window and stop the development server by pressing Ctrl + C (or Cmd + C on Mac) in your terminal.

Now we need to install the Solana-web3.js and Solana Pay packages. Run the following command:

npm install @solana/web3.js@1 @solana/pay
## or
yarn add @solana/web3.js@1 @solana/pay

Finally, you'll need a Solana endpoint to connect to the Solana network to verify payments on chain.

Connect to a Solana Cluster with Your QuickNode Endpoint
To build on Solana, you'll need an API endpoint to connect with the network. You're welcome to use public nodes or deploy and manage your own infrastructure; however, if you'd like 8x faster response times, you can leave the heavy lifting to us.

See why over 50% of projects on Solana choose QuickNode and sign up for a free account here. We're going to use a Solana Mainnet endpoint.

Copy the HTTP Provider link:

Great job. You're ready to start building your application. If you're having trouble getting set up or running into any other issues in this guide, please reach out to us on Discord.

Create Your Backend
For this demonstration, we will use Next.js API routes. API routes are a great way to create a backend for your application without setting up a separate server. "Any file inside the folder pages/api is mapped to /api/* and will be treated as an API endpoint instead of a page." You can read more about Next.js API routes here.

Navigate to pages/api and delete hello.ts. We will be replacing this file with our own API routes. Create a new file called pay.ts and add the following code:

import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { encodeURL, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';

// CONSTANTS
const myWallet = 'DemoKMZWkk483hX4mUrcJoo3zVvsKhm8XXs28TuwZw9H'; // Replace with your wallet address (this is the destination where the payment will be sent)
const recipient = new PublicKey(myWallet);
const amount = new BigNumber(0.0001); // 0.0001 SOL
const label = 'QuickNode Guide Store';
const memo = 'QN Solana Pay Demo Public Memo';
const quicknodeEndpoint = 'https://example.solana-devnet.quiknode.pro/123456/'; // Replace with your QuickNode endpoint

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle Generate Payment Requests
  if (req.method === 'POST') {

  // Handle Verify Payment Requests
  } else if (req.method === 'GET') {

  // Handle Invalid Requests
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}


Logs for Simplified Debugging
You can now access Logs for your RPC endpoints, helping you troubleshoot issues more effectively. If you encounter an issue with your RPC calls, simply check the logs in your QuickNode dashboard to identify and resolve problems quickly. Learn more about log history limits on our pricing page.

What we are doing here is defining some key variables that we will use throughout the application. We are also importing the necessary packages from Solana Pay and Solana-web3.js. Note that we have defined a few constants here for demonstration--you may want to make some of these values variable based on your application's needs (e.g., amount, memo, or recipient). Make sure to update the quicknodeEndpoint with your QuickNode endpoint and myWallet with your public key (this is the destination where the payment will be sent--so if this is incorrect, your payment URL will direct payments to the wrong address).

We are also defining our API handler. We will use a single handler to process our generate payment requests and verify payment requests. We are using the req.method property to determine which action to take. If the request method is POST, we will generate a payment request. If the request method is GET, we will verify a payment request. If the request method is anything else, we will return an error. You could also use a separate handler for each action, but for the sake of simplicity, we will use a single handler.

Generate Payment Requests
We will use some of the tools we created in our Guide to Getting Started with Solana Pay to get us started. Add a generateUrl function to the top-level of pay.ts, before the handler function. This will generate a Solana payment request URL that we can use to generate a QR code for our customers to scan and pay with Solana Pay.

async function generateUrl(
  recipient: PublicKey,
  amount: BigNumber,
  reference: PublicKey,
  label: string,
  message: string,
  memo: string,
) {
  const url: URL = encodeURL({
    recipient,
    amount,
    reference,
    label,
    message,
    memo,
  });
  return { url };
}

Next, we will need a way to store the payment request information. For this demo, we will use a simple in-memory data structure to store the payment request information. This will allow us to verify the payment request later on. Add a paymentRequests Map to pay.ts:

const paymentRequests = new Map<string, { recipient: PublicKey; amount: BigNumber; memo: string }>();


This will allow us to store the payment request information using the reference as the key. We will use the reference as the key because it is a unique identifier for each payment request. We will also store the recipient, amount, and memo to verify the payment request later. Keep in mind that this approach is only suitable for small-scale applications or during development. In a production environment or for a more extensive application, you should consider using a more persistent storage solution like a database (e.g., PostgreSQL, MongoDB, Redis) to store the payment request information. This will ensure that the data is not lost on server restarts and can be accessed across multiple server instances if you have a distributed or load-balanced system.

Now let's update our handler to use the generateUrl function and store the payment request information in our paymentRequests Map. Add the following code to pay.ts inside of the POST handler:

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const reference = new Keypair().publicKey;
      const message = `QuickNode Demo - Order ID #0${Math.floor(Math.random() * 999999) + 1}`;
      const urlData = await generateUrl(
        recipient,
        amount,
        reference,
        label,
        message,
        memo
      );
      const ref = reference.toBase58();
      paymentRequests.set(ref, { recipient, amount, memo });
      const { url } = urlData;
      res.status(200).json({ url: url.toString(), ref });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  //...
}


Here's a breakdown of what we are doing here:

We generate a new reference keypair and store the public key in the reference variable. This is generated at random and will be unique for each payment request.
We generate a message to display our user's order ID. For our demonstration purposes, we are generating a random order ID. Feel free to pass whatever message you wish to your user (this should be displayed in their wallet when they are prompted to pay).
We call the generateUrl function to generate a payment request URL. We are passing in the recipient, amount, reference, label, message, and memo variables that we defined earlier. This will generate a payment request URL that we store as urlData.
We convert the reference public key to a base58 string and store it as ref, which we use as the key to store the payment request information in our paymentRequests Map (using .set).
We respond to the client with a 200 status code (success), the payment request url, and the ref key.
Let's test it out! Run the following command to start the server:

npm run dev
# or 
yarn dev

Then in a separate terminal window, run the following cURL script to make a POST request to the /api/pay endpoint:

curl -X POST http://localhost:3000/api/pay

You should see a response similar to the following:

Sample POST Response

Nice job! You just created an API endpoint that generates a payment request URL and stores the payment request information in memory. Now let's create an endpoint to verify the payment request.

Verify Payment Requests
Before we move on to our frontend, we will need our backend to do some verification to ensure that the payment request is valid and that the payment has been received by our recipient wallet. We will use the reference keypair we generated earlier to find the payment. We will use the recipient, amount, and memo fields to verify that the payment has been made to the correct recipient and that the payment amount is correct (remember, we stored these values in our paymentRequests Map so that our backend knows what to look for).

Create a verifyTransaction function in pay.ts:

async function verifyTransaction(reference: PublicKey) {
  // 1 - Check that the payment request exists
  const paymentData = paymentRequests.get(reference.toBase58());
  if (!paymentData) {
    throw new Error('Payment request not found');
  }
  const { recipient, amount, memo } = paymentData;
  // 2 - Establish a Connection to the Solana Cluster
  const connection = new Connection(quicknodeEndpoint, 'confirmed');
  console.log('recipient', recipient.toBase58());
  console.log('amount', amount);
  console.log('reference', reference.toBase58());
  console.log('memo', memo);

  // 3 - Find the transaction reference
  const found = await findReference(connection, reference);
  console.log(found.signature)

  // 4 - Validate the transaction
  const response = await validateTransfer(
    connection,
    found.signature,
    {
      recipient,
      amount,
      splToken: undefined,
      reference,
      //memo
    },
    { commitment: 'confirmed' }
  );
  // 5 - Delete the payment request from local storage and return the response
  if (response) {
    paymentRequests.delete(reference.toBase58());
  }
  return response;
}


Here's a breakdown of what we are doing here:

We check to see if the payment request exists in our paymentRequests Map. If it does not, we throw an error. We should only be verifying payment requests that we have generated.
We establish a connection to the Solana cluster. We are using our quicknodeEndpoint variable that we defined earlier. Important: the payer must be connected to the same Solana cluster as specified in our backend. The payment will not be found if the buyer uses an incorrect cluster.
We find the transaction reference. This is the transaction that contains the payment request information. We use the findReference function imported from solana-pay and pass in the reference parameter.
We validate the transaction. We are using the validateTransfer function that we imported from solana-pay This will return a TransactionResponse if a valid payment has been found or an error if the payment has not been found or is invalid.
If the payment is valid, we delete the payment request from our paymentRequests Map and return the TransactionResponse.
Now that we have our verifyTransaction function let's update our handler. Inside the handler function's GET condition, add the following code:

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ...
  else if (req.method === 'GET') {
    // 1 - Get the reference query parameter from the NextApiRequest
    const reference = req.query.reference;
    if (!reference) {
      res.status(400).json({ error: 'Missing reference query parameter' });
      return;
    }
    // 2 - Verify the transaction
    try {
      const referencePublicKey = new PublicKey(reference as string);
      const response = await verifyTransaction(referencePublicKey);
      if (response) {
        res.status(200).json({ status: 'verified' });
      } else {
        res.status(404).json({ status: 'not found' });
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  // ...
}


Here's a quick breakdown of our code:

We get the reference query parameter from the NextApiRequest and store it as reference. We return a 400 status code (bad request) if no reference was provided. Note that we expect our frontend to pass in the reference query parameter as a string. We will convert it to a PublicKey in the next step.
We verify the transaction. We pass in the reference query parameter as a PublicKey and store the response asresponse. If the response is valid, we return a 200 status code (success) and a verified status. If the response is invalid, we return a 404 status code (not found) and a not found status. If there is an error, we return a 500 status code (internal server error) and an error message.
Create a Frontend
Now that our backend is set up let's create a frontend to interact with our API. Let's start by replacing the contents of the default pages/index.tsx file with the following code:

import Head from 'next/head';
import Image from 'next/image';
import { useState } from 'react';
import { createQR } from '@solana/pay';

export default function Home() {

  const handleGenerateClick = async () => {

  };

  const handleVerifyClick = async () => {

  };

  return (
    <>
      <Head>
        <title>QuickNode Solana Pay Demo</title>
        <meta name="description" content="QuickNode Guide: Solana Pay" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
          <h1 className='text-2xl font-semibold'>Solana Pay Demo</h1>
        </div>
        {<Image
          style={{ position: "relative", background: "white" }}
          src={''}
          alt="QR Code"
          width={200}
          height={200}
          priority
        />}
        <div>
          <button
            style={{ cursor: 'pointer', padding: '10px', marginRight: '10px' }}
            onClick={handleGenerateClick}
          >
            Generate Solana Pay Order
          </button>
          {<button
            style={{ cursor: 'pointer', padding: '10px' }}
            onClick={handleVerifyClick}
          >
            Verify Transaction
          </button>}
        </div>
      </main>
    </>
  );
}


We are changing our app's homepage to a simple UI that will allow us to generate a Solana Pay order and verify a transaction. We are importing the necessary dependencies and creating two empty functions: handleGenerateClick and handleVerifyClick. Each function has a corresponding button on the page. We will fill in the functionality of these functions in the next step. If you run your app now, you should see a simple UI with two buttons:

Solana Pay Demo

Implement the QR Generator
In the same, pages/index.tsx file, let's start by creating two state variables: qrCode and reference. We will use these variables to store the QR code and the transaction reference. Add the following code to the top of the Home function:

  const [qrCode, setQrCode] = useState<string>();
  const [reference, setReference] = useState<string>();

We will generate a QR Code as a base64 string and store it in the qrCode state variable so that we can pass it into an Image component. We will also store the transaction reference in the reference state variable so that we can use it later to verify the transaction.

Now, let's implement the handleGenerateClick function. We will use this function to generate to send a POST request to our backend and use the URL response to create a QR code. Add the following code to the handleGenerateClick function:

  const handleGenerateClick = async () => {
    // 1 - Send a POST request to our backend and log the response URL
    const res = await fetch('/api/pay', { method: 'POST' });
    const { url, ref } = await res.json();
    console.log(url)
    // 2 - Generate a QR Code from the URL and generate a blob
    const qr = createQR(url);
    const qrBlob = await qr.getRawData('png');
    if (!qrBlob) return;
    // 3 - Convert the blob to a base64 string (using FileReader) and set the QR code state
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setQrCode(event.target.result);
      }
    };
    reader.readAsDataURL(qrBlob);
    // 4 - Set the reference state
    setReference(ref);
  };


Let's break down the handleGenerateClick function:

We send a POST request to our backend (/api/pay) and then destructure and store the response's url and ref properties.
We generate a QR code from the url using the createQR function from @solana/pay. We then create a blob from the QR code using a png format and store it in qrBlob.
We are converting the blob to a base64 string using a FileReader and storing it in qrCode. We are then setting the qrCode state to the base64 string.
We set the state of reference to the ref property from the response. This will allow us to verify the transaction later on.
Now that we have a QR code generated let's update our page render to display it when it's available. Update the Image component in the return statement to the following:

        {qrCode && (
          <Image
            src={qrCode}
            style={{ position: "relative", background: "white" }}
            alt="QR Code"
            width={200}
            height={200}
            priority
          />
        )}


qrCode && will hide our Image component if qrCode is not set, and when it is set, it will display the QR code (src={qrCode}).
If you were to run your app now, you should see a QR code generated when you click the "Generate Solana Pay Order" button! Let's create a function to verify the transaction so we can complete our payment flow.

Implement Transaction Verification
Now that we have a QR code generated let's create a function to verify the transaction so we can complete our payment flow. We will use the reference state we saved in the previous state to pass to our backend and verify the transaction. Add the following code to the handleVerifyClick function:

  const handleVerifyClick = async () => {
    // 1 - Check if the reference is set
    if (!reference) {
      alert('Please generate a payment order first');
      return;
    }
    // 2 - Send a GET request to our backend and return the response status
    const res = await fetch(`/api/pay?reference=${reference}`);
    const { status } = await res.json();

    // 3 - Alert the user if the transaction was verified or not and reset the QR code and reference
    if (status === 'verified') {
      alert('Transaction verified');
      setQrCode(undefined);
      setReference(undefined);
    } else {
      alert('Transaction not found');
    }
  };


Here's what we are doing in the handleVerifyClick function:

We check if the reference state is set. If it is not set, we alert the user to generate a payment order first.
We send a GET request (implied by the fetch method by default) to our backend (/api/pay) and pass in the reference state as a query parameter. We are then destructuring and storing the response's status property.
We alert the user if the transaction was verified and reset the qrCode and reference states.
Finally, let's hide our "Verify Transaction" button if the reference state is not set. Update the Button component in the return statement to the following:

          {reference && <button
            style={{ cursor: 'pointer', padding: '10px' }}
            onClick={handleVerifyClick}
          >
            Verify Transaction
          </button>}


Great job! Let's test out our payment flow.

Test the Payment Flow
Launch your payment terminal by running the following command in your terminal:

npm run dev
## or 
yarn dev

Test your payment flow by following these steps:

Navigate to localhost:3000.
In your browser, click the "Generate Solana Pay Order" button. You should see a QR code generated.
Scan the QR code with a Solana-Pay-enabled wallet (e.g., Phantom).
IMPORTANT - Verify your cluster
Make sure you are on the correct cluster (e.g., Devnet) in your wallet. If you are on a different cluster than you specified in your backend, you will not be able to verify your transaction. You can change your wallet's cluster by going to "Developer Settings" and selecting the correct cluster.

If your wallet is set to mainnet, real funds will be transferred as specified on your backend.

If you need devnet SOL, you can request some here:
🪂Request Devnet SOL
Enter Solana Wallet Address
Verify the transaction details in your wallet are as expected, and then approve the payment in your wallet. Wait to see a success message in your wallet.
Once you complete the payment, click the "Verify Transaction" button. You should see an alert that the transaction was verified! Note that if you click this button before the network confirms the transaction, you will see an alert that the transaction was not found.
Here's what our final payment terminal should look like after verifying a payment:

Solana Pay Terminal

Great job!

If you want to reference our code in its entirety, check out our GitHub page here.

Wrap Up
Congratulations, you have successfully built a Solana Pay Terminal using Next.js 13 and the @solana/pay library! With this terminal, you can accept payments in Solana using QR codes that can be scanned by Solana Pay-compatible wallet apps. To deploy this project in a production environment, you should consider using a more persistent storage solution like a database (e.g., PostgreSQL, MongoDB, Redis) to store the payment request information. This will ensure that the data is not lost on server restarts and can be accessed across multiple server instances if you have a distributed or load-balanced system.

How to Use Solana Pay with Custom Solana Programs
Updated on
May 05, 2025
All
Solana
JavaScript
TypeScript
Solana-Web3.js
Solana Pay
React
NextJS
WebSocket
21 min read

Overview
Solana Pay enables swift, secure payment rails on the Solana blockchain. A little-known fact, however, is that the technology behind Solana Pay can be used for more than just payments. This guide will show you how to use Solana Pay to invoke a custom Solana program.

What You Will Do
Create a Next.js 13 application that generates a QR code that is used to invoke a custom Solana program through your backend:

Transaction FlowSource: Solana Pay Docs

Specifically, you will:

Create a new Next.js project.
Build a simple UI with React.
Use Next API routes to generate a custom program transaction.
Render a QR code for the user to access and sign the transaction.
Use Solana Websockets to listen to the program and update a counter in the UI when the program is invoked.
What You Will Need
This advanced guide will use concepts from several elements of building on Solana. Please review these requisites before proceeding.

Nodejs (version 16.15 or higher) installed
TypeScript experience and ts-node installed
Experience with Next.js and React
Experience with Solana Pay will be helpful: review our Guide to Getting Started with Solana Pay and Guide to Adding Solana Pay to your dApp
A mobile wallet that supports Solana Pay (e.g., Solflare) (Note: at present, there is a known issue with Phantom on Android, so if you have an Android device, we recommend to use Solflare instead. We will update this when the issue has been fixed.)
Ngrok, or another service to expose your local development server to the internet (or a service like Vercel, if you want to deploy your application to the cloud)
Experience with Solana Websocket Subscriptions (Check out our Guide: How to Create Solana WebSocket Subscriptions )
Experience with Solana programs (Check out our Guide: Your First Anchor Program in Solana)
Experience Deserializing Solana Account Data (Check out our Guide: How to Deserialize Account Data on Solana)
Create a New Next.js Project
To get started, open your terminal and run the following command to create a new Next.js project:

npx create-next-app@latest solana-pay-beyond
## or
yarn create next-app solana-pay-beyond

You will be prompted with about 5 questions on how you want to configure your project. For this guide, you can accept the default values for all of them. This will create a new directory, solana-pay-beyond, for your project and initialize it with the latest version of Next.js. Navigate to your new project directory:

cd solana-pay-beyond

Run yarn dev to start the development server and make sure the installation was successful. This will open up the project in your default browser (usually localhost:3000). You should see the default Next.js landing page:

Next.js Landing Page

Great job. Close the browser window and stop the development server by pressing Ctrl + C (or Cmd + C on Mac) in your terminal.

Now we need to install the Solana-web3.js and Solana Pay packages. Run the following command:

npm install @solana/web3.js@1 @solana/pay
## or
yarn add @solana/web3.js@1 @solana/pay

Finally, you'll need a Solana endpoint to connect to the Solana devnet to assemble a transaction.

Connect to a Solana Cluster with Your QuickNode Endpoint
To build on Solana, you'll need an API endpoint to connect with the network. You're welcome to use public nodes or deploy and manage your own infrastructure; however, if you'd like 8x faster response times, you can leave the heavy lifting to us.

See why over 50% of projects on Solana choose QuickNode and sign up for a free account here. We're going to use a Solana Devnet endpoint.

Copy the HTTP Provider link:

Great job. You're ready to start building your application. If you need help getting set up or running into any issues, please reach out to us on Discord.

Create a Custom Solana Program
For this demonstration, we will use a simple program incrementing a counter. We will ultimately invoke this program by calling an increment instruction with our QR code. We have already created a program for you to use in this guide (Devnet yV5T4jugYYqkPfA2REktXugfJ3HvmvRLEw7JxuB2TUf). The program includes a function called increment that will increment a counter by 1 each time it is called.

The important thing to know about our program is it creates a single PDA that stores a count state. For more information on PDAs, check out our Guide: How to use PDAs. Here's our account struct:

#[account]
pub struct Counter {
    pub count: u64,
}

If you want to see this program's source code or create your own version, check it out on Solana Playground.

Create Your Backend
Before building our backend, let's look at the steps we need to take to send a custom transaction using Solana Pay. Here's a summary of the Solana Pay spec and flow for sending custom transactions:

User scans a QR code on the frontend.
User's wallet sends a GET request to the backend
Backend receives the request and responds with a label and icon URL to display to the user in their wallet.
User's wallet sends a POST request to the backend with the user's account id (public key as a string)*
Backend receives the request and assembles a Solana Transaction that includes the increment instruction on our custom program.
Backend responds with a serialized transaction.
User approves and signs the transaction in their wallet.
User's wallet sends the signed transaction to the cluster for processing
In short, our backend must respond to a GET request with a label and icon URL and a POST request with a serialized transaction.

For this demonstration, we will use Next.js API routes. API routes are a great way to create a backend for your application without setting up a separate server. "Any file inside the folder pages/api is mapped to /api/* and will be treated as an API endpoint instead of a page." You can read more about Next.js API routes here.

Navigate to pages/api and delete hello.ts. We will be replacing this file with our own API routes. Create a new file called pay.ts and add the following code:

import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import crypto from 'crypto';

// CONSTANTS
const programId = new PublicKey('yV5T4jugYYqkPfA2REktXugfJ3HvmvRLEw7JxuB2TUf'); // 👈 You can use this program or create/use your own
const counterSeed = 'counter'; // This is the seed used to generate the counter account (may be different if you use a different program)
const functionName = 'increment'; // This is the name of our anchor instruction (may be different if you use a different program)
const message = `QuickNode Demo - Increment Counter`;
const quickNodeEndpoint = 'https://example.solana-devnet.quiknode.pro/0123456/'; // 👈 Replace with your own devnet endpoint
const connection = new Connection(quickNodeEndpoint, 'confirmed');
const label = 'QuickCount +1';
const icon = 'https://www.arweave.net/wtjT0OwnRfwRuUhe9WXzSzGMUCDlmIX7rh8zqbapzno?ext=png';

// Utility function to generate data for a specific Anchor instruction
function getInstructionData(instructionName: string) {
  return Buffer.from(
    crypto.createHash('sha256').update(`global:${instructionName}`).digest().subarray(0, 8)
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
  // POST code will be here
  } else if (req.method === 'GET') {
    res.status(200).json({ label, icon });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}


Logs for Simplified Debugging
You can now access Logs for your RPC endpoints, helping you troubleshoot issues more effectively. If you encounter an issue with your RPC calls, simply check the logs in your QuickNode dashboard to identify and resolve problems quickly. Learn more about log history limits on our pricing page.

What we are doing here is:

defining some key variables that we will use throughout the application. We are also importing the necessary packages from Solana Pay, Solana-web3.js, and crypto (a NodeJS library).
defining a few constants here for demonstration--you may want to make some of these values variable based on your application's needs (e.g., message and label). Make sure to update the quicknodeEndpoint with your QuickNode endpoint. If you are using a different program than the one we provided, you will likely need to modify the counterSeed and functionName constants.
defining our API handler. We will use a single handler to process GET and POST requests. We will use the req.method property to determine which action to take. If the request method is GET, respond with a label and icon URL - since we defined these in our constants, we can just return them, calling res.status(200).json({ label, icon }). We will generate a transaction if the request method is POST. If the request method is anything else, we will return an error. You could use a separate handler for each action, but for the sake of simplicity, we will use a single handler.
defining a getInstructionData function. This function will generate the data for our increment instruction. We are using a hashing function to generate the serialized data that we can pass into our Transaction. This is how Anchor serializes account instructions - you can see the source code here.
Handle POST Requests - Generate a Transaction
When the wallet sends a POST request to our backend, we will need to generate a transaction. We will use the account id (public key) the wallet sends us to create the transaction. First, we will need to ensure the wallet, in fact, passed an account. Add the following code to the POST handler:

  if (req.method === 'POST') {
    try {
      const account: string = req.body?.account;
      if (!account) res.status(400).json({ error: 'Missing account field' });
      const transaction = await generateTx(account);
      res.status(200).send({ transaction, message });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }


What we are doing here:

Checking whether the account field was passed in the request body. If it is not, we will return a 400 error.
If the account field was passed, we will call a new function, generateTx, and pass the account as an argument. This function will generate a transaction that will increment the counter (we will build that next).
If the transaction was successfully generated, we will return the serialized transaction and a message (defined in our constants) to the wallet. The wallet will display the message to the user and ask them to confirm the transaction.
Let's create the generateTx function. Add the following code to pay.ts, below your handler:

async function generateTx(account: string) {
  // 1. Get the counter PDA
  const [counterPda] = PublicKey.findProgramAddressSync([Buffer.from(counterSeed)], programId);
  // 2. Create the data buffer with the function selector
  const data = getInstructionData(functionName);
  // 3. Build the transaction to call the increment function
  const tx = new Transaction();
  const incrementIx = new TransactionInstruction({
    keys: [
      { pubkey: counterPda, isWritable: true, isSigner: false },
    ],
    programId: programId,
    data
  });
  // 4. Set the latest blockhash and set the fee payer
  const latestBlockhash = await connection.getLatestBlockhash();
  tx.feePayer = new PublicKey(account);
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.add(incrementIx);
  // 5. Serialize the transaction
  const serializedTransaction = tx.serialize({
    verifySignatures: false,
    requireAllSignatures: false,
  });
  // 6. Encode the transaction data as base64
  const base64Transaction = serializedTransaction.toString('base64');
  return base64Transaction;
}


Let's walk through what we are doing here:

We use the counterSeed and programId to generate the counter PDA. We must pass this account into our increment function's transaction instruction.
We generate the data buffer for our increment function. We are using the getInstructionData function we defined earlier.
We are building the transaction. We are creating a new Transaction and adding a new TransactionInstruction. We pass the counterPda (as a writeable, non-payer account) and data we generated in steps 1 and 2. We also pass the programId we defined in our constants. Note: If you are using your own program, you will need to update these values based on the context defined in your program.
We fetch and set the latest blockhash and set the user's wallet as the fee payer.
We serialize the transaction. We are setting verifySignatures and requireAllSignatures as false because we are not signing the transaction. We will let the wallet handle that.
Finally, we encode the transaction data as base64 (Base64 is a common encoding format for binary data) and return it to the wallet.
Great job! You just created a function that will generate a transaction that will increment the counter. Your backend is now ready to accept requests from the wallet. Let's test it out!

Run the following command to start the server:

npm run dev
# or 
yarn dev

Then in a separate terminal window, run the following cURL script to make a GET request to the /api/pay endpoint:

curl -X GET http://localhost:3000/api/pay

This should return your label and icon that we defined in our constants. Now let's test out the POST request. Run the following cURL script to make a POST request to the /api/pay endpoint:

curl -X POST "http://localhost:3000/api/pay" \
-H "Content-Type: application/json" \
-d '{"account": "YOUR_WALLET_ADDRESS"}'

You should get a response back that looks similar to the following:

{
  "transaction":"AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDWvArSV39ujMKeO06xNO5Sx4ql4HJrmyWxnQjubHQp0iDxxzKuMff4tsV5PtxlzfcnR+CW+QUuiF+PqTIV/uDQ54RxxfTuGSHXAe+/I1AVzHOi5+zqX/ntgsd/DMy3V0VsyJ9ZUQHHexample/ZfFplpKKLcl3bpmiHJ0DTRUBAgexample",
  "message":"QuickNode Demo - Increment Counter"
}


Nice job! You just created an API endpoint that generates a transaction to our customer program and returns it to the wallet. Now let's build the front end.

Create a Front End
Now that our backend is set up, let's create a front end. The front end will be a simple React app that:

Generates a QR code on page load that triggers the scanning wallet to make a GET request to our backend
Fetch, deserialize, and display our program's account data (count)
Create a subscription to our program's account data to update the count in real time
Open /pages/index.tsx and replace the default content with the following:

import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createQR, encodeURL } from '@solana/pay';
import { Connection, PublicKey } from '@solana/web3.js';
import { u64 } from '@solana/buffer-layout-utils';
import { struct } from '@solana/buffer-layout';

const quickNodeEndpoint = 'https://example.solana-devnet.quiknode.pro/0123456/'; // 👈 Replace with your own devnet endpoint
const connection = new Connection(quickNodeEndpoint, 'confirmed');
const programId = new PublicKey('yV5T4jugYYqkPfA2REktXugfJ3HvmvRLEw7JxuB2TUf');
const counterSeed = 'counter';
const [counterPda] = PublicKey.findProgramAddressSync([Buffer.from(counterSeed)], programId);
// TODO: add counter interface

export default function Home() {
  const [qrCode, setQrCode] = useState<string>();
  const [count, setCount] = useState<string>('');

  useEffect(() => {
    // TODO: Cal QR code generation
  }, []);

  const generateQr = async () => {
    // TODO: Add QR code generation
  }

  return (
    <>
      <Head>
        <title>QuickNode Solana Pay Demo: Quick Count</title>
        <meta name="description" content="QuickNode Guide: Solana Pay" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
          <h1 className='text-2xl font-semibold'>Solana Pay Demo: QuickCount</h1>
          <h1 className='text-xl font-semibold'>Count: {count}</h1>
        </div>
        {qrCode && (
          <Image
            src={qrCode}
            style={{ position: "relative", background: "white" }}
            alt="QR Code"
            width={200}
            height={200}
            priority
          />
        )}
      </main>
    </>
  );
}


This will be a good starting point for us to work off of. Let's walk through what is here:

Import the necessary dependencies from React, Next, and Solana. Much of this is the same as our previous Guide to Adding Solana Pay to your dApp, so we won't go into too much detail here. We are also adding a couple of imports from Solana's buffer layout libraries. We will use these to deserialize our program's account data.
Define a few constants (these should look familiar to our backend): quickNodeEndpoint, connection, programId, and counterPda. We will use these to connect to our program and fetch the account data.
Using .env Files
Note we are hardcoding our endpoint here for simplicity. You should use an environment variable in a production app to store your endpoint. Check Next.js docs to learn more about using environment variables.

Define a Home component that will render our UI. The UI will display a count and QR code if they are defined (though we did not define them yet). We have also created a useEffect hook that will run when the component mounts. We will use this hook to fetch the account data and generate the QR code.
Implement the QR Generator
We will generate a QR Code as a base64 string and store it in the qrCode state variable so that it will be passed into our Image component. First, let's build out our generateQr function. Add the following code to the generateQr function:

  const generateQr = async () => {
    const apiUrl = `${window.location.protocol}/${window.location.host}/api/pay`;
    const label = 'label';
    const message = 'message';
    const url = encodeURL({ link: new URL(apiUrl), label, message });
    const qr = createQR(url);
    const qrBlob = await qr.getRawData('png');
    if (!qrBlob) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setQrCode(event.target.result);
      }
    };
    reader.readAsDataURL(qrBlob);
  }


Let's dig into what this function is doing:

We define an apiUrl, the URL of our backend API endpoint. We are using the window.location object to get the protocol and host of our current page. We are then appending /api/pay to the end of the URL. This will allow our API to work on both localhost and our deployed app (instead of hard coding the URL).
We define a label and message, effectively placeholders for this demo.
We are using the encodeURL function from @solana/pay to create a URL that will trigger the scanning wallet to make a GET request to our backend. We are passing in the apiUrl as a new URL.
Finally, we render the QR code as a base64 string and store it in the qrCode state variable.
Now that we have a function to generate our QR code let's call it when the component mounts. Add the following code to the useEffect hook:

  useEffect(() => {
    generateQr();
  }, []);

This should render our QR code when the page loads. If you were to run your app now, you should see a QR code! Here's an example of what it should look like:

QR Code

Fetch and Update the Count
Let's fetch and display our program's count to the frontend to ensure our call to the program works. Our front end already includes <h1>Count: {count}</h1> in the Home component, so we just need to fetch the count data and deserialize the account. Let's start by defining our account struct. To deserialize our data, we need to know the account schema from our on-chain program struct--if you recall, this was defined with a u64 count and an 8-byte discriminator (used in all Anchor accounts). We can use the @solana/buffer-layout library to define our account struct. Add the following code above your Home component:

interface Counter {
  discriminator: bigint;
  count: bigint;
}
const CountLayout = struct<Counter>([
  u64('discriminator'),
  u64('count'),
]);

If you need a refresher on how to deserialize Solana account data, check out this guide. In short, what we are doing here, is defining our data schema, and telling it that we expect to see two different 8-byte values using the u64 layout.

Now that we have our account struct defined let's fetch the account data and deserialize it. Create a new function called fetchCount and add the following code above your Home component but after your CountLayout definition:

async function fetchCount() {
  let { data } = await connection.getAccountInfo(counterPda) || {};
  if (!data) throw new Error('Account not found');
  const deserialized = CountLayout.decode(data);
  return deserialized.count.toString();
}


We are effectively fetching the account data from our PDA and then using the CountLayout to deserialize the data. We are then returning the count value as a string. Now let's call this function in our useEffect hook. Add the following code to the useEffect hook:

  useEffect(() => {
    generateQr();
    fetchCount().then(setCount);
    const subscribe = connection.onProgramAccountChange(
      programId,
      () => fetchCount().then(setCount),
      'finalized'
    )
    return () => {
      connection.removeProgramAccountChangeListener(subscribe);
    }
  }, []);


Here we call our fetchCount function on mount and set the count state variable. This should give us the current count on the page render. We have also created a subscription to the program account change event so that we can update the count our program is invoked by using the onProgramAccountChange. If you need a refresher on Solana WebSocket methods, check out this guide. We are also returning a function that will unsubscribe from the program account change event when the component unmounts.

Awesome work! Let's recap what we have built so far. We have:

Created and deployed a Solana counter program using Anchor
Built a Next.js front end that
fetches our program counter
subscribes to changes to our program counter
generates and displays a QR code that can be scanned by Solana Pay-compatible wallet apps
Created a backend API endpoint that can be called by Solana Pay-compatible wallet apps when they scan the wallet. The API endpoint follows the Solana Pay API spec and will send a transaction invoking our counter to the user's wallet for their signature.
Now, all we need to do is test it out.

Test the App
Open up a new terminal window and run the following command to start the Next.js development server:

npm run dev
# or 
yarn dev

This will start the Next.js development server on port 3000. Navigate to http://localhost:3000 in your browser to view the app. You should see a QR code and the current count. Unfortunately, since our app is running on localhost, our wallet app on a separate device will not be able to access our API endpoint. We will need to deploy our app to a public URL to fix this. If you're so inclined, you can publish your project to a service like Vercel or Netlify (just make sure to secure your endpoints as we mentioned before). However, for the purposes of this guide, we will use ngrok, a tool that allows you to expose a local development server to the internet. After you have installed ngrok, you will need to follow the instructions to create an account and register your API key. Once you have done this, run the following command in your terminal:

ngrok http 3000

You should see a message that looks like this:

ngrok                                                           (Ctrl+C to quit)
                                                                                                                                                                
Session Status                online                                            
Account                       your@email.com (Plan: Free)                  
Version                       3.2.2                                             
Region                        United States (us)                                
Latency                       -                                                 
Web Interface                 http://127.0.0.1:xxxx                             
Forwarding                    https://wxyz-00-123-456-789.ngrok.io -> http://loc
                                                                                
Connections                   ttl     opn     rt1     rt5     p50     p90       
                              0       0       0.00    0.00    0.00    0.00 


Follow the forwarding URL and click 'Visit Page.' You should be directed to a ngrok.io page running your local development server (NextJS app). You should see your final app running with a valid QR code and updated count:

Custom Counter Landing Page

Note: the QR code above is invalid because it points to a ngrok backend that is no longer active.

Now that we have our app running let's test it out. Open your Solana Pay-compatible wallet app (at present, there is a known issue with Phantom on Android-we will update when this has been fixed) and make sure the network is set to Devnet. Then, scan the QR code. You should be prompted to sign a transaction that will invoke our counter program:


Once you have approved the transaction and it is finalized by the network, you should see the count increment in your app!

If you want to reference our code in its entirety, check out our GitHub page here.

Wrap Up
Great work! That was a lot of work, but you have successfully built an integration between Solana Pay and a custom Solana program. The possibilities for this are endless. We can't wait to see what you come up with! If you're struggling for inspiration, check out this fun Tug-of-War game built by the Solana Foundation.

If you need help or want to share what you are building with Solana Pay, let us know on Discord or Twitter.
```