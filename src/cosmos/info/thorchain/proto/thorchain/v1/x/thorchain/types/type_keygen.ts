/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export enum KeygenType {
  UnknownKeygen = 0,
  AsgardKeygen = 1,
  YggdrasilKeygen = 2,
  UNRECOGNIZED = -1,
}

export function keygenTypeFromJSON(object: any): KeygenType {
  switch (object) {
    case 0:
    case "UnknownKeygen":
      return KeygenType.UnknownKeygen;
    case 1:
    case "AsgardKeygen":
      return KeygenType.AsgardKeygen;
    case 2:
    case "YggdrasilKeygen":
      return KeygenType.YggdrasilKeygen;
    case -1:
    case "UNRECOGNIZED":
    default:
      return KeygenType.UNRECOGNIZED;
  }
}

export function keygenTypeToJSON(object: KeygenType): string {
  switch (object) {
    case KeygenType.UnknownKeygen:
      return "UnknownKeygen";
    case KeygenType.AsgardKeygen:
      return "AsgardKeygen";
    case KeygenType.YggdrasilKeygen:
      return "YggdrasilKeygen";
    case KeygenType.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface Keygen {
  id: string;
  type: KeygenType;
  members: string[];
}

export interface KeygenBlock {
  height: Long;
  keygens: Keygen[];
}

function createBaseKeygen(): Keygen {
  return { id: "", type: 0, members: [] };
}

export const Keygen = {
  encode(message: Keygen, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.type !== 0) {
      writer.uint32(16).int32(message.type);
    }
    for (const v of message.members) {
      writer.uint32(26).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Keygen {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseKeygen();
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

          message.type = reader.int32() as any;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.members.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Keygen {
    return {
      id: isSet(object.id) ? globalThis.String(object.id) : "",
      type: isSet(object.type) ? keygenTypeFromJSON(object.type) : 0,
      members: globalThis.Array.isArray(object?.members) ? object.members.map((e: any) => globalThis.String(e)) : [],
    };
  },

  toJSON(message: Keygen): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (message.type !== 0) {
      obj.type = keygenTypeToJSON(message.type);
    }
    if (message.members?.length) {
      obj.members = message.members;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Keygen>, I>>(base?: I): Keygen {
    return Keygen.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Keygen>, I>>(object: I): Keygen {
    const message = createBaseKeygen();
    message.id = object.id ?? "";
    message.type = object.type ?? 0;
    message.members = object.members?.map((e) => e) || [];
    return message;
  },
};

function createBaseKeygenBlock(): KeygenBlock {
  return { height: Long.ZERO, keygens: [] };
}

export const KeygenBlock = {
  encode(message: KeygenBlock, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.height.isZero()) {
      writer.uint32(8).int64(message.height);
    }
    for (const v of message.keygens) {
      Keygen.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): KeygenBlock {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseKeygenBlock();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.height = reader.int64() as Long;
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.keygens.push(Keygen.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): KeygenBlock {
    return {
      height: isSet(object.height) ? Long.fromValue(object.height) : Long.ZERO,
      keygens: globalThis.Array.isArray(object?.keygens) ? object.keygens.map((e: any) => Keygen.fromJSON(e)) : [],
    };
  },

  toJSON(message: KeygenBlock): unknown {
    const obj: any = {};
    if (!message.height.isZero()) {
      obj.height = (message.height || Long.ZERO).toString();
    }
    if (message.keygens?.length) {
      obj.keygens = message.keygens.map((e) => Keygen.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<KeygenBlock>, I>>(base?: I): KeygenBlock {
    return KeygenBlock.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<KeygenBlock>, I>>(object: I): KeygenBlock {
    const message = createBaseKeygenBlock();
    message.height = (object.height !== undefined && object.height !== null)
      ? Long.fromValue(object.height)
      : Long.ZERO;
    message.keygens = object.keygens?.map((e) => Keygen.fromPartial(e)) || [];
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
