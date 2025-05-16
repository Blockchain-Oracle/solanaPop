How to Create a Fungible SPL Token on Solana with Metaplex
Updated on
Mar 18, 2025
All
Solana
SPL Token Program
Metaplex
TypeScript
JavaScript
IPFS
Solana-Web3.js
Video
11 min read

Overview
Are you creating a Whitelist token for your upcoming NFT mint? Or want to launch a fungible token for your next great dApp? Solana and Metaplex make it easy to do so right from your terminal! 

Prefer a video walkthrough? Follow along with Sahil and learn how to create a fungible token on Solana.

Subscribe to our YouTube channel for more videos!
Subscribe
On June 20, 2022, Solana deprecated the Solana Token List, the repository which housed metadata with all fungible SPL tokens. The list has been replaced by Metaplex's Fungible Token Standard. If you're familiar with the old standard or just getting started with your first SPL token, this guide is for you. 

What You Will Do
In this guide, you will create a wallet (and airdrop some SOL), create fungible token metadata using the Metaplex standard, upload token metadata to IPFS, and mint a new fungible SPL token on Solana devnet using Metaplex umi client.

What You Will Need
Nodejs installed (version 16.15 or higher)
npm or yarn installed (We will be using yarn to initialize our project and install the necessary packages. Feel free to use npm instead if that’s your preferred package manager)
Typescript experience and ts-node installed
Solana Web3
Metaplex Foundation umi JS client
Metaplex Foundation umi default plugins bundle
Metaplex Foundation MPL Token Metadata Library
Set Up Your Environment
Create a new project directory in your terminal with:

mkdir mint-fungible-spl
cd mint-fungible-spl

Logs for Simplified Debugging
You can now access Logs for your RPC endpoints, helping you troubleshoot issues more effectively. If you encounter an issue with your RPC calls, simply check the logs in your QuickNode dashboard to identify and resolve problems quickly. Learn more about log history limits on our pricing page.

Create two files, wallet.ts and mint.ts. We will use wallet.ts to create a new dev wallet and airdrop some Solana for testing. We'll use mint.ts to mint a new SPL token and upload our token metadata. 

echo > {wallet,mint}.ts

Initialize your project with the "yes" flag to use default values for your new package: 

yarn init --yes
#or
npm init --yes

Create a tsconfig.json file: 

tsc --init

Open tsconfig.json and uncomment (or add) this to your file: 

"resolveJsonModule": true

This will allow us to import .json files into our repository, which will be important later when we want to generate a Keypair from a PrivateKey.

Also double check that esModuleInterop is set to true to allow for us to use imports. 

Install Solana Web3 dependencies:
yarn add @solana/web3.js@1 @metaplex-foundation/umi @metaplex-foundation/mpl-token-metadata @metaplex-foundation/umi-bundle-defaults bs58
#or
npm i @solana/web3.js@1 @metaplex-foundation/umi @metaplex-foundation/mpl-token-metadata @metaplex-foundation/umi-bundle-defaults bs58


Your environment should look something like this: 

Ready Solana Environment

Alright! We're all ready to go. 

Set Up Your QuickNode Endpoint
To build on Solana, you'll need an API endpoint to connect with the network. You're welcome to use public nodes or deploy and manage your own infrastructure; however, if you'd like 8x faster response times, you can leave the heavy lifting to us.


QuickNode Now Accepts Solana Payments 🚀
You can now pay for a QuickNode plan using USDC on Solana. As the first multi-chain provider to accept Solana payments, we're streamlining the process for developers — whether you're creating a new account or managing an existing one. Learn more about paying with Solana here.

See why over 50% of projects on Solana choose QuickNode and sign up for a free account here.

We're going to use a Solana Devnet node. Copy the HTTP Provider link:

New Solana Endpoint

Create a Wallet and Airdrop SOL
In order to mint a fungible SPL token, we'll first want to create a Devnet wallet and airdrop SOL into it. If you already have a paper wallet, save it to your project directory as guideSecret.json. If it needs some devnet SOL, you can request some with the form below or from QuickNode multi-chain faucet:

