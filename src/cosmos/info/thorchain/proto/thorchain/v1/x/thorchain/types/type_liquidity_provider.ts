/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset } from "../../../common/common";

export const protobufPackage = "types";

export interface LiquidityProvider {
  asset?: Asset | undefined;
  runeAddress: string;
  assetAddress: string;
  lastAddHeight: Long;
  lastWithdrawHeight: Long;
  units: string;
  pendingRune: string;
  pendingAsset: string;
  pendingTxId: string;
  runeDepositValue: string;
  assetDepositValue: string;
}

function createBaseLiquidityProvider(): LiquidityProvider {
  return {
    asset: undefined,
    runeAddress: "",
    assetAddress: "",
    lastAddHeight: Long.ZERO,
    lastWithdrawHeight: Long.ZERO,
    units: "",
    pendingRune: "",
    pendingAsset: "",
    pendingTxId: "",
    runeDepositValue: "",
    assetDepositValue: "",
  };
}

export const LiquidityProvider = {
  encode(message: LiquidityProvider, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.asset !== undefined) {
      Asset.encode(message.asset, writer.uint32(10).fork()).ldelim();
    }
    if (message.runeAddress !== "") {
      writer.uint32(18).string(message.runeAddress);
    }
    if (message.assetAddress !== "") {
      writer.uint32(26).string(message.assetAddress);
    }
    if (!message.lastAddHeight.isZero()) {
      writer.uint32(32).int64(message.lastAddHeight);
    }
    if (!message.lastWithdrawHeight.isZero()) {
      writer.uint32(40).int64(message.lastWithdrawHeight);
    }
    if (message.units !== "") {
      writer.uint32(50).string(message.units);
    }
    if (message.pendingRune !== "") {
      writer.uint32(58).string(message.pendingRune);
    }
    if (message.pendingAsset !== "") {
      writer.uint32(66).string(message.pendingAsset);
    }
    if (message.pendingTxId !== "") {
      writer.uint32(74).string(message.pendingTxId);
    }
    if (message.runeDepositValue !== "") {
      writer.uint32(82).string(message.runeDepositValue);
    }
    if (message.assetDepositValue !== "") {
      writer.uint32(90).string(message.assetDepositValue);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LiquidityProvider {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLiquidityProvider();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.asset = Asset.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.runeAddress = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.assetAddress = reader.string();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.lastAddHeight = reader.int64() as Long;
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.lastWithdrawHeight = reader.int64() as Long;
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.units = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.pendingRune = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.pendingAsset = reader.string();
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.pendingTxId = reader.string();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.runeDepositValue = reader.string();
          continue;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.assetDepositValue = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LiquidityProvider {
    return {
      asset: isSet(object.asset) ? Asset.fromJSON(object.asset) : undefined,
      runeAddress: isSet(object.runeAddress) ? globalThis.String(object.runeAddress) : "",
      assetAddress: isSet(object.assetAddress) ? globalThis.String(object.assetAddress) : "",
      lastAddHeight: isSet(object.lastAddHeight) ? Long.fromValue(object.lastAddHeight) : Long.ZERO,
      lastWithdrawHeight: isSet(object.lastWithdrawHeight) ? Long.fromValue(object.lastWithdrawHeight) : Long.ZERO,
      units: isSet(object.units) ? globalThis.String(object.units) : "",
      pendingRune: isSet(object.pendingRune) ? globalThis.String(object.pendingRune) : "",
      pendingAsset: isSet(object.pendingAsset) ? globalThis.String(object.pendingAsset) : "",
      pendingTxId: isSet(object.pendingTxId) ? globalThis.String(object.pendingTxId) : "",
      runeDepositValue: isSet(object.runeDepositValue) ? globalThis.String(object.runeDepositValue) : "",
      assetDepositValue: isSet(object.assetDepositValue) ? globalThis.String(object.assetDepositValue) : "",
    };
  },

  toJSON(message: LiquidityProvider): unknown {
    const obj: any = {};
    if (message.asset !== undefined) {
      obj.asset = Asset.toJSON(message.asset);
    }
    if (message.runeAddress !== "") {
      obj.runeAddress = message.runeAddress;
    }
    if (message.assetAddress !== "") {
      obj.assetAddress = message.assetAddress;
    }
    if (!message.lastAddHeight.isZero()) {
      obj.lastAddHeight = (message.lastAddHeight || Long.ZERO).toString();
    }
    if (!message.lastWithdrawHeight.isZero()) {
      obj.lastWithdrawHeight = (message.lastWithdrawHeight || Long.ZERO).toString();
    }
    if (message.units !== "") {
      obj.units = message.units;
    }
    if (message.pendingRune !== "") {
      obj.pendingRune = message.pendingRune;
    }
    if (message.pendingAsset !== "") {
      obj.pendingAsset = message.pendingAsset;
    }
    if (message.pendingTxId !== "") {
      obj.pendingTxId = message.pendingTxId;
    }
    if (message.runeDepositValue !== "") {
      obj.runeDepositValue = message.runeDepositValue;
    }
    if (message.assetDepositValue !== "") {
      obj.assetDepositValue = message.assetDepositValue;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<LiquidityProvider>, I>>(base?: I): LiquidityProvider {
    return LiquidityProvider.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<LiquidityProvider>, I>>(object: I): LiquidityProvider {
    const message = createBaseLiquidityProvider();
    message.asset = (object.asset !== undefined && object.asset !== null) ? Asset.fromPartial(object.asset) : undefined;
    message.runeAddress = object.runeAddress ?? "";
    message.assetAddress = object.assetAddress ?? "";
    message.lastAddHeight = (object.lastAddHeight !== undefined && object.lastAddHeight !== null)
      ? Long.fromValue(object.lastAddHeight)
      : Long.ZERO;
    message.lastWithdrawHeight = (object.lastWithdrawHeight !== undefined && object.lastWithdrawHeight !== null)
      ? Long.fromValue(object.lastWithdrawHeight)
      : Long.ZERO;
    message.units = object.units ?? "";
    message.pendingRune = object.pendingRune ?? "";
    message.pendingAsset = object.pendingAsset ?? "";
    message.pendingTxId = object.pendingTxId ?? "";
    message.runeDepositValue = object.runeDepositValue ?? "";
    message.assetDepositValue = object.assetDepositValue ?? "";
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
