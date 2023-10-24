/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface ObservedNetworkFeeVoter {
  blockHeight: Long;
  reportBlockHeight: Long;
  chain: string;
  signers: string[];
  feeRate: Long;
}

function createBaseObservedNetworkFeeVoter(): ObservedNetworkFeeVoter {
  return { blockHeight: Long.ZERO, reportBlockHeight: Long.ZERO, chain: "", signers: [], feeRate: Long.ZERO };
}

export const ObservedNetworkFeeVoter = {
  encode(message: ObservedNetworkFeeVoter, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.blockHeight.isZero()) {
      writer.uint32(8).int64(message.blockHeight);
    }
    if (!message.reportBlockHeight.isZero()) {
      writer.uint32(16).int64(message.reportBlockHeight);
    }
    if (message.chain !== "") {
      writer.uint32(26).string(message.chain);
    }
    for (const v of message.signers) {
      writer.uint32(34).string(v!);
    }
    if (!message.feeRate.isZero()) {
      writer.uint32(40).int64(message.feeRate);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ObservedNetworkFeeVoter {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseObservedNetworkFeeVoter();
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
          if (tag !== 16) {
            break;
          }

          message.reportBlockHeight = reader.int64() as Long;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.chain = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.signers.push(reader.string());
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.feeRate = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ObservedNetworkFeeVoter {
    return {
      blockHeight: isSet(object.blockHeight) ? Long.fromValue(object.blockHeight) : Long.ZERO,
      reportBlockHeight: isSet(object.reportBlockHeight) ? Long.fromValue(object.reportBlockHeight) : Long.ZERO,
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      signers: globalThis.Array.isArray(object?.signers) ? object.signers.map((e: any) => globalThis.String(e)) : [],
      feeRate: isSet(object.feeRate) ? Long.fromValue(object.feeRate) : Long.ZERO,
    };
  },

  toJSON(message: ObservedNetworkFeeVoter): unknown {
    const obj: any = {};
    if (!message.blockHeight.isZero()) {
      obj.blockHeight = (message.blockHeight || Long.ZERO).toString();
    }
    if (!message.reportBlockHeight.isZero()) {
      obj.reportBlockHeight = (message.reportBlockHeight || Long.ZERO).toString();
    }
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (message.signers?.length) {
      obj.signers = message.signers;
    }
    if (!message.feeRate.isZero()) {
      obj.feeRate = (message.feeRate || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ObservedNetworkFeeVoter>, I>>(base?: I): ObservedNetworkFeeVoter {
    return ObservedNetworkFeeVoter.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ObservedNetworkFeeVoter>, I>>(object: I): ObservedNetworkFeeVoter {
    const message = createBaseObservedNetworkFeeVoter();
    message.blockHeight = (object.blockHeight !== undefined && object.blockHeight !== null)
      ? Long.fromValue(object.blockHeight)
      : Long.ZERO;
    message.reportBlockHeight = (object.reportBlockHeight !== undefined && object.reportBlockHeight !== null)
      ? Long.fromValue(object.reportBlockHeight)
      : Long.ZERO;
    message.chain = object.chain ?? "";
    message.signers = object.signers?.map((e) => e) || [];
    message.feeRate = (object.feeRate !== undefined && object.feeRate !== null)
      ? Long.fromValue(object.feeRate)
      : Long.ZERO;
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
