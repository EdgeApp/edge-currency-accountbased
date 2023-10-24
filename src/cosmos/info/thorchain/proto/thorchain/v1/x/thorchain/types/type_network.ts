/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface Network {
  bondRewardRune: string;
  totalBondUnits: string;
  /** TODO remove on hard fork */
  burnedBep2Rune: string;
  /** TODO remove on hard fork */
  burnedErc20Rune: string;
  LPIncomeSplit: Long;
  NodeIncomeSplit: Long;
  outboundGasSpentRune: Long;
  outboundGasWithheldRune: Long;
}

function createBaseNetwork(): Network {
  return {
    bondRewardRune: "",
    totalBondUnits: "",
    burnedBep2Rune: "",
    burnedErc20Rune: "",
    LPIncomeSplit: Long.ZERO,
    NodeIncomeSplit: Long.ZERO,
    outboundGasSpentRune: Long.UZERO,
    outboundGasWithheldRune: Long.UZERO,
  };
}

export const Network = {
  encode(message: Network, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.bondRewardRune !== "") {
      writer.uint32(10).string(message.bondRewardRune);
    }
    if (message.totalBondUnits !== "") {
      writer.uint32(18).string(message.totalBondUnits);
    }
    if (message.burnedBep2Rune !== "") {
      writer.uint32(26).string(message.burnedBep2Rune);
    }
    if (message.burnedErc20Rune !== "") {
      writer.uint32(34).string(message.burnedErc20Rune);
    }
    if (!message.LPIncomeSplit.isZero()) {
      writer.uint32(40).int64(message.LPIncomeSplit);
    }
    if (!message.NodeIncomeSplit.isZero()) {
      writer.uint32(48).int64(message.NodeIncomeSplit);
    }
    if (!message.outboundGasSpentRune.isZero()) {
      writer.uint32(56).uint64(message.outboundGasSpentRune);
    }
    if (!message.outboundGasWithheldRune.isZero()) {
      writer.uint32(64).uint64(message.outboundGasWithheldRune);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Network {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNetwork();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.bondRewardRune = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.totalBondUnits = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.burnedBep2Rune = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.burnedErc20Rune = reader.string();
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.LPIncomeSplit = reader.int64() as Long;
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.NodeIncomeSplit = reader.int64() as Long;
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.outboundGasSpentRune = reader.uint64() as Long;
          continue;
        case 8:
          if (tag !== 64) {
            break;
          }

          message.outboundGasWithheldRune = reader.uint64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Network {
    return {
      bondRewardRune: isSet(object.bondRewardRune) ? globalThis.String(object.bondRewardRune) : "",
      totalBondUnits: isSet(object.totalBondUnits) ? globalThis.String(object.totalBondUnits) : "",
      burnedBep2Rune: isSet(object.burnedBep2Rune) ? globalThis.String(object.burnedBep2Rune) : "",
      burnedErc20Rune: isSet(object.burnedErc20Rune) ? globalThis.String(object.burnedErc20Rune) : "",
      LPIncomeSplit: isSet(object.LPIncomeSplit) ? Long.fromValue(object.LPIncomeSplit) : Long.ZERO,
      NodeIncomeSplit: isSet(object.NodeIncomeSplit) ? Long.fromValue(object.NodeIncomeSplit) : Long.ZERO,
      outboundGasSpentRune: isSet(object.outboundGasSpentRune)
        ? Long.fromValue(object.outboundGasSpentRune)
        : Long.UZERO,
      outboundGasWithheldRune: isSet(object.outboundGasWithheldRune)
        ? Long.fromValue(object.outboundGasWithheldRune)
        : Long.UZERO,
    };
  },

  toJSON(message: Network): unknown {
    const obj: any = {};
    if (message.bondRewardRune !== "") {
      obj.bondRewardRune = message.bondRewardRune;
    }
    if (message.totalBondUnits !== "") {
      obj.totalBondUnits = message.totalBondUnits;
    }
    if (message.burnedBep2Rune !== "") {
      obj.burnedBep2Rune = message.burnedBep2Rune;
    }
    if (message.burnedErc20Rune !== "") {
      obj.burnedErc20Rune = message.burnedErc20Rune;
    }
    if (!message.LPIncomeSplit.isZero()) {
      obj.LPIncomeSplit = (message.LPIncomeSplit || Long.ZERO).toString();
    }
    if (!message.NodeIncomeSplit.isZero()) {
      obj.NodeIncomeSplit = (message.NodeIncomeSplit || Long.ZERO).toString();
    }
    if (!message.outboundGasSpentRune.isZero()) {
      obj.outboundGasSpentRune = (message.outboundGasSpentRune || Long.UZERO).toString();
    }
    if (!message.outboundGasWithheldRune.isZero()) {
      obj.outboundGasWithheldRune = (message.outboundGasWithheldRune || Long.UZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Network>, I>>(base?: I): Network {
    return Network.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Network>, I>>(object: I): Network {
    const message = createBaseNetwork();
    message.bondRewardRune = object.bondRewardRune ?? "";
    message.totalBondUnits = object.totalBondUnits ?? "";
    message.burnedBep2Rune = object.burnedBep2Rune ?? "";
    message.burnedErc20Rune = object.burnedErc20Rune ?? "";
    message.LPIncomeSplit = (object.LPIncomeSplit !== undefined && object.LPIncomeSplit !== null)
      ? Long.fromValue(object.LPIncomeSplit)
      : Long.ZERO;
    message.NodeIncomeSplit = (object.NodeIncomeSplit !== undefined && object.NodeIncomeSplit !== null)
      ? Long.fromValue(object.NodeIncomeSplit)
      : Long.ZERO;
    message.outboundGasSpentRune = (object.outboundGasSpentRune !== undefined && object.outboundGasSpentRune !== null)
      ? Long.fromValue(object.outboundGasSpentRune)
      : Long.UZERO;
    message.outboundGasWithheldRune =
      (object.outboundGasWithheldRune !== undefined && object.outboundGasWithheldRune !== null)
        ? Long.fromValue(object.outboundGasWithheldRune)
        : Long.UZERO;
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
