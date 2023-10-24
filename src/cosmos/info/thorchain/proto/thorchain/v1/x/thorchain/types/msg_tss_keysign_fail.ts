/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Coin } from "../../../common/common";
import { Blame } from "./type_blame";

export const protobufPackage = "types";

export interface MsgTssKeysignFail {
  id: string;
  height: Long;
  blame?: Blame | undefined;
  memo: string;
  coins: Coin[];
  pubKey: string;
  signer: Uint8Array;
}

function createBaseMsgTssKeysignFail(): MsgTssKeysignFail {
  return { id: "", height: Long.ZERO, blame: undefined, memo: "", coins: [], pubKey: "", signer: new Uint8Array(0) };
}

export const MsgTssKeysignFail = {
  encode(message: MsgTssKeysignFail, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (!message.height.isZero()) {
      writer.uint32(16).int64(message.height);
    }
    if (message.blame !== undefined) {
      Blame.encode(message.blame, writer.uint32(26).fork()).ldelim();
    }
    if (message.memo !== "") {
      writer.uint32(34).string(message.memo);
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    if (message.pubKey !== "") {
      writer.uint32(50).string(message.pubKey);
    }
    if (message.signer.length !== 0) {
      writer.uint32(58).bytes(message.signer);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgTssKeysignFail {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgTssKeysignFail();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.height = reader.int64() as Long;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.blame = Blame.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.memo = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.coins.push(Coin.decode(reader, reader.uint32()));
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.pubKey = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
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

  fromJSON(object: any): MsgTssKeysignFail {
    return {
      id: isSet(object.id) ? globalThis.String(object.id) : "",
      height: isSet(object.height) ? Long.fromValue(object.height) : Long.ZERO,
      blame: isSet(object.blame) ? Blame.fromJSON(object.blame) : undefined,
      memo: isSet(object.memo) ? globalThis.String(object.memo) : "",
      coins: globalThis.Array.isArray(object?.coins) ? object.coins.map((e: any) => Coin.fromJSON(e)) : [],
      pubKey: isSet(object.pubKey) ? globalThis.String(object.pubKey) : "",
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
    };
  },

  toJSON(message: MsgTssKeysignFail): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (!message.height.isZero()) {
      obj.height = (message.height || Long.ZERO).toString();
    }
    if (message.blame !== undefined) {
      obj.blame = Blame.toJSON(message.blame);
    }
    if (message.memo !== "") {
      obj.memo = message.memo;
    }
    if (message.coins?.length) {
      obj.coins = message.coins.map((e) => Coin.toJSON(e));
    }
    if (message.pubKey !== "") {
      obj.pubKey = message.pubKey;
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgTssKeysignFail>, I>>(base?: I): MsgTssKeysignFail {
    return MsgTssKeysignFail.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgTssKeysignFail>, I>>(object: I): MsgTssKeysignFail {
    const message = createBaseMsgTssKeysignFail();
    message.id = object.id ?? "";
    message.height = (object.height !== undefined && object.height !== null)
      ? Long.fromValue(object.height)
      : Long.ZERO;
    message.blame = (object.blame !== undefined && object.blame !== null) ? Blame.fromPartial(object.blame) : undefined;
    message.memo = object.memo ?? "";
    message.coins = object.coins?.map((e) => Coin.fromPartial(e)) || [];
    message.pubKey = object.pubKey ?? "";
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
