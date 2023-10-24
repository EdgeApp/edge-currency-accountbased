/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset, Tx } from "../../../common/common";

export const protobufPackage = "types";

export interface MsgWithdrawLiquidity {
  tx?: Tx | undefined;
  withdrawAddress: string;
  basisPoints: string;
  asset?: Asset | undefined;
  withdrawalAsset?: Asset | undefined;
  signer: Uint8Array;
}

function createBaseMsgWithdrawLiquidity(): MsgWithdrawLiquidity {
  return {
    tx: undefined,
    withdrawAddress: "",
    basisPoints: "",
    asset: undefined,
    withdrawalAsset: undefined,
    signer: new Uint8Array(0),
  };
}

export const MsgWithdrawLiquidity = {
  encode(message: MsgWithdrawLiquidity, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(10).fork()).ldelim();
    }
    if (message.withdrawAddress !== "") {
      writer.uint32(18).string(message.withdrawAddress);
    }
    if (message.basisPoints !== "") {
      writer.uint32(26).string(message.basisPoints);
    }
    if (message.asset !== undefined) {
      Asset.encode(message.asset, writer.uint32(34).fork()).ldelim();
    }
    if (message.withdrawalAsset !== undefined) {
      Asset.encode(message.withdrawalAsset, writer.uint32(42).fork()).ldelim();
    }
    if (message.signer.length !== 0) {
      writer.uint32(50).bytes(message.signer);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgWithdrawLiquidity {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawLiquidity();
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

          message.withdrawAddress = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.basisPoints = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.asset = Asset.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.withdrawalAsset = Asset.decode(reader, reader.uint32());
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

  fromJSON(object: any): MsgWithdrawLiquidity {
    return {
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
      withdrawAddress: isSet(object.withdrawAddress) ? globalThis.String(object.withdrawAddress) : "",
      basisPoints: isSet(object.basisPoints) ? globalThis.String(object.basisPoints) : "",
      asset: isSet(object.asset) ? Asset.fromJSON(object.asset) : undefined,
      withdrawalAsset: isSet(object.withdrawalAsset) ? Asset.fromJSON(object.withdrawalAsset) : undefined,
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
    };
  },

  toJSON(message: MsgWithdrawLiquidity): unknown {
    const obj: any = {};
    if (message.tx !== undefined) {
      obj.tx = Tx.toJSON(message.tx);
    }
    if (message.withdrawAddress !== "") {
      obj.withdrawAddress = message.withdrawAddress;
    }
    if (message.basisPoints !== "") {
      obj.basisPoints = message.basisPoints;
    }
    if (message.asset !== undefined) {
      obj.asset = Asset.toJSON(message.asset);
    }
    if (message.withdrawalAsset !== undefined) {
      obj.withdrawalAsset = Asset.toJSON(message.withdrawalAsset);
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgWithdrawLiquidity>, I>>(base?: I): MsgWithdrawLiquidity {
    return MsgWithdrawLiquidity.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgWithdrawLiquidity>, I>>(object: I): MsgWithdrawLiquidity {
    const message = createBaseMsgWithdrawLiquidity();
    message.tx = (object.tx !== undefined && object.tx !== null) ? Tx.fromPartial(object.tx) : undefined;
    message.withdrawAddress = object.withdrawAddress ?? "";
    message.basisPoints = object.basisPoints ?? "";
    message.asset = (object.asset !== undefined && object.asset !== null) ? Asset.fromPartial(object.asset) : undefined;
    message.withdrawalAsset = (object.withdrawalAsset !== undefined && object.withdrawalAsset !== null)
      ? Asset.fromPartial(object.withdrawalAsset)
      : undefined;
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
