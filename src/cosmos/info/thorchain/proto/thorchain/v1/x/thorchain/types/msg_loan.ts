/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset, Coin } from "../../../common/common";

export const protobufPackage = "types";

export interface MsgLoanOpen {
  owner: string;
  collateralAsset?: Asset | undefined;
  collateralAmount: string;
  targetAddress: string;
  targetAsset?: Asset | undefined;
  minOut: string;
  affiliateAddress: string;
  affiliateBasisPoints: string;
  aggregator: string;
  aggregatorTargetAddress: string;
  aggregatorTargetLimit: string;
  signer: Uint8Array;
  txId: string;
}

export interface MsgLoanRepayment {
  owner: string;
  collateralAsset?: Asset | undefined;
  coin?: Coin | undefined;
  minOut: string;
  signer: Uint8Array;
  from: string;
  txId: string;
}

function createBaseMsgLoanOpen(): MsgLoanOpen {
  return {
    owner: "",
    collateralAsset: undefined,
    collateralAmount: "",
    targetAddress: "",
    targetAsset: undefined,
    minOut: "",
    affiliateAddress: "",
    affiliateBasisPoints: "",
    aggregator: "",
    aggregatorTargetAddress: "",
    aggregatorTargetLimit: "",
    signer: new Uint8Array(0),
    txId: "",
  };
}

export const MsgLoanOpen = {
  encode(message: MsgLoanOpen, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.owner !== "") {
      writer.uint32(10).string(message.owner);
    }
    if (message.collateralAsset !== undefined) {
      Asset.encode(message.collateralAsset, writer.uint32(18).fork()).ldelim();
    }
    if (message.collateralAmount !== "") {
      writer.uint32(26).string(message.collateralAmount);
    }
    if (message.targetAddress !== "") {
      writer.uint32(34).string(message.targetAddress);
    }
    if (message.targetAsset !== undefined) {
      Asset.encode(message.targetAsset, writer.uint32(42).fork()).ldelim();
    }
    if (message.minOut !== "") {
      writer.uint32(50).string(message.minOut);
    }
    if (message.affiliateAddress !== "") {
      writer.uint32(58).string(message.affiliateAddress);
    }
    if (message.affiliateBasisPoints !== "") {
      writer.uint32(66).string(message.affiliateBasisPoints);
    }
    if (message.aggregator !== "") {
      writer.uint32(74).string(message.aggregator);
    }
    if (message.aggregatorTargetAddress !== "") {
      writer.uint32(82).string(message.aggregatorTargetAddress);
    }
    if (message.aggregatorTargetLimit !== "") {
      writer.uint32(90).string(message.aggregatorTargetLimit);
    }
    if (message.signer.length !== 0) {
      writer.uint32(98).bytes(message.signer);
    }
    if (message.txId !== "") {
      writer.uint32(106).string(message.txId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgLoanOpen {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLoanOpen();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.owner = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.collateralAsset = Asset.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.collateralAmount = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.targetAddress = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.targetAsset = Asset.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.minOut = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.affiliateAddress = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.affiliateBasisPoints = reader.string();
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.aggregator = reader.string();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.aggregatorTargetAddress = reader.string();
          continue;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.aggregatorTargetLimit = reader.string();
          continue;
        case 12:
          if (tag !== 98) {
            break;
          }

          message.signer = reader.bytes();
          continue;
        case 13:
          if (tag !== 106) {
            break;
          }

          message.txId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgLoanOpen {
    return {
      owner: isSet(object.owner) ? globalThis.String(object.owner) : "",
      collateralAsset: isSet(object.collateralAsset) ? Asset.fromJSON(object.collateralAsset) : undefined,
      collateralAmount: isSet(object.collateralAmount) ? globalThis.String(object.collateralAmount) : "",
      targetAddress: isSet(object.targetAddress) ? globalThis.String(object.targetAddress) : "",
      targetAsset: isSet(object.targetAsset) ? Asset.fromJSON(object.targetAsset) : undefined,
      minOut: isSet(object.minOut) ? globalThis.String(object.minOut) : "",
      affiliateAddress: isSet(object.affiliateAddress) ? globalThis.String(object.affiliateAddress) : "",
      affiliateBasisPoints: isSet(object.affiliateBasisPoints) ? globalThis.String(object.affiliateBasisPoints) : "",
      aggregator: isSet(object.aggregator) ? globalThis.String(object.aggregator) : "",
      aggregatorTargetAddress: isSet(object.aggregatorTargetAddress)
        ? globalThis.String(object.aggregatorTargetAddress)
        : "",
      aggregatorTargetLimit: isSet(object.aggregatorTargetLimit) ? globalThis.String(object.aggregatorTargetLimit) : "",
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
    };
  },

  toJSON(message: MsgLoanOpen): unknown {
    const obj: any = {};
    if (message.owner !== "") {
      obj.owner = message.owner;
    }
    if (message.collateralAsset !== undefined) {
      obj.collateralAsset = Asset.toJSON(message.collateralAsset);
    }
    if (message.collateralAmount !== "") {
      obj.collateralAmount = message.collateralAmount;
    }
    if (message.targetAddress !== "") {
      obj.targetAddress = message.targetAddress;
    }
    if (message.targetAsset !== undefined) {
      obj.targetAsset = Asset.toJSON(message.targetAsset);
    }
    if (message.minOut !== "") {
      obj.minOut = message.minOut;
    }
    if (message.affiliateAddress !== "") {
      obj.affiliateAddress = message.affiliateAddress;
    }
    if (message.affiliateBasisPoints !== "") {
      obj.affiliateBasisPoints = message.affiliateBasisPoints;
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
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgLoanOpen>, I>>(base?: I): MsgLoanOpen {
    return MsgLoanOpen.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgLoanOpen>, I>>(object: I): MsgLoanOpen {
    const message = createBaseMsgLoanOpen();
    message.owner = object.owner ?? "";
    message.collateralAsset = (object.collateralAsset !== undefined && object.collateralAsset !== null)
      ? Asset.fromPartial(object.collateralAsset)
      : undefined;
    message.collateralAmount = object.collateralAmount ?? "";
    message.targetAddress = object.targetAddress ?? "";
    message.targetAsset = (object.targetAsset !== undefined && object.targetAsset !== null)
      ? Asset.fromPartial(object.targetAsset)
      : undefined;
    message.minOut = object.minOut ?? "";
    message.affiliateAddress = object.affiliateAddress ?? "";
    message.affiliateBasisPoints = object.affiliateBasisPoints ?? "";
    message.aggregator = object.aggregator ?? "";
    message.aggregatorTargetAddress = object.aggregatorTargetAddress ?? "";
    message.aggregatorTargetLimit = object.aggregatorTargetLimit ?? "";
    message.signer = object.signer ?? new Uint8Array(0);
    message.txId = object.txId ?? "";
    return message;
  },
};

function createBaseMsgLoanRepayment(): MsgLoanRepayment {
  return {
    owner: "",
    collateralAsset: undefined,
    coin: undefined,
    minOut: "",
    signer: new Uint8Array(0),
    from: "",
    txId: "",
  };
}

export const MsgLoanRepayment = {
  encode(message: MsgLoanRepayment, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.owner !== "") {
      writer.uint32(10).string(message.owner);
    }
    if (message.collateralAsset !== undefined) {
      Asset.encode(message.collateralAsset, writer.uint32(18).fork()).ldelim();
    }
    if (message.coin !== undefined) {
      Coin.encode(message.coin, writer.uint32(26).fork()).ldelim();
    }
    if (message.minOut !== "") {
      writer.uint32(34).string(message.minOut);
    }
    if (message.signer.length !== 0) {
      writer.uint32(42).bytes(message.signer);
    }
    if (message.from !== "") {
      writer.uint32(50).string(message.from);
    }
    if (message.txId !== "") {
      writer.uint32(58).string(message.txId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgLoanRepayment {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLoanRepayment();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.owner = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.collateralAsset = Asset.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.coin = Coin.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.minOut = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.signer = reader.bytes();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.from = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.txId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgLoanRepayment {
    return {
      owner: isSet(object.owner) ? globalThis.String(object.owner) : "",
      collateralAsset: isSet(object.collateralAsset) ? Asset.fromJSON(object.collateralAsset) : undefined,
      coin: isSet(object.coin) ? Coin.fromJSON(object.coin) : undefined,
      minOut: isSet(object.minOut) ? globalThis.String(object.minOut) : "",
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
      from: isSet(object.from) ? globalThis.String(object.from) : "",
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
    };
  },

  toJSON(message: MsgLoanRepayment): unknown {
    const obj: any = {};
    if (message.owner !== "") {
      obj.owner = message.owner;
    }
    if (message.collateralAsset !== undefined) {
      obj.collateralAsset = Asset.toJSON(message.collateralAsset);
    }
    if (message.coin !== undefined) {
      obj.coin = Coin.toJSON(message.coin);
    }
    if (message.minOut !== "") {
      obj.minOut = message.minOut;
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    if (message.from !== "") {
      obj.from = message.from;
    }
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgLoanRepayment>, I>>(base?: I): MsgLoanRepayment {
    return MsgLoanRepayment.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgLoanRepayment>, I>>(object: I): MsgLoanRepayment {
    const message = createBaseMsgLoanRepayment();
    message.owner = object.owner ?? "";
    message.collateralAsset = (object.collateralAsset !== undefined && object.collateralAsset !== null)
      ? Asset.fromPartial(object.collateralAsset)
      : undefined;
    message.coin = (object.coin !== undefined && object.coin !== null) ? Coin.fromPartial(object.coin) : undefined;
    message.minOut = object.minOut ?? "";
    message.signer = object.signer ?? new Uint8Array(0);
    message.from = object.from ?? "";
    message.txId = object.txId ?? "";
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
