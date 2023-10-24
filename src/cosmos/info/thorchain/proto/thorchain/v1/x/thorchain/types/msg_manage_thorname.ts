/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset, Coin } from "../../../common/common";

export const protobufPackage = "types";

export interface MsgManageTHORName {
  name: string;
  chain: string;
  address: string;
  coin?: Coin | undefined;
  expireBlockHeight: Long;
  preferredAsset?: Asset | undefined;
  owner: Uint8Array;
  signer: Uint8Array;
}

function createBaseMsgManageTHORName(): MsgManageTHORName {
  return {
    name: "",
    chain: "",
    address: "",
    coin: undefined,
    expireBlockHeight: Long.ZERO,
    preferredAsset: undefined,
    owner: new Uint8Array(0),
    signer: new Uint8Array(0),
  };
}

export const MsgManageTHORName = {
  encode(message: MsgManageTHORName, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (message.chain !== "") {
      writer.uint32(18).string(message.chain);
    }
    if (message.address !== "") {
      writer.uint32(26).string(message.address);
    }
    if (message.coin !== undefined) {
      Coin.encode(message.coin, writer.uint32(34).fork()).ldelim();
    }
    if (!message.expireBlockHeight.isZero()) {
      writer.uint32(40).int64(message.expireBlockHeight);
    }
    if (message.preferredAsset !== undefined) {
      Asset.encode(message.preferredAsset, writer.uint32(50).fork()).ldelim();
    }
    if (message.owner.length !== 0) {
      writer.uint32(58).bytes(message.owner);
    }
    if (message.signer.length !== 0) {
      writer.uint32(66).bytes(message.signer);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgManageTHORName {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgManageTHORName();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
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

          message.address = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.coin = Coin.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.expireBlockHeight = reader.int64() as Long;
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.preferredAsset = Asset.decode(reader, reader.uint32());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.owner = reader.bytes();
          continue;
        case 8:
          if (tag !== 66) {
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

  fromJSON(object: any): MsgManageTHORName {
    return {
      name: isSet(object.name) ? globalThis.String(object.name) : "",
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      address: isSet(object.address) ? globalThis.String(object.address) : "",
      coin: isSet(object.coin) ? Coin.fromJSON(object.coin) : undefined,
      expireBlockHeight: isSet(object.expireBlockHeight) ? Long.fromValue(object.expireBlockHeight) : Long.ZERO,
      preferredAsset: isSet(object.preferredAsset) ? Asset.fromJSON(object.preferredAsset) : undefined,
      owner: isSet(object.owner) ? bytesFromBase64(object.owner) : new Uint8Array(0),
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
    };
  },

  toJSON(message: MsgManageTHORName): unknown {
    const obj: any = {};
    if (message.name !== "") {
      obj.name = message.name;
    }
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (message.address !== "") {
      obj.address = message.address;
    }
    if (message.coin !== undefined) {
      obj.coin = Coin.toJSON(message.coin);
    }
    if (!message.expireBlockHeight.isZero()) {
      obj.expireBlockHeight = (message.expireBlockHeight || Long.ZERO).toString();
    }
    if (message.preferredAsset !== undefined) {
      obj.preferredAsset = Asset.toJSON(message.preferredAsset);
    }
    if (message.owner.length !== 0) {
      obj.owner = base64FromBytes(message.owner);
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgManageTHORName>, I>>(base?: I): MsgManageTHORName {
    return MsgManageTHORName.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgManageTHORName>, I>>(object: I): MsgManageTHORName {
    const message = createBaseMsgManageTHORName();
    message.name = object.name ?? "";
    message.chain = object.chain ?? "";
    message.address = object.address ?? "";
    message.coin = (object.coin !== undefined && object.coin !== null) ? Coin.fromPartial(object.coin) : undefined;
    message.expireBlockHeight = (object.expireBlockHeight !== undefined && object.expireBlockHeight !== null)
      ? Long.fromValue(object.expireBlockHeight)
      : Long.ZERO;
    message.preferredAsset = (object.preferredAsset !== undefined && object.preferredAsset !== null)
      ? Asset.fromPartial(object.preferredAsset)
      : undefined;
    message.owner = object.owner ?? new Uint8Array(0);
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
