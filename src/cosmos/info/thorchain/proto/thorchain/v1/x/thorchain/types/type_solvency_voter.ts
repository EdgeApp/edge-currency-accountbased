/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Coin } from "../../../common/common";

export const protobufPackage = "types";

export interface SolvencyVoter {
  id: string;
  chain: string;
  pubKey: string;
  coins: Coin[];
  height: Long;
  consensusBlockHeight: Long;
  signers: string[];
}

function createBaseSolvencyVoter(): SolvencyVoter {
  return { id: "", chain: "", pubKey: "", coins: [], height: Long.ZERO, consensusBlockHeight: Long.ZERO, signers: [] };
}

export const SolvencyVoter = {
  encode(message: SolvencyVoter, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.chain !== "") {
      writer.uint32(18).string(message.chain);
    }
    if (message.pubKey !== "") {
      writer.uint32(26).string(message.pubKey);
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    if (!message.height.isZero()) {
      writer.uint32(40).int64(message.height);
    }
    if (!message.consensusBlockHeight.isZero()) {
      writer.uint32(48).int64(message.consensusBlockHeight);
    }
    for (const v of message.signers) {
      writer.uint32(58).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SolvencyVoter {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSolvencyVoter();
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

          message.chain = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.pubKey = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.coins.push(Coin.decode(reader, reader.uint32()));
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.height = reader.int64() as Long;
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.consensusBlockHeight = reader.int64() as Long;
          continue;
        case 7:
          if (tag !== 58) {
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

  fromJSON(object: any): SolvencyVoter {
    return {
      id: isSet(object.id) ? globalThis.String(object.id) : "",
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      pubKey: isSet(object.pubKey) ? globalThis.String(object.pubKey) : "",
      coins: globalThis.Array.isArray(object?.coins) ? object.coins.map((e: any) => Coin.fromJSON(e)) : [],
      height: isSet(object.height) ? Long.fromValue(object.height) : Long.ZERO,
      consensusBlockHeight: isSet(object.consensusBlockHeight)
        ? Long.fromValue(object.consensusBlockHeight)
        : Long.ZERO,
      signers: globalThis.Array.isArray(object?.signers) ? object.signers.map((e: any) => globalThis.String(e)) : [],
    };
  },

  toJSON(message: SolvencyVoter): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (message.pubKey !== "") {
      obj.pubKey = message.pubKey;
    }
    if (message.coins?.length) {
      obj.coins = message.coins.map((e) => Coin.toJSON(e));
    }
    if (!message.height.isZero()) {
      obj.height = (message.height || Long.ZERO).toString();
    }
    if (!message.consensusBlockHeight.isZero()) {
      obj.consensusBlockHeight = (message.consensusBlockHeight || Long.ZERO).toString();
    }
    if (message.signers?.length) {
      obj.signers = message.signers;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<SolvencyVoter>, I>>(base?: I): SolvencyVoter {
    return SolvencyVoter.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<SolvencyVoter>, I>>(object: I): SolvencyVoter {
    const message = createBaseSolvencyVoter();
    message.id = object.id ?? "";
    message.chain = object.chain ?? "";
    message.pubKey = object.pubKey ?? "";
    message.coins = object.coins?.map((e) => Coin.fromPartial(e)) || [];
    message.height = (object.height !== undefined && object.height !== null)
      ? Long.fromValue(object.height)
      : Long.ZERO;
    message.consensusBlockHeight = (object.consensusBlockHeight !== undefined && object.consensusBlockHeight !== null)
      ? Long.fromValue(object.consensusBlockHeight)
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
