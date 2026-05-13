import { address as solanaAddress } from '@solana/addresses';
import { address as bitcoinAddress, networks } from 'bitcoinjs-lib';
import { isAddress as isEvmAddress } from 'ethers';

import { getChain } from './chains';
import type { ChainId, CustomEvmChains, NetworkMode } from './types';

export function validateRecipientAddress(
  chainId: ChainId,
  recipient: string,
  networkMode: NetworkMode,
  customEvmChains?: CustomEvmChains,
): string {
  const value = recipient.trim();

  if (!value) {
    throw new Error('Recipient address is required.');
  }

  const chain = getChain(chainId, networkMode, customEvmChains);

  if (chain.family === 'evm') {
    if (!isEvmAddress(value)) {
      throw new Error(`Enter a valid ${chain.label} address.`);
    }
    return value;
  }

  if (chain.family === 'bitcoin') {
    try {
      bitcoinAddress.toOutputScript(
        value,
        chain.bitcoinNetwork === 'testnet' ? networks.testnet : networks.bitcoin,
      );
      return value;
    } catch {
      throw new Error(`Enter a valid ${chain.networkLabel} address.`);
    }
  }

  if (chain.family === 'solana') {
    try {
      solanaAddress(value);
      return value;
    } catch {
      throw new Error('Enter a valid Solana address.');
    }
  }

  if (!/^spark1[0-9a-z]+$/i.test(value)) {
    throw new Error('Enter a valid Spark address.');
  }

  return value;
}
