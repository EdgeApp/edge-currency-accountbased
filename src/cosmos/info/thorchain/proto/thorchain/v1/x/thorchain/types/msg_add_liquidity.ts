/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset, Tx } from "../../../common/common";

export const protobufPackage = "types";

export interface MsgAddLiquidity {
  tx?: Tx | undefined;
  asset?: Asset | undefined;
  assetAmount: string;
  runeAmount: string;
  runeAddress: string;
  assetAddress: string;
  affiliateAddress: string;
  affiliateBasisPoints: string;
  signer: Uint8Array;
}

function createBaseMsgAddLiquidity(): MsgAddLiquidity {
  return {
    tx: undefined,
    asset: undefined,
    assetAmount: "",
    runeAmount: "",
    runeAddress: "",
    assetAddress: "",
    affiliateAddress: "",
    affiliateBasisPoints: "",
    signer: new Uint8Array(0),
  };
}

export const MsgAddLiquidity = {
  encode(message: MsgAddLiquidity, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(10).fork()).ldelim();
    }
    if (message.asset !== undefined) {
      Asset.encode(message.asset, writer.uint32(18).fork()).ldelim();
    }
    if (message.assetAmount !== "") {
      writer.uint32(26).string(message.assetAmount);
    }
    if (message.runeAmount !== "") {
      writer.uint32(34).string(message.runeAmount);
    }
    if (message.runeAddress !== "") {
      writer.uint32(42).string(message.runeAddress);
    }
    if (message.assetAddress !== "") {
      writer.uint32(50).string(message.assetAddress);
    }
    if (message.affiliateAddress !== "") {
      writer.uint32(58).string(message.affiliateAddress);
    }
    if (message.affiliateBasisPoints !== "") {
      writer.uint32(66).string(message.affiliateBasisPoints);
    }
    if (message.signer.length !== 0) {
      writer.uint32(74).bytes(message.signer);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgAddLiquidity {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAddLiquidity();
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

          message.asset = Asset.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.assetAmount = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.runeAmount = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.runeAddress = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.assetAddress = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.affiliateAddress = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.affiliateBasisPoints = reader.string();
          continue;
        case 9:
          if (tag !== 74) {
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

  fromJSON(object: any): MsgAddLiquidity {
    return {
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
      asset: isSet(object.asset) ? Asset.fromJSON(object.asset) : undefined,
      assetAmount: isSet(object.assetAmount) ? globalThis.String(object.assetAmount) : "",
      runeAmount: isSet(object.runeAmount) ? globalThis.String(object.runeAmount) : "",
      runeAddress: isSet(object.runeAddress) ? globalThis.String(object.runeAddress) : "",
      assetAddress: isSet(object.assetAddress) ? globalThis.String(object.assetAddress) : "",
      affiliateAddress: isSet(object.affiliateAddress) ? globalThis.String(object.affiliateAddress) : "",
      affiliateBasisPoints: isSet(object.affiliateBasisPoints) ? globalThis.String(object.affiliateBasisPoints) : "",
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(0),
    };
  },

  toJSON(message: MsgAddLiquidity): unknown {
    const obj: any = {};
    if (message.tx !== undefined) {
      obj.tx = Tx.toJSON(message.tx);
    }
    if (message.asset !== undefined) {
      obj.asset = Asset.toJSON(message.asset);
    }
    if (message.assetAmount !== "") {
      obj.assetAmount = message.assetAmount;
    }
    if (message.runeAmount !== "") {
      obj.runeAmount = message.runeAmount;
    }
    if (message.runeAddress !== "") {
      obj.runeAddress = message.runeAddress;
    }
    if (message.assetAddress !== "") {
      obj.assetAddress = message.assetAddress;
    }
    if (message.affiliateAddress !== "") {
      obj.affiliateAddress = message.affiliateAddress;
    }
    if (message.affiliateBasisPoints !== "") {
      obj.affiliateBasisPoints = message.affiliateBasisPoints;
    }
    if (message.signer.length !== 0) {
      obj.signer = base64FromBytes(message.signer);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgAddLiquidity>, I>>(base?: I): MsgAddLiquidity {
    return MsgAddLiquidity.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgAddLiquidity>, I>>(object: I): MsgAddLiquidity {
    const message = createBaseMsgAddLiquidity();
    message.tx = (object.tx !== undefined && object.tx !== null) ? Tx.fromPartial(object.tx) : undefined;
    message.asset = (object.asset !== undefined && object.asset !== null) ? Asset.fromPartial(object.asset) : undefined;
    message.assetAmount = object.assetAmount ?? "";
    message.runeAmount = object.runeAmount ?? "";
    message.runeAddress = object.runeAddress ?? "";
    message.assetAddress = object.assetAddress ?? "";
    message.affiliateAddress = object.affiliateAddress ?? "";
    message.affiliateBasisPoints = object.affiliateBasisPoints ?? "";
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
