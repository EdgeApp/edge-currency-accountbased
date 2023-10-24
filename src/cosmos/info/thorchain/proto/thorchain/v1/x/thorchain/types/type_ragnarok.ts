/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset } from "../../../common/common";

export const protobufPackage = "types";

export interface RagnarokWithdrawPosition {
  number: Long;
  pool?: Asset | undefined;
}

function createBaseRagnarokWithdrawPosition(): RagnarokWithdrawPosition {
  return { number: Long.ZERO, pool: undefined };
}

export const RagnarokWithdrawPosition = {
  encode(message: RagnarokWithdrawPosition, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.number.isZero()) {
      writer.uint32(8).int64(message.number);
    }
    if (message.pool !== undefined) {
      Asset.encode(message.pool, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RagnarokWithdrawPosition {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRagnarokWithdrawPosition();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.number = reader.int64() as Long;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.pool = Asset.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): RagnarokWithdrawPosition {
    return {
      number: isSet(object.number) ? Long.fromValue(object.number) : Long.ZERO,
      pool: isSet(object.pool) ? Asset.fromJSON(object.pool) : undefined,
    };
  },

  toJSON(message: RagnarokWithdrawPosition): unknown {
    const obj: any = {};
    if (!message.number.isZero()) {
      obj.number = (message.number || Long.ZERO).toString();
    }
    if (message.pool !== undefined) {
      obj.pool = Asset.toJSON(message.pool);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<RagnarokWithdrawPosition>, I>>(base?: I): RagnarokWithdrawPosition {
    return RagnarokWithdrawPosition.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<RagnarokWithdrawPosition>, I>>(object: I): RagnarokWithdrawPosition {
    const message = createBaseRagnarokWithdrawPosition();
    message.number = (object.number !== undefined && object.number !== null)
      ? Long.fromValue(object.number)
      : Long.ZERO;
    message.pool = (object.pool !== undefined && object.pool !== null) ? Asset.fromPartial(object.pool) : undefined;
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
