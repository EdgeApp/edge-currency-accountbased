/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface ProtoInt64 {
  value: Long;
}

export interface ProtoUint64 {
  value: Long;
}

export interface ProtoAccAddresses {
  value: Uint8Array[];
}

export interface ProtoStrings {
  value: string[];
}

export interface ProtoBools {
  value: boolean[];
}

function createBaseProtoInt64(): ProtoInt64 {
  return { value: Long.ZERO };
}

export const ProtoInt64 = {
  encode(message: ProtoInt64, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.value.isZero()) {
      writer.uint32(8).int64(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProtoInt64 {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProtoInt64();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.value = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ProtoInt64 {
    return { value: isSet(object.value) ? Long.fromValue(object.value) : Long.ZERO };
  },

  toJSON(message: ProtoInt64): unknown {
    const obj: any = {};
    if (!message.value.isZero()) {
      obj.value = (message.value || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ProtoInt64>, I>>(base?: I): ProtoInt64 {
    return ProtoInt64.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProtoInt64>, I>>(object: I): ProtoInt64 {
    const message = createBaseProtoInt64();
    message.value = (object.value !== undefined && object.value !== null) ? Long.fromValue(object.value) : Long.ZERO;
    return message;
  },
};

function createBaseProtoUint64(): ProtoUint64 {
  return { value: Long.UZERO };
}

export const ProtoUint64 = {
  encode(message: ProtoUint64, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.value.isZero()) {
      writer.uint32(8).uint64(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProtoUint64 {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProtoUint64();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.value = reader.uint64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ProtoUint64 {
    return { value: isSet(object.value) ? Long.fromValue(object.value) : Long.UZERO };
  },

  toJSON(message: ProtoUint64): unknown {
    const obj: any = {};
    if (!message.value.isZero()) {
      obj.value = (message.value || Long.UZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ProtoUint64>, I>>(base?: I): ProtoUint64 {
    return ProtoUint64.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProtoUint64>, I>>(object: I): ProtoUint64 {
    const message = createBaseProtoUint64();
    message.value = (object.value !== undefined && object.value !== null) ? Long.fromValue(object.value) : Long.UZERO;
    return message;
  },
};

function createBaseProtoAccAddresses(): ProtoAccAddresses {
  return { value: [] };
}

export const ProtoAccAddresses = {
  encode(message: ProtoAccAddresses, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.value) {
      writer.uint32(10).bytes(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProtoAccAddresses {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProtoAccAddresses();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.value.push(reader.bytes());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ProtoAccAddresses {
    return { value: globalThis.Array.isArray(object?.value) ? object.value.map((e: any) => bytesFromBase64(e)) : [] };
  },

  toJSON(message: ProtoAccAddresses): unknown {
    const obj: any = {};
    if (message.value?.length) {
      obj.value = message.value.map((e) => base64FromBytes(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ProtoAccAddresses>, I>>(base?: I): ProtoAccAddresses {
    return ProtoAccAddresses.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProtoAccAddresses>, I>>(object: I): ProtoAccAddresses {
    const message = createBaseProtoAccAddresses();
    message.value = object.value?.map((e) => e) || [];
    return message;
  },
};

function createBaseProtoStrings(): ProtoStrings {
  return { value: [] };
}

export const ProtoStrings = {
  encode(message: ProtoStrings, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.value) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProtoStrings {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProtoStrings();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.value.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ProtoStrings {
    return { value: globalThis.Array.isArray(object?.value) ? object.value.map((e: any) => globalThis.String(e)) : [] };
  },

  toJSON(message: ProtoStrings): unknown {
    const obj: any = {};
    if (message.value?.length) {
      obj.value = message.value;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ProtoStrings>, I>>(base?: I): ProtoStrings {
    return ProtoStrings.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProtoStrings>, I>>(object: I): ProtoStrings {
    const message = createBaseProtoStrings();
    message.value = object.value?.map((e) => e) || [];
    return message;
  },
};

function createBaseProtoBools(): ProtoBools {
  return { value: [] };
}

export const ProtoBools = {
  encode(message: ProtoBools, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    writer.uint32(10).fork();
    for (const v of message.value) {
      writer.bool(v);
    }
    writer.ldelim();
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProtoBools {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProtoBools();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag === 8) {
            message.value.push(reader.bool());

            continue;
          }

          if (tag === 10) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.value.push(reader.bool());
            }

            continue;
          }

          break;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ProtoBools {
    return {
      value: globalThis.Array.isArray(object?.value) ? object.value.map((e: any) => globalThis.Boolean(e)) : [],
    };
  },

  toJSON(message: ProtoBools): unknown {
    const obj: any = {};
    if (message.value?.length) {
      obj.value = message.value;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ProtoBools>, I>>(base?: I): ProtoBools {
    return ProtoBools.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProtoBools>, I>>(object: I): ProtoBools {
    const message = createBaseProtoBools();
    message.value = object.value?.map((e) => e) || [];
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
