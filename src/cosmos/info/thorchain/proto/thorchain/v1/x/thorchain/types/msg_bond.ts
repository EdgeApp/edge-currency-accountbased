/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Tx } from "../../../common/common";

export const protobufPackage = "types";

export interface MsgBond {
  txIn?: Tx | undefined;
  nodeAddress: Uint8Array;
  bond: string;
  bondAddress: string;
  signer: Uint8Array;
  bondProviderAddress: Uint8Array;
  operatorFee: Long;
}

function createBaseMsgBond(): MsgBond {
  return {
    txIn: undefined,
    nodeAddress: new Uint8Array(0),
    bond: "",
    bondAddress: "",
    signer: new Uint8Array(0),
    bondProviderAddress: new Uint8Array(0),
    operatorFee: Long.ZERO,
  };
}

export const MsgBond = {
  encode(message: MsgBond, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.txIn !== undefined) {
      Tx.encode(message.txIn, writer.uint32(10).fork()).ldelim();
    }
    if (message.nodeAddress.length !== 0) {
      writer.uint32(18).bytes(message.nodeAddress);
    }
    if (message.bond !== "") {
      writer.uint32(26).string(message.bond);
    }
    if (message.bondAddress !== "") {
      writer.uint32(34).string(message.bondAddress);
    }
    if (message.signer.length !== 0) {
      writer.uint32(42).bytes(message.signer);
    }
    if (message.bondProviderAddress.length !== 0) {
      writer.uint32(50).bytes(message.bondProviderAddress);
    }
    if (!message.operatorFee.isZero()) {
      writer.uint32(56).int64(message.operatorFee);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgBond {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgBond();
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
        case 3:
          if (tag !== 26) {
            break;
          }

          message.bond = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.bondAddress = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.signer = reader.bytes();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.bondProviderAddress = reader.bytes();
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.operatorFee = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgBond {
    return {
      txIn: isSet(object.txIn) ? Tx.fromJSON(object.txIn) : undefined,
      nodeAddress: isSet(object.nodeAddress) ? bytesFromBase64(object.nodeAddress) : new Uint8Array(0),
      bond: isSet(object.bond) ? globalThis.String(object.bond) : "",
      bondAddress: isSet(object.bondAddress) ? globalThis.String(object.bondAddress) : "",
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
      bondProviderAddress: isSet(object.bondProviderAddress)
        ? bytesFromBase64(object.bondProviderAddress)
        : new Uint8Array(0),
      operatorFee: isSet(object.operatorFee) ? Long.fromValue(object.operatorFee) : Long.ZERO,
    };
  },

  toJSON(message: MsgBond): unknown {
    const obj: any = {};
    if (message.txIn !== undefined) {
      obj.txIn = Tx.toJSON(message.txIn);
    }
    if (message.nodeAddress.length !== 0) {
      obj.nodeAddress = base64FromBytes(message.nodeAddress);
    }
    if (message.bond !== "") {
      obj.bond = message.bond;
    }
    if (message.bondAddress !== "") {
      obj.bondAddress = message.bondAddress;
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    if (message.bondProviderAddress.length !== 0) {
      obj.bondProviderAddress = base64FromBytes(message.bondProviderAddress);
    }
    if (!message.operatorFee.isZero()) {
      obj.operatorFee = (message.operatorFee || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgBond>, I>>(base?: I): MsgBond {
    return MsgBond.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgBond>, I>>(object: I): MsgBond {
    const message = createBaseMsgBond();
    message.txIn = (object.txIn !== undefined && object.txIn !== null) ? Tx.fromPartial(object.txIn) : undefined;
    message.nodeAddress = object.nodeAddress ?? new Uint8Array(0);
    message.bond = object.bond ?? "";
    message.bondAddress = object.bondAddress ?? "";
    message.signer = object.signer ?? new Uint8Array(0);
    message.bondProviderAddress = object.bondProviderAddress ?? new Uint8Array(0);
    message.operatorFee = (object.operatorFee !== undefined && object.operatorFee !== null)
      ? Long.fromValue(object.operatorFee)
      : Long.ZERO;
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
