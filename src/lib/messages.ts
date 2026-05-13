import type {
  ChainId,
  CustomEvmChainId,
  DashboardState,
  NetworkMode,
  PrimitiveRequest,
  PrimitiveResult,
  SendQuote,
  SendRequest,
} from './types';

export type WalletStatus = {
  locked: boolean;
  hasVault: boolean;
  networkMode: NetworkMode;
};

export type DappRequest = {
  origin: string;
  method: string;
  params?: unknown;
};

export type DappApproval = {
  id: string;
  origin: string;
  action: 'connect' | 'sign' | 'transaction' | 'chain';
  title: string;
  description: string;
  chainLabel?: string;
  address?: string;
  payload?: string;
  permissionOrigins?: string[];
};

export type RuntimeRequest =
  | { type: 'vault:get' }
  | { type: 'vault:create'; password: string; seedPhrase: string; name: string }
  | { type: 'vault:unlock'; password: string }
  | { type: 'vault:lock' }
  | { type: 'network:set'; networkMode: NetworkMode }
  | { type: 'wallet:generateSeed' }
  | { type: 'wallet:status' }
  | { type: 'dapp:request'; request: DappRequest }
  | { type: 'dapp:approval:get'; id: string }
  | { type: 'dapp:approval:resolve'; id: string; approved: boolean }
  | { type: 'wallet:add'; seedPhrase: string; name: string }
  | { type: 'wallet:addAccount'; walletId: string }
  | { type: 'wallet:setActive'; walletId: string }
  | { type: 'rpc:add'; chainId: ChainId; networkMode: NetworkMode; url: string }
  | { type: 'rpc:remove'; chainId: ChainId; networkMode: NetworkMode; url: string }
  | { type: 'chain:removeCustom'; chainId: CustomEvmChainId; networkMode: NetworkMode }
  | { type: 'wallet:refresh'; chainId?: ChainId }
  | { type: 'send:quote'; request: SendRequest }
  | { type: 'send:broadcast'; request: SendRequest }
  | { type: 'primitive:execute'; request: PrimitiveRequest };

export type RuntimeResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type RuntimeResponseData = {
  'vault:get': DashboardState;
  'vault:create': DashboardState;
  'vault:unlock': DashboardState;
  'vault:lock': DashboardState;
  'network:set': DashboardState;
  'wallet:generateSeed': string;
  'wallet:status': WalletStatus;
  'dapp:request': unknown;
  'dapp:approval:get': DappApproval | null;
  'dapp:approval:resolve': null;
  'wallet:add': DashboardState;
  'wallet:addAccount': DashboardState;
  'wallet:setActive': DashboardState;
  'rpc:add': DashboardState;
  'rpc:remove': DashboardState;
  'chain:removeCustom': DashboardState;
  'wallet:refresh': DashboardState;
  'send:quote': SendQuote;
  'send:broadcast': DashboardState;
  'primitive:execute': PrimitiveResult;
};

export async function sendRuntimeMessage<T extends RuntimeRequest>(
  request: T,
): Promise<RuntimeResponse<RuntimeResponseData[T['type']]>> {
  return browser.runtime.sendMessage(request);
}
