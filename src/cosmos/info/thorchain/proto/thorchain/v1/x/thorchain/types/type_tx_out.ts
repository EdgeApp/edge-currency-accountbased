/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Coin } from "../../../common/common";

export const protobufPackage = "types";

export interface TxOutItem {
  chain: string;
  toAddress: string;
  vaultPubKey: string;
  coin?: Coin | undefined;
  memo: string;
  maxGas: Coin[];
  gasRate: Long;
  inHash: string;
  outHash: string;
  moduleName: string;
  aggregator: string;
  aggregatorTargetAsset: string;
  aggregatorTargetLimit: string;
}

export interface TxOut {
  height: Long;
  txArray: TxOutItem[];
}

function createBaseTxOutItem(): TxOutItem {
  return {
    chain: "",
    toAddress: "",
    vaultPubKey: "",
    coin: undefined,
    memo: "",
    maxGas: [],
    gasRate: Long.ZERO,
    inHash: "",
    outHash: "",
    moduleName: "",
    aggregator: "",
    aggregatorTargetAsset: "",
    aggregatorTargetLimit: "",
  };
}

export const TxOutItem = {
  encode(message: TxOutItem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.chain !== "") {
      writer.uint32(10).string(message.chain);
    }
    if (message.toAddress !== "") {
      writer.uint32(18).string(message.toAddress);
    }
    if (message.vaultPubKey !== "") {
      writer.uint32(26).string(message.vaultPubKey);
    }
    if (message.coin !== undefined) {
      Coin.encode(message.coin, writer.uint32(34).fork()).ldelim();
    }
    if (message.memo !== "") {
      writer.uint32(42).string(message.memo);
    }
    for (const v of message.maxGas) {
      Coin.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    if (!message.gasRate.isZero()) {
      writer.uint32(56).int64(message.gasRate);
    }
    if (message.inHash !== "") {
      writer.uint32(66).string(message.inHash);
    }
    if (message.outHash !== "") {
      writer.uint32(74).string(message.outHash);
    }
    if (message.moduleName !== "") {
      writer.uint32(82).string(message.moduleName);
    }
    if (message.aggregator !== "") {
      writer.uint32(90).string(message.aggregator);
    }
    if (message.aggregatorTargetAsset !== "") {
      writer.uint32(98).string(message.aggregatorTargetAsset);
    }
    if (message.aggregatorTargetLimit !== "") {
      writer.uint32(106).string(message.aggregatorTargetLimit);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TxOutItem {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxOutItem();
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
          if (tag !== 18) {
            break;
          }

          message.toAddress = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.vaultPubKey = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.coin = Coin.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.memo = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.maxGas.push(Coin.decode(reader, reader.uint32()));
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.gasRate = reader.int64() as Long;
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.inHash = reader.string();
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.outHash = reader.string();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.moduleName = reader.string();
          continue;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.aggregator = reader.string();
          continue;
        case 12:
          if (tag !== 98) {
            break;
          }

          message.aggregatorTargetAsset = reader.string();
          continue;
        case 13:
          if (tag !== 106) {
            break;
          }

          message.aggregatorTargetLimit = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TxOutItem {
    return {
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      toAddress: isSet(object.toAddress) ? globalThis.String(object.toAddress) : "",
      vaultPubKey: isSet(object.vaultPubKey) ? globalThis.String(object.vaultPubKey) : "",
      coin: isSet(object.coin) ? Coin.fromJSON(object.coin) : undefined,
      memo: isSet(object.memo) ? globalThis.String(object.memo) : "",
      maxGas: globalThis.Array.isArray(object?.maxGas) ? object.maxGas.map((e: any) => Coin.fromJSON(e)) : [],
      gasRate: isSet(object.gasRate) ? Long.fromValue(object.gasRate) : Long.ZERO,
      inHash: isSet(object.inHash) ? globalThis.String(object.inHash) : "",
      outHash: isSet(object.outHash) ? globalThis.String(object.outHash) : "",
      moduleName: isSet(object["-"]) ? globalThis.String(object["-"]) : "",
      aggregator: isSet(object.aggregator) ? globalThis.String(object.aggregator) : "",
      aggregatorTargetAsset: isSet(object.aggregatorTargetAsset) ? globalThis.String(object.aggregatorTargetAsset) : "",
      aggregatorTargetLimit: isSet(object.aggregatorTargetLimit) ? globalThis.String(object.aggregatorTargetLimit) : "",
    };
  },

  toJSON(message: TxOutItem): unknown {
    const obj: any = {};
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (message.toAddress !== "") {
      obj.toAddress = message.toAddress;
    }
    if (message.vaultPubKey !== "") {
      obj.vaultPubKey = message.vaultPubKey;
    }
    if (message.coin !== undefined) {
      obj.coin = Coin.toJSON(message.coin);
    }
    if (message.memo !== "") {
      obj.memo = message.memo;
    }
    if (message.maxGas?.length) {
      obj.maxGas = message.maxGas.map((e) => Coin.toJSON(e));
    }
    if (!message.gasRate.isZero()) {
      obj.gasRate = (message.gasRate || Long.ZERO).toString();
    }
    if (message.inHash !== "") {
      obj.inHash = message.inHash;
    }
    if (message.outHash !== "") {
      obj.outHash = message.outHash;
    }
    if (message.moduleName !== "") {
      obj["-"] = message.moduleName;
    }
    if (message.aggregator !== "") {
      obj.aggregator = message.aggregator;
    }
    if (message.aggregatorTargetAsset !== "") {
      obj.aggregatorTargetAsset = message.aggregatorTargetAsset;
    }
    if (message.aggregatorTargetLimit !== "") {
      obj.aggregatorTargetLimit = message.aggregatorTargetLimit;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TxOutItem>, I>>(base?: I): TxOutItem {
    return TxOutItem.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<TxOutItem>, I>>(object: I): TxOutItem {
    const message = createBaseTxOutItem();
    message.chain = object.chain ?? "";
    message.toAddress = object.toAddress ?? "";
    message.vaultPubKey = object.vaultPubKey ?? "";
    message.coin = (object.coin !== undefined && object.coin !== null) ? Coin.fromPartial(object.coin) : undefined;
    message.memo = object.memo ?? "";
    message.maxGas = object.maxGas?.map((e) => Coin.fromPartial(e)) || [];
    message.gasRate = (object.gasRate !== undefined && object.gasRate !== null)
      ? Long.fromValue(object.gasRate)
      : Long.ZERO;
    message.inHash = object.inHash ?? "";
    message.outHash = object.outHash ?? "";
    message.moduleName = object.moduleName ?? "";
    message.aggregator = object.aggregator ?? "";
    message.aggregatorTargetAsset = object.aggregatorTargetAsset ?? "";
    message.aggregatorTargetLimit = object.aggregatorTargetLimit ?? "";
    return message;
  },
};

function createBaseTxOut(): TxOut {
  return { height: Long.ZERO, txArray: [] };
}

export const TxOut = {
  encode(message: TxOut, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.height.isZero()) {
      writer.uint32(8).int64(message.height);
    }
    for (const v of message.txArray) {
      TxOutItem.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TxOut {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxOut();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.height = reader.int64() as Long;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.txArray.push(TxOutItem.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TxOut {
    return {
      height: isSet(object.height) ? Long.fromValue(object.height) : Long.ZERO,
      txArray: globalThis.Array.isArray(object?.txArray) ? object.txArray.map((e: any) => TxOutItem.fromJSON(e)) : [],
    };
  },

  toJSON(message: TxOut): unknown {
    const obj: any = {};
    if (!message.height.isZero()) {
      obj.height = (message.height || Long.ZERO).toString();
    }
    if (message.txArray?.length) {
      obj.txArray = message.txArray.map((e) => TxOutItem.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TxOut>, I>>(base?: I): TxOut {
    return TxOut.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<TxOut>, I>>(object: I): TxOut {
    const message = createBaseTxOut();
    message.height = (object.height !== undefined && object.height !== null)
      ? Long.fromValue(object.height)
      : Long.ZERO;
    message.txArray = object.txArray?.map((e) => TxOutItem.fromPartial(e)) || [];
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
