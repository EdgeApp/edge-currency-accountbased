/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface TssVoter {
  id: string;
  poolPubKey: string;
  pubKeys: string[];
  blockHeight: Long;
  chains: string[];
  signers: string[];
  majorityConsensusBlockHeight: Long;
}

function createBaseTssVoter(): TssVoter {
  return {
    id: "",
    poolPubKey: "",
    pubKeys: [],
    blockHeight: Long.ZERO,
    chains: [],
    signers: [],
    majorityConsensusBlockHeight: Long.ZERO,
  };
}

export const TssVoter = {
  encode(message: TssVoter, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.poolPubKey !== "") {
      writer.uint32(18).string(message.poolPubKey);
    }
    for (const v of message.pubKeys) {
      writer.uint32(26).string(v!);
    }
    if (!message.blockHeight.isZero()) {
      writer.uint32(32).int64(message.blockHeight);
    }
    for (const v of message.chains) {
      writer.uint32(42).string(v!);
    }
    for (const v of message.signers) {
      writer.uint32(50).string(v!);
    }
    if (!message.majorityConsensusBlockHeight.isZero()) {
      writer.uint32(56).int64(message.majorityConsensusBlockHeight);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TssVoter {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTssVoter();
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
          if (tag !== 26) {
            break;
          }

          message.pubKeys.push(reader.string());
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.blockHeight = reader.int64() as Long;
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.chains.push(reader.string());
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

          message.majorityConsensusBlockHeight = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TssVoter {
    return {
      id: isSet(object.id) ? globalThis.String(object.id) : "",
      poolPubKey: isSet(object.poolPubKey) ? globalThis.String(object.poolPubKey) : "",
      pubKeys: globalThis.Array.isArray(object?.pubKeys) ? object.pubKeys.map((e: any) => globalThis.String(e)) : [],
      blockHeight: isSet(object.blockHeight) ? Long.fromValue(object.blockHeight) : Long.ZERO,
      chains: globalThis.Array.isArray(object?.chains) ? object.chains.map((e: any) => globalThis.String(e)) : [],
      signers: globalThis.Array.isArray(object?.signers) ? object.signers.map((e: any) => globalThis.String(e)) : [],
      majorityConsensusBlockHeight: isSet(object.majorityConsensusBlockHeight)
        ? Long.fromValue(object.majorityConsensusBlockHeight)
        : Long.ZERO,
    };
  },

  toJSON(message: TssVoter): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (message.poolPubKey !== "") {
      obj.poolPubKey = message.poolPubKey;
    }
    if (message.pubKeys?.length) {
      obj.pubKeys = message.pubKeys;
    }
    if (!message.blockHeight.isZero()) {
      obj.blockHeight = (message.blockHeight || Long.ZERO).toString();
    }
    if (message.chains?.length) {
      obj.chains = message.chains;
    }
    if (message.signers?.length) {
      obj.signers = message.signers;
    }
    if (!message.majorityConsensusBlockHeight.isZero()) {
      obj.majorityConsensusBlockHeight = (message.majorityConsensusBlockHeight || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TssVoter>, I>>(base?: I): TssVoter {
    return TssVoter.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<TssVoter>, I>>(object: I): TssVoter {
    const message = createBaseTssVoter();
    message.id = object.id ?? "";
    message.poolPubKey = object.poolPubKey ?? "";
    message.pubKeys = object.pubKeys?.map((e) => e) || [];
    message.blockHeight = (object.blockHeight !== undefined && object.blockHeight !== null)
      ? Long.fromValue(object.blockHeight)
      : Long.ZERO;
    message.chains = object.chains?.map((e) => e) || [];
    message.signers = object.signers?.map((e) => e) || [];
    message.majorityConsensusBlockHeight =
      (object.majorityConsensusBlockHeight !== undefined && object.majorityConsensusBlockHeight !== null)
        ? Long.fromValue(object.majorityConsensusBlockHeight)
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
