/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface TssKeysignFailVoter {
  id: string;
  height: Long;
  signers: string[];
  round7Count: Long;
}

function createBaseTssKeysignFailVoter(): TssKeysignFailVoter {
  return { id: "", height: Long.ZERO, signers: [], round7Count: Long.ZERO };
}

export const TssKeysignFailVoter = {
  encode(message: TssKeysignFailVoter, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (!message.height.isZero()) {
      writer.uint32(32).int64(message.height);
    }
    for (const v of message.signers) {
      writer.uint32(50).string(v!);
    }
    if (!message.round7Count.isZero()) {
      writer.uint32(56).int64(message.round7Count);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TssKeysignFailVoter {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTssKeysignFailVoter();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.height = reader.int64() as Long;
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.signers.push(reader.string());
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.round7Count = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TssKeysignFailVoter {
    return {
      id: isSet(object.id) ? globalThis.String(object.id) : "",
      height: isSet(object.height) ? Long.fromValue(object.height) : Long.ZERO,
      signers: globalThis.Array.isArray(object?.signers) ? object.signers.map((e: any) => globalThis.String(e)) : [],
      round7Count: isSet(object.round7Count) ? Long.fromValue(object.round7Count) : Long.ZERO,
    };
  },

  toJSON(message: TssKeysignFailVoter): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (!message.height.isZero()) {
      obj.height = (message.height || Long.ZERO).toString();
    }
    if (message.signers?.length) {
      obj.signers = message.signers;
    }
    if (!message.round7Count.isZero()) {
      obj.round7Count = (message.round7Count || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TssKeysignFailVoter>, I>>(base?: I): TssKeysignFailVoter {
    return TssKeysignFailVoter.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<TssKeysignFailVoter>, I>>(object: I): TssKeysignFailVoter {
    const message = createBaseTssKeysignFailVoter();
    message.id = object.id ?? "";
    message.height = (object.height !== undefined && object.height !== null)
      ? Long.fromValue(object.height)
      : Long.ZERO;
    message.signers = object.signers?.map((e) => e) || [];
    message.round7Count = (object.round7Count !== undefined && object.round7Count !== null)
      ? Long.fromValue(object.round7Count)
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