🪂Request Devnet SOL
Enter Solana Wallet Address
If you don't have a paper wallet, we'll programmatically generate a new one. Open wallet.ts and paste the following code in. We'll break it down in the next section.

wallet.ts
import { Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import * as fs from 'fs';
import bs58 from 'bs58';

//STEP 1 - Connect to Solana Network
const endpoint = 'https://example.solana-devnet.quiknode.pro/000000/'; //Replace with your QuickNode RPC Endpoint
const solanaConnection = new Connection(endpoint);

//STEP 2 - Generate a New Solana Wallet
const keypair = Keypair.generate();
console.log(`Generated new KeyPair. Wallet PublicKey: `, keypair.publicKey.toString());

//STEP 3 - Convert Private key to Base58
const privateKey = bs58.encode(keypair.secretKey);
console.log(`Wallet PrivateKey:`, privateKey);

//STEP 4 - Write Wallet Secret Key to a .JSON
const secret_array = keypair.secretKey    
    .toString() //convert secret key to string
    .split(',') //delimit string by commas and convert to an array of strings
    .map(value=>Number(value)); //convert string values to numbers inside the array

const secret = JSON.stringify(secret_array); //Covert to JSON string

fs.writeFile('guideSecret.json', secret, 'utf8', function(err) {
    if (err) throw err;
    console.log('Wrote secret key to guideSecret.json.');
});

//STEP 5 - Airdrop 1 SOL to new wallet
(async()=>{
    const airdropSignature = solanaConnection.requestAirdrop(
        keypair.publicKey,
        LAMPORTS_PER_SOL,
    );
    try{
        const txId = await airdropSignature;     
        console.log(`Airdrop Transaction Id: ${txId}`);        
        console.log(`https://explorer.solana.com/tx/${txId}?cluster=devnet`)
    }
    catch(err){
        console.log(err);
    }    
})()


This script will perform 5 tasks: 

Connect to the Solana Network (Make sure you replace the example URL on Line 6 with your actual QuickNode Endpoint URL that you saved in the previous step).

Generate a new Wallet Keypair.

Convert the Private key to Base58 and print it to the console.

Write the Secret Key to a .json file that we'll use in the next step. Lines 16-22 are necessary to format the key as an array of numbers. Lines 24-27 use fs to export the array to a .json file.

Airdrop 1 SOL to the new Wallet. 

Go ahead and run this script to create a new wallet and aidrop it 1 SOL: 

ts-node wallet.ts

You should see a new file, guideSecret.json in your project folder and a terminal log like this:

Generated new KeyPair. Wallet PublicKey:  G7ugoBpckgiL13KZMzWgQ751G27moDR9yVckQERrNnvj
Wallet PrivateKey: 3A4b34ob9hqUaTjR52eBLjQCLova1jqAG1zT59ypXSJvjh1cQzEExpBBbQLWT7gfbcS4KuYddBDiAaYrFCPE55Tu
Wrote secret key to guideSecret.json.
Airdrop Transaction Id: 58uYUd8PeimjWxf12dZRdqmURoMg1Q15SaaWwEET8U4VXU2pystyUsL9s2sq3cp2JTsUugPY7SUwW82S71SUo6Sj
https://explorer.solana.com/tx/58uYUd8PeimjWxf12dZRdqmURoMg1Q15SaaWwEET8U4VXU2pystyUsL9s2sq3cp2JTsUugPY7SUwW82S71SUo6Sj?cluster=devnet


Now, let's add the private key to the wallet of our choice (Phantom in this case):

Do not share Private Keys
We are printing the private keys just so that we can add the new wallet in Phantom. Never share your private keys with anyone; always store them securely and in environment files (.env) when using them in code, and make sure to add the environment files to .gitignore before publishing them on GitHub.

Adding Wallet in Phantom

Let's upload the Token icon and metadata.

Uploading Token Icon and Metadata
We will need a token icon (image) and metadata (JSON file) that are publicly accessible so that our token metadata can be properly displayed on block explorers, wallets, and exchanges.

To stay true to the ethos of decentralization, we will use IPFS to upload our token icon and metadata.

Although we reccomend using QuickNode's IPFS tool to pin and serve data, we'll demonstrate both methods below (e.g. 1. Using QuickNode's managed IPFS service; 2. Running a local IPFS node).


QuickNode IPFS
Local IPFS Node
tip
To use IPFS on QuickNode, a Build plan or higher is required. View our feature breakdown by plan on our pricing page.

Navigate to the QuickNode Dashboard and click the IPFS tab on the left-sidebar.

Then, click on the Files tab and either click the New button and select Upload a file or simply drag the file you want to pin. We'll first upload the image below and then the metadata JSON file.

Token icon

Once the image is uploaded, click on the ellipses menu next to the file then click on Copy IPFS URL. We'll need to add this in the metadata file.

Now let's define our metadata. Solana has recently adopted Metaplex's Fungible Token Standard, which requires a name, symbol, description, and image (all are string values). Using the standard with your token mint will enable major platforms like Phantom Wallet or Solana Explorer to easily recognize your token and make it viewable by their users. Create a new metadata JSON file (token.json in this case).

token.json
{
    "name": "Best Token Ever",
    "symbol": "BTE",
    "description": "This is the best token ever!",
    "image": "IPFS_URL_OF_IMAGE"
}

Update IPFS_URL_OF_IMAGE with the IPFS URL of the image we got earlier, save the file and upload it. Once pinned, you'll see the file's name, along with other data such as the files CID, whether they're pinned, and the date they were pinned. Copy the IPFS URL of the metadata file too, We will need this URL later while minting our token.

Screenshot of dashboard with Token icon and metadata upload to IPFS

That was easy! Plus, we don't have to worry about running and managing our own IPFS node. You can click the ellipses next to the file and click Copy IPFS URL to get the URL where your file is hosted. Additionally, you can re-download or view your files details under this ellipses menu. Take a moment to try it.

Now that we have our files pinned on IPFS via QuickNode. Let's mint our token!

Build a Mint Tool
Import Dependencies
Open up mint.ts and import the following dependencies on line 1: 

import { percentAmount, generateSigner, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi'
import { TokenStandard, createAndMint, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import secret from './guideSecret.json';


We'll cover these as we get to them in the guide, but we do want to note that final import, secret, which is importing the .json we created in early steps.

Establish Solana Connection
Create a Connection to the Solana network by replacing example URL with your QuickNode Endpoint URL in the code below and pasting it just below your imports:

const umi = createUmi('https://example.solana-devnet.quiknode.pro/000000/'); //Replace with your QuickNode RPC Endpoint


Initialize the Signer wallet
We are initializing the wallet from the secret and making it the signer for transactions.

const userWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const userWalletSigner = createSignerFromKeypair(umi, userWallet);


*Note: setting numDecimals to 0 results in a token that cannot be subdivided. This might be relevant for something like a membership or whitelist mint token.

Creating the Metadata variable
Create a metadata variable like below and fill in your token details. Replace IPFS_URL_OF_METADATA with the actual IPFS URL of your metadata (token.json) file.

const metadata = {
    name: "Best Token Ever",
    symbol: "BTE",
    uri: "IPFS_URL_OF_METADATA",
};

Creating the Mint PDA
We'll need to create a Mint Program Derived Address for our token. Learn about what are PDAs in Solana and what is Mint PDA for Tokens on Solana.

Below, we are creating a new Mint PDA and asking the umi client to use our wallet initialized earlier from secret as a signer and use the MPL Token Metadata to mint token metadata.

const mint = generateSigner(umi);
umi.use(signerIdentity(userWalletSigner));
umi.use(mplTokenMetadata())

Function to deploy Mint PDA and mint Tokens
In the below function, we send a transaction to deploy the Mint PDA and mint 1 million of our tokens. You can change the amount of tokens and console message according to whatever suits best for you.

createAndMint(umi, {
    mint,
    authority: umi.identity,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: 8,
    amount: 1000000_00000000,
    tokenOwner: userWallet.publicKey,
    tokenStandard: TokenStandard.Fungible,
}).sendAndConfirm(umi)
    .then(() => {
        console.log("Successfully minted 1 million tokens (", mint.publicKey, ")");
    })
    .catch((err) => {
        console.error("Error minting tokens:", err);
    });


Why we add decimals?
Decimals are added to tokens to make them divisible to the smallest parts for simpler transactions and better liquidity. For example, in the above example, we are saying that our token's decimal would be 8, which means that our one token will be divisible to the 8th decimal value. Thus, while minting 1 million tokens, we have to add eight zeros ahead of the 1 million number (1000000_00000000).

Pull it All Together
Alright, the complete mint.ts should look like this:

mint.ts
import { percentAmount, generateSigner, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi'
import { TokenStandard, createAndMint, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import secret from './guideSecret.json';

const umi = createUmi('https://example.solana-devnet.quiknode.pro/000000/'); //Replace with your QuickNode RPC Endpoint

const userWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const userWalletSigner = createSignerFromKeypair(umi, userWallet);

const metadata = {
    name: "Best Token Ever",
    symbol: "BTE",
    uri: "IPFS_URL_OF_METADATA",
};

const mint = generateSigner(umi);
umi.use(signerIdentity(userWalletSigner));
umi.use(mplTokenMetadata())

createAndMint(umi, {
    mint,
    authority: umi.identity,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: 8,
    amount: 1000000_00000000,
    tokenOwner: userWallet.publicKey,
    tokenStandard: TokenStandard.Fungible,
}).sendAndConfirm(umi)
    .then(() => {
        console.log("Successfully minted 1 million tokens (", mint.publicKey, ")");
    })
    .catch((err) => {
        console.error("Error minting tokens:", err);
    });


Run Your Code
In your Terminal, type: 

ts-node mint.ts

Upon successful execution you should see an output like this:

Final results terminal output

You can view your token on Solana Devnet Explorer as well as in your Phantom wallet:


Token account on Solana devnet explorerToken being displayed in Phantom wallet
Note: If you've minted a fungible token in the past, you've probably submitted your token to the Solana Token Program Registry. That registry is now deprecated and no longer a necessary step. You've already uploaded the metadata on chain, so you're good to go!

SPL Token Transfers on Solana: A Complete Guide
Updated on
May 05, 2025
All
Solana
SPL Token Program
TypeScript
JavaScript
Solana-Web3.js
Video
10 min read

Overview
Sending Solana Program Library (SPL) Tokens is a critical mechanism for Solana development. Whether you are airdropping whitelist tokens to your community, bulk sending NFTs to another wallet, or managing token flows between escrow accounts, you will inevitably need to be able to transfer SPL tokens. Transferring SPL tokens is slightly different from sending SOL, so it is essential to understand how it works as you progress on your Solana development journey.

What You Will Do
In this guide, you will use TypeScript to write a script that transfers an SPL token from one account to another on Solana's devnet.

If you'd like to learn how to transfer SPL tokens and SOL in a Program using the Anchor Framework, check out our Guide: How to Transfer SOL and SPL Tokens Using Anchor .

Prefer a video walkthrough? Follow along with Sahil and learn how to transfer SPL tokens on Solana Devnet.

Subscribe to our YouTube channel for more videos!
Subscribe
What You Will Need
Nodejs (version 16.15 or higher) installed
Typescript experience and ts-node installed
SPL Token Accounts Overview
Before getting started, it is helpful to understand how a couple of components of the Solana Token Program account work: Mint IDs and Associated Token Accounts.

Mint IDs
Every SPL token has a unique Mint ID that can discern it from any other type of token. For example, the $USDC SPL Token Mint ID is EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v and the $SAMO mint ID is 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU.

It is worth noting that every NFT has a unique mint address (which is partly what makes it non-fungible). For example, Famous Fox #4679 has a Mint ID of GS2AtoEoL9DgaYg9xC7cUumftB7vb2CPMrczZCKgJv1Y and Famous Fox #6562 has a Mint ID of 7FTdQdMqkk5Xc2oFsYR88BuJt2yyCPReTpqr3viH6b6C. As you'll see in a second, this is a significant distinction between the two tokens.

If you want to know more about minting SPL tokens, check out our guides on How to Create a Fungible SPL token with the New Metaplex Token Standard and How to Mint an NFT on Solana.

Associated Token Accounts
The Solana Token Program derives "a token account key from a user's main System account address and a token mint address, allowing the user to create a main token account for each token they own" (Source: spl.solana.com). That account is referred to as an Associated Token Account or "ATA." Effectively an ATA is a unique account linked to a user and a specific token mint. For example, let's say I am the owner of Account "DEMO...1234". I can have many ATAs--one for each token mint I hold (e.g., a unique ATA for each $USDC, $SAMO, etc., as illustrated below).



Token Transfers must always occur between two ATAs associated with the same associated mint address. This means we cannot send $USDC from my ATA to your $SAMO ATA (see example below).



As you'll see in our code in a bit, every account does not already have an ATA for every mint. If a user hasn't interacted with a token before, the sender must "create" it and deposit the necessary rent for the account to remain active.

This concept can be tricky at first, but it's important, so take the time to ensure you understand this! I find it helpful to browse my wallet on Solana Explorer on the tokens detail page: https://explorer.solana.com/address/YOUR_WALLET_ADDRESS/tokens?display=detail. You can see each of your ATAs, their Account ID, and the associated Mint ID:



If you want to dig in a little more on the Solana SPL Token Program Library, head over to spl.solana.com.

Ready to start coding? Me too!

Set Up Your Project
Create a new project directory in your terminal with:

mkdir spl-transfer
cd spl-transfer

Create a file for your app, app.ts:

echo > app.ts

Initialize your project with the "yes" flag to use default values for your new package:

yarn init --yes
#or
npm init --yes

Create a tsconfig.json with .json importing enabled:

tsc -init --resolveJsonModule true

Install Solana Web3 Dependency
We will need to add the Solana Web3 and SPL Token libraries for this exercise. In your terminal type:

yarn add @solana/web3.js@1 @solana/spl-token
#or
npm install @solana/web3.js@1 @solana/spl-token

Create a Wallet and Airdrop SOL
The first task we'll need to accomplish is creating an account with a wallet and funding it. We'll be using the handy tool below to automatically generate a new wallet and airdrop 1 SOL to it. (You can also achieve this with the Keypair.generate() and requestAirdrop() functions if you prefer a more manual approach).

🔑Generate a new wallet with Devnet SOL
Once you've successfully generated your keypair, you'll notice two new constants: secret and FROM_KEYPAIR, a Keypair. The secret is a 32-byte array that is used to generate the public and private keys. The FROM_KEYPAIR is a Keypair instance that is used to sign transactions (we've airdropped some devnet SOL to cover the gas fees). Make sure to add it to your code below your other constants if you haven't yet.

Below your imports, paste your new secret, and add:

import { Keypair } from "@solana/web3.js";

const secret = [0,...,0]; // 👈 Replace with your secret
const FROM_KEYPAIR = Keypair.fromSecretKey(new Uint8Array(secret));
console.log(`My public key is: ${FROM_KEYPAIR.publicKey.toString()}.`);


Logs for Simplified Debugging
You can now access Logs for your RPC endpoints, helping you troubleshoot issues more effectively. If you encounter an issue with your RPC calls, simply check the logs in your QuickNode dashboard to identify and resolve problems quickly. Learn more about log history limits on our pricing page.

Mint or Airdrop Some SPL Tokens
To complete this guide, you will need some SPL tokens on Devnet. There are several ways to go about getting Devnet SPL tokens--here are a few.

Mint your own fungible tokens (Guide: How to Create a Fungible SPL token with the New Metaplex Token Standard).

Mint one or more NFTs using Candy Machine (Guide: How to Deploy an NFT Collection on Solana Using Sugar (Candy Machine)).

Request a $DUMMY token airdrop from an SPL Token Faucet.*

If you already have Devnet SPL tokens in another wallet, you can send them using Phantom or another wallet inteface.*

Before proceeding, you should be able to go to Solana Explorer and see that your wallet has a balance of SOL and at least one SPL token on devnet (https://explorer.solana.com/address/YOUR_WALLET_ADDRESS/tokens?cluster=devnet). It should look something like this:



Let's get started.

Set Up Your App
Import Necessary Dependencies
Open app.ts, and paste the following imports on line 1:

import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { Connection, Keypair, ParsedAccountData, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";


In addition to the wallet we created in the previous step, we are also importing a few essential methods and classes from the Solana Web3 library.

Set Up Your QuickNode Endpoint
To build on Solana, you'll need an API endpoint to connect with the network. You're welcome to use public nodes or deploy and manage your own infrastructure; however, if you'd like 8x faster response times, you can leave the heavy lifting to us. See why over 50% of projects on Solana choose QuickNode and sign up for a free account here. We're going to use a Solana Devnet node.

Copy the HTTP Provider link:



Inside app.ts under your import statements, declare your RPC and establish your Connection to Solana:

const QUICKNODE_RPC = 'https://example.solana-devnet.quiknode.pro/0123456/';
const SOLANA_CONNECTION = new Connection(QUICKNODE_RPC);


Declare Variables
You are going to need to declare a few variables to run your script: your destination account (the owner you wish to transfer tokens to), the mint address of the token you are transferring, and the number of tokens to transfer. Add the following declarations below SOLANA_CONNECTION:

const DESTINATION_WALLET = 'DemoKMZWkk483hX4mUrcJoo3zVvsKhm8XXs28TuwZw9H'; 
const MINT_ADDRESS = 'DoJuta7joTSuuoozqQtjtnASRYiVsT435gh4srh5LLGK'; //You must change this value!
const TRANSFER_AMOUNT = 1;


Replace MINT_ADDRESS with the mint address of the token you plan to send. If you do not know the mint address of your token, you can go to https://explorer.solana.com/address/YOUR_WALLET_ADDRESS/tokens?cluster=devnet and click the Copy icon to capture your mint address. Paste it in the MINT_ADDRESS variable.



Note: You may also update your DESTINATION_WALLET address and TRANSFER_AMOUNT if you like, but both values will work for this example.

Fetch the Number of Decimals
If you have created a fungible SPL token before, you know that decimals matter. Since the chain represents the supply of tokens as an integer value, we must covert the token amount based on the number of decimals allocated in the token's metadata (for example, if a mint has three decimals, we must send 1,000 units in order to effectively transfer one token [1,000 / 10**3]).

To fetch decimals, we will call getParsedAccountInfo on SOLANA_CONNECTION and pass the token MINT_ADDRESS. Because the method can return multiple types, we need to declare our type as ParsedAccountData to parse the data effectively. Add this function below your declarations:

async function getNumberDecimals(mintAddress: string):Promise<number> {
    const info = await SOLANA_CONNECTION.getParsedAccountInfo(new PublicKey(MINT_ADDRESS));
    const result = (info.value?.data as ParsedAccountData).parsed.info.decimals as number;
    return result;
}


Technically, you don't need this if you know the number of decimals of your token mint (you can find it on Solana Explorer's token page). Still, we like to include it as it allows you to modify your code with different mints without changing another variable.

Let's get to the fun stuff!

Create Transfer Function
Create a new async function, sendTokens:

async function sendTokens() {
}

First, we will need to get the Associated Token Accounts ("ATA") for our source and destination accounts. Remember, each account must have an ATA that associates a wallet with a mint; an ATA can only hold tokens for a single mint; and the mint of both sender and receiver associated token accounts must be the same.

We will use getOrCreateAssociatedTokenAccount to fetch the ATA (or create it if it doesn't exist) for each party to this transaction. Because we may need to create an associated account for these transactions, our payer may have to seed the new ATA with a small amount of SOL to cover rent. Inside of sendTokens, add step 1 to your code to fetch our source account (technically, since we know we already have SPL tokens--we already have an ATA, so we could also use getAssociatedTokenAddress):

    console.log(`Sending ${TRANSFER_AMOUNT} ${(MINT_ADDRESS)} from ${(FROM_KEYPAIR.publicKey.toString())} to ${(DESTINATION_WALLET)}.`)
    //Step 1
    console.log(`1 - Getting Source Token Account`);
    let sourceAccount = await getOrCreateAssociatedTokenAccount(
        SOLANA_CONNECTION, 
        FROM_KEYPAIR,
        new PublicKey(MINT_ADDRESS),
        FROM_KEYPAIR.publicKey
    );
    console.log(`    Source Account: ${sourceAccount.address.toString()}`);


We will do the same thing for our destinationAccount. Add step 2 below to get or create our destinationAccount (the recipient's ATA to which the tokens will be sent):

    //Step 2
    console.log(`2 - Getting Destination Token Account`);
    let destinationAccount = await getOrCreateAssociatedTokenAccount(
        SOLANA_CONNECTION, 
        FROM_KEYPAIR,
        new PublicKey(MINT_ADDRESS),
        new PublicKey(DESTINATION_WALLET)
    );
    console.log(`    Destination Account: ${destinationAccount.address.toString()}`);


Just one more piece of information is required to assemble our transaction. Remember that getNumberDecimals function we created? Let's call that and store the returned value in a constant, numberDecimals:

    //Step 3
    console.log(`3 - Fetching Number of Decimals for Mint: ${MINT_ADDRESS}`);
    const numberDecimals = await getNumberDecimals(MINT_ADDRESS);
    console.log(`    Number of Decimals: ${numberDecimals}`);


Finally, we need to assemble and send our transaction. Add the following instruction assembly below Step 3:

    //Step 4
    console.log(`4 - Creating and Sending Transaction`);
    const tx = new Transaction();
    tx.add(createTransferInstruction(
        sourceAccount.address,
        destinationAccount.address,
        FROM_KEYPAIR.publicKey,
        TRANSFER_AMOUNT * Math.pow(10, numberDecimals)
    ))

What we are doing here is telling our app to transfer TRANSFER_AMOUNT tokens (note that we must multiply by 10 to the power of numberDecimals) from the sourceAccount we fetched to the destinationAccount we fetched.

For best practices, we should fetch a recent blockhash before sending our transaction. Add this snippet at the end of Step 4 in your sendTokens function:

    const latestBlockHash = await SOLANA_CONNECTION.getLatestBlockhash('confirmed');
    tx.recentBlockhash = await latestBlockHash.blockhash;    
    const signature = await sendAndConfirmTransaction(SOLANA_CONNECTION,tx,[FROM_KEYPAIR]);
    console.log(
        '\x1b[32m', //Green Text
        `   Transaction Success!🎉`,
        `\n    https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );


Don't mind that console.log--that's just some trickery to make our success appear in green text.

🏃‍♂️ Run Your Code
Finally, at the end of your code, call sendTokens:

sendTokens();

In your terminal, run your code by typing:

ts-node app.ts

Congrats! If you have followed the steps above, you should see something like this:



Next Steps and Wrap Up
Awesome! You now know how to transfer SPL tokens from one user to another! Want to take it to the next level? Here are a couple of ideas for how you could take this a little further:

Can you write a script that will transfer all of your NFTs to another wallet? (Hint: you might want to study up on how to fetch all tokens in a user's wallet first).

Can you write a script to airdrop SPL tokens to a bunch of wallets that may or may not have an ATA associated with your mint? (Hint: check out our guide on sending bulk SOL distributions for inspiration).