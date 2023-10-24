/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface ErrataTxVoter {
  txId: string;
  chain: string;
  blockHeight: Long;
  signers: string[];
}

function createBaseErrataTxVoter(): ErrataTxVoter {
  return { txId: "", chain: "", blockHeight: Long.ZERO, signers: [] };
}

export const ErrataTxVoter = {
  encode(message: ErrataTxVoter, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.txId !== "") {
      writer.uint32(10).string(message.txId);
    }
    if (message.chain !== "") {
      writer.uint32(18).string(message.chain);
    }
    if (!message.blockHeight.isZero()) {
      writer.uint32(24).int64(message.blockHeight);
    }
    for (const v of message.signers) {
      writer.uint32(34).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ErrataTxVoter {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseErrataTxVoter();
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
          if (tag !== 18) {
            break;
          }

          message.chain = reader.string();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.blockHeight = reader.int64() as Long;
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.signers.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ErrataTxVoter {
    return {
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      blockHeight: isSet(object.blockHeight) ? Long.fromValue(object.blockHeight) : Long.ZERO,
      signers: globalThis.Array.isArray(object?.signers) ? object.signers.map((e: any) => globalThis.String(e)) : [],
    };
  },

  toJSON(message: ErrataTxVoter): unknown {
    const obj: any = {};
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (!message.blockHeight.isZero()) {
      obj.blockHeight = (message.blockHeight || Long.ZERO).toString();
    }
    if (message.signers?.length) {
      obj.signers = message.signers;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ErrataTxVoter>, I>>(base?: I): ErrataTxVoter {
    return ErrataTxVoter.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ErrataTxVoter>, I>>(object: I): ErrataTxVoter {
    const message = createBaseErrataTxVoter();
    message.txId = object.txId ?? "";
    message.chain = object.chain ?? "";
    message.blockHeight = (object.blockHeight !== undefined && object.blockHeight !== null)
      ? Long.fromValue(object.blockHeight)
      : Long.ZERO;
    message.signers = object.signers?.map((e) => e) || [];
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
