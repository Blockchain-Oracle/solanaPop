import { Connection, TransactionSignature } from '@solana/web3.js';

type TransactionStatusCallback = (status: 'processing' | 'confirmed' | 'finalized' | 'error', signature?: string, error?: Error) => void;

export function subscribeToTransaction(
  connection: Connection,
  signature: TransactionSignature,
  callback: TransactionStatusCallback
) {
  // First try to get current status - might already be confirmed
  connection.getSignatureStatus(signature)
    .then(status => {
      if (status.value?.confirmationStatus === 'finalized') {
        callback('finalized', signature);
        return null; // Don't subscribe if already finalized
      }
      
      // Subscribe to transaction status
      const subscriptionId = connection.onSignature(
        signature,
        (result, context) => {
          if (result.err) {
            callback('error', signature, new Error(JSON.stringify(result.err)));
          } else {
            callback('finalized', signature);
          }
        },
        'finalized'
      );
      
      // Initial notification that we're monitoring the transaction
      callback('processing', signature);
      
      return subscriptionId;
    })
    .catch(error => {
      console.error('Error checking transaction status:', error);
      callback('error', signature, error);
      return null;
    });
}

export function unsubscribeFromTransaction(
  connection: Connection,
  subscriptionId: number
) {
  if (subscriptionId) {
    connection.removeSignatureListener(subscriptionId);
  }
} 