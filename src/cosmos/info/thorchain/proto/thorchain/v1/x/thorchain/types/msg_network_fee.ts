/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface MsgNetworkFee {
  blockHeight: Long;
  chain: string;
  transactionSize: Long;
  transactionFeeRate: Long;
  signer: Uint8Array;
}

function createBaseMsgNetworkFee(): MsgNetworkFee {
  return {
    blockHeight: Long.ZERO,
    chain: "",
    transactionSize: Long.UZERO,
    transactionFeeRate: Long.UZERO,
    signer: new Uint8Array(0),
  };
}

export const MsgNetworkFee = {
  encode(message: MsgNetworkFee, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.blockHeight.isZero()) {
      writer.uint32(8).int64(message.blockHeight);
    }
    if (message.chain !== "") {
      writer.uint32(18).string(message.chain);
    }
    if (!message.transactionSize.isZero()) {
      writer.uint32(24).uint64(message.transactionSize);
    }
    if (!message.transactionFeeRate.isZero()) {
      writer.uint32(32).uint64(message.transactionFeeRate);
    }
    if (message.signer.length !== 0) {
      writer.uint32(42).bytes(message.signer);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgNetworkFee {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgNetworkFee();
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

          message.chain = reader.string();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.transactionSize = reader.uint64() as Long;
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.transactionFeeRate = reader.uint64() as Long;
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.signer = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgNetworkFee {
    return {
      blockHeight: isSet(object.blockHeight) ? Long.fromValue(object.blockHeight) : Long.ZERO,
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      transactionSize: isSet(object.transactionSize) ? Long.fromValue(object.transactionSize) : Long.UZERO,
      transactionFeeRate: isSet(object.transactionFeeRate) ? Long.fromValue(object.transactionFeeRate) : Long.UZERO,
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
    };
  },

  toJSON(message: MsgNetworkFee): unknown {
    const obj: any = {};
    if (!message.blockHeight.isZero()) {
      obj.blockHeight = (message.blockHeight || Long.ZERO).toString();
    }
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (!message.transactionSize.isZero()) {
      obj.transactionSize = (message.transactionSize || Long.UZERO).toString();
    }
    if (!message.transactionFeeRate.isZero()) {
      obj.transactionFeeRate = (message.transactionFeeRate || Long.UZERO).toString();
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgNetworkFee>, I>>(base?: I): MsgNetworkFee {
    return MsgNetworkFee.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgNetworkFee>, I>>(object: I): MsgNetworkFee {
    const message = createBaseMsgNetworkFee();
    message.blockHeight = (object.blockHeight !== undefined && object.blockHeight !== null)
      ? Long.fromValue(object.blockHeight)
      : Long.ZERO;
    message.chain = object.chain ?? "";
    message.transactionSize = (object.transactionSize !== undefined && object.transactionSize !== null)
      ? Long.fromValue(object.transactionSize)
      : Long.UZERO;
    message.transactionFeeRate = (object.transactionFeeRate !== undefined && object.transactionFeeRate !== null)
      ? Long.fromValue(object.transactionFeeRate)
      : Long.UZERO;
    message.signer = object.signer ?? new Uint8Array(0);
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
