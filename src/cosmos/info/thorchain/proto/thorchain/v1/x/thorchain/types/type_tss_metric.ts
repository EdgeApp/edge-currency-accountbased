/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface NodeTssTime {
  address: Uint8Array;
  tssTime: Long;
}

export interface TssKeygenMetric {
  pubKey: string;
  nodeTssTimes: NodeTssTime[];
}

export interface TssKeysignMetric {
  txId: string;
  nodeTssTimes: NodeTssTime[];
}

function createBaseNodeTssTime(): NodeTssTime {
  return { address: new Uint8Array(0), tssTime: Long.ZERO };
}

export const NodeTssTime = {
  encode(message: NodeTssTime, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.address.length !== 0) {
      writer.uint32(10).bytes(message.address);
    }
    if (!message.tssTime.isZero()) {
      writer.uint32(16).int64(message.tssTime);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): NodeTssTime {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNodeTssTime();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.address = reader.bytes();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.tssTime = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): NodeTssTime {
    return {
      address: isSet(object.address) ? bytesFromBase64(object.address) : new Uint8Array(0),
      tssTime: isSet(object.tssTime) ? Long.fromValue(object.tssTime) : Long.ZERO,
    };
  },

  toJSON(message: NodeTssTime): unknown {
    const obj: any = {};
    if (message.address.length !== 0) {
      obj.address = base64FromBytes(message.address);
    }
    if (!message.tssTime.isZero()) {
      obj.tssTime = (message.tssTime || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<NodeTssTime>, I>>(base?: I): NodeTssTime {
    return NodeTssTime.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<NodeTssTime>, I>>(object: I): NodeTssTime {
    const message = createBaseNodeTssTime();
    message.address = object.address ?? new Uint8Array(0);
    message.tssTime = (object.tssTime !== undefined && object.tssTime !== null)
      ? Long.fromValue(object.tssTime)
      : Long.ZERO;
    return message;
  },
};

function createBaseTssKeygenMetric(): TssKeygenMetric {
  return { pubKey: "", nodeTssTimes: [] };
}

export const TssKeygenMetric = {
  encode(message: TssKeygenMetric, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pubKey !== "") {
      writer.uint32(10).string(message.pubKey);
    }
    for (const v of message.nodeTssTimes) {
      NodeTssTime.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TssKeygenMetric {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTssKeygenMetric();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pubKey = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.nodeTssTimes.push(NodeTssTime.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TssKeygenMetric {
    return {
      pubKey: isSet(object.pubKey) ? globalThis.String(object.pubKey) : "",
      nodeTssTimes: globalThis.Array.isArray(object?.nodeTssTimes)
        ? object.nodeTssTimes.map((e: any) => NodeTssTime.fromJSON(e))
        : [],
    };
  },

  toJSON(message: TssKeygenMetric): unknown {
    const obj: any = {};
    if (message.pubKey !== "") {
      obj.pubKey = message.pubKey;
    }
    if (message.nodeTssTimes?.length) {
      obj.nodeTssTimes = message.nodeTssTimes.map((e) => NodeTssTime.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TssKeygenMetric>, I>>(base?: I): TssKeygenMetric {
    return TssKeygenMetric.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<TssKeygenMetric>, I>>(object: I): TssKeygenMetric {
    const message = createBaseTssKeygenMetric();
    message.pubKey = object.pubKey ?? "";
    message.nodeTssTimes = object.nodeTssTimes?.map((e) => NodeTssTime.fromPartial(e)) || [];
    return message;
  },
};

function createBaseTssKeysignMetric(): TssKeysignMetric {
  return { txId: "", nodeTssTimes: [] };
}

export const TssKeysignMetric = {
  encode(message: TssKeysignMetric, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.txId !== "") {
      writer.uint32(10).string(message.txId);
    }
    for (const v of message.nodeTssTimes) {
      NodeTssTime.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TssKeysignMetric {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTssKeysignMetric();
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

          message.nodeTssTimes.push(NodeTssTime.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TssKeysignMetric {
    return {
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
      nodeTssTimes: globalThis.Array.isArray(object?.nodeTssTimes)
        ? object.nodeTssTimes.map((e: any) => NodeTssTime.fromJSON(e))
        : [],
    };
  },

  toJSON(message: TssKeysignMetric): unknown {
    const obj: any = {};
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    if (message.nodeTssTimes?.length) {
      obj.nodeTssTimes = message.nodeTssTimes.map((e) => NodeTssTime.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TssKeysignMetric>, I>>(base?: I): TssKeysignMetric {
    return TssKeysignMetric.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<TssKeysignMetric>, I>>(object: I): TssKeysignMetric {
    const message = createBaseTssKeysignMetric();
    message.txId = object.txId ?? "";
    message.nodeTssTimes = object.nodeTssTimes?.map((e) => NodeTssTime.fromPartial(e)) || [];
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
