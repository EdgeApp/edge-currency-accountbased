/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset, Tx } from "../../../common/common";

export const protobufPackage = "types";

export enum OrderType {
  market = 0,
  limit = 1,
  UNRECOGNIZED = -1,
}

export function orderTypeFromJSON(object: any): OrderType {
  switch (object) {
    case 0:
    case "market":
      return OrderType.market;
    case 1:
    case "limit":
      return OrderType.limit;
    case -1:
    case "UNRECOGNIZED":
    default:
      return OrderType.UNRECOGNIZED;
  }
}

export function orderTypeToJSON(object: OrderType): string {
  switch (object) {
    case OrderType.market:
      return "market";
    case OrderType.limit:
      return "limit";
    case OrderType.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface MsgSwap {
  tx?: Tx | undefined;
  targetAsset?: Asset | undefined;
  destination: string;
  tradeTarget: string;
  affiliateAddress: string;
  affiliateBasisPoints: string;
  signer: Uint8Array;
  aggregator: string;
  aggregatorTargetAddress: string;
  aggregatorTargetLimit: string;
  orderType: OrderType;
  streamQuantity: Long;
  streamInterval: Long;
}

function createBaseMsgSwap(): MsgSwap {
  return {
    tx: undefined,
    targetAsset: undefined,
    destination: "",
    tradeTarget: "",
    affiliateAddress: "",
    affiliateBasisPoints: "",
    signer: new Uint8Array(0),
    aggregator: "",
    aggregatorTargetAddress: "",
    aggregatorTargetLimit: "",
    orderType: 0,
    streamQuantity: Long.UZERO,
    streamInterval: Long.UZERO,
  };
}

export const MsgSwap = {
  encode(message: MsgSwap, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(10).fork()).ldelim();
    }
    if (message.targetAsset !== undefined) {
      Asset.encode(message.targetAsset, writer.uint32(18).fork()).ldelim();
    }
    if (message.destination !== "") {
      writer.uint32(26).string(message.destination);
    }
    if (message.tradeTarget !== "") {
      writer.uint32(34).string(message.tradeTarget);
    }
    if (message.affiliateAddress !== "") {
      writer.uint32(42).string(message.affiliateAddress);
    }
    if (message.affiliateBasisPoints !== "") {
      writer.uint32(50).string(message.affiliateBasisPoints);
    }
    if (message.signer.length !== 0) {
      writer.uint32(58).bytes(message.signer);
    }
    if (message.aggregator !== "") {
      writer.uint32(66).string(message.aggregator);
    }
    if (message.aggregatorTargetAddress !== "") {
      writer.uint32(74).string(message.aggregatorTargetAddress);
    }
    if (message.aggregatorTargetLimit !== "") {
      writer.uint32(82).string(message.aggregatorTargetLimit);
    }
    if (message.orderType !== 0) {
      writer.uint32(88).int32(message.orderType);
    }
    if (!message.streamQuantity.isZero()) {
      writer.uint32(96).uint64(message.streamQuantity);
    }
    if (!message.streamInterval.isZero()) {
      writer.uint32(104).uint64(message.streamInterval);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgSwap {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSwap();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.tx = Tx.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.targetAsset = Asset.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.destination = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.tradeTarget = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.affiliateAddress = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.affiliateBasisPoints = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.signer = reader.bytes();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.aggregator = reader.string();
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.aggregatorTargetAddress = reader.string();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.aggregatorTargetLimit = reader.string();
          continue;
        case 11:
          if (tag !== 88) {
            break;
          }

          message.orderType = reader.int32() as any;
          continue;
        case 12:
          if (tag !== 96) {
            break;
          }

          message.streamQuantity = reader.uint64() as Long;
          continue;
        case 13:
          if (tag !== 104) {
            break;
          }

          message.streamInterval = reader.uint64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgSwap {
    return {
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
      targetAsset: isSet(object.targetAsset) ? Asset.fromJSON(object.targetAsset) : undefined,
      destination: isSet(object.destination) ? globalThis.String(object.destination) : "",
      tradeTarget: isSet(object.tradeTarget) ? globalThis.String(object.tradeTarget) : "",
      affiliateAddress: isSet(object.affiliateAddress) ? globalThis.String(object.affiliateAddress) : "",
      affiliateBasisPoints: isSet(object.affiliateBasisPoints) ? globalThis.String(object.affiliateBasisPoints) : "",
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
      aggregator: isSet(object.aggregator) ? globalThis.String(object.aggregator) : "",
      aggregatorTargetAddress: isSet(object.aggregatorTargetAddress)
        ? globalThis.String(object.aggregatorTargetAddress)
        : "",
      aggregatorTargetLimit: isSet(object.aggregatorTargetLimit) ? globalThis.String(object.aggregatorTargetLimit) : "",
      orderType: isSet(object.orderType) ? orderTypeFromJSON(object.orderType) : 0,
      streamQuantity: isSet(object.streamQuantity) ? Long.fromValue(object.streamQuantity) : Long.UZERO,
      streamInterval: isSet(object.streamInterval) ? Long.fromValue(object.streamInterval) : Long.UZERO,
    };
  },

  toJSON(message: MsgSwap): unknown {
    const obj: any = {};
    if (message.tx !== undefined) {
      obj.tx = Tx.toJSON(message.tx);
    }
    if (message.targetAsset !== undefined) {
      obj.targetAsset = Asset.toJSON(message.targetAsset);
    }
    if (message.destination !== "") {
      obj.destination = message.destination;
    }
    if (message.tradeTarget !== "") {
      obj.tradeTarget = message.tradeTarget;
    }
    if (message.affiliateAddress !== "") {
      obj.affiliateAddress = message.affiliateAddress;
    }
    if (message.affiliateBasisPoints !== "") {
      obj.affiliateBasisPoints = message.affiliateBasisPoints;
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    if (message.aggregator !== "") {
      obj.aggregator = message.aggregator;
    }
    if (message.aggregatorTargetAddress !== "") {
      obj.aggregatorTargetAddress = message.aggregatorTargetAddress;
    }
    if (message.aggregatorTargetLimit !== "") {
      obj.aggregatorTargetLimit = message.aggregatorTargetLimit;
    }
    if (message.orderType !== 0) {
      obj.orderType = orderTypeToJSON(message.orderType);
    }
    if (!message.streamQuantity.isZero()) {
      obj.streamQuantity = (message.streamQuantity || Long.UZERO).toString();
    }
    if (!message.streamInterval.isZero()) {
      obj.streamInterval = (message.streamInterval || Long.UZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgSwap>, I>>(base?: I): MsgSwap {
    return MsgSwap.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgSwap>, I>>(object: I): MsgSwap {
    const message = createBaseMsgSwap();
    message.tx = (object.tx !== undefined && object.tx !== null) ? Tx.fromPartial(object.tx) : undefined;
    message.targetAsset = (object.targetAsset !== undefined && object.targetAsset !== null)
      ? Asset.fromPartial(object.targetAsset)
      : undefined;
    message.destination = object.destination ?? "";
    message.tradeTarget = object.tradeTarget ?? "";
    message.affiliateAddress = object.affiliateAddress ?? "";
    message.affiliateBasisPoints = object.affiliateBasisPoints ?? "";
    message.signer = object.signer ?? new Uint8Array(0);
    message.aggregator = object.aggregator ?? "";
    message.aggregatorTargetAddress = object.aggregatorTargetAddress ?? "";
    message.aggregatorTargetLimit = object.aggregatorTargetLimit ?? "";
    message.orderType = object.orderType ?? 0;
    message.streamQuantity = (object.streamQuantity !== undefined && object.streamQuantity !== null)
      ? Long.fromValue(object.streamQuantity)
      : Long.UZERO;
    message.streamInterval = (object.streamInterval !== undefined && object.streamInterval !== null)
      ? Long.fromValue(object.streamInterval)
      : Long.UZERO;
    return message;
  },
};

function bytesFromBase64(b64: string): Uint8Array {
  if (globalThis.Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(b64, "base64"));
  } else {
    const bin = globalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(globalThis.String.fromCharCode(byte));
    });
    return globalThis.btoa(bin.join(""));
  }
}

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
