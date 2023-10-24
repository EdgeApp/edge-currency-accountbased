/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Blame } from "./type_blame";
import { KeygenType, keygenTypeFromJSON, keygenTypeToJSON } from "./type_keygen";

export const protobufPackage = "types";

export interface MsgTssPool {
  id: string;
  poolPubKey: string;
  keygenType: KeygenType;
  pubKeys: string[];
  height: Long;
  blame?: Blame | undefined;
  chains: string[];
  signer: Uint8Array;
  keygenTime: Long;
  keysharesBackup: Uint8Array;
}

function createBaseMsgTssPool(): MsgTssPool {
  return {
    id: "",
    poolPubKey: "",
    keygenType: 0,
    pubKeys: [],
    height: Long.ZERO,
    blame: undefined,
    chains: [],
    signer: new Uint8Array(0),
    keygenTime: Long.ZERO,
    keysharesBackup: new Uint8Array(0),
  };
}

export const MsgTssPool = {
  encode(message: MsgTssPool, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.poolPubKey !== "") {
      writer.uint32(18).string(message.poolPubKey);
    }
    if (message.keygenType !== 0) {
      writer.uint32(24).int32(message.keygenType);
    }
    for (const v of message.pubKeys) {
      writer.uint32(34).string(v!);
    }
    if (!message.height.isZero()) {
      writer.uint32(40).int64(message.height);
    }
    if (message.blame !== undefined) {
      Blame.encode(message.blame, writer.uint32(50).fork()).ldelim();
    }
    for (const v of message.chains) {
      writer.uint32(58).string(v!);
    }
    if (message.signer.length !== 0) {
      writer.uint32(66).bytes(message.signer);
    }
    if (!message.keygenTime.isZero()) {
      writer.uint32(72).int64(message.keygenTime);
    }
    if (message.keysharesBackup.length !== 0) {
      writer.uint32(82).bytes(message.keysharesBackup);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgTssPool {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgTssPool();
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
          if (tag !== 18) {
            break;
          }

          message.poolPubKey = reader.string();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.keygenType = reader.int32() as any;
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.pubKeys.push(reader.string());
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.height = reader.int64() as Long;
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.blame = Blame.decode(reader, reader.uint32());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.chains.push(reader.string());
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.signer = reader.bytes();
          continue;
        case 9:
          if (tag !== 72) {
            break;
          }

          message.keygenTime = reader.int64() as Long;
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.keysharesBackup = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgTssPool {
    return {
      id: isSet(object.id) ? globalThis.String(object.id) : "",
      poolPubKey: isSet(object.poolPubKey) ? globalThis.String(object.poolPubKey) : "",
      keygenType: isSet(object.keygenType) ? keygenTypeFromJSON(object.keygenType) : 0,
      pubKeys: globalThis.Array.isArray(object?.pubKeys) ? object.pubKeys.map((e: any) => globalThis.String(e)) : [],
      height: isSet(object.height) ? Long.fromValue(object.height) : Long.ZERO,
      blame: isSet(object.blame) ? Blame.fromJSON(object.blame) : undefined,
      chains: globalThis.Array.isArray(object?.chains) ? object.chains.map((e: any) => globalThis.String(e)) : [],
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
      keygenTime: isSet(object.keygenTime) ? Long.fromValue(object.keygenTime) : Long.ZERO,
      keysharesBackup: isSet(object.keysharesBackup) ? bytesFromBase64(object.keysharesBackup) : new Uint8Array(0),
    };
  },

  toJSON(message: MsgTssPool): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (message.poolPubKey !== "") {
      obj.poolPubKey = message.poolPubKey;
    }
    if (message.keygenType !== 0) {
      obj.keygenType = keygenTypeToJSON(message.keygenType);
    }
    if (message.pubKeys?.length) {
      obj.pubKeys = message.pubKeys;
    }
    if (!message.height.isZero()) {
      obj.height = (message.height || Long.ZERO).toString();
    }
    if (message.blame !== undefined) {
      obj.blame = Blame.toJSON(message.blame);
    }
    if (message.chains?.length) {
      obj.chains = message.chains;
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    if (!message.keygenTime.isZero()) {
      obj.keygenTime = (message.keygenTime || Long.ZERO).toString();
    }
    if (message.keysharesBackup.length !== 0) {
      obj.keysharesBackup = base64FromBytes(message.keysharesBackup);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgTssPool>, I>>(base?: I): MsgTssPool {
    return MsgTssPool.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgTssPool>, I>>(object: I): MsgTssPool {
    const message = createBaseMsgTssPool();
    message.id = object.id ?? "";
    message.poolPubKey = object.poolPubKey ?? "";
    message.keygenType = object.keygenType ?? 0;
    message.pubKeys = object.pubKeys?.map((e) => e) || [];
    message.height = (object.height !== undefined && object.height !== null)
      ? Long.fromValue(object.height)
      : Long.ZERO;
    message.blame = (object.blame !== undefined && object.blame !== null) ? Blame.fromPartial(object.blame) : undefined;
    message.chains = object.chains?.map((e) => e) || [];
    message.signer = object.signer ?? new Uint8Array(0);
    message.keygenTime = (object.keygenTime !== undefined && object.keygenTime !== null)
      ? Long.fromValue(object.keygenTime)
      : Long.ZERO;
    message.keysharesBackup = object.keysharesBackup ?? new Uint8Array(0);
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
