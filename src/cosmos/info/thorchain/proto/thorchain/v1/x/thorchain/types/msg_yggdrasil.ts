/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Coin, Tx } from "../../../common/common";

export const protobufPackage = "types";

export interface MsgYggdrasil {
  tx?: Tx | undefined;
  pubKey: string;
  addFunds: boolean;
  coins: Coin[];
  blockHeight: Long;
  signer: Uint8Array;
}

function createBaseMsgYggdrasil(): MsgYggdrasil {
  return { tx: undefined, pubKey: "", addFunds: false, coins: [], blockHeight: Long.ZERO, signer: new Uint8Array(0) };
}

export const MsgYggdrasil = {
  encode(message: MsgYggdrasil, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(10).fork()).ldelim();
    }
    if (message.pubKey !== "") {
      writer.uint32(18).string(message.pubKey);
    }
    if (message.addFunds === true) {
      writer.uint32(24).bool(message.addFunds);
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    if (!message.blockHeight.isZero()) {
      writer.uint32(40).int64(message.blockHeight);
    }
    if (message.signer.length !== 0) {
      writer.uint32(50).bytes(message.signer);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgYggdrasil {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgYggdrasil();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.tx = Tx.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.pubKey = reader.string();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.addFunds = reader.bool();
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

          message.blockHeight = reader.int64() as Long;
          continue;
        case 6:
          if (tag !== 50) {
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

  fromJSON(object: any): MsgYggdrasil {
    return {
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
      pubKey: isSet(object.pubKey) ? globalThis.String(object.pubKey) : "",
      addFunds: isSet(object.addFunds) ? globalThis.Boolean(object.addFunds) : false,
      coins: globalThis.Array.isArray(object?.coins) ? object.coins.map((e: any) => Coin.fromJSON(e)) : [],
      blockHeight: isSet(object.blockHeight) ? Long.fromValue(object.blockHeight) : Long.ZERO,
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
    };
  },

  toJSON(message: MsgYggdrasil): unknown {
    const obj: any = {};
    if (message.tx !== undefined) {
      obj.tx = Tx.toJSON(message.tx);
    }
    if (message.pubKey !== "") {
      obj.pubKey = message.pubKey;
    }
    if (message.addFunds === true) {
      obj.addFunds = message.addFunds;
    }
    if (message.coins?.length) {
      obj.coins = message.coins.map((e) => Coin.toJSON(e));
    }
    if (!message.blockHeight.isZero()) {
      obj.blockHeight = (message.blockHeight || Long.ZERO).toString();
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgYggdrasil>, I>>(base?: I): MsgYggdrasil {
    return MsgYggdrasil.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgYggdrasil>, I>>(object: I): MsgYggdrasil {
    const message = createBaseMsgYggdrasil();
    message.tx = (object.tx !== undefined && object.tx !== null) ? Tx.fromPartial(object.tx) : undefined;
    message.pubKey = object.pubKey ?? "";
    message.addFunds = object.addFunds ?? false;
    message.coins = object.coins?.map((e) => Coin.fromPartial(e)) || [];
    message.blockHeight = (object.blockHeight !== undefined && object.blockHeight !== null)
      ? Long.fromValue(object.blockHeight)
      : Long.ZERO;
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
