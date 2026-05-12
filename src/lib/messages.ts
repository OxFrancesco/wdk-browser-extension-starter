import type {
  ChainId,
  DashboardState,
  NetworkMode,
  PrimitiveRequest,
  PrimitiveResult,
  SendQuote,
  SendRequest,
} from './types';

export type RuntimeRequest =
  | { type: 'vault:get' }
  | { type: 'vault:create'; password: string; seedPhrase: string; name: string }
  | { type: 'vault:unlock'; password: string }
  | { type: 'vault:lock' }
  | { type: 'network:set'; networkMode: NetworkMode }
  | { type: 'wallet:generateSeed' }
  | { type: 'wallet:add'; seedPhrase: string; name: string }
  | { type: 'wallet:addAccount'; walletId: string }
  | { type: 'wallet:setActive'; walletId: string }
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
  'wallet:add': DashboardState;
  'wallet:addAccount': DashboardState;
  'wallet:setActive': DashboardState;
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
