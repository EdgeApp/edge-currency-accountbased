/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { MsgSwap } from "./types/msg_swap";
import { ChainContract } from "./types/type_chain_contract";
import { LiquidityProvider } from "./types/type_liquidity_provider";
import { Loan } from "./types/type_loan";
import { Network } from "./types/type_network";
import { NetworkFee } from "./types/type_network_fee";
import { BondProviders, NodeAccount } from "./types/type_node_account";
import { ObservedTxVoter } from "./types/type_observed_tx";
import { ProtocolOwnedLiquidity } from "./types/type_pol";
import { Pool } from "./types/type_pool";
import { ReserveContributor } from "./types/type_reserve_contributor";
import { StreamingSwap } from "./types/type_streaming_swap";
import { THORName } from "./types/type_thorname";
import { TxOut } from "./types/type_tx_out";
import { Vault } from "./types/type_vault";

export const protobufPackage = "thorchain";

export interface lastChainHeight {
  chain: string;
  height: Long;
}

export interface mimir {
  key: string;
  value: Long;
}

export interface GenesisState {
  pools: Pool[];
  liquidityProviders: LiquidityProvider[];
  observedTxInVoters: ObservedTxVoter[];
  observedTxOutVoters: ObservedTxVoter[];
  txOuts: TxOut[];
  nodeAccounts: NodeAccount[];
  vaults: Vault[];
  reserve: Long;
  lastSignedHeight: Long;
  lastChainHeights: lastChainHeight[];
  reserveContributors: ReserveContributor[];
  network?: Network | undefined;
  orderbookItems: MsgSwap[];
  networkFees: NetworkFee[];
  chainContracts: ChainContract[];
  THORNames: THORName[];
  mimirs: mimir[];
  storeVersion: Long;
  bondProviders: BondProviders[];
  POL?: ProtocolOwnedLiquidity | undefined;
  loans: Loan[];
  streamingSwaps: StreamingSwap[];
  swapQueueItems: MsgSwap[];
}

function createBaselastChainHeight(): lastChainHeight {
  return { chain: "", height: Long.ZERO };
}

