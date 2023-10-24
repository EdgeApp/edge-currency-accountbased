/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface StreamingSwap {
  txId: string;
  interval: Long;
  quantity: Long;
  count: Long;
  lastHeight: Long;
  tradeTarget: string;
  deposit: string;
  in: string;
  out: string;
  failedSwaps: Long[];
  failedSwapReasons: string[];
}

function createBaseStreamingSwap(): StreamingSwap {
  return {
    txId: "",
    interval: Long.UZERO,
    quantity: Long.UZERO,
    count: Long.UZERO,
    lastHeight: Long.ZERO,
    tradeTarget: "",
    deposit: "",
    in: "",
    out: "",
    failedSwaps: [],
    failedSwapReasons: [],
  };
}

export const StreamingSwap = {
  encode(message: StreamingSwap, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.txId !== "") {
      writer.uint32(10).string(message.txId);
    }
    if (!message.interval.isZero()) {
      writer.uint32(16).uint64(message.interval);
    }
    if (!message.quantity.isZero()) {
      writer.uint32(24).uint64(message.quantity);
    }
    if (!message.count.isZero()) {
      writer.uint32(32).uint64(message.count);
    }
    if (!message.lastHeight.isZero()) {
      writer.uint32(40).int64(message.lastHeight);
    }
    if (message.tradeTarget !== "") {
      writer.uint32(50).string(message.tradeTarget);
    }
    if (message.deposit !== "") {
      writer.uint32(58).string(message.deposit);
    }
    if (message.in !== "") {
      writer.uint32(66).string(message.in);
    }
    if (message.out !== "") {
      writer.uint32(74).string(message.out);
    }
    writer.uint32(82).fork();
    for (const v of message.failedSwaps) {
      writer.uint64(v);
    }
    writer.ldelim();
    for (const v of message.failedSwapReasons) {
      writer.uint32(90).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StreamingSwap {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStreamingSwap();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.txId = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.interval = reader.uint64() as Long;
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.quantity = reader.uint64() as Long;
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.count = reader.uint64() as Long;
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.lastHeight = reader.int64() as Long;
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.tradeTarget = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.deposit = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.in = reader.string();
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.out = reader.string();
          continue;
        case 10:
          if (tag === 80) {
            message.failedSwaps.push(reader.uint64() as Long);

            continue;
          }

          if (tag === 82) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.failedSwaps.push(reader.uint64() as Long);
            }

            continue;
          }

          break;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.failedSwapReasons.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): StreamingSwap {
    return {
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
      interval: isSet(object.interval) ? Long.fromValue(object.interval) : Long.UZERO,
      quantity: isSet(object.quantity) ? Long.fromValue(object.quantity) : Long.UZERO,
      count: isSet(object.count) ? Long.fromValue(object.count) : Long.UZERO,
      lastHeight: isSet(object.lastHeight) ? Long.fromValue(object.lastHeight) : Long.ZERO,
      tradeTarget: isSet(object.tradeTarget) ? globalThis.String(object.tradeTarget) : "",
      deposit: isSet(object.deposit) ? globalThis.String(object.deposit) : "",
      in: isSet(object.in) ? globalThis.String(object.in) : "",
      out: isSet(object.out) ? globalThis.String(object.out) : "",
      failedSwaps: globalThis.Array.isArray(object?.failedSwaps)
        ? object.failedSwaps.map((e: any) => Long.fromValue(e))
        : [],
      failedSwapReasons: globalThis.Array.isArray(object?.failedSwapReasons)
        ? object.failedSwapReasons.map((e: any) => globalThis.String(e))
        : [],
    };
  },

  toJSON(message: StreamingSwap): unknown {
    const obj: any = {};
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    if (!message.interval.isZero()) {
      obj.interval = (message.interval || Long.UZERO).toString();
    }
    if (!message.quantity.isZero()) {
      obj.quantity = (message.quantity || Long.UZERO).toString();
    }
    if (!message.count.isZero()) {
      obj.count = (message.count || Long.UZERO).toString();
    }
    if (!message.lastHeight.isZero()) {
      obj.lastHeight = (message.lastHeight || Long.ZERO).toString();
    }
    if (message.tradeTarget !== "") {
      obj.tradeTarget = message.tradeTarget;
    }
    if (message.deposit !== "") {
      obj.deposit = message.deposit;
    }
    if (message.in !== "") {
      obj.in = message.in;
    }
    if (message.out !== "") {
      obj.out = message.out;
    }
    if (message.failedSwaps?.length) {
      obj.failedSwaps = message.failedSwaps.map((e) => (e || Long.UZERO).toString());
    }
    if (message.failedSwapReasons?.length) {
      obj.failedSwapReasons = message.failedSwapReasons;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<StreamingSwap>, I>>(base?: I): StreamingSwap {
    return StreamingSwap.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<StreamingSwap>, I>>(object: I): StreamingSwap {
    const message = createBaseStreamingSwap();
    message.txId = object.txId ?? "";
    message.interval = (object.interval !== undefined && object.interval !== null)
      ? Long.fromValue(object.interval)
      : Long.UZERO;
    message.quantity = (object.quantity !== undefined && object.quantity !== null)
      ? Long.fromValue(object.quantity)
      : Long.UZERO;
    message.count = (object.count !== undefined && object.count !== null) ? Long.fromValue(object.count) : Long.UZERO;
    message.lastHeight = (object.lastHeight !== undefined && object.lastHeight !== null)
      ? Long.fromValue(object.lastHeight)
      : Long.ZERO;
    message.tradeTarget = object.tradeTarget ?? "";
    message.deposit = object.deposit ?? "";
    message.in = object.in ?? "";
    message.out = object.out ?? "";
    message.failedSwaps = object.failedSwaps?.map((e) => Long.fromValue(e)) || [];
    message.failedSwapReasons = object.failedSwapReasons?.map((e) => e) || [];
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
