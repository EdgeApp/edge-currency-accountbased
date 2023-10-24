/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { ObservedTx } from "./type_observed_tx";

export const protobufPackage = "types";

export interface MsgNoOp {
  observedTx?: ObservedTx | undefined;
  signer: Uint8Array;
  action: string;
}

function createBaseMsgNoOp(): MsgNoOp {
  return { observedTx: undefined, signer: new Uint8Array(0), action: "" };
}

export const MsgNoOp = {
  encode(message: MsgNoOp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.observedTx !== undefined) {
      ObservedTx.encode(message.observedTx, writer.uint32(10).fork()).ldelim();
    }
    if (message.signer.length !== 0) {
      writer.uint32(18).bytes(message.signer);
    }
    if (message.action !== "") {
      writer.uint32(26).string(message.action);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgNoOp {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgNoOp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.observedTx = ObservedTx.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.signer = reader.bytes();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.action = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgNoOp {
    return {
      observedTx: isSet(object.observedTx) ? ObservedTx.fromJSON(object.observedTx) : undefined,
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
      action: isSet(object.action) ? globalThis.String(object.action) : "",
    };
  },

  toJSON(message: MsgNoOp): unknown {
    const obj: any = {};
    if (message.observedTx !== undefined) {
      obj.observedTx = ObservedTx.toJSON(message.observedTx);
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    if (message.action !== "") {
      obj.action = message.action;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgNoOp>, I>>(base?: I): MsgNoOp {
    return MsgNoOp.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgNoOp>, I>>(object: I): MsgNoOp {
    const message = createBaseMsgNoOp();
    message.observedTx = (object.observedTx !== undefined && object.observedTx !== null)
      ? ObservedTx.fromPartial(object.observedTx)
      : undefined;
    message.signer = object.signer ?? new Uint8Array(0);
    message.action = object.action ?? "";
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
