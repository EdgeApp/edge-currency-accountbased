/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

/**
 * NetworkFee represent the fee rate and typical transaction size outbound from
 * THORNode This is to keep the information reported by bifrost For BTC chain,
 * TransactionFeeRate should be sats/vbyte For Binance chain , given fee is
 * fixed , thus for single coin , transaction size will be 1, and the rate
 * should be 37500, for multiple coin , Transaction size should the number of
 * coins
 */
export interface NetworkFee {
  chain: string;
  transactionSize: Long;
  transactionFeeRate: Long;
}

function createBaseNetworkFee(): NetworkFee {
  return { chain: "", transactionSize: Long.UZERO, transactionFeeRate: Long.UZERO };
}

export const NetworkFee = {
  encode(message: NetworkFee, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.chain !== "") {
      writer.uint32(10).string(message.chain);
    }
    if (!message.transactionSize.isZero()) {
      writer.uint32(16).uint64(message.transactionSize);
    }
    if (!message.transactionFeeRate.isZero()) {
      writer.uint32(24).uint64(message.transactionFeeRate);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): NetworkFee {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNetworkFee();
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

          message.transactionSize = reader.uint64() as Long;
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.transactionFeeRate = reader.uint64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): NetworkFee {
    return {
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      transactionSize: isSet(object.transactionSize) ? Long.fromValue(object.transactionSize) : Long.UZERO,
      transactionFeeRate: isSet(object.transactionFeeRate) ? Long.fromValue(object.transactionFeeRate) : Long.UZERO,
    };
  },

  toJSON(message: NetworkFee): unknown {
    const obj: any = {};
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (!message.transactionSize.isZero()) {
      obj.transactionSize = (message.transactionSize || Long.UZERO).toString();
    }
    if (!message.transactionFeeRate.isZero()) {
      obj.transactionFeeRate = (message.transactionFeeRate || Long.UZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<NetworkFee>, I>>(base?: I): NetworkFee {
    return NetworkFee.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<NetworkFee>, I>>(object: I): NetworkFee {
    const message = createBaseNetworkFee();
    message.chain = object.chain ?? "";
    message.transactionSize = (object.transactionSize !== undefined && object.transactionSize !== null)
      ? Long.fromValue(object.transactionSize)
      : Long.UZERO;
    message.transactionFeeRate = (object.transactionFeeRate !== undefined && object.transactionFeeRate !== null)
      ? Long.fromValue(object.transactionFeeRate)
      : Long.UZERO;
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
