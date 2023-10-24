/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Tx } from "../../../common/common";

export const protobufPackage = "types";

export interface MsgUnBond {
  txIn?: Tx | undefined;
  nodeAddress: Uint8Array;
  bondAddress: string;
  amount: string;
  signer: Uint8Array;
  bondProviderAddress: Uint8Array;
}

function createBaseMsgUnBond(): MsgUnBond {
  return {
    txIn: undefined,
    nodeAddress: new Uint8Array(0),
    bondAddress: "",
    amount: "",
    signer: new Uint8Array(0),
    bondProviderAddress: new Uint8Array(0),
  };
}

export const MsgUnBond = {
  encode(message: MsgUnBond, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.txIn !== undefined) {
      Tx.encode(message.txIn, writer.uint32(10).fork()).ldelim();
    }
    if (message.nodeAddress.length !== 0) {
      writer.uint32(18).bytes(message.nodeAddress);
    }
    if (message.bondAddress !== "") {
      writer.uint32(42).string(message.bondAddress);
    }
    if (message.amount !== "") {
      writer.uint32(50).string(message.amount);
    }
    if (message.signer.length !== 0) {
      writer.uint32(58).bytes(message.signer);
    }
    if (message.bondProviderAddress.length !== 0) {
      writer.uint32(66).bytes(message.bondProviderAddress);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgUnBond {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnBond();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.txIn = Tx.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.nodeAddress = reader.bytes();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.bondAddress = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.amount = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.signer = reader.bytes();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.bondProviderAddress = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgUnBond {
    return {
      txIn: isSet(object.txIn) ? Tx.fromJSON(object.txIn) : undefined,
      nodeAddress: isSet(object.nodeAddress) ? bytesFromBase64(object.nodeAddress) : new Uint8Array(0),
      bondAddress: isSet(object.bondAddress) ? globalThis.String(object.bondAddress) : "",
      amount: isSet(object.amount) ? globalThis.String(object.amount) : "",
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
      bondProviderAddress: isSet(object.bondProviderAddress)
        ? bytesFromBase64(object.bondProviderAddress)
        : new Uint8Array(0),
    };
  },

  toJSON(message: MsgUnBond): unknown {
    const obj: any = {};
    if (message.txIn !== undefined) {
      obj.txIn = Tx.toJSON(message.txIn);
    }
    if (message.nodeAddress.length !== 0) {
      obj.nodeAddress = base64FromBytes(message.nodeAddress);
    }
    if (message.bondAddress !== "") {
      obj.bondAddress = message.bondAddress;
    }
    if (message.amount !== "") {
      obj.amount = message.amount;
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    if (message.bondProviderAddress.length !== 0) {
      obj.bondProviderAddress = base64FromBytes(message.bondProviderAddress);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgUnBond>, I>>(base?: I): MsgUnBond {
    return MsgUnBond.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgUnBond>, I>>(object: I): MsgUnBond {
    const message = createBaseMsgUnBond();
    message.txIn = (object.txIn !== undefined && object.txIn !== null) ? Tx.fromPartial(object.txIn) : undefined;
    message.nodeAddress = object.nodeAddress ?? new Uint8Array(0);
    message.bondAddress = object.bondAddress ?? "";
    message.amount = object.amount ?? "";
    message.signer = object.signer ?? new Uint8Array(0);
    message.bondProviderAddress = object.bondProviderAddress ?? new Uint8Array(0);
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