export const lastChainHeight = {
  encode(message: lastChainHeight, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.chain !== "") {
      writer.uint32(10).string(message.chain);
    }
    if (!message.height.isZero()) {
      writer.uint32(16).int64(message.height);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): lastChainHeight {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaselastChainHeight();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.chain = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.height = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): lastChainHeight {
    return {
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      height: isSet(object.height) ? Long.fromValue(object.height) : Long.ZERO,
    };
  },

  toJSON(message: lastChainHeight): unknown {
    const obj: any = {};
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (!message.height.isZero()) {
      obj.height = (message.height || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<lastChainHeight>, I>>(base?: I): lastChainHeight {
    return lastChainHeight.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<lastChainHeight>, I>>(object: I): lastChainHeight {
    const message = createBaselastChainHeight();
    message.chain = object.chain ?? "";
    message.height = (object.height !== undefined && object.height !== null)
      ? Long.fromValue(object.height)
      : Long.ZERO;
    return message;
  },
};

function createBasemimir(): mimir {
  return { key: "", value: Long.ZERO };
}

export const mimir = {
  encode(message: mimir, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (!message.value.isZero()) {
      writer.uint32(16).int64(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): mimir {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasemimir();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.key = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.value = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): mimir {
    return {
      key: isSet(object.key) ? globalThis.String(object.key) : "",
      value: isSet(object.value) ? Long.fromValue(object.value) : Long.ZERO,
    };
  },

  toJSON(message: mimir): unknown {
    const obj: any = {};
    if (message.key !== "") {
      obj.key = message.key;
    }
    if (!message.value.isZero()) {
      obj.value = (message.value || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<mimir>, I>>(base?: I): mimir {
    return mimir.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<mimir>, I>>(object: I): mimir {
    const message = createBasemimir();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null) ? Long.fromValue(object.value) : Long.ZERO;
    return message;
  },
};

function createBaseGenesisState(): GenesisState {
  return {
    pools: [],
    liquidityProviders: [],
    observedTxInVoters: [],
    observedTxOutVoters: [],
    txOuts: [],
    nodeAccounts: [],
    vaults: [],
    reserve: Long.UZERO,
    lastSignedHeight: Long.ZERO,
    lastChainHeights: [],
    reserveContributors: [],
    network: undefined,
    orderbookItems: [],
    networkFees: [],
    chainContracts: [],
    THORNames: [],
    mimirs: [],
    storeVersion: Long.ZERO,
    bondProviders: [],
    POL: undefined,
    loans: [],
    streamingSwaps: [],
    swapQueueItems: [],
  };
}

export const GenesisState = {
  encode(message: GenesisState, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.pools) {
      Pool.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.liquidityProviders) {
      LiquidityProvider.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.observedTxInVoters) {
      ObservedTxVoter.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.observedTxOutVoters) {
      ObservedTxVoter.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.txOuts) {
      TxOut.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    for (const v of message.nodeAccounts) {
      NodeAccount.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    for (const v of message.vaults) {
      Vault.encode(v!, writer.uint32(58).fork()).ldelim();
    }
    if (!message.reserve.isZero()) {
      writer.uint32(64).uint64(message.reserve);
    }
    if (!message.lastSignedHeight.isZero()) {
      writer.uint32(80).int64(message.lastSignedHeight);
    }
    for (const v of message.lastChainHeights) {
      lastChainHeight.encode(v!, writer.uint32(90).fork()).ldelim();
    }
    for (const v of message.reserveContributors) {
      ReserveContributor.encode(v!, writer.uint32(98).fork()).ldelim();
    }
    if (message.network !== undefined) {
      Network.encode(message.network, writer.uint32(106).fork()).ldelim();
    }
    for (const v of message.orderbookItems) {
      MsgSwap.encode(v!, writer.uint32(154).fork()).ldelim();
    }
    for (const v of message.networkFees) {
      NetworkFee.encode(v!, writer.uint32(162).fork()).ldelim();
    }
    for (const v of message.chainContracts) {
      ChainContract.encode(v!, writer.uint32(178).fork()).ldelim();
    }
    for (const v of message.THORNames) {
      THORName.encode(v!, writer.uint32(186).fork()).ldelim();
    }
    for (const v of message.mimirs) {
      mimir.encode(v!, writer.uint32(194).fork()).ldelim();
    }
    if (!message.storeVersion.isZero()) {
      writer.uint32(200).int64(message.storeVersion);
    }
    for (const v of message.bondProviders) {
      BondProviders.encode(v!, writer.uint32(210).fork()).ldelim();
    }
    if (message.POL !== undefined) {
      ProtocolOwnedLiquidity.encode(message.POL, writer.uint32(218).fork()).ldelim();
    }
    for (const v of message.loans) {
      Loan.encode(v!, writer.uint32(226).fork()).ldelim();
    }
    for (const v of message.streamingSwaps) {
      StreamingSwap.encode(v!, writer.uint32(234).fork()).ldelim();
    }
    for (const v of message.swapQueueItems) {
      MsgSwap.encode(v!, writer.uint32(242).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GenesisState {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pools.push(Pool.decode(reader, reader.uint32()));
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.liquidityProviders.push(LiquidityProvider.decode(reader, reader.uint32()));
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.observedTxInVoters.push(ObservedTxVoter.decode(reader, reader.uint32()));
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.observedTxOutVoters.push(ObservedTxVoter.decode(reader, reader.uint32()));
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.txOuts.push(TxOut.decode(reader, reader.uint32()));
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.nodeAccounts.push(NodeAccount.decode(reader, reader.uint32()));
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.vaults.push(Vault.decode(reader, reader.uint32()));
          continue;
        case 8:
          if (tag !== 64) {
            break;
          }

          message.reserve = reader.uint64() as Long;
          continue;
        case 10:
          if (tag !== 80) {
            break;
          }

          message.lastSignedHeight = reader.int64() as Long;
          continue;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.lastChainHeights.push(lastChainHeight.decode(reader, reader.uint32()));
          continue;
        case 12:
          if (tag !== 98) {
            break;
          }

          message.reserveContributors.push(ReserveContributor.decode(reader, reader.uint32()));
          continue;
        case 13:
          if (tag !== 106) {
            break;
          }

          message.network = Network.decode(reader, reader.uint32());
          continue;
        case 19:
          if (tag !== 154) {
            break;
          }

          message.orderbookItems.push(MsgSwap.decode(reader, reader.uint32()));
          continue;
        case 20:
          if (tag !== 162) {
            break;
          }

          message.networkFees.push(NetworkFee.decode(reader, reader.uint32()));
          continue;
        case 22:
          if (tag !== 178) {
            break;
          }

          message.chainContracts.push(ChainContract.decode(reader, reader.uint32()));
          continue;
        case 23:
          if (tag !== 186) {
            break;
          }

          message.THORNames.push(THORName.decode(reader, reader.uint32()));
          continue;
        case 24:
          if (tag !== 194) {
            break;
          }

          message.mimirs.push(mimir.decode(reader, reader.uint32()));
          continue;
        case 25:
          if (tag !== 200) {
            break;
          }

          message.storeVersion = reader.int64() as Long;
          continue;
        case 26:
          if (tag !== 210) {
            break;
          }

          message.bondProviders.push(BondProviders.decode(reader, reader.uint32()));
          continue;
        case 27:
          if (tag !== 218) {
            break;
          }

          message.POL = ProtocolOwnedLiquidity.decode(reader, reader.uint32());
          continue;
        case 28:
          if (tag !== 226) {
            break;
          }

          message.loans.push(Loan.decode(reader, reader.uint32()));
          continue;
        case 29:
          if (tag !== 234) {
            break;
          }

          message.streamingSwaps.push(StreamingSwap.decode(reader, reader.uint32()));
          continue;
        case 30:
          if (tag !== 242) {
            break;
          }

          message.swapQueueItems.push(MsgSwap.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GenesisState {
    return {
      pools: globalThis.Array.isArray(object?.pools) ? object.pools.map((e: any) => Pool.fromJSON(e)) : [],
      liquidityProviders: globalThis.Array.isArray(object?.liquidityProviders)
        ? object.liquidityProviders.map((e: any) => LiquidityProvider.fromJSON(e))
        : [],
      observedTxInVoters: globalThis.Array.isArray(object?.observedTxInVoters)
        ? object.observedTxInVoters.map((e: any) => ObservedTxVoter.fromJSON(e))
        : [],
      observedTxOutVoters: globalThis.Array.isArray(object?.observedTxOutVoters)
        ? object.observedTxOutVoters.map((e: any) => ObservedTxVoter.fromJSON(e))
        : [],
      txOuts: globalThis.Array.isArray(object?.txOuts) ? object.txOuts.map((e: any) => TxOut.fromJSON(e)) : [],
      nodeAccounts: globalThis.Array.isArray(object?.nodeAccounts)
        ? object.nodeAccounts.map((e: any) => NodeAccount.fromJSON(e))
        : [],
      vaults: globalThis.Array.isArray(object?.vaults) ? object.vaults.map((e: any) => Vault.fromJSON(e)) : [],
      reserve: isSet(object.reserve) ? Long.fromValue(object.reserve) : Long.UZERO,
      lastSignedHeight: isSet(object.lastSignedHeight) ? Long.fromValue(object.lastSignedHeight) : Long.ZERO,
      lastChainHeights: globalThis.Array.isArray(object?.lastChainHeights)
        ? object.lastChainHeights.map((e: any) => lastChainHeight.fromJSON(e))
        : [],
      reserveContributors: globalThis.Array.isArray(object?.reserveContributors)
        ? object.reserveContributors.map((e: any) => ReserveContributor.fromJSON(e))
        : [],
      network: isSet(object.network) ? Network.fromJSON(object.network) : undefined,
      orderbookItems: globalThis.Array.isArray(object?.orderbookItems)
        ? object.orderbookItems.map((e: any) => MsgSwap.fromJSON(e))
        : [],
      networkFees: globalThis.Array.isArray(object?.networkFees)
        ? object.networkFees.map((e: any) => NetworkFee.fromJSON(e))
        : [],
      chainContracts: globalThis.Array.isArray(object?.chainContracts)
        ? object.chainContracts.map((e: any) => ChainContract.fromJSON(e))
        : [],
      THORNames: globalThis.Array.isArray(object?.THORNames)
        ? object.THORNames.map((e: any) => THORName.fromJSON(e))
        : [],
      mimirs: globalThis.Array.isArray(object?.mimirs) ? object.mimirs.map((e: any) => mimir.fromJSON(e)) : [],
      storeVersion: isSet(object.storeVersion) ? Long.fromValue(object.storeVersion) : Long.ZERO,
      bondProviders: globalThis.Array.isArray(object?.bondProviders)
        ? object.bondProviders.map((e: any) => BondProviders.fromJSON(e))
        : [],
      POL: isSet(object.POL) ? ProtocolOwnedLiquidity.fromJSON(object.POL) : undefined,
      loans: globalThis.Array.isArray(object?.loans)
        ? object.loans.map((e: any) => Loan.fromJSON(e))
        : [],
      streamingSwaps: globalThis.Array.isArray(object?.streamingSwaps)
        ? object.streamingSwaps.map((e: any) => StreamingSwap.fromJSON(e))
        : [],
      swapQueueItems: globalThis.Array.isArray(object?.swapQueueItems)
        ? object.swapQueueItems.map((e: any) => MsgSwap.fromJSON(e))
        : [],
    };
  },

  toJSON(message: GenesisState): unknown {
    const obj: any = {};
    if (message.pools?.length) {
      obj.pools = message.pools.map((e) => Pool.toJSON(e));
    }
    if (message.liquidityProviders?.length) {
      obj.liquidityProviders = message.liquidityProviders.map((e) => LiquidityProvider.toJSON(e));
    }
    if (message.observedTxInVoters?.length) {
      obj.observedTxInVoters = message.observedTxInVoters.map((e) => ObservedTxVoter.toJSON(e));
    }
    if (message.observedTxOutVoters?.length) {
      obj.observedTxOutVoters = message.observedTxOutVoters.map((e) => ObservedTxVoter.toJSON(e));
    }
    if (message.txOuts?.length) {
      obj.txOuts = message.txOuts.map((e) => TxOut.toJSON(e));
    }
    if (message.nodeAccounts?.length) {
      obj.nodeAccounts = message.nodeAccounts.map((e) => NodeAccount.toJSON(e));
    }
    if (message.vaults?.length) {
      obj.vaults = message.vaults.map((e) => Vault.toJSON(e));
    }
    if (!message.reserve.isZero()) {
      obj.reserve = (message.reserve || Long.UZERO).toString();
    }
    if (!message.lastSignedHeight.isZero()) {
      obj.lastSignedHeight = (message.lastSignedHeight || Long.ZERO).toString();
    }
    if (message.lastChainHeights?.length) {
      obj.lastChainHeights = message.lastChainHeights.map((e) => lastChainHeight.toJSON(e));
    }
    if (message.reserveContributors?.length) {
      obj.reserveContributors = message.reserveContributors.map((e) => ReserveContributor.toJSON(e));
    }
    if (message.network !== undefined) {
      obj.network = Network.toJSON(message.network);
    }
    if (message.orderbookItems?.length) {
      obj.orderbookItems = message.orderbookItems.map((e) => MsgSwap.toJSON(e));
    }
    if (message.networkFees?.length) {
      obj.networkFees = message.networkFees.map((e) => NetworkFee.toJSON(e));
    }
    if (message.chainContracts?.length) {
      obj.chainContracts = message.chainContracts.map((e) => ChainContract.toJSON(e));
    }
    if (message.THORNames?.length) {
      obj.THORNames = message.THORNames.map((e) => THORName.toJSON(e));
    }
    if (message.mimirs?.length) {
      obj.mimirs = message.mimirs.map((e) => mimir.toJSON(e));
    }
    if (!message.storeVersion.isZero()) {
      obj.storeVersion = (message.storeVersion || Long.ZERO).toString();
    }
    if (message.bondProviders?.length) {
      obj.bondProviders = message.bondProviders.map((e) => BondProviders.toJSON(e));
    }
    if (message.POL !== undefined) {
      obj.POL = ProtocolOwnedLiquidity.toJSON(message.POL);
    }
    if (message.loans?.length) {
      obj.loans = message.loans.map((e) => Loan.toJSON(e));
    }
    if (message.streamingSwaps?.length) {
      obj.streamingSwaps = message.streamingSwaps.map((e) => StreamingSwap.toJSON(e));
    }
    if (message.swapQueueItems?.length) {
      obj.swapQueueItems = message.swapQueueItems.map((e) => MsgSwap.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GenesisState>, I>>(base?: I): GenesisState {
    return GenesisState.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GenesisState>, I>>(object: I): GenesisState {
    const message = createBaseGenesisState();
    message.pools = object.pools?.map((e) => Pool.fromPartial(e)) || [];
    message.liquidityProviders = object.liquidityProviders?.map((e) => LiquidityProvider.fromPartial(e)) || [];
    message.observedTxInVoters = object.observedTxInVoters?.map((e) => ObservedTxVoter.fromPartial(e)) || [];
    message.observedTxOutVoters = object.observedTxOutVoters?.map((e) => ObservedTxVoter.fromPartial(e)) || [];
    message.txOuts = object.txOuts?.map((e) => TxOut.fromPartial(e)) || [];
    message.nodeAccounts = object.nodeAccounts?.map((e) => NodeAccount.fromPartial(e)) || [];
    message.vaults = object.vaults?.map((e) => Vault.fromPartial(e)) || [];
    message.reserve = (object.reserve !== undefined && object.reserve !== null)
      ? Long.fromValue(object.reserve)
      : Long.UZERO;
    message.lastSignedHeight = (object.lastSignedHeight !== undefined && object.lastSignedHeight !== null)
      ? Long.fromValue(object.lastSignedHeight)
      : Long.ZERO;
    message.lastChainHeights = object.lastChainHeights?.map((e) => lastChainHeight.fromPartial(e)) || [];
    message.reserveContributors = object.reserveContributors?.map((e) => ReserveContributor.fromPartial(e)) || [];
    message.network = (object.network !== undefined && object.network !== null)
      ? Network.fromPartial(object.network)
      : undefined;
    message.orderbookItems = object.orderbookItems?.map((e) => MsgSwap.fromPartial(e)) || [];
    message.networkFees = object.networkFees?.map((e) => NetworkFee.fromPartial(e)) || [];
    message.chainContracts = object.chainContracts?.map((e) => ChainContract.fromPartial(e)) || [];
    message.THORNames = object.THORNames?.map((e) => THORName.fromPartial(e)) || [];
    message.mimirs = object.mimirs?.map((e) => mimir.fromPartial(e)) || [];
    message.storeVersion = (object.storeVersion !== undefined && object.storeVersion !== null)
      ? Long.fromValue(object.storeVersion)
      : Long.ZERO;
    message.bondProviders = object.bondProviders?.map((e) => BondProviders.fromPartial(e)) || [];
    message.POL = (object.POL !== undefined && object.POL !== null)
      ? ProtocolOwnedLiquidity.fromPartial(object.POL)
      : undefined;
    message.loans = object.loans?.map((e) => Loan.fromPartial(e)) || [];
    message.streamingSwaps = object.streamingSwaps?.map((e) => StreamingSwap.fromPartial(e)) || [];
    message.swapQueueItems = object.swapQueueItems?.map((e) => MsgSwap.fromPartial(e)) || [];
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Long ? string | number | Long : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
