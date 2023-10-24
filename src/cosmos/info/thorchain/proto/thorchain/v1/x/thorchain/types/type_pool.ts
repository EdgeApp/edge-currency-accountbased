/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset } from "../../../common/common";

export const protobufPackage = "types";

/**
 * |    State    | Swap | Add   | Withdraw  | Refunding |
 * | ----------- | ---- | ----- | --------- | --------- |
 * | `staged`    | no   | yes   | yes       | Refund Invalid Add/Remove Liquidity && all Swaps |
 * | `available` | yes  | yes   | yes       | Refund Invalid Tx |
 * | `suspended` | no   | no    | no        | Refund all |
 */
export enum PoolStatus {
  UnknownPoolStatus = 0,
  Available = 1,
  Staged = 2,
  Suspended = 3,
  UNRECOGNIZED = -1,
}

export function poolStatusFromJSON(object: any): PoolStatus {
  switch (object) {
    case 0:
    case "UnknownPoolStatus":
      return PoolStatus.UnknownPoolStatus;
    case 1:
    case "Available":
      return PoolStatus.Available;
    case 2:
    case "Staged":
      return PoolStatus.Staged;
    case 3:
    case "Suspended":
      return PoolStatus.Suspended;
    case -1:
    case "UNRECOGNIZED":
    default:
      return PoolStatus.UNRECOGNIZED;
  }
}

export function poolStatusToJSON(object: PoolStatus): string {
  switch (object) {
    case PoolStatus.UnknownPoolStatus:
      return "UnknownPoolStatus";
    case PoolStatus.Available:
      return "Available";
    case PoolStatus.Staged:
      return "Staged";
    case PoolStatus.Suspended:
      return "Suspended";
    case PoolStatus.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface Pool {
  balanceRune: string;
  balanceAsset: string;
  asset?: Asset | undefined;
  LPUnits: string;
  status: PoolStatus;
  statusSince: Long;
  decimals: Long;
  synthUnits: string;
  pendingInboundRune: string;
  pendingInboundAsset: string;
}

function createBasePool(): Pool {
  return {
    balanceRune: "",
    balanceAsset: "",
    asset: undefined,
    LPUnits: "",
    status: 0,
    statusSince: Long.ZERO,
    decimals: Long.ZERO,
    synthUnits: "",
    pendingInboundRune: "",
    pendingInboundAsset: "",
  };
}

export const Pool = {
  encode(message: Pool, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.balanceRune !== "") {
      writer.uint32(10).string(message.balanceRune);
    }
    if (message.balanceAsset !== "") {
      writer.uint32(18).string(message.balanceAsset);
    }
    if (message.asset !== undefined) {
      Asset.encode(message.asset, writer.uint32(26).fork()).ldelim();
    }
    if (message.LPUnits !== "") {
      writer.uint32(34).string(message.LPUnits);
    }
    if (message.status !== 0) {
      writer.uint32(40).int32(message.status);
    }
    if (!message.statusSince.isZero()) {
      writer.uint32(80).int64(message.statusSince);
    }
    if (!message.decimals.isZero()) {
      writer.uint32(48).int64(message.decimals);
    }
    if (message.synthUnits !== "") {
      writer.uint32(58).string(message.synthUnits);
    }
    if (message.pendingInboundRune !== "") {
      writer.uint32(66).string(message.pendingInboundRune);
    }
    if (message.pendingInboundAsset !== "") {
      writer.uint32(74).string(message.pendingInboundAsset);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Pool {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.balanceRune = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.balanceAsset = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.asset = Asset.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.LPUnits = reader.string();
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.status = reader.int32() as any;
          continue;
        case 10:
          if (tag !== 80) {
            break;
          }

          message.statusSince = reader.int64() as Long;
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.decimals = reader.int64() as Long;
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.synthUnits = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.pendingInboundRune = reader.string();
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.pendingInboundAsset = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Pool {
    return {
      balanceRune: isSet(object.balanceRune) ? globalThis.String(object.balanceRune) : "",
      balanceAsset: isSet(object.balanceAsset) ? globalThis.String(object.balanceAsset) : "",
      asset: isSet(object.asset) ? Asset.fromJSON(object.asset) : undefined,
      LPUnits: isSet(object.LPUnits) ? globalThis.String(object.LPUnits) : "",
      status: isSet(object.status) ? poolStatusFromJSON(object.status) : 0,
      statusSince: isSet(object.statusSince) ? Long.fromValue(object.statusSince) : Long.ZERO,
      decimals: isSet(object.decimals) ? Long.fromValue(object.decimals) : Long.ZERO,
      synthUnits: isSet(object.synthUnits) ? globalThis.String(object.synthUnits) : "",
      pendingInboundRune: isSet(object.pendingInboundRune) ? globalThis.String(object.pendingInboundRune) : "",
      pendingInboundAsset: isSet(object.pendingInboundAsset) ? globalThis.String(object.pendingInboundAsset) : "",
    };
  },

  toJSON(message: Pool): unknown {
    const obj: any = {};
    if (message.balanceRune !== "") {
      obj.balanceRune = message.balanceRune;
    }
    if (message.balanceAsset !== "") {
      obj.balanceAsset = message.balanceAsset;
    }
    if (message.asset !== undefined) {
      obj.asset = Asset.toJSON(message.asset);
    }
    if (message.LPUnits !== "") {
      obj.LPUnits = message.LPUnits;
    }
    if (message.status !== 0) {
      obj.status = poolStatusToJSON(message.status);
    }
    if (!message.statusSince.isZero()) {
      obj.statusSince = (message.statusSince || Long.ZERO).toString();
    }
    if (!message.decimals.isZero()) {
      obj.decimals = (message.decimals || Long.ZERO).toString();
    }
    if (message.synthUnits !== "") {
      obj.synthUnits = message.synthUnits;
    }
    if (message.pendingInboundRune !== "") {
      obj.pendingInboundRune = message.pendingInboundRune;
    }
    if (message.pendingInboundAsset !== "") {
      obj.pendingInboundAsset = message.pendingInboundAsset;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Pool>, I>>(base?: I): Pool {
    return Pool.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Pool>, I>>(object: I): Pool {
    const message = createBasePool();
    message.balanceRune = object.balanceRune ?? "";
    message.balanceAsset = object.balanceAsset ?? "";
    message.asset = (object.asset !== undefined && object.asset !== null) ? Asset.fromPartial(object.asset) : undefined;
    message.LPUnits = object.LPUnits ?? "";
    message.status = object.status ?? 0;
    message.statusSince = (object.statusSince !== undefined && object.statusSince !== null)
      ? Long.fromValue(object.statusSince)
      : Long.ZERO;
    message.decimals = (object.decimals !== undefined && object.decimals !== null)
      ? Long.fromValue(object.decimals)
      : Long.ZERO;
    message.synthUnits = object.synthUnits ?? "";
    message.pendingInboundRune = object.pendingInboundRune ?? "";
    message.pendingInboundAsset = object.pendingInboundAsset ?? "";
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
