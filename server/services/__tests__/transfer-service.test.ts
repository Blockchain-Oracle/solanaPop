// import { transferToken } from '../transfer-service';
// import { Connection, Keypair, PublicKey } from '@solana/web3.js';
// import * as splToken from '@solana/spl-token';
// import * as keyService from '../keys-service';

// // Mock dependencies
// jest.mock('@solana/web3.js', () => {
//   const original = jest.requireActual('@solana/web3.js');
//   return {
//     ...original,
//     Connection: jest.fn(),
//     sendAndConfirmTransaction: jest.fn().mockResolvedValue('mocked-signature')
//   };
// });

// jest.mock('@solana/spl-token', () => ({
//   getOrCreateAssociatedTokenAccount: jest.fn().mockResolvedValue({
//     address: new (jest.requireActual('@solana/web3.js')).PublicKey('TokenAccountAddress11111111111111111111111111111'),
//   }),
//   createTransferInstruction: jest.fn().mockReturnValue({
//     keys: [],
//     programId: new (jest.requireActual('@solana/web3.js')).PublicKey('TokenProgram1111111111111111111111111111111'),
//     data: Buffer.from([])
//   })
// }));

// jest.mock('../keys-service', () => ({
//   getServiceKeypair: jest.fn().mockReturnValue({
//     publicKey: new (jest.requireActual('@solana/web3.js')).PublicKey('ServiceWallet111111111111111111111111111111'),
//     secretKey: new Uint8Array(32).fill(1)
//   })
// }));

// describe('Transfer Service', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//     process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
//     process.env.SOLANA_NETWORK = 'devnet';
//   });

//   // Mock Connection's getParsedAccountInfo
//   const mockGetParsedAccountInfo = jest.fn().mockResolvedValue({
//     value: {
//       data: {
//         parsed: {
//           info: {
//             decimals: 6
//           }
//         }
//       }
//     }
//   });
  
//   // Mock Connection's getLatestBlockhash
//   const mockGetLatestBlockhash = jest.fn().mockResolvedValue({
//     blockhash: 'mockedBlockhash',
//     lastValidBlockHeight: 123456
//   });
  
//   beforeEach(() => {
//     // Apply the mocks to the Connection constructor
//     (Connection as jest.Mock).mockImplementation(() => ({
//       getParsedAccountInfo: mockGetParsedAccountInfo,
//       getLatestBlockhash: mockGetLatestBlockhash
//     }));
//   });

//   it('should successfully transfer tokens', async () => {
//     // Test parameters
//     const mintAddress = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
//     const recipientAddress = '6QuXb6mB6WmRASP2y8AavXh6aabBXEH5ZzrSH5xRrgSm';
//     const amount = 1.5;
//     const referenceKey = Keypair.generate().publicKey;
    
//     // Execute the transfer
//     const result = await transferToken(mintAddress, recipientAddress, amount, referenceKey);
    
//     // Verify the results
//     expect(result.success).toBe(true);
//     expect(result.signature).toBe('mocked-signature');
//     expect(result.explorerUrl).toBe('https://explorer.solana.com/tx/mocked-signature?cluster=devnet');
    
//     // Verify that the mocks were called correctly
//     expect(keyService.getServiceKeypair).toHaveBeenCalled();
//     expect(splToken.getOrCreateAssociatedTokenAccount).toHaveBeenCalledTimes(2);
//     expect(splToken.createTransferInstruction).toHaveBeenCalledWith(
//       expect.any(PublicKey),
//       expect.any(PublicKey),
//       expect.any(PublicKey),
//       amount * Math.pow(10, 6) // 6 decimals
//     );
//   });

//   it('should handle errors during transfer', async () => {
//     // Make one of the dependencies throw an error
//     (splToken.getOrCreateAssociatedTokenAccount as jest.Mock).mockRejectedValueOnce(
//       new Error('Token account creation failed')
//     );
    
//     // Test parameters
//     const mintAddress = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
//     const recipientAddress = '6QuXb6mB6WmRASP2y8AavXh6aabBXEH5ZzrSH5xRrgSm';
//     const amount = 1.5;
//     const referenceKey = Keypair.generate().publicKey;
    
//     // Execute the transfer
//     const result = await transferToken(mintAddress, recipientAddress, amount, referenceKey);
    
//     // Verify the results
//     expect(result.success).toBe(false);
//     expect(result.error).toBe('Token account creation failed');
//     expect(result.signature).toBeUndefined();
//   });
// }); 