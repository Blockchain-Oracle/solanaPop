import { KeyService } from '../server/services/keys-service';

async function main() {
  console.log('Generating new keypairs for services...');
  const keypairs = KeyService.generateAndLogKeypairs();
  
  console.log('\nAdd these values to your .env file:');
  console.log('\nSERVICE_PRIVATE_KEY=' + JSON.stringify(keypairs.service.privateKeyArray));
  console.log('\nCOMPRESSION_PRIVATE_KEY=' + JSON.stringify(keypairs.compression.privateKeyArray));
}

main().catch(console.error); 