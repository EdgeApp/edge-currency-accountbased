/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset } from "../../../common/common";

export const protobufPackage = "types";

export interface Loan {
  owner: string;
  asset?: Asset | undefined;
  debtIssued: string;
  debtRepaid: string;
  collateralDeposited: string;
  collateralWithdrawn: string;
  lastOpenHeight: Long;
  lastRepayHeight: Long;
}

function createBaseLoan(): Loan {
  return {
    owner: "",
    asset: undefined,
    debtIssued: "",
    debtRepaid: "",
    collateralDeposited: "",
    collateralWithdrawn: "",
    lastOpenHeight: Long.ZERO,
    lastRepayHeight: Long.ZERO,
  };
}

export const Loan = {
  encode(message: Loan, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.owner !== "") {
      writer.uint32(10).string(message.owner);
    }
    if (message.asset !== undefined) {
      Asset.encode(message.asset, writer.uint32(18).fork()).ldelim();
    }
    if (message.debtIssued !== "") {
      writer.uint32(26).string(message.debtIssued);
    }
    if (message.debtRepaid !== "") {
      writer.uint32(34).string(message.debtRepaid);
    }
    if (message.collateralDeposited !== "") {
      writer.uint32(42).string(message.collateralDeposited);
    }
    if (message.collateralWithdrawn !== "") {
      writer.uint32(50).string(message.collateralWithdrawn);
    }
    if (!message.lastOpenHeight.isZero()) {
      writer.uint32(72).int64(message.lastOpenHeight);
    }
    if (!message.lastRepayHeight.isZero()) {
      writer.uint32(80).int64(message.lastRepayHeight);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Loan {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLoan();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.owner = reader.string();
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

          message.debtIssued = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.debtRepaid = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.collateralDeposited = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.collateralWithdrawn = reader.string();
          continue;
        case 9:
          if (tag !== 72) {
            break;
          }

          message.lastOpenHeight = reader.int64() as Long;
          continue;
        case 10:
          if (tag !== 80) {
            break;
          }

          message.lastRepayHeight = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Loan {
    return {
      owner: isSet(object.owner) ? globalThis.String(object.owner) : "",
      asset: isSet(object.asset) ? Asset.fromJSON(object.asset) : undefined,
      debtIssued: isSet(object.debtIssued) ? globalThis.String(object.debtIssued) : "",
      debtRepaid: isSet(object.debtRepaid) ? globalThis.String(object.debtRepaid) : "",
      collateralDeposited: isSet(object.collateralDeposited) ? globalThis.String(object.collateralDeposited) : "",
      collateralWithdrawn: isSet(object.collateralWithdrawn) ? globalThis.String(object.collateralWithdrawn) : "",
      lastOpenHeight: isSet(object.lastOpenHeight) ? Long.fromValue(object.lastOpenHeight) : Long.ZERO,
      lastRepayHeight: isSet(object.lastRepayHeight) ? Long.fromValue(object.lastRepayHeight) : Long.ZERO,
    };
  },

  toJSON(message: Loan): unknown {
    const obj: any = {};
    if (message.owner !== "") {
      obj.owner = message.owner;
    }
    if (message.asset !== undefined) {
      obj.asset = Asset.toJSON(message.asset);
    }
    if (message.debtIssued !== "") {
      obj.debtIssued = message.debtIssued;
    }
    if (message.debtRepaid !== "") {
      obj.debtRepaid = message.debtRepaid;
    }
    if (message.collateralDeposited !== "") {
      obj.collateralDeposited = message.collateralDeposited;
    }
    if (message.collateralWithdrawn !== "") {
      obj.collateralWithdrawn = message.collateralWithdrawn;
    }
    if (!message.lastOpenHeight.isZero()) {
      obj.lastOpenHeight = (message.lastOpenHeight || Long.ZERO).toString();
    }
    if (!message.lastRepayHeight.isZero()) {
      obj.lastRepayHeight = (message.lastRepayHeight || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Loan>, I>>(base?: I): Loan {
    return Loan.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Loan>, I>>(object: I): Loan {
    const message = createBaseLoan();
    message.owner = object.owner ?? "";
    message.asset = (object.asset !== undefined && object.asset !== null) ? Asset.fromPartial(object.asset) : undefined;
    message.debtIssued = object.debtIssued ?? "";
    message.debtRepaid = object.debtRepaid ?? "";
    message.collateralDeposited = object.collateralDeposited ?? "";
    message.collateralWithdrawn = object.collateralWithdrawn ?? "";
    message.lastOpenHeight = (object.lastOpenHeight !== undefined && object.lastOpenHeight !== null)
      ? Long.fromValue(object.lastOpenHeight)
      : Long.ZERO;
    message.lastRepayHeight = (object.lastRepayHeight !== undefined && object.lastRepayHeight !== null)
      ? Long.fromValue(object.lastRepayHeight)
      : Long.ZERO;
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
