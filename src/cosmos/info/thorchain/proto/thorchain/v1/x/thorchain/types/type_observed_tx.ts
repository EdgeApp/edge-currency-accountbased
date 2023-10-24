/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Tx } from "../../../common/common";
import { TxOutItem } from "./type_tx_out";

export const protobufPackage = "types";

export enum Status {
  incomplete = 0,
  done = 1,
  reverted = 2,
  UNRECOGNIZED = -1,
}

export function statusFromJSON(object: any): Status {
  switch (object) {
    case 0:
    case "incomplete":
      return Status.incomplete;
    case 1:
    case "done":
      return Status.done;
    case 2:
    case "reverted":
      return Status.reverted;
    case -1:
    case "UNRECOGNIZED":
    default:
      return Status.UNRECOGNIZED;
  }
}

export function statusToJSON(object: Status): string {
  switch (object) {
    case Status.incomplete:
      return "incomplete";
    case Status.done:
      return "done";
    case Status.reverted:
      return "reverted";
    case Status.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface ObservedTx {
  tx?: Tx | undefined;
  status: Status;
  outHashes: string[];
  blockHeight: Long;
  signers: string[];
  observedPubKey: string;
  keysignMs: Long;
  finaliseHeight: Long;
  aggregator: string;
  aggregatorTarget: string;
  aggregatorTargetLimit: string;
}

export interface ObservedTxVoter {
  txId: string;
  tx?: ObservedTx | undefined;
  height: Long;
  txs: ObservedTx[];
  actions: TxOutItem[];
  outTxs: Tx[];
  finalisedHeight: Long;
  updatedVault: boolean;
  reverted: boolean;
  outboundHeight: Long;
}

function createBaseObservedTx(): ObservedTx {
  return {
    tx: undefined,
    status: 0,
    outHashes: [],
    blockHeight: Long.ZERO,
    signers: [],
    observedPubKey: "",
    keysignMs: Long.ZERO,
    finaliseHeight: Long.ZERO,
    aggregator: "",
    aggregatorTarget: "",
    aggregatorTargetLimit: "",
  };
}

export const ObservedTx = {
  encode(message: ObservedTx, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(10).fork()).ldelim();
    }
    if (message.status !== 0) {
      writer.uint32(16).int32(message.status);
    }
    for (const v of message.outHashes) {
      writer.uint32(26).string(v!);
    }
    if (!message.blockHeight.isZero()) {
      writer.uint32(32).int64(message.blockHeight);
    }
    for (const v of message.signers) {
      writer.uint32(42).string(v!);
    }
    if (message.observedPubKey !== "") {
      writer.uint32(50).string(message.observedPubKey);
    }
    if (!message.keysignMs.isZero()) {
      writer.uint32(56).int64(message.keysignMs);
    }
    if (!message.finaliseHeight.isZero()) {
      writer.uint32(64).int64(message.finaliseHeight);
    }
    if (message.aggregator !== "") {
      writer.uint32(74).string(message.aggregator);
    }
    if (message.aggregatorTarget !== "") {
      writer.uint32(82).string(message.aggregatorTarget);
    }
    if (message.aggregatorTargetLimit !== "") {
      writer.uint32(90).string(message.aggregatorTargetLimit);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ObservedTx {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseObservedTx();
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
          if (tag !== 16) {
            break;
          }

          message.status = reader.int32() as any;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.outHashes.push(reader.string());
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.blockHeight = reader.int64() as Long;
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.signers.push(reader.string());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.observedPubKey = reader.string();
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.keysignMs = reader.int64() as Long;
          continue;
        case 8:
          if (tag !== 64) {
            break;
          }

          message.finaliseHeight = reader.int64() as Long;
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.aggregator = reader.string();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.aggregatorTarget = reader.string();
          continue;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.aggregatorTargetLimit = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ObservedTx {
    return {
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
      status: isSet(object.status) ? statusFromJSON(object.status) : 0,
      outHashes: globalThis.Array.isArray(object?.outHashes)
        ? object.outHashes.map((e: any) => globalThis.String(e))
        : [],
      blockHeight: isSet(object.blockHeight) ? Long.fromValue(object.blockHeight) : Long.ZERO,
      signers: globalThis.Array.isArray(object?.signers) ? object.signers.map((e: any) => globalThis.String(e)) : [],
      observedPubKey: isSet(object.observedPubKey) ? globalThis.String(object.observedPubKey) : "",
      keysignMs: isSet(object.keysignMs) ? Long.fromValue(object.keysignMs) : Long.ZERO,
      finaliseHeight: isSet(object.finaliseHeight) ? Long.fromValue(object.finaliseHeight) : Long.ZERO,
      aggregator: isSet(object.aggregator) ? globalThis.String(object.aggregator) : "",
      aggregatorTarget: isSet(object.aggregatorTarget) ? globalThis.String(object.aggregatorTarget) : "",
      aggregatorTargetLimit: isSet(object.aggregatorTargetLimit) ? globalThis.String(object.aggregatorTargetLimit) : "",
    };
  },

  toJSON(message: ObservedTx): unknown {
    const obj: any = {};
    if (message.tx !== undefined) {
      obj.tx = Tx.toJSON(message.tx);
    }
    if (message.status !== 0) {
      obj.status = statusToJSON(message.status);
    }
    if (message.outHashes?.length) {
      obj.outHashes = message.outHashes;
    }
    if (!message.blockHeight.isZero()) {
      obj.blockHeight = (message.blockHeight || Long.ZERO).toString();
    }
    if (message.signers?.length) {
      obj.signers = message.signers;
    }
    if (message.observedPubKey !== "") {
      obj.observedPubKey = message.observedPubKey;
    }
    if (!message.keysignMs.isZero()) {
      obj.keysignMs = (message.keysignMs || Long.ZERO).toString();
    }
    if (!message.finaliseHeight.isZero()) {
      obj.finaliseHeight = (message.finaliseHeight || Long.ZERO).toString();
    }
    if (message.aggregator !== "") {
      obj.aggregator = message.aggregator;
    }
    if (message.aggregatorTarget !== "") {
      obj.aggregatorTarget = message.aggregatorTarget;
    }
    if (message.aggregatorTargetLimit !== "") {
      obj.aggregatorTargetLimit = message.aggregatorTargetLimit;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ObservedTx>, I>>(base?: I): ObservedTx {
    return ObservedTx.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ObservedTx>, I>>(object: I): ObservedTx {
    const message = createBaseObservedTx();
    message.tx = (object.tx !== undefined && object.tx !== null) ? Tx.fromPartial(object.tx) : undefined;
    message.status = object.status ?? 0;
    message.outHashes = object.outHashes?.map((e) => e) || [];
    message.blockHeight = (object.blockHeight !== undefined && object.blockHeight !== null)
      ? Long.fromValue(object.blockHeight)
      : Long.ZERO;
    message.signers = object.signers?.map((e) => e) || [];
    message.observedPubKey = object.observedPubKey ?? "";
    message.keysignMs = (object.keysignMs !== undefined && object.keysignMs !== null)
      ? Long.fromValue(object.keysignMs)
      : Long.ZERO;
    message.finaliseHeight = (object.finaliseHeight !== undefined && object.finaliseHeight !== null)
      ? Long.fromValue(object.finaliseHeight)
      : Long.ZERO;
    message.aggregator = object.aggregator ?? "";
    message.aggregatorTarget = object.aggregatorTarget ?? "";
    message.aggregatorTargetLimit = object.aggregatorTargetLimit ?? "";
    return message;
  },
};

function createBaseObservedTxVoter(): ObservedTxVoter {
  return {
    txId: "",
    tx: undefined,
    height: Long.ZERO,
    txs: [],
    actions: [],
    outTxs: [],
    finalisedHeight: Long.ZERO,
    updatedVault: false,
    reverted: false,
    outboundHeight: Long.ZERO,
  };
}

export const ObservedTxVoter = {
  encode(message: ObservedTxVoter, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.txId !== "") {
      writer.uint32(10).string(message.txId);
    }
    if (message.tx !== undefined) {
      ObservedTx.encode(message.tx, writer.uint32(18).fork()).ldelim();
    }
    if (!message.height.isZero()) {
      writer.uint32(24).int64(message.height);
    }
    for (const v of message.txs) {
      ObservedTx.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.actions) {
      TxOutItem.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    for (const v of message.outTxs) {
      Tx.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    if (!message.finalisedHeight.isZero()) {
      writer.uint32(56).int64(message.finalisedHeight);
    }
    if (message.updatedVault === true) {
      writer.uint32(64).bool(message.updatedVault);
    }
    if (message.reverted === true) {
      writer.uint32(72).bool(message.reverted);
    }
    if (!message.outboundHeight.isZero()) {
      writer.uint32(80).int64(message.outboundHeight);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ObservedTxVoter {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseObservedTxVoter();
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

          message.tx = ObservedTx.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.height = reader.int64() as Long;
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.txs.push(ObservedTx.decode(reader, reader.uint32()));
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.actions.push(TxOutItem.decode(reader, reader.uint32()));
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.outTxs.push(Tx.decode(reader, reader.uint32()));
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.finalisedHeight = reader.int64() as Long;
          continue;
        case 8:
          if (tag !== 64) {
            break;
          }

          message.updatedVault = reader.bool();
          continue;
        case 9:
          if (tag !== 72) {
            break;
          }

          message.reverted = reader.bool();
          continue;
        case 10:
          if (tag !== 80) {
            break;
          }

          message.outboundHeight = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ObservedTxVoter {
    return {
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
      tx: isSet(object.tx) ? ObservedTx.fromJSON(object.tx) : undefined,
      height: isSet(object.height) ? Long.fromValue(object.height) : Long.ZERO,
      txs: globalThis.Array.isArray(object?.txs) ? object.txs.map((e: any) => ObservedTx.fromJSON(e)) : [],
      actions: globalThis.Array.isArray(object?.actions) ? object.actions.map((e: any) => TxOutItem.fromJSON(e)) : [],
      outTxs: globalThis.Array.isArray(object?.outTxs) ? object.outTxs.map((e: any) => Tx.fromJSON(e)) : [],
      finalisedHeight: isSet(object.finalisedHeight) ? Long.fromValue(object.finalisedHeight) : Long.ZERO,
      updatedVault: isSet(object.updatedVault) ? globalThis.Boolean(object.updatedVault) : false,
      reverted: isSet(object.reverted) ? globalThis.Boolean(object.reverted) : false,
      outboundHeight: isSet(object.outboundHeight) ? Long.fromValue(object.outboundHeight) : Long.ZERO,
    };
  },

  toJSON(message: ObservedTxVoter): unknown {
    const obj: any = {};
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    if (message.tx !== undefined) {
      obj.tx = ObservedTx.toJSON(message.tx);
    }
    if (!message.height.isZero()) {
      obj.height = (message.height || Long.ZERO).toString();
    }
    if (message.txs?.length) {
      obj.txs = message.txs.map((e) => ObservedTx.toJSON(e));
    }
    if (message.actions?.length) {
      obj.actions = message.actions.map((e) => TxOutItem.toJSON(e));
    }
    if (message.outTxs?.length) {
      obj.outTxs = message.outTxs.map((e) => Tx.toJSON(e));
    }
    if (!message.finalisedHeight.isZero()) {
      obj.finalisedHeight = (message.finalisedHeight || Long.ZERO).toString();
    }
    if (message.updatedVault === true) {
      obj.updatedVault = message.updatedVault;
    }
    if (message.reverted === true) {
      obj.reverted = message.reverted;
    }
    if (!message.outboundHeight.isZero()) {
      obj.outboundHeight = (message.outboundHeight || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ObservedTxVoter>, I>>(base?: I): ObservedTxVoter {
    return ObservedTxVoter.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ObservedTxVoter>, I>>(object: I): ObservedTxVoter {
    const message = createBaseObservedTxVoter();
    message.txId = object.txId ?? "";
    message.tx = (object.tx !== undefined && object.tx !== null) ? ObservedTx.fromPartial(object.tx) : undefined;
    message.height = (object.height !== undefined && object.height !== null)
      ? Long.fromValue(object.height)
      : Long.ZERO;
    message.txs = object.txs?.map((e) => ObservedTx.fromPartial(e)) || [];
    message.actions = object.actions?.map((e) => TxOutItem.fromPartial(e)) || [];
    message.outTxs = object.outTxs?.map((e) => Tx.fromPartial(e)) || [];
    message.finalisedHeight = (object.finalisedHeight !== undefined && object.finalisedHeight !== null)
      ? Long.fromValue(object.finalisedHeight)
      : Long.ZERO;
    message.updatedVault = object.updatedVault ?? false;
    message.reverted = object.reverted ?? false;
    message.outboundHeight = (object.outboundHeight !== undefined && object.outboundHeight !== null)
      ? Long.fromValue(object.outboundHeight)
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
