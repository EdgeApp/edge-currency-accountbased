/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Coin } from "../../../common/common";
import { ChainContract } from "./type_chain_contract";

export const protobufPackage = "types";

export enum VaultType {
  UnknownVault = 0,
  AsgardVault = 1,
  YggdrasilVault = 2,
  UNRECOGNIZED = -1,
}

export function vaultTypeFromJSON(object: any): VaultType {
  switch (object) {
    case 0:
    case "UnknownVault":
      return VaultType.UnknownVault;
    case 1:
    case "AsgardVault":
      return VaultType.AsgardVault;
    case 2:
    case "YggdrasilVault":
      return VaultType.YggdrasilVault;
    case -1:
    case "UNRECOGNIZED":
    default:
      return VaultType.UNRECOGNIZED;
  }
}

export function vaultTypeToJSON(object: VaultType): string {
  switch (object) {
    case VaultType.UnknownVault:
      return "UnknownVault";
    case VaultType.AsgardVault:
      return "AsgardVault";
    case VaultType.YggdrasilVault:
      return "YggdrasilVault";
    case VaultType.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export enum VaultStatus {
  InactiveVault = 0,
  ActiveVault = 1,
  RetiringVault = 2,
  InitVault = 3,
  UNRECOGNIZED = -1,
}

export function vaultStatusFromJSON(object: any): VaultStatus {
  switch (object) {
    case 0:
    case "InactiveVault":
      return VaultStatus.InactiveVault;
    case 1:
    case "ActiveVault":
      return VaultStatus.ActiveVault;
    case 2:
    case "RetiringVault":
      return VaultStatus.RetiringVault;
    case 3:
    case "InitVault":
      return VaultStatus.InitVault;
    case -1:
    case "UNRECOGNIZED":
    default:
      return VaultStatus.UNRECOGNIZED;
  }
}

export function vaultStatusToJSON(object: VaultStatus): string {
  switch (object) {
    case VaultStatus.InactiveVault:
      return "InactiveVault";
    case VaultStatus.ActiveVault:
      return "ActiveVault";
    case VaultStatus.RetiringVault:
      return "RetiringVault";
    case VaultStatus.InitVault:
      return "InitVault";
    case VaultStatus.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface Vault {
  blockHeight: Long;
  pubKey: string;
  coins: Coin[];
  type: VaultType;
  status: VaultStatus;
  statusSince: Long;
  membership: string[];
  chains: string[];
  inboundTxCount: Long;
  outboundTxCount: Long;
  pendingTxBlockHeights: Long[];
  routers: ChainContract[];
  frozen: string[];
}

function createBaseVault(): Vault {
  return {
    blockHeight: Long.ZERO,
    pubKey: "",
    coins: [],
    type: 0,
    status: 0,
    statusSince: Long.ZERO,
    membership: [],
    chains: [],
    inboundTxCount: Long.ZERO,
    outboundTxCount: Long.ZERO,
    pendingTxBlockHeights: [],
    routers: [],
    frozen: [],
  };
}

export const Vault = {
  encode(message: Vault, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.blockHeight.isZero()) {
      writer.uint32(8).int64(message.blockHeight);
    }
    if (message.pubKey !== "") {
      writer.uint32(18).string(message.pubKey);
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.type !== 0) {
      writer.uint32(32).int32(message.type);
    }
    if (message.status !== 0) {
      writer.uint32(40).int32(message.status);
    }
    if (!message.statusSince.isZero()) {
      writer.uint32(48).int64(message.statusSince);
    }
    for (const v of message.membership) {
      writer.uint32(58).string(v!);
    }
    for (const v of message.chains) {
      writer.uint32(66).string(v!);
    }
    if (!message.inboundTxCount.isZero()) {
      writer.uint32(72).int64(message.inboundTxCount);
    }
    if (!message.outboundTxCount.isZero()) {
      writer.uint32(80).int64(message.outboundTxCount);
    }
    writer.uint32(90).fork();
    for (const v of message.pendingTxBlockHeights) {
      writer.int64(v);
    }
    writer.ldelim();
    for (const v of message.routers) {
      ChainContract.encode(v!, writer.uint32(178).fork()).ldelim();
    }
    for (const v of message.frozen) {
      writer.uint32(186).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Vault {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVault();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.blockHeight = reader.int64() as Long;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.pubKey = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.coins.push(Coin.decode(reader, reader.uint32()));
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.type = reader.int32() as any;
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.status = reader.int32() as any;
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.statusSince = reader.int64() as Long;
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.membership.push(reader.string());
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.chains.push(reader.string());
          continue;
        case 9:
          if (tag !== 72) {
            break;
          }

          message.inboundTxCount = reader.int64() as Long;
          continue;
        case 10:
          if (tag !== 80) {
            break;
          }

          message.outboundTxCount = reader.int64() as Long;
          continue;
        case 11:
          if (tag === 88) {
            message.pendingTxBlockHeights.push(reader.int64() as Long);

            continue;
          }

          if (tag === 90) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.pendingTxBlockHeights.push(reader.int64() as Long);
            }

            continue;
          }

          break;
        case 22:
          if (tag !== 178) {
            break;
          }

          message.routers.push(ChainContract.decode(reader, reader.uint32()));
          continue;
        case 23:
          if (tag !== 186) {
            break;
          }

          message.frozen.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Vault {
    return {
      blockHeight: isSet(object.blockHeight) ? Long.fromValue(object.blockHeight) : Long.ZERO,
      pubKey: isSet(object.pubKey) ? globalThis.String(object.pubKey) : "",
      coins: globalThis.Array.isArray(object?.coins) ? object.coins.map((e: any) => Coin.fromJSON(e)) : [],
      type: isSet(object.type) ? vaultTypeFromJSON(object.type) : 0,
      status: isSet(object.status) ? vaultStatusFromJSON(object.status) : 0,
      statusSince: isSet(object.statusSince) ? Long.fromValue(object.statusSince) : Long.ZERO,
      membership: globalThis.Array.isArray(object?.membership)
        ? object.membership.map((e: any) => globalThis.String(e))
        : [],
      chains: globalThis.Array.isArray(object?.chains) ? object.chains.map((e: any) => globalThis.String(e)) : [],
      inboundTxCount: isSet(object.inboundTxCount) ? Long.fromValue(object.inboundTxCount) : Long.ZERO,
      outboundTxCount: isSet(object.outboundTxCount) ? Long.fromValue(object.outboundTxCount) : Long.ZERO,
      pendingTxBlockHeights: globalThis.Array.isArray(object?.pendingTxBlockHeights)
        ? object.pendingTxBlockHeights.map((e: any) => Long.fromValue(e))
        : [],
      routers: globalThis.Array.isArray(object?.routers)
        ? object.routers.map((e: any) => ChainContract.fromJSON(e))
        : [],
      frozen: globalThis.Array.isArray(object?.frozen) ? object.frozen.map((e: any) => globalThis.String(e)) : [],
    };
  },

  toJSON(message: Vault): unknown {
    const obj: any = {};
    if (!message.blockHeight.isZero()) {
      obj.blockHeight = (message.blockHeight || Long.ZERO).toString();
    }
    if (message.pubKey !== "") {
      obj.pubKey = message.pubKey;
    }
    if (message.coins?.length) {
      obj.coins = message.coins.map((e) => Coin.toJSON(e));
    }
    if (message.type !== 0) {
      obj.type = vaultTypeToJSON(message.type);
    }
    if (message.status !== 0) {
      obj.status = vaultStatusToJSON(message.status);
    }
    if (!message.statusSince.isZero()) {
      obj.statusSince = (message.statusSince || Long.ZERO).toString();
    }
    if (message.membership?.length) {
      obj.membership = message.membership;
    }
    if (message.chains?.length) {
      obj.chains = message.chains;
    }
    if (!message.inboundTxCount.isZero()) {
      obj.inboundTxCount = (message.inboundTxCount || Long.ZERO).toString();
    }
    if (!message.outboundTxCount.isZero()) {
      obj.outboundTxCount = (message.outboundTxCount || Long.ZERO).toString();
    }
    if (message.pendingTxBlockHeights?.length) {
      obj.pendingTxBlockHeights = message.pendingTxBlockHeights.map((e) => (e || Long.ZERO).toString());
    }
    if (message.routers?.length) {
      obj.routers = message.routers.map((e) => ChainContract.toJSON(e));
    }
    if (message.frozen?.length) {
      obj.frozen = message.frozen;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Vault>, I>>(base?: I): Vault {
    return Vault.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Vault>, I>>(object: I): Vault {
    const message = createBaseVault();
    message.blockHeight = (object.blockHeight !== undefined && object.blockHeight !== null)
      ? Long.fromValue(object.blockHeight)
      : Long.ZERO;
    message.pubKey = object.pubKey ?? "";
    message.coins = object.coins?.map((e) => Coin.fromPartial(e)) || [];
    message.type = object.type ?? 0;
    message.status = object.status ?? 0;
    message.statusSince = (object.statusSince !== undefined && object.statusSince !== null)
      ? Long.fromValue(object.statusSince)
      : Long.ZERO;
    message.membership = object.membership?.map((e) => e) || [];
    message.chains = object.chains?.map((e) => e) || [];
    message.inboundTxCount = (object.inboundTxCount !== undefined && object.inboundTxCount !== null)
      ? Long.fromValue(object.inboundTxCount)
      : Long.ZERO;
    message.outboundTxCount = (object.outboundTxCount !== undefined && object.outboundTxCount !== null)
      ? Long.fromValue(object.outboundTxCount)
      : Long.ZERO;
    message.pendingTxBlockHeights = object.pendingTxBlockHeights?.map((e) => Long.fromValue(e)) || [];
    message.routers = object.routers?.map((e) => ChainContract.fromPartial(e)) || [];
    message.frozen = object.frozen?.map((e) => e) || [];
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
