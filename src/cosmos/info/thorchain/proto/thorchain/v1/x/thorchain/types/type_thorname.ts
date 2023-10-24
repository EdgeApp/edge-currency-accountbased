/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset } from "../../../common/common";

export const protobufPackage = "types";

export interface THORNameAlias {
  chain: string;
  address: string;
}

export interface THORName {
  name: string;
  expireBlockHeight: Long;
  owner: Uint8Array;
  preferredAsset?: Asset | undefined;
  aliases: THORNameAlias[];
}

function createBaseTHORNameAlias(): THORNameAlias {
  return { chain: "", address: "" };
}

export const THORNameAlias = {
  encode(message: THORNameAlias, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.chain !== "") {
      writer.uint32(10).string(message.chain);
    }
    if (message.address !== "") {
      writer.uint32(18).string(message.address);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): THORNameAlias {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTHORNameAlias();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.chain = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.address = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): THORNameAlias {
    return {
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      address: isSet(object.address) ? globalThis.String(object.address) : "",
    };
  },

  toJSON(message: THORNameAlias): unknown {
    const obj: any = {};
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (message.address !== "") {
      obj.address = message.address;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<THORNameAlias>, I>>(base?: I): THORNameAlias {
    return THORNameAlias.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<THORNameAlias>, I>>(object: I): THORNameAlias {
    const message = createBaseTHORNameAlias();
    message.chain = object.chain ?? "";
    message.address = object.address ?? "";
    return message;
  },
};

function createBaseTHORName(): THORName {
  return { name: "", expireBlockHeight: Long.ZERO, owner: new Uint8Array(0), preferredAsset: undefined, aliases: [] };
}

export const THORName = {
  encode(message: THORName, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (!message.expireBlockHeight.isZero()) {
      writer.uint32(16).int64(message.expireBlockHeight);
    }
    if (message.owner.length !== 0) {
      writer.uint32(26).bytes(message.owner);
    }
    if (message.preferredAsset !== undefined) {
      Asset.encode(message.preferredAsset, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.aliases) {
      THORNameAlias.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): THORName {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTHORName();
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
          if (tag !== 16) {
            break;
          }

          message.expireBlockHeight = reader.int64() as Long;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.owner = reader.bytes();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.preferredAsset = Asset.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.aliases.push(THORNameAlias.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): THORName {
    return {
      name: isSet(object.name) ? globalThis.String(object.name) : "",
      expireBlockHeight: isSet(object.expireBlockHeight) ? Long.fromValue(object.expireBlockHeight) : Long.ZERO,
      owner: isSet(object.owner) ? bytesFromBase64(object.owner) : new Uint8Array(0),
      preferredAsset: isSet(object.preferredAsset) ? Asset.fromJSON(object.preferredAsset) : undefined,
      aliases: globalThis.Array.isArray(object?.aliases)
        ? object.aliases.map((e: any) => THORNameAlias.fromJSON(e))
        : [],
    };
  },

  toJSON(message: THORName): unknown {
    const obj: any = {};
    if (message.name !== "") {
      obj.name = message.name;
    }
    if (!message.expireBlockHeight.isZero()) {
      obj.expireBlockHeight = (message.expireBlockHeight || Long.ZERO).toString();
    }
    if (message.owner.length !== 0) {
      obj.owner = base64FromBytes(message.owner);
    }
    if (message.preferredAsset !== undefined) {
      obj.preferredAsset = Asset.toJSON(message.preferredAsset);
    }
    if (message.aliases?.length) {
      obj.aliases = message.aliases.map((e) => THORNameAlias.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<THORName>, I>>(base?: I): THORName {
    return THORName.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<THORName>, I>>(object: I): THORName {
    const message = createBaseTHORName();
    message.name = object.name ?? "";
    message.expireBlockHeight = (object.expireBlockHeight !== undefined && object.expireBlockHeight !== null)
      ? Long.fromValue(object.expireBlockHeight)
      : Long.ZERO;
    message.owner = object.owner ?? new Uint8Array(0);
    message.preferredAsset = (object.preferredAsset !== undefined && object.preferredAsset !== null)
      ? Asset.fromPartial(object.preferredAsset)
      : undefined;
    message.aliases = object.aliases?.map((e) => THORNameAlias.fromPartial(e)) || [];
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
