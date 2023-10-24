/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface Jail {
  nodeAddress: Uint8Array;
  releaseHeight: Long;
  reason: string;
}

function createBaseJail(): Jail {
  return { nodeAddress: new Uint8Array(0), releaseHeight: Long.ZERO, reason: "" };
}

export const Jail = {
  encode(message: Jail, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.nodeAddress.length !== 0) {
      writer.uint32(10).bytes(message.nodeAddress);
    }
    if (!message.releaseHeight.isZero()) {
      writer.uint32(16).int64(message.releaseHeight);
    }
    if (message.reason !== "") {
      writer.uint32(26).string(message.reason);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Jail {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseJail();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.nodeAddress = reader.bytes();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.releaseHeight = reader.int64() as Long;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.reason = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Jail {
    return {
      nodeAddress: isSet(object.nodeAddress) ? bytesFromBase64(object.nodeAddress) : new Uint8Array(0),
      releaseHeight: isSet(object.releaseHeight) ? Long.fromValue(object.releaseHeight) : Long.ZERO,
      reason: isSet(object.reason) ? globalThis.String(object.reason) : "",
    };
  },

  toJSON(message: Jail): unknown {
    const obj: any = {};
    if (message.nodeAddress.length !== 0) {
      obj.nodeAddress = base64FromBytes(message.nodeAddress);
    }
    if (!message.releaseHeight.isZero()) {
      obj.releaseHeight = (message.releaseHeight || Long.ZERO).toString();
    }
    if (message.reason !== "") {
      obj.reason = message.reason;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Jail>, I>>(base?: I): Jail {
    return Jail.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Jail>, I>>(object: I): Jail {
    const message = createBaseJail();
    message.nodeAddress = object.nodeAddress ?? new Uint8Array(0);
    message.releaseHeight = (object.releaseHeight !== undefined && object.releaseHeight !== null)
      ? Long.fromValue(object.releaseHeight)
      : Long.ZERO;
    message.reason = object.reason ?? "";
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
