/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Asset, Coin, Fee, Tx } from "../../../common/common";
import { PoolStatus, poolStatusFromJSON, poolStatusToJSON } from "./type_pool";
import { ReserveContributor } from "./type_reserve_contributor";
import { TxOutItem } from "./type_tx_out";

export const protobufPackage = "types";

export enum PendingLiquidityType {
  add = 0,
  withdraw = 1,
  UNRECOGNIZED = -1,
}

export function pendingLiquidityTypeFromJSON(object: any): PendingLiquidityType {
  switch (object) {
    case 0:
    case "add":
      return PendingLiquidityType.add;
    case 1:
    case "withdraw":
      return PendingLiquidityType.withdraw;
    case -1:
    case "UNRECOGNIZED":
    default:
      return PendingLiquidityType.UNRECOGNIZED;
  }
}

export function pendingLiquidityTypeToJSON(object: PendingLiquidityType): string {
  switch (object) {
    case PendingLiquidityType.add:
      return "add";
    case PendingLiquidityType.withdraw:
      return "withdraw";
    case PendingLiquidityType.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export enum BondType {
  bond_paid = 0,
  bond_returned = 1,
  bond_reward = 2,
  bond_cost = 3,
  UNRECOGNIZED = -1,
}

export function bondTypeFromJSON(object: any): BondType {
  switch (object) {
    case 0:
    case "bond_paid":
      return BondType.bond_paid;
    case 1:
    case "bond_returned":
      return BondType.bond_returned;
    case 2:
    case "bond_reward":
      return BondType.bond_reward;
    case 3:
    case "bond_cost":
      return BondType.bond_cost;
    case -1:
    case "UNRECOGNIZED":
    default:
      return BondType.UNRECOGNIZED;
  }
}

export function bondTypeToJSON(object: BondType): string {
  switch (object) {
    case BondType.bond_paid:
      return "bond_paid";
    case BondType.bond_returned:
      return "bond_returned";
    case BondType.bond_reward:
      return "bond_reward";
    case BondType.bond_cost:
      return "bond_cost";
    case BondType.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export enum MintBurnSupplyType {
  mint = 0,
  burn = 1,
  UNRECOGNIZED = -1,
}

export function mintBurnSupplyTypeFromJSON(object: any): MintBurnSupplyType {
  switch (object) {
    case 0:
    case "mint":
      return MintBurnSupplyType.mint;
    case 1:
    case "burn":
      return MintBurnSupplyType.burn;
    case -1:
    case "UNRECOGNIZED":
    default:
      return MintBurnSupplyType.UNRECOGNIZED;
  }
}

export function mintBurnSupplyTypeToJSON(object: MintBurnSupplyType): string {
  switch (object) {
    case MintBurnSupplyType.mint:
      return "mint";
    case MintBurnSupplyType.burn:
      return "burn";
    case MintBurnSupplyType.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface PoolMod {
  asset?: Asset | undefined;
  runeAmt: string;
  runeAdd: boolean;
  assetAmt: string;
  assetAdd: boolean;
}

export interface EventLimitOrder {
  source?: Coin | undefined;
  target?: Coin | undefined;
  txId: string;
}

export interface EventStreamingSwap {
  txId: string;
  interval: Long;
  quantity: Long;
  count: Long;
  lastHeight: Long;
  tradeTarget: string;
  deposit?: Coin | undefined;
  in?: Coin | undefined;
  out?: Coin | undefined;
  failedSwaps: Long[];
  failedSwapReasons: string[];
}

export interface EventSwap {
  pool?: Asset | undefined;
  swapTarget: string;
  swapSlip: string;
  liquidityFee: string;
  liquidityFeeInRune: string;
  inTx?: Tx | undefined;
  outTxs?: Tx | undefined;
  emitAsset?: Coin | undefined;
  synthUnits: string;
  streamingSwapQuantity: Long;
  streamingSwapCount: Long;
}

export interface EventAddLiquidity {
  pool?: Asset | undefined;
  providerUnits: string;
  runeAddress: string;
  runeAmount: string;
  assetAmount: string;
  runeTxId: string;
  assetTxId: string;
  assetAddress: string;
}

export interface EventWithdraw {
  pool?: Asset | undefined;
  providerUnits: string;
  basisPoints: Long;
  asymmetry: Uint8Array;
  inTx?: Tx | undefined;
  emitAsset: string;
  emitRune: string;
  impLossProtection: string;
}

export interface EventPendingLiquidity {
  pool?: Asset | undefined;
  pendingType: PendingLiquidityType;
  runeAddress: string;
  runeAmount: string;
  assetAddress: string;
  assetAmount: string;
  runeTxId: string;
  assetTxId: string;
}

export interface EventDonate {
  pool?: Asset | undefined;
  inTx?: Tx | undefined;
}

export interface EventPool {
  pool?: Asset | undefined;
  Status: PoolStatus;
}

export interface PoolAmt {
  asset?: Asset | undefined;
  amount: Long;
}

export interface EventRewards {
  bondReward: string;
  poolRewards: PoolAmt[];
}

export interface EventRefund {
  code: number;
  reason: string;
  inTx?: Tx | undefined;
  fee?: Fee | undefined;
}

export interface EventBond {
  amount: string;
  bondType: BondType;
  txIn?: Tx | undefined;
}

export interface GasPool {
  asset?: Asset | undefined;
  runeAmt: string;
  assetAmt: string;
  count: Long;
}

export interface EventGas {
  pools: GasPool[];
}

export interface EventReserve {
  reserveContributor?: ReserveContributor | undefined;
  inTx?: Tx | undefined;
}

export interface EventScheduledOutbound {
  outTx?: TxOutItem | undefined;
}

export interface EventSecurity {
  msg: string;
  tx?: Tx | undefined;
}

export interface EventSlash {
  pool?: Asset | undefined;
  slashAmount: PoolAmt[];
}

export interface EventErrata {
  txId: string;
  pools: PoolMod[];
}

export interface EventFee {
  txId: string;
  fee?: Fee | undefined;
  synthUnits: string;
}

export interface EventOutbound {
  inTxId: string;
  tx?: Tx | undefined;
}

export interface EventTssKeygenSuccess {
  pubKey: string;
  members: string[];
  height: Long;
}

export interface EventTssKeygenFailure {
  failReason: string;
  isUnicast: boolean;
  blameNodes: string[];
  round: string;
  height: Long;
}

export interface EventTssKeygenMetric {
  pubKey: string;
  medianDurationMs: Long;
}

export interface EventTssKeysignMetric {
  txId: string;
  medianDurationMs: Long;
}

export interface EventSlashPoint {
  nodeAddress: Uint8Array;
  slashPoints: Long;
  reason: string;
}

export interface EventPoolBalanceChanged {
  poolChange?: PoolMod | undefined;
  reason: string;
}

/** TODO remove on hard fork */
export interface EventSwitch {
  toAddress: Uint8Array;
  fromAddress: string;
  burn?: Coin | undefined;
  txId: string;
}

/** TODO remove on hard fork */
export interface EventSwitchV87 {
  toAddress: Uint8Array;
  fromAddress: string;
  burn?: Coin | undefined;
  txId: string;
  mint: string;
}

export interface EventMintBurn {
  supply: MintBurnSupplyType;
  denom: string;
  amount: string;
  reason: string;
}

export interface EventLoanOpen {
  collateralDeposited: string;
  collateralAsset?: Asset | undefined;
  collateralizationRatio: string;
  debtIssued: string;
  owner: string;
  targetAsset?: Asset | undefined;
  txId: string;
}

export interface EventLoanRepayment {
  collateralWithdrawn: string;
  collateralAsset?: Asset | undefined;
  debtRepaid: string;
  owner: string;
  txId: string;
}

export interface EventTHORName {
  name: string;
  chain: string;
  address: string;
  registrationFee: string;
  fundAmt: string;
  expire: Long;
  owner: Uint8Array;
}

export interface EventSetMimir {
  key: string;
  value: string;
}

export interface EventSetNodeMimir {
  key: string;
  value: string;
  address: string;
}

export interface EventVersion {
  version: string;
}

function createBasePoolMod(): PoolMod {
  return { asset: undefined, runeAmt: "", runeAdd: false, assetAmt: "", assetAdd: false };
}

export const PoolMod = {
  encode(message: PoolMod, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.asset !== undefined) {
      Asset.encode(message.asset, writer.uint32(10).fork()).ldelim();
    }
    if (message.runeAmt !== "") {
      writer.uint32(18).string(message.runeAmt);
    }
    if (message.runeAdd === true) {
      writer.uint32(24).bool(message.runeAdd);
    }
    if (message.assetAmt !== "") {
      writer.uint32(34).string(message.assetAmt);
    }
    if (message.assetAdd === true) {
      writer.uint32(40).bool(message.assetAdd);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PoolMod {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePoolMod();
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

          message.runeAmt = reader.string();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.runeAdd = reader.bool();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.assetAmt = reader.string();
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.assetAdd = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PoolMod {
    return {
      asset: isSet(object.asset) ? Asset.fromJSON(object.asset) : undefined,
      runeAmt: isSet(object.runeAmt) ? globalThis.String(object.runeAmt) : "",
      runeAdd: isSet(object.runeAdd) ? globalThis.Boolean(object.runeAdd) : false,
      assetAmt: isSet(object.assetAmt) ? globalThis.String(object.assetAmt) : "",
      assetAdd: isSet(object.assetAdd) ? globalThis.Boolean(object.assetAdd) : false,
    };
  },

  toJSON(message: PoolMod): unknown {
    const obj: any = {};
    if (message.asset !== undefined) {
      obj.asset = Asset.toJSON(message.asset);
    }
    if (message.runeAmt !== "") {
      obj.runeAmt = message.runeAmt;
    }
    if (message.runeAdd === true) {
      obj.runeAdd = message.runeAdd;
    }
    if (message.assetAmt !== "") {
      obj.assetAmt = message.assetAmt;
    }
    if (message.assetAdd === true) {
      obj.assetAdd = message.assetAdd;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PoolMod>, I>>(base?: I): PoolMod {
    return PoolMod.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PoolMod>, I>>(object: I): PoolMod {
    const message = createBasePoolMod();
    message.asset = (object.asset !== undefined && object.asset !== null) ? Asset.fromPartial(object.asset) : undefined;
    message.runeAmt = object.runeAmt ?? "";
    message.runeAdd = object.runeAdd ?? false;
    message.assetAmt = object.assetAmt ?? "";
    message.assetAdd = object.assetAdd ?? false;
    return message;
  },
};

function createBaseEventLimitOrder(): EventLimitOrder {
  return { source: undefined, target: undefined, txId: "" };
}

export const EventLimitOrder = {
  encode(message: EventLimitOrder, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.source !== undefined) {
      Coin.encode(message.source, writer.uint32(10).fork()).ldelim();
    }
    if (message.target !== undefined) {
      Coin.encode(message.target, writer.uint32(18).fork()).ldelim();
    }
    if (message.txId !== "") {
      writer.uint32(26).string(message.txId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventLimitOrder {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventLimitOrder();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.source = Coin.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.target = Coin.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.txId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventLimitOrder {
    return {
      source: isSet(object.source) ? Coin.fromJSON(object.source) : undefined,
      target: isSet(object.target) ? Coin.fromJSON(object.target) : undefined,
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
    };
  },

  toJSON(message: EventLimitOrder): unknown {
    const obj: any = {};
    if (message.source !== undefined) {
      obj.source = Coin.toJSON(message.source);
    }
    if (message.target !== undefined) {
      obj.target = Coin.toJSON(message.target);
    }
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventLimitOrder>, I>>(base?: I): EventLimitOrder {
    return EventLimitOrder.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventLimitOrder>, I>>(object: I): EventLimitOrder {
    const message = createBaseEventLimitOrder();
    message.source = (object.source !== undefined && object.source !== null)
      ? Coin.fromPartial(object.source)
      : undefined;
    message.target = (object.target !== undefined && object.target !== null)
      ? Coin.fromPartial(object.target)
      : undefined;
    message.txId = object.txId ?? "";
    return message;
  },
};

function createBaseEventStreamingSwap(): EventStreamingSwap {
  return {
    txId: "",
    interval: Long.UZERO,
    quantity: Long.UZERO,
    count: Long.UZERO,
    lastHeight: Long.ZERO,
    tradeTarget: "",
    deposit: undefined,
    in: undefined,
    out: undefined,
    failedSwaps: [],
    failedSwapReasons: [],
  };
}

export const EventStreamingSwap = {
  encode(message: EventStreamingSwap, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.txId !== "") {
      writer.uint32(10).string(message.txId);
    }
    if (!message.interval.isZero()) {
      writer.uint32(16).uint64(message.interval);
    }
    if (!message.quantity.isZero()) {
      writer.uint32(24).uint64(message.quantity);
    }
    if (!message.count.isZero()) {
      writer.uint32(32).uint64(message.count);
    }
    if (!message.lastHeight.isZero()) {
      writer.uint32(40).int64(message.lastHeight);
    }
    if (message.tradeTarget !== "") {
      writer.uint32(50).string(message.tradeTarget);
    }
    if (message.deposit !== undefined) {
      Coin.encode(message.deposit, writer.uint32(58).fork()).ldelim();
    }
    if (message.in !== undefined) {
      Coin.encode(message.in, writer.uint32(66).fork()).ldelim();
    }
    if (message.out !== undefined) {
      Coin.encode(message.out, writer.uint32(74).fork()).ldelim();
    }
    writer.uint32(82).fork();
    for (const v of message.failedSwaps) {
      writer.uint64(v);
    }
    writer.ldelim();
    for (const v of message.failedSwapReasons) {
      writer.uint32(90).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventStreamingSwap {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventStreamingSwap();
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
          if (tag !== 16) {
            break;
          }

          message.interval = reader.uint64() as Long;
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.quantity = reader.uint64() as Long;
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.count = reader.uint64() as Long;
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.lastHeight = reader.int64() as Long;
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.tradeTarget = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.deposit = Coin.decode(reader, reader.uint32());
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.in = Coin.decode(reader, reader.uint32());
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.out = Coin.decode(reader, reader.uint32());
          continue;
        case 10:
          if (tag === 80) {
            message.failedSwaps.push(reader.uint64() as Long);

            continue;
          }

          if (tag === 82) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.failedSwaps.push(reader.uint64() as Long);
            }

            continue;
          }

          break;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.failedSwapReasons.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventStreamingSwap {
    return {
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
      interval: isSet(object.interval) ? Long.fromValue(object.interval) : Long.UZERO,
      quantity: isSet(object.quantity) ? Long.fromValue(object.quantity) : Long.UZERO,
      count: isSet(object.count) ? Long.fromValue(object.count) : Long.UZERO,
      lastHeight: isSet(object.lastHeight) ? Long.fromValue(object.lastHeight) : Long.ZERO,
      tradeTarget: isSet(object.tradeTarget) ? globalThis.String(object.tradeTarget) : "",
      deposit: isSet(object.deposit) ? Coin.fromJSON(object.deposit) : undefined,
      in: isSet(object.in) ? Coin.fromJSON(object.in) : undefined,
      out: isSet(object.out) ? Coin.fromJSON(object.out) : undefined,
      failedSwaps: globalThis.Array.isArray(object?.failedSwaps)
        ? object.failedSwaps.map((e: any) => Long.fromValue(e))
        : [],
      failedSwapReasons: globalThis.Array.isArray(object?.failedSwapReasons)
        ? object.failedSwapReasons.map((e: any) => globalThis.String(e))
        : [],
    };
  },

  toJSON(message: EventStreamingSwap): unknown {
    const obj: any = {};
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    if (!message.interval.isZero()) {
      obj.interval = (message.interval || Long.UZERO).toString();
    }
    if (!message.quantity.isZero()) {
      obj.quantity = (message.quantity || Long.UZERO).toString();
    }
    if (!message.count.isZero()) {
      obj.count = (message.count || Long.UZERO).toString();
    }
    if (!message.lastHeight.isZero()) {
      obj.lastHeight = (message.lastHeight || Long.ZERO).toString();
    }
    if (message.tradeTarget !== "") {
      obj.tradeTarget = message.tradeTarget;
    }
    if (message.deposit !== undefined) {
      obj.deposit = Coin.toJSON(message.deposit);
    }
    if (message.in !== undefined) {
      obj.in = Coin.toJSON(message.in);
    }
    if (message.out !== undefined) {
      obj.out = Coin.toJSON(message.out);
    }
    if (message.failedSwaps?.length) {
      obj.failedSwaps = message.failedSwaps.map((e) => (e || Long.UZERO).toString());
    }
    if (message.failedSwapReasons?.length) {
      obj.failedSwapReasons = message.failedSwapReasons;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventStreamingSwap>, I>>(base?: I): EventStreamingSwap {
    return EventStreamingSwap.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventStreamingSwap>, I>>(object: I): EventStreamingSwap {
    const message = createBaseEventStreamingSwap();
    message.txId = object.txId ?? "";
    message.interval = (object.interval !== undefined && object.interval !== null)
      ? Long.fromValue(object.interval)
      : Long.UZERO;
    message.quantity = (object.quantity !== undefined && object.quantity !== null)
      ? Long.fromValue(object.quantity)
      : Long.UZERO;
    message.count = (object.count !== undefined && object.count !== null) ? Long.fromValue(object.count) : Long.UZERO;
    message.lastHeight = (object.lastHeight !== undefined && object.lastHeight !== null)
      ? Long.fromValue(object.lastHeight)
      : Long.ZERO;
    message.tradeTarget = object.tradeTarget ?? "";
    message.deposit = (object.deposit !== undefined && object.deposit !== null)
      ? Coin.fromPartial(object.deposit)
      : undefined;
    message.in = (object.in !== undefined && object.in !== null) ? Coin.fromPartial(object.in) : undefined;
    message.out = (object.out !== undefined && object.out !== null) ? Coin.fromPartial(object.out) : undefined;
    message.failedSwaps = object.failedSwaps?.map((e) => Long.fromValue(e)) || [];
    message.failedSwapReasons = object.failedSwapReasons?.map((e) => e) || [];
    return message;
  },
};

function createBaseEventSwap(): EventSwap {
  return {
    pool: undefined,
    swapTarget: "",
    swapSlip: "",
    liquidityFee: "",
    liquidityFeeInRune: "",
    inTx: undefined,
    outTxs: undefined,
    emitAsset: undefined,
    synthUnits: "",
    streamingSwapQuantity: Long.UZERO,
    streamingSwapCount: Long.UZERO,
  };
}

export const EventSwap = {
  encode(message: EventSwap, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pool !== undefined) {
      Asset.encode(message.pool, writer.uint32(10).fork()).ldelim();
    }
    if (message.swapTarget !== "") {
      writer.uint32(18).string(message.swapTarget);
    }
    if (message.swapSlip !== "") {
      writer.uint32(26).string(message.swapSlip);
    }
    if (message.liquidityFee !== "") {
      writer.uint32(34).string(message.liquidityFee);
    }
    if (message.liquidityFeeInRune !== "") {
      writer.uint32(42).string(message.liquidityFeeInRune);
    }
    if (message.inTx !== undefined) {
      Tx.encode(message.inTx, writer.uint32(50).fork()).ldelim();
    }
    if (message.outTxs !== undefined) {
      Tx.encode(message.outTxs, writer.uint32(58).fork()).ldelim();
    }
    if (message.emitAsset !== undefined) {
      Coin.encode(message.emitAsset, writer.uint32(66).fork()).ldelim();
    }
    if (message.synthUnits !== "") {
      writer.uint32(74).string(message.synthUnits);
    }
    if (!message.streamingSwapQuantity.isZero()) {
      writer.uint32(80).uint64(message.streamingSwapQuantity);
    }
    if (!message.streamingSwapCount.isZero()) {
      writer.uint32(88).uint64(message.streamingSwapCount);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventSwap {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventSwap();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pool = Asset.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.swapTarget = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.swapSlip = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.liquidityFee = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.liquidityFeeInRune = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.inTx = Tx.decode(reader, reader.uint32());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.outTxs = Tx.decode(reader, reader.uint32());
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.emitAsset = Coin.decode(reader, reader.uint32());
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.synthUnits = reader.string();
          continue;
        case 10:
          if (tag !== 80) {
            break;
          }

          message.streamingSwapQuantity = reader.uint64() as Long;
          continue;
        case 11:
          if (tag !== 88) {
            break;
          }

          message.streamingSwapCount = reader.uint64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventSwap {
    return {
      pool: isSet(object.pool) ? Asset.fromJSON(object.pool) : undefined,
      swapTarget: isSet(object.swapTarget) ? globalThis.String(object.swapTarget) : "",
      swapSlip: isSet(object.swapSlip) ? globalThis.String(object.swapSlip) : "",
      liquidityFee: isSet(object.liquidityFee) ? globalThis.String(object.liquidityFee) : "",
      liquidityFeeInRune: isSet(object.liquidityFeeInRune) ? globalThis.String(object.liquidityFeeInRune) : "",
      inTx: isSet(object.inTx) ? Tx.fromJSON(object.inTx) : undefined,
      outTxs: isSet(object.outTxs) ? Tx.fromJSON(object.outTxs) : undefined,
      emitAsset: isSet(object.emitAsset) ? Coin.fromJSON(object.emitAsset) : undefined,
      synthUnits: isSet(object.synthUnits) ? globalThis.String(object.synthUnits) : "",
      streamingSwapQuantity: isSet(object.streamingSwapQuantity)
        ? Long.fromValue(object.streamingSwapQuantity)
        : Long.UZERO,
      streamingSwapCount: isSet(object.streamingSwapCount) ? Long.fromValue(object.streamingSwapCount) : Long.UZERO,
    };
  },

  toJSON(message: EventSwap): unknown {
    const obj: any = {};
    if (message.pool !== undefined) {
      obj.pool = Asset.toJSON(message.pool);
    }
    if (message.swapTarget !== "") {
      obj.swapTarget = message.swapTarget;
    }
    if (message.swapSlip !== "") {
      obj.swapSlip = message.swapSlip;
    }
    if (message.liquidityFee !== "") {
      obj.liquidityFee = message.liquidityFee;
    }
    if (message.liquidityFeeInRune !== "") {
      obj.liquidityFeeInRune = message.liquidityFeeInRune;
    }
    if (message.inTx !== undefined) {
      obj.inTx = Tx.toJSON(message.inTx);
    }
    if (message.outTxs !== undefined) {
      obj.outTxs = Tx.toJSON(message.outTxs);
    }
    if (message.emitAsset !== undefined) {
      obj.emitAsset = Coin.toJSON(message.emitAsset);
    }
    if (message.synthUnits !== "") {
      obj.synthUnits = message.synthUnits;
    }
    if (!message.streamingSwapQuantity.isZero()) {
      obj.streamingSwapQuantity = (message.streamingSwapQuantity || Long.UZERO).toString();
    }
    if (!message.streamingSwapCount.isZero()) {
      obj.streamingSwapCount = (message.streamingSwapCount || Long.UZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventSwap>, I>>(base?: I): EventSwap {
    return EventSwap.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventSwap>, I>>(object: I): EventSwap {
    const message = createBaseEventSwap();
    message.pool = (object.pool !== undefined && object.pool !== null) ? Asset.fromPartial(object.pool) : undefined;
    message.swapTarget = object.swapTarget ?? "";
    message.swapSlip = object.swapSlip ?? "";
    message.liquidityFee = object.liquidityFee ?? "";
    message.liquidityFeeInRune = object.liquidityFeeInRune ?? "";
    message.inTx = (object.inTx !== undefined && object.inTx !== null) ? Tx.fromPartial(object.inTx) : undefined;
    message.outTxs = (object.outTxs !== undefined && object.outTxs !== null)
      ? Tx.fromPartial(object.outTxs)
      : undefined;
    message.emitAsset = (object.emitAsset !== undefined && object.emitAsset !== null)
      ? Coin.fromPartial(object.emitAsset)
      : undefined;
    message.synthUnits = object.synthUnits ?? "";
    message.streamingSwapQuantity =
      (object.streamingSwapQuantity !== undefined && object.streamingSwapQuantity !== null)
        ? Long.fromValue(object.streamingSwapQuantity)
        : Long.UZERO;
    message.streamingSwapCount = (object.streamingSwapCount !== undefined && object.streamingSwapCount !== null)
      ? Long.fromValue(object.streamingSwapCount)
      : Long.UZERO;
    return message;
  },
};

function createBaseEventAddLiquidity(): EventAddLiquidity {
  return {
    pool: undefined,
    providerUnits: "",
    runeAddress: "",
    runeAmount: "",
    assetAmount: "",
    runeTxId: "",
    assetTxId: "",
    assetAddress: "",
  };
}

export const EventAddLiquidity = {
  encode(message: EventAddLiquidity, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pool !== undefined) {
      Asset.encode(message.pool, writer.uint32(10).fork()).ldelim();
    }
    if (message.providerUnits !== "") {
      writer.uint32(18).string(message.providerUnits);
    }
    if (message.runeAddress !== "") {
      writer.uint32(26).string(message.runeAddress);
    }
    if (message.runeAmount !== "") {
      writer.uint32(34).string(message.runeAmount);
    }
    if (message.assetAmount !== "") {
      writer.uint32(42).string(message.assetAmount);
    }
    if (message.runeTxId !== "") {
      writer.uint32(50).string(message.runeTxId);
    }
    if (message.assetTxId !== "") {
      writer.uint32(58).string(message.assetTxId);
    }
    if (message.assetAddress !== "") {
      writer.uint32(66).string(message.assetAddress);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventAddLiquidity {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventAddLiquidity();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pool = Asset.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.providerUnits = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.runeAddress = reader.string();
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

          message.assetAmount = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.runeTxId = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.assetTxId = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.assetAddress = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventAddLiquidity {
    return {
      pool: isSet(object.pool) ? Asset.fromJSON(object.pool) : undefined,
      providerUnits: isSet(object.providerUnits) ? globalThis.String(object.providerUnits) : "",
      runeAddress: isSet(object.runeAddress) ? globalThis.String(object.runeAddress) : "",
      runeAmount: isSet(object.runeAmount) ? globalThis.String(object.runeAmount) : "",
      assetAmount: isSet(object.assetAmount) ? globalThis.String(object.assetAmount) : "",
      runeTxId: isSet(object.runeTxId) ? globalThis.String(object.runeTxId) : "",
      assetTxId: isSet(object.assetTxId) ? globalThis.String(object.assetTxId) : "",
      assetAddress: isSet(object.assetAddress) ? globalThis.String(object.assetAddress) : "",
    };
  },

  toJSON(message: EventAddLiquidity): unknown {
    const obj: any = {};
    if (message.pool !== undefined) {
      obj.pool = Asset.toJSON(message.pool);
    }
    if (message.providerUnits !== "") {
      obj.providerUnits = message.providerUnits;
    }
    if (message.runeAddress !== "") {
      obj.runeAddress = message.runeAddress;
    }
    if (message.runeAmount !== "") {
      obj.runeAmount = message.runeAmount;
    }
    if (message.assetAmount !== "") {
      obj.assetAmount = message.assetAmount;
    }
    if (message.runeTxId !== "") {
      obj.runeTxId = message.runeTxId;
    }
    if (message.assetTxId !== "") {
      obj.assetTxId = message.assetTxId;
    }
    if (message.assetAddress !== "") {
      obj.assetAddress = message.assetAddress;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventAddLiquidity>, I>>(base?: I): EventAddLiquidity {
    return EventAddLiquidity.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventAddLiquidity>, I>>(object: I): EventAddLiquidity {
    const message = createBaseEventAddLiquidity();
    message.pool = (object.pool !== undefined && object.pool !== null) ? Asset.fromPartial(object.pool) : undefined;
    message.providerUnits = object.providerUnits ?? "";
    message.runeAddress = object.runeAddress ?? "";
    message.runeAmount = object.runeAmount ?? "";
    message.assetAmount = object.assetAmount ?? "";
    message.runeTxId = object.runeTxId ?? "";
    message.assetTxId = object.assetTxId ?? "";
    message.assetAddress = object.assetAddress ?? "";
    return message;
  },
};

function createBaseEventWithdraw(): EventWithdraw {
  return {
    pool: undefined,
    providerUnits: "",
    basisPoints: Long.ZERO,
    asymmetry: new Uint8Array(0),
    inTx: undefined,
    emitAsset: "",
    emitRune: "",
    impLossProtection: "",
  };
}

export const EventWithdraw = {
  encode(message: EventWithdraw, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pool !== undefined) {
      Asset.encode(message.pool, writer.uint32(10).fork()).ldelim();
    }
    if (message.providerUnits !== "") {
      writer.uint32(18).string(message.providerUnits);
    }
    if (!message.basisPoints.isZero()) {
      writer.uint32(24).int64(message.basisPoints);
    }
    if (message.asymmetry.length !== 0) {
      writer.uint32(34).bytes(message.asymmetry);
    }
    if (message.inTx !== undefined) {
      Tx.encode(message.inTx, writer.uint32(42).fork()).ldelim();
    }
    if (message.emitAsset !== "") {
      writer.uint32(50).string(message.emitAsset);
    }
    if (message.emitRune !== "") {
      writer.uint32(58).string(message.emitRune);
    }
    if (message.impLossProtection !== "") {
      writer.uint32(66).string(message.impLossProtection);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventWithdraw {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventWithdraw();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pool = Asset.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.providerUnits = reader.string();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.basisPoints = reader.int64() as Long;
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.asymmetry = reader.bytes();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.inTx = Tx.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.emitAsset = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.emitRune = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.impLossProtection = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventWithdraw {
    return {
      pool: isSet(object.pool) ? Asset.fromJSON(object.pool) : undefined,
      providerUnits: isSet(object.providerUnits) ? globalThis.String(object.providerUnits) : "",
      basisPoints: isSet(object.basisPoints) ? Long.fromValue(object.basisPoints) : Long.ZERO,
      asymmetry: isSet(object.asymmetry) ? bytesFromBase64(object.asymmetry) : new Uint8Array(0),
      inTx: isSet(object.inTx) ? Tx.fromJSON(object.inTx) : undefined,
      emitAsset: isSet(object.emitAsset) ? globalThis.String(object.emitAsset) : "",
      emitRune: isSet(object.emitRune) ? globalThis.String(object.emitRune) : "",
      impLossProtection: isSet(object.impLossProtection) ? globalThis.String(object.impLossProtection) : "",
    };
  },

  toJSON(message: EventWithdraw): unknown {
    const obj: any = {};
    if (message.pool !== undefined) {
      obj.pool = Asset.toJSON(message.pool);
    }
    if (message.providerUnits !== "") {
      obj.providerUnits = message.providerUnits;
    }
    if (!message.basisPoints.isZero()) {
      obj.basisPoints = (message.basisPoints || Long.ZERO).toString();
    }
    if (message.asymmetry.length !== 0) {
      obj.asymmetry = base64FromBytes(message.asymmetry);
    }
    if (message.inTx !== undefined) {
      obj.inTx = Tx.toJSON(message.inTx);
    }
    if (message.emitAsset !== "") {
      obj.emitAsset = message.emitAsset;
    }
    if (message.emitRune !== "") {
      obj.emitRune = message.emitRune;
    }
    if (message.impLossProtection !== "") {
      obj.impLossProtection = message.impLossProtection;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventWithdraw>, I>>(base?: I): EventWithdraw {
    return EventWithdraw.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventWithdraw>, I>>(object: I): EventWithdraw {
    const message = createBaseEventWithdraw();
    message.pool = (object.pool !== undefined && object.pool !== null) ? Asset.fromPartial(object.pool) : undefined;
    message.providerUnits = object.providerUnits ?? "";
    message.basisPoints = (object.basisPoints !== undefined && object.basisPoints !== null)
      ? Long.fromValue(object.basisPoints)
      : Long.ZERO;
    message.asymmetry = object.asymmetry ?? new Uint8Array(0);
    message.inTx = (object.inTx !== undefined && object.inTx !== null) ? Tx.fromPartial(object.inTx) : undefined;
    message.emitAsset = object.emitAsset ?? "";
    message.emitRune = object.emitRune ?? "";
    message.impLossProtection = object.impLossProtection ?? "";
    return message;
  },
};

function createBaseEventPendingLiquidity(): EventPendingLiquidity {
  return {
    pool: undefined,
    pendingType: 0,
    runeAddress: "",
    runeAmount: "",
    assetAddress: "",
    assetAmount: "",
    runeTxId: "",
    assetTxId: "",
  };
}

export const EventPendingLiquidity = {
  encode(message: EventPendingLiquidity, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pool !== undefined) {
      Asset.encode(message.pool, writer.uint32(10).fork()).ldelim();
    }
    if (message.pendingType !== 0) {
      writer.uint32(16).int32(message.pendingType);
    }
    if (message.runeAddress !== "") {
      writer.uint32(26).string(message.runeAddress);
    }
    if (message.runeAmount !== "") {
      writer.uint32(34).string(message.runeAmount);
    }
    if (message.assetAddress !== "") {
      writer.uint32(42).string(message.assetAddress);
    }
    if (message.assetAmount !== "") {
      writer.uint32(50).string(message.assetAmount);
    }
    if (message.runeTxId !== "") {
      writer.uint32(58).string(message.runeTxId);
    }
    if (message.assetTxId !== "") {
      writer.uint32(66).string(message.assetTxId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventPendingLiquidity {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventPendingLiquidity();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pool = Asset.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.pendingType = reader.int32() as any;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.runeAddress = reader.string();
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

          message.assetAddress = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.assetAmount = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.runeTxId = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.assetTxId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventPendingLiquidity {
    return {
      pool: isSet(object.pool) ? Asset.fromJSON(object.pool) : undefined,
      pendingType: isSet(object.pendingType) ? pendingLiquidityTypeFromJSON(object.pendingType) : 0,
      runeAddress: isSet(object.runeAddress) ? globalThis.String(object.runeAddress) : "",
      runeAmount: isSet(object.runeAmount) ? globalThis.String(object.runeAmount) : "",
      assetAddress: isSet(object.assetAddress) ? globalThis.String(object.assetAddress) : "",
      assetAmount: isSet(object.assetAmount) ? globalThis.String(object.assetAmount) : "",
      runeTxId: isSet(object.runeTxId) ? globalThis.String(object.runeTxId) : "",
      assetTxId: isSet(object.assetTxId) ? globalThis.String(object.assetTxId) : "",
    };
  },

  toJSON(message: EventPendingLiquidity): unknown {
    const obj: any = {};
    if (message.pool !== undefined) {
      obj.pool = Asset.toJSON(message.pool);
    }
    if (message.pendingType !== 0) {
      obj.pendingType = pendingLiquidityTypeToJSON(message.pendingType);
    }
    if (message.runeAddress !== "") {
      obj.runeAddress = message.runeAddress;
    }
    if (message.runeAmount !== "") {
      obj.runeAmount = message.runeAmount;
    }
    if (message.assetAddress !== "") {
      obj.assetAddress = message.assetAddress;
    }
    if (message.assetAmount !== "") {
      obj.assetAmount = message.assetAmount;
    }
    if (message.runeTxId !== "") {
      obj.runeTxId = message.runeTxId;
    }
    if (message.assetTxId !== "") {
      obj.assetTxId = message.assetTxId;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventPendingLiquidity>, I>>(base?: I): EventPendingLiquidity {
    return EventPendingLiquidity.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventPendingLiquidity>, I>>(object: I): EventPendingLiquidity {
    const message = createBaseEventPendingLiquidity();
    message.pool = (object.pool !== undefined && object.pool !== null) ? Asset.fromPartial(object.pool) : undefined;
    message.pendingType = object.pendingType ?? 0;
    message.runeAddress = object.runeAddress ?? "";
    message.runeAmount = object.runeAmount ?? "";
    message.assetAddress = object.assetAddress ?? "";
    message.assetAmount = object.assetAmount ?? "";
    message.runeTxId = object.runeTxId ?? "";
    message.assetTxId = object.assetTxId ?? "";
    return message;
  },
};

function createBaseEventDonate(): EventDonate {
  return { pool: undefined, inTx: undefined };
}

export const EventDonate = {
  encode(message: EventDonate, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pool !== undefined) {
      Asset.encode(message.pool, writer.uint32(10).fork()).ldelim();
    }
    if (message.inTx !== undefined) {
      Tx.encode(message.inTx, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventDonate {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventDonate();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pool = Asset.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.inTx = Tx.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventDonate {
    return {
      pool: isSet(object.pool) ? Asset.fromJSON(object.pool) : undefined,
      inTx: isSet(object.inTx) ? Tx.fromJSON(object.inTx) : undefined,
    };
  },

  toJSON(message: EventDonate): unknown {
    const obj: any = {};
    if (message.pool !== undefined) {
      obj.pool = Asset.toJSON(message.pool);
    }
    if (message.inTx !== undefined) {
      obj.inTx = Tx.toJSON(message.inTx);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventDonate>, I>>(base?: I): EventDonate {
    return EventDonate.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventDonate>, I>>(object: I): EventDonate {
    const message = createBaseEventDonate();
    message.pool = (object.pool !== undefined && object.pool !== null) ? Asset.fromPartial(object.pool) : undefined;
    message.inTx = (object.inTx !== undefined && object.inTx !== null) ? Tx.fromPartial(object.inTx) : undefined;
    return message;
  },
};

function createBaseEventPool(): EventPool {
  return { pool: undefined, Status: 0 };
}

export const EventPool = {
  encode(message: EventPool, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pool !== undefined) {
      Asset.encode(message.pool, writer.uint32(10).fork()).ldelim();
    }
    if (message.Status !== 0) {
      writer.uint32(16).int32(message.Status);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventPool {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventPool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pool = Asset.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.Status = reader.int32() as any;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventPool {
    return {
      pool: isSet(object.pool) ? Asset.fromJSON(object.pool) : undefined,
      Status: isSet(object.Status) ? poolStatusFromJSON(object.Status) : 0,
    };
  },

  toJSON(message: EventPool): unknown {
    const obj: any = {};
    if (message.pool !== undefined) {
      obj.pool = Asset.toJSON(message.pool);
    }
    if (message.Status !== 0) {
      obj.Status = poolStatusToJSON(message.Status);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventPool>, I>>(base?: I): EventPool {
    return EventPool.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventPool>, I>>(object: I): EventPool {
    const message = createBaseEventPool();
    message.pool = (object.pool !== undefined && object.pool !== null) ? Asset.fromPartial(object.pool) : undefined;
    message.Status = object.Status ?? 0;
    return message;
  },
};

function createBasePoolAmt(): PoolAmt {
  return { asset: undefined, amount: Long.ZERO };
}

export const PoolAmt = {
  encode(message: PoolAmt, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.asset !== undefined) {
      Asset.encode(message.asset, writer.uint32(10).fork()).ldelim();
    }
    if (!message.amount.isZero()) {
      writer.uint32(16).int64(message.amount);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PoolAmt {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePoolAmt();
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
          if (tag !== 16) {
            break;
          }

          message.amount = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PoolAmt {
    return {
      asset: isSet(object.asset) ? Asset.fromJSON(object.asset) : undefined,
      amount: isSet(object.amount) ? Long.fromValue(object.amount) : Long.ZERO,
    };
  },

  toJSON(message: PoolAmt): unknown {
    const obj: any = {};
    if (message.asset !== undefined) {
      obj.asset = Asset.toJSON(message.asset);
    }
    if (!message.amount.isZero()) {
      obj.amount = (message.amount || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PoolAmt>, I>>(base?: I): PoolAmt {
    return PoolAmt.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PoolAmt>, I>>(object: I): PoolAmt {
    const message = createBasePoolAmt();
    message.asset = (object.asset !== undefined && object.asset !== null) ? Asset.fromPartial(object.asset) : undefined;
    message.amount = (object.amount !== undefined && object.amount !== null)
      ? Long.fromValue(object.amount)
      : Long.ZERO;
    return message;
  },
};

function createBaseEventRewards(): EventRewards {
  return { bondReward: "", poolRewards: [] };
}

export const EventRewards = {
  encode(message: EventRewards, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.bondReward !== "") {
      writer.uint32(10).string(message.bondReward);
    }
    for (const v of message.poolRewards) {
      PoolAmt.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventRewards {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventRewards();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.bondReward = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.poolRewards.push(PoolAmt.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventRewards {
    return {
      bondReward: isSet(object.bondReward) ? globalThis.String(object.bondReward) : "",
      poolRewards: globalThis.Array.isArray(object?.poolRewards)
        ? object.poolRewards.map((e: any) => PoolAmt.fromJSON(e))
        : [],
    };
  },

  toJSON(message: EventRewards): unknown {
    const obj: any = {};
    if (message.bondReward !== "") {
      obj.bondReward = message.bondReward;
    }
    if (message.poolRewards?.length) {
      obj.poolRewards = message.poolRewards.map((e) => PoolAmt.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventRewards>, I>>(base?: I): EventRewards {
    return EventRewards.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventRewards>, I>>(object: I): EventRewards {
    const message = createBaseEventRewards();
    message.bondReward = object.bondReward ?? "";
    message.poolRewards = object.poolRewards?.map((e) => PoolAmt.fromPartial(e)) || [];
    return message;
  },
};

function createBaseEventRefund(): EventRefund {
  return { code: 0, reason: "", inTx: undefined, fee: undefined };
}

export const EventRefund = {
  encode(message: EventRefund, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.code !== 0) {
      writer.uint32(8).uint32(message.code);
    }
    if (message.reason !== "") {
      writer.uint32(18).string(message.reason);
    }
    if (message.inTx !== undefined) {
      Tx.encode(message.inTx, writer.uint32(26).fork()).ldelim();
    }
    if (message.fee !== undefined) {
      Fee.encode(message.fee, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventRefund {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventRefund();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.code = reader.uint32();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.reason = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.inTx = Tx.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.fee = Fee.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventRefund {
    return {
      code: isSet(object.code) ? globalThis.Number(object.code) : 0,
      reason: isSet(object.reason) ? globalThis.String(object.reason) : "",
      inTx: isSet(object.inTx) ? Tx.fromJSON(object.inTx) : undefined,
      fee: isSet(object.fee) ? Fee.fromJSON(object.fee) : undefined,
    };
  },

  toJSON(message: EventRefund): unknown {
    const obj: any = {};
    if (message.code !== 0) {
      obj.code = Math.round(message.code);
    }
    if (message.reason !== "") {
      obj.reason = message.reason;
    }
    if (message.inTx !== undefined) {
      obj.inTx = Tx.toJSON(message.inTx);
    }
    if (message.fee !== undefined) {
      obj.fee = Fee.toJSON(message.fee);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventRefund>, I>>(base?: I): EventRefund {
    return EventRefund.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventRefund>, I>>(object: I): EventRefund {
    const message = createBaseEventRefund();
    message.code = object.code ?? 0;
    message.reason = object.reason ?? "";
    message.inTx = (object.inTx !== undefined && object.inTx !== null) ? Tx.fromPartial(object.inTx) : undefined;
    message.fee = (object.fee !== undefined && object.fee !== null) ? Fee.fromPartial(object.fee) : undefined;
    return message;
  },
};

function createBaseEventBond(): EventBond {
  return { amount: "", bondType: 0, txIn: undefined };
}

export const EventBond = {
  encode(message: EventBond, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.amount !== "") {
      writer.uint32(10).string(message.amount);
    }
    if (message.bondType !== 0) {
      writer.uint32(16).int32(message.bondType);
    }
    if (message.txIn !== undefined) {
      Tx.encode(message.txIn, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventBond {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventBond();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.amount = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.bondType = reader.int32() as any;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.txIn = Tx.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventBond {
    return {
      amount: isSet(object.amount) ? globalThis.String(object.amount) : "",
      bondType: isSet(object.bondType) ? bondTypeFromJSON(object.bondType) : 0,
      txIn: isSet(object.txIn) ? Tx.fromJSON(object.txIn) : undefined,
    };
  },

  toJSON(message: EventBond): unknown {
    const obj: any = {};
    if (message.amount !== "") {
      obj.amount = message.amount;
    }
    if (message.bondType !== 0) {
      obj.bondType = bondTypeToJSON(message.bondType);
    }
    if (message.txIn !== undefined) {
      obj.txIn = Tx.toJSON(message.txIn);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventBond>, I>>(base?: I): EventBond {
    return EventBond.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventBond>, I>>(object: I): EventBond {
    const message = createBaseEventBond();
    message.amount = object.amount ?? "";
    message.bondType = object.bondType ?? 0;
    message.txIn = (object.txIn !== undefined && object.txIn !== null) ? Tx.fromPartial(object.txIn) : undefined;
    return message;
  },
};

function createBaseGasPool(): GasPool {
  return { asset: undefined, runeAmt: "", assetAmt: "", count: Long.ZERO };
}

export const GasPool = {
  encode(message: GasPool, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.asset !== undefined) {
      Asset.encode(message.asset, writer.uint32(10).fork()).ldelim();
    }
    if (message.runeAmt !== "") {
      writer.uint32(18).string(message.runeAmt);
    }
    if (message.assetAmt !== "") {
      writer.uint32(26).string(message.assetAmt);
    }
    if (!message.count.isZero()) {
      writer.uint32(32).int64(message.count);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GasPool {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGasPool();
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

          message.runeAmt = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.assetAmt = reader.string();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.count = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GasPool {
    return {
      asset: isSet(object.asset) ? Asset.fromJSON(object.asset) : undefined,
      runeAmt: isSet(object.runeAmt) ? globalThis.String(object.runeAmt) : "",
      assetAmt: isSet(object.assetAmt) ? globalThis.String(object.assetAmt) : "",
      count: isSet(object.count) ? Long.fromValue(object.count) : Long.ZERO,
    };
  },

  toJSON(message: GasPool): unknown {
    const obj: any = {};
    if (message.asset !== undefined) {
      obj.asset = Asset.toJSON(message.asset);
    }
    if (message.runeAmt !== "") {
      obj.runeAmt = message.runeAmt;
    }
    if (message.assetAmt !== "") {
      obj.assetAmt = message.assetAmt;
    }
    if (!message.count.isZero()) {
      obj.count = (message.count || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GasPool>, I>>(base?: I): GasPool {
    return GasPool.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GasPool>, I>>(object: I): GasPool {
    const message = createBaseGasPool();
    message.asset = (object.asset !== undefined && object.asset !== null) ? Asset.fromPartial(object.asset) : undefined;
    message.runeAmt = object.runeAmt ?? "";
    message.assetAmt = object.assetAmt ?? "";
    message.count = (object.count !== undefined && object.count !== null) ? Long.fromValue(object.count) : Long.ZERO;
    return message;
  },
};

function createBaseEventGas(): EventGas {
  return { pools: [] };
}

export const EventGas = {
  encode(message: EventGas, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.pools) {
      GasPool.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventGas {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventGas();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pools.push(GasPool.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventGas {
    return { pools: globalThis.Array.isArray(object?.pools) ? object.pools.map((e: any) => GasPool.fromJSON(e)) : [] };
  },

  toJSON(message: EventGas): unknown {
    const obj: any = {};
    if (message.pools?.length) {
      obj.pools = message.pools.map((e) => GasPool.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventGas>, I>>(base?: I): EventGas {
    return EventGas.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventGas>, I>>(object: I): EventGas {
    const message = createBaseEventGas();
    message.pools = object.pools?.map((e) => GasPool.fromPartial(e)) || [];
    return message;
  },
};

function createBaseEventReserve(): EventReserve {
  return { reserveContributor: undefined, inTx: undefined };
}

export const EventReserve = {
  encode(message: EventReserve, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.reserveContributor !== undefined) {
      ReserveContributor.encode(message.reserveContributor, writer.uint32(10).fork()).ldelim();
    }
    if (message.inTx !== undefined) {
      Tx.encode(message.inTx, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventReserve {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventReserve();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.reserveContributor = ReserveContributor.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.inTx = Tx.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventReserve {
    return {
      reserveContributor: isSet(object.reserveContributor)
        ? ReserveContributor.fromJSON(object.reserveContributor)
        : undefined,
      inTx: isSet(object.inTx) ? Tx.fromJSON(object.inTx) : undefined,
    };
  },

  toJSON(message: EventReserve): unknown {
    const obj: any = {};
    if (message.reserveContributor !== undefined) {
      obj.reserveContributor = ReserveContributor.toJSON(message.reserveContributor);
    }
    if (message.inTx !== undefined) {
      obj.inTx = Tx.toJSON(message.inTx);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventReserve>, I>>(base?: I): EventReserve {
    return EventReserve.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventReserve>, I>>(object: I): EventReserve {
    const message = createBaseEventReserve();
    message.reserveContributor = (object.reserveContributor !== undefined && object.reserveContributor !== null)
      ? ReserveContributor.fromPartial(object.reserveContributor)
      : undefined;
    message.inTx = (object.inTx !== undefined && object.inTx !== null) ? Tx.fromPartial(object.inTx) : undefined;
    return message;
  },
};

function createBaseEventScheduledOutbound(): EventScheduledOutbound {
  return { outTx: undefined };
}

export const EventScheduledOutbound = {
  encode(message: EventScheduledOutbound, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.outTx !== undefined) {
      TxOutItem.encode(message.outTx, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventScheduledOutbound {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventScheduledOutbound();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.outTx = TxOutItem.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventScheduledOutbound {
    return { outTx: isSet(object.outTx) ? TxOutItem.fromJSON(object.outTx) : undefined };
  },

  toJSON(message: EventScheduledOutbound): unknown {
    const obj: any = {};
    if (message.outTx !== undefined) {
      obj.outTx = TxOutItem.toJSON(message.outTx);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventScheduledOutbound>, I>>(base?: I): EventScheduledOutbound {
    return EventScheduledOutbound.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventScheduledOutbound>, I>>(object: I): EventScheduledOutbound {
    const message = createBaseEventScheduledOutbound();
    message.outTx = (object.outTx !== undefined && object.outTx !== null)
      ? TxOutItem.fromPartial(object.outTx)
      : undefined;
    return message;
  },
};

function createBaseEventSecurity(): EventSecurity {
  return { msg: "", tx: undefined };
}

export const EventSecurity = {
  encode(message: EventSecurity, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.msg !== "") {
      writer.uint32(10).string(message.msg);
    }
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventSecurity {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventSecurity();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.msg = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.tx = Tx.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventSecurity {
    return {
      msg: isSet(object.msg) ? globalThis.String(object.msg) : "",
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
    };
  },

  toJSON(message: EventSecurity): unknown {
    const obj: any = {};
    if (message.msg !== "") {
      obj.msg = message.msg;
    }
    if (message.tx !== undefined) {
      obj.tx = Tx.toJSON(message.tx);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventSecurity>, I>>(base?: I): EventSecurity {
    return EventSecurity.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventSecurity>, I>>(object: I): EventSecurity {
    const message = createBaseEventSecurity();
    message.msg = object.msg ?? "";
    message.tx = (object.tx !== undefined && object.tx !== null) ? Tx.fromPartial(object.tx) : undefined;
    return message;
  },
};

function createBaseEventSlash(): EventSlash {
  return { pool: undefined, slashAmount: [] };
}

export const EventSlash = {
  encode(message: EventSlash, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pool !== undefined) {
      Asset.encode(message.pool, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.slashAmount) {
      PoolAmt.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventSlash {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventSlash();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pool = Asset.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.slashAmount.push(PoolAmt.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventSlash {
    return {
      pool: isSet(object.pool) ? Asset.fromJSON(object.pool) : undefined,
      slashAmount: globalThis.Array.isArray(object?.slashAmount)
        ? object.slashAmount.map((e: any) => PoolAmt.fromJSON(e))
        : [],
    };
  },

  toJSON(message: EventSlash): unknown {
    const obj: any = {};
    if (message.pool !== undefined) {
      obj.pool = Asset.toJSON(message.pool);
    }
    if (message.slashAmount?.length) {
      obj.slashAmount = message.slashAmount.map((e) => PoolAmt.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventSlash>, I>>(base?: I): EventSlash {
    return EventSlash.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventSlash>, I>>(object: I): EventSlash {
    const message = createBaseEventSlash();
    message.pool = (object.pool !== undefined && object.pool !== null) ? Asset.fromPartial(object.pool) : undefined;
    message.slashAmount = object.slashAmount?.map((e) => PoolAmt.fromPartial(e)) || [];
    return message;
  },
};

function createBaseEventErrata(): EventErrata {
  return { txId: "", pools: [] };
}

export const EventErrata = {
  encode(message: EventErrata, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.txId !== "") {
      writer.uint32(10).string(message.txId);
    }
    for (const v of message.pools) {
      PoolMod.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventErrata {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventErrata();
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

          message.pools.push(PoolMod.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventErrata {
    return {
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
      pools: globalThis.Array.isArray(object?.pools) ? object.pools.map((e: any) => PoolMod.fromJSON(e)) : [],
    };
  },

  toJSON(message: EventErrata): unknown {
    const obj: any = {};
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    if (message.pools?.length) {
      obj.pools = message.pools.map((e) => PoolMod.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventErrata>, I>>(base?: I): EventErrata {
    return EventErrata.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventErrata>, I>>(object: I): EventErrata {
    const message = createBaseEventErrata();
    message.txId = object.txId ?? "";
    message.pools = object.pools?.map((e) => PoolMod.fromPartial(e)) || [];
    return message;
  },
};

function createBaseEventFee(): EventFee {
  return { txId: "", fee: undefined, synthUnits: "" };
}

export const EventFee = {
  encode(message: EventFee, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.txId !== "") {
      writer.uint32(10).string(message.txId);
    }
    if (message.fee !== undefined) {
      Fee.encode(message.fee, writer.uint32(18).fork()).ldelim();
    }
    if (message.synthUnits !== "") {
      writer.uint32(26).string(message.synthUnits);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventFee {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventFee();
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

          message.fee = Fee.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.synthUnits = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventFee {
    return {
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
      fee: isSet(object.fee) ? Fee.fromJSON(object.fee) : undefined,
      synthUnits: isSet(object.synthUnits) ? globalThis.String(object.synthUnits) : "",
    };
  },

  toJSON(message: EventFee): unknown {
    const obj: any = {};
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    if (message.fee !== undefined) {
      obj.fee = Fee.toJSON(message.fee);
    }
    if (message.synthUnits !== "") {
      obj.synthUnits = message.synthUnits;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventFee>, I>>(base?: I): EventFee {
    return EventFee.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventFee>, I>>(object: I): EventFee {
    const message = createBaseEventFee();
    message.txId = object.txId ?? "";
    message.fee = (object.fee !== undefined && object.fee !== null) ? Fee.fromPartial(object.fee) : undefined;
    message.synthUnits = object.synthUnits ?? "";
    return message;
  },
};

function createBaseEventOutbound(): EventOutbound {
  return { inTxId: "", tx: undefined };
}

export const EventOutbound = {
  encode(message: EventOutbound, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inTxId !== "") {
      writer.uint32(10).string(message.inTxId);
    }
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventOutbound {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventOutbound();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.inTxId = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.tx = Tx.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventOutbound {
    return {
      inTxId: isSet(object.inTxId) ? globalThis.String(object.inTxId) : "",
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
    };
  },

  toJSON(message: EventOutbound): unknown {
    const obj: any = {};
    if (message.inTxId !== "") {
      obj.inTxId = message.inTxId;
    }
    if (message.tx !== undefined) {
      obj.tx = Tx.toJSON(message.tx);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventOutbound>, I>>(base?: I): EventOutbound {
    return EventOutbound.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventOutbound>, I>>(object: I): EventOutbound {
    const message = createBaseEventOutbound();
    message.inTxId = object.inTxId ?? "";
    message.tx = (object.tx !== undefined && object.tx !== null) ? Tx.fromPartial(object.tx) : undefined;
    return message;
  },
};

function createBaseEventTssKeygenSuccess(): EventTssKeygenSuccess {
  return { pubKey: "", members: [], height: Long.ZERO };
}

export const EventTssKeygenSuccess = {
  encode(message: EventTssKeygenSuccess, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pubKey !== "") {
      writer.uint32(10).string(message.pubKey);
    }
    for (const v of message.members) {
      writer.uint32(18).string(v!);
    }
    if (!message.height.isZero()) {
      writer.uint32(24).int64(message.height);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventTssKeygenSuccess {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventTssKeygenSuccess();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pubKey = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.members.push(reader.string());
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.height = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventTssKeygenSuccess {
    return {
      pubKey: isSet(object.pubKey) ? globalThis.String(object.pubKey) : "",
      members: globalThis.Array.isArray(object?.members) ? object.members.map((e: any) => globalThis.String(e)) : [],
      height: isSet(object.height) ? Long.fromValue(object.height) : Long.ZERO,
    };
  },

  toJSON(message: EventTssKeygenSuccess): unknown {
    const obj: any = {};
    if (message.pubKey !== "") {
      obj.pubKey = message.pubKey;
    }
    if (message.members?.length) {
      obj.members = message.members;
    }
    if (!message.height.isZero()) {
      obj.height = (message.height || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventTssKeygenSuccess>, I>>(base?: I): EventTssKeygenSuccess {
    return EventTssKeygenSuccess.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventTssKeygenSuccess>, I>>(object: I): EventTssKeygenSuccess {
    const message = createBaseEventTssKeygenSuccess();
    message.pubKey = object.pubKey ?? "";
    message.members = object.members?.map((e) => e) || [];
    message.height = (object.height !== undefined && object.height !== null)
      ? Long.fromValue(object.height)
      : Long.ZERO;
    return message;
  },
};

function createBaseEventTssKeygenFailure(): EventTssKeygenFailure {
  return { failReason: "", isUnicast: false, blameNodes: [], round: "", height: Long.ZERO };
}

export const EventTssKeygenFailure = {
  encode(message: EventTssKeygenFailure, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.failReason !== "") {
      writer.uint32(10).string(message.failReason);
    }
    if (message.isUnicast === true) {
      writer.uint32(16).bool(message.isUnicast);
    }
    for (const v of message.blameNodes) {
      writer.uint32(26).string(v!);
    }
    if (message.round !== "") {
      writer.uint32(34).string(message.round);
    }
    if (!message.height.isZero()) {
      writer.uint32(40).int64(message.height);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventTssKeygenFailure {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventTssKeygenFailure();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.failReason = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.isUnicast = reader.bool();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.blameNodes.push(reader.string());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.round = reader.string();
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.height = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventTssKeygenFailure {
    return {
      failReason: isSet(object.failReason) ? globalThis.String(object.failReason) : "",
      isUnicast: isSet(object.isUnicast) ? globalThis.Boolean(object.isUnicast) : false,
      blameNodes: globalThis.Array.isArray(object?.blameNodes)
        ? object.blameNodes.map((e: any) => globalThis.String(e))
        : [],
      round: isSet(object.round) ? globalThis.String(object.round) : "",
      height: isSet(object.height) ? Long.fromValue(object.height) : Long.ZERO,
    };
  },

  toJSON(message: EventTssKeygenFailure): unknown {
    const obj: any = {};
    if (message.failReason !== "") {
      obj.failReason = message.failReason;
    }
    if (message.isUnicast === true) {
      obj.isUnicast = message.isUnicast;
    }
    if (message.blameNodes?.length) {
      obj.blameNodes = message.blameNodes;
    }
    if (message.round !== "") {
      obj.round = message.round;
    }
    if (!message.height.isZero()) {
      obj.height = (message.height || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventTssKeygenFailure>, I>>(base?: I): EventTssKeygenFailure {
    return EventTssKeygenFailure.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventTssKeygenFailure>, I>>(object: I): EventTssKeygenFailure {
    const message = createBaseEventTssKeygenFailure();
    message.failReason = object.failReason ?? "";
    message.isUnicast = object.isUnicast ?? false;
    message.blameNodes = object.blameNodes?.map((e) => e) || [];
    message.round = object.round ?? "";
    message.height = (object.height !== undefined && object.height !== null)
      ? Long.fromValue(object.height)
      : Long.ZERO;
    return message;
  },
};

function createBaseEventTssKeygenMetric(): EventTssKeygenMetric {
  return { pubKey: "", medianDurationMs: Long.ZERO };
}

export const EventTssKeygenMetric = {
  encode(message: EventTssKeygenMetric, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pubKey !== "") {
      writer.uint32(10).string(message.pubKey);
    }
    if (!message.medianDurationMs.isZero()) {
      writer.uint32(16).int64(message.medianDurationMs);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventTssKeygenMetric {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventTssKeygenMetric();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pubKey = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.medianDurationMs = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventTssKeygenMetric {
    return {
      pubKey: isSet(object.pubKey) ? globalThis.String(object.pubKey) : "",
      medianDurationMs: isSet(object.medianDurationMs) ? Long.fromValue(object.medianDurationMs) : Long.ZERO,
    };
  },

  toJSON(message: EventTssKeygenMetric): unknown {
    const obj: any = {};
    if (message.pubKey !== "") {
      obj.pubKey = message.pubKey;
    }
    if (!message.medianDurationMs.isZero()) {
      obj.medianDurationMs = (message.medianDurationMs || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventTssKeygenMetric>, I>>(base?: I): EventTssKeygenMetric {
    return EventTssKeygenMetric.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventTssKeygenMetric>, I>>(object: I): EventTssKeygenMetric {
    const message = createBaseEventTssKeygenMetric();
    message.pubKey = object.pubKey ?? "";
    message.medianDurationMs = (object.medianDurationMs !== undefined && object.medianDurationMs !== null)
      ? Long.fromValue(object.medianDurationMs)
      : Long.ZERO;
    return message;
  },
};

function createBaseEventTssKeysignMetric(): EventTssKeysignMetric {
  return { txId: "", medianDurationMs: Long.ZERO };
}

export const EventTssKeysignMetric = {
  encode(message: EventTssKeysignMetric, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.txId !== "") {
      writer.uint32(10).string(message.txId);
    }
    if (!message.medianDurationMs.isZero()) {
      writer.uint32(16).int64(message.medianDurationMs);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventTssKeysignMetric {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventTssKeysignMetric();
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
          if (tag !== 16) {
            break;
          }

          message.medianDurationMs = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventTssKeysignMetric {
    return {
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
      medianDurationMs: isSet(object.medianDurationMs) ? Long.fromValue(object.medianDurationMs) : Long.ZERO,
    };
  },

  toJSON(message: EventTssKeysignMetric): unknown {
    const obj: any = {};
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    if (!message.medianDurationMs.isZero()) {
      obj.medianDurationMs = (message.medianDurationMs || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventTssKeysignMetric>, I>>(base?: I): EventTssKeysignMetric {
    return EventTssKeysignMetric.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventTssKeysignMetric>, I>>(object: I): EventTssKeysignMetric {
    const message = createBaseEventTssKeysignMetric();
    message.txId = object.txId ?? "";
    message.medianDurationMs = (object.medianDurationMs !== undefined && object.medianDurationMs !== null)
      ? Long.fromValue(object.medianDurationMs)
      : Long.ZERO;
    return message;
  },
};

function createBaseEventSlashPoint(): EventSlashPoint {
  return { nodeAddress: new Uint8Array(0), slashPoints: Long.ZERO, reason: "" };
}

export const EventSlashPoint = {
  encode(message: EventSlashPoint, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.nodeAddress.length !== 0) {
      writer.uint32(10).bytes(message.nodeAddress);
    }
    if (!message.slashPoints.isZero()) {
      writer.uint32(16).int64(message.slashPoints);
    }
    if (message.reason !== "") {
      writer.uint32(26).string(message.reason);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventSlashPoint {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventSlashPoint();
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

          message.slashPoints = reader.int64() as Long;
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

  fromJSON(object: any): EventSlashPoint {
    return {
      nodeAddress: isSet(object.nodeAddress) ? bytesFromBase64(object.nodeAddress) : new Uint8Array(0),
      slashPoints: isSet(object.slashPoints) ? Long.fromValue(object.slashPoints) : Long.ZERO,
      reason: isSet(object.reason) ? globalThis.String(object.reason) : "",
    };
  },

  toJSON(message: EventSlashPoint): unknown {
    const obj: any = {};
    if (message.nodeAddress.length !== 0) {
      obj.nodeAddress = base64FromBytes(message.nodeAddress);
    }
    if (!message.slashPoints.isZero()) {
      obj.slashPoints = (message.slashPoints || Long.ZERO).toString();
    }
    if (message.reason !== "") {
      obj.reason = message.reason;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventSlashPoint>, I>>(base?: I): EventSlashPoint {
    return EventSlashPoint.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventSlashPoint>, I>>(object: I): EventSlashPoint {
    const message = createBaseEventSlashPoint();
    message.nodeAddress = object.nodeAddress ?? new Uint8Array(0);
    message.slashPoints = (object.slashPoints !== undefined && object.slashPoints !== null)
      ? Long.fromValue(object.slashPoints)
      : Long.ZERO;
    message.reason = object.reason ?? "";
    return message;
  },
};

function createBaseEventPoolBalanceChanged(): EventPoolBalanceChanged {
  return { poolChange: undefined, reason: "" };
}

export const EventPoolBalanceChanged = {
  encode(message: EventPoolBalanceChanged, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.poolChange !== undefined) {
      PoolMod.encode(message.poolChange, writer.uint32(10).fork()).ldelim();
    }
    if (message.reason !== "") {
      writer.uint32(18).string(message.reason);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventPoolBalanceChanged {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventPoolBalanceChanged();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.poolChange = PoolMod.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
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

  fromJSON(object: any): EventPoolBalanceChanged {
    return {
      poolChange: isSet(object.poolChange) ? PoolMod.fromJSON(object.poolChange) : undefined,
      reason: isSet(object.reason) ? globalThis.String(object.reason) : "",
    };
  },

  toJSON(message: EventPoolBalanceChanged): unknown {
    const obj: any = {};
    if (message.poolChange !== undefined) {
      obj.poolChange = PoolMod.toJSON(message.poolChange);
    }
    if (message.reason !== "") {
      obj.reason = message.reason;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventPoolBalanceChanged>, I>>(base?: I): EventPoolBalanceChanged {
    return EventPoolBalanceChanged.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventPoolBalanceChanged>, I>>(object: I): EventPoolBalanceChanged {
    const message = createBaseEventPoolBalanceChanged();
    message.poolChange = (object.poolChange !== undefined && object.poolChange !== null)
      ? PoolMod.fromPartial(object.poolChange)
      : undefined;
    message.reason = object.reason ?? "";
    return message;
  },
};

function createBaseEventSwitch(): EventSwitch {
  return { toAddress: new Uint8Array(0), fromAddress: "", burn: undefined, txId: "" };
}

export const EventSwitch = {
  encode(message: EventSwitch, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.toAddress.length !== 0) {
      writer.uint32(10).bytes(message.toAddress);
    }
    if (message.fromAddress !== "") {
      writer.uint32(18).string(message.fromAddress);
    }
    if (message.burn !== undefined) {
      Coin.encode(message.burn, writer.uint32(26).fork()).ldelim();
    }
    if (message.txId !== "") {
      writer.uint32(34).string(message.txId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventSwitch {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventSwitch();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.toAddress = reader.bytes();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.fromAddress = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.burn = Coin.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.txId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventSwitch {
    return {
      toAddress: isSet(object.toAddress) ? bytesFromBase64(object.toAddress) : new Uint8Array(0),
      fromAddress: isSet(object.fromAddress) ? globalThis.String(object.fromAddress) : "",
      burn: isSet(object.burn) ? Coin.fromJSON(object.burn) : undefined,
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
    };
  },

  toJSON(message: EventSwitch): unknown {
    const obj: any = {};
    if (message.toAddress.length !== 0) {
      obj.toAddress = base64FromBytes(message.toAddress);
    }
    if (message.fromAddress !== "") {
      obj.fromAddress = message.fromAddress;
    }
    if (message.burn !== undefined) {
      obj.burn = Coin.toJSON(message.burn);
    }
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventSwitch>, I>>(base?: I): EventSwitch {
    return EventSwitch.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventSwitch>, I>>(object: I): EventSwitch {
    const message = createBaseEventSwitch();
    message.toAddress = object.toAddress ?? new Uint8Array(0);
    message.fromAddress = object.fromAddress ?? "";
    message.burn = (object.burn !== undefined && object.burn !== null) ? Coin.fromPartial(object.burn) : undefined;
    message.txId = object.txId ?? "";
    return message;
  },
};

function createBaseEventSwitchV87(): EventSwitchV87 {
  return { toAddress: new Uint8Array(0), fromAddress: "", burn: undefined, txId: "", mint: "" };
}

export const EventSwitchV87 = {
  encode(message: EventSwitchV87, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.toAddress.length !== 0) {
      writer.uint32(10).bytes(message.toAddress);
    }
    if (message.fromAddress !== "") {
      writer.uint32(18).string(message.fromAddress);
    }
    if (message.burn !== undefined) {
      Coin.encode(message.burn, writer.uint32(26).fork()).ldelim();
    }
    if (message.txId !== "") {
      writer.uint32(34).string(message.txId);
    }
    if (message.mint !== "") {
      writer.uint32(42).string(message.mint);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventSwitchV87 {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventSwitchV87();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.toAddress = reader.bytes();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.fromAddress = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.burn = Coin.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.txId = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.mint = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventSwitchV87 {
    return {
      toAddress: isSet(object.toAddress) ? bytesFromBase64(object.toAddress) : new Uint8Array(0),
      fromAddress: isSet(object.fromAddress) ? globalThis.String(object.fromAddress) : "",
      burn: isSet(object.burn) ? Coin.fromJSON(object.burn) : undefined,
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
      mint: isSet(object.mint) ? globalThis.String(object.mint) : "",
    };
  },

  toJSON(message: EventSwitchV87): unknown {
    const obj: any = {};
    if (message.toAddress.length !== 0) {
      obj.toAddress = base64FromBytes(message.toAddress);
    }
    if (message.fromAddress !== "") {
      obj.fromAddress = message.fromAddress;
    }
    if (message.burn !== undefined) {
      obj.burn = Coin.toJSON(message.burn);
    }
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    if (message.mint !== "") {
      obj.mint = message.mint;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventSwitchV87>, I>>(base?: I): EventSwitchV87 {
    return EventSwitchV87.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventSwitchV87>, I>>(object: I): EventSwitchV87 {
    const message = createBaseEventSwitchV87();
    message.toAddress = object.toAddress ?? new Uint8Array(0);
    message.fromAddress = object.fromAddress ?? "";
    message.burn = (object.burn !== undefined && object.burn !== null) ? Coin.fromPartial(object.burn) : undefined;
    message.txId = object.txId ?? "";
    message.mint = object.mint ?? "";
    return message;
  },
};

function createBaseEventMintBurn(): EventMintBurn {
  return { supply: 0, denom: "", amount: "", reason: "" };
}

export const EventMintBurn = {
  encode(message: EventMintBurn, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.supply !== 0) {
      writer.uint32(8).int32(message.supply);
    }
    if (message.denom !== "") {
      writer.uint32(18).string(message.denom);
    }
    if (message.amount !== "") {
      writer.uint32(26).string(message.amount);
    }
    if (message.reason !== "") {
      writer.uint32(34).string(message.reason);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventMintBurn {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventMintBurn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.supply = reader.int32() as any;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.denom = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.amount = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
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

  fromJSON(object: any): EventMintBurn {
    return {
      supply: isSet(object.supply) ? mintBurnSupplyTypeFromJSON(object.supply) : 0,
      denom: isSet(object.denom) ? globalThis.String(object.denom) : "",
      amount: isSet(object.amount) ? globalThis.String(object.amount) : "",
      reason: isSet(object.reason) ? globalThis.String(object.reason) : "",
    };
  },

  toJSON(message: EventMintBurn): unknown {
    const obj: any = {};
    if (message.supply !== 0) {
      obj.supply = mintBurnSupplyTypeToJSON(message.supply);
    }
    if (message.denom !== "") {
      obj.denom = message.denom;
    }
    if (message.amount !== "") {
      obj.amount = message.amount;
    }
    if (message.reason !== "") {
      obj.reason = message.reason;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventMintBurn>, I>>(base?: I): EventMintBurn {
    return EventMintBurn.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventMintBurn>, I>>(object: I): EventMintBurn {
    const message = createBaseEventMintBurn();
    message.supply = object.supply ?? 0;
    message.denom = object.denom ?? "";
    message.amount = object.amount ?? "";
    message.reason = object.reason ?? "";
    return message;
  },
};

function createBaseEventLoanOpen(): EventLoanOpen {
  return {
    collateralDeposited: "",
    collateralAsset: undefined,
    collateralizationRatio: "",
    debtIssued: "",
    owner: "",
    targetAsset: undefined,
    txId: "",
  };
}

export const EventLoanOpen = {
  encode(message: EventLoanOpen, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.collateralDeposited !== "") {
      writer.uint32(10).string(message.collateralDeposited);
    }
    if (message.collateralAsset !== undefined) {
      Asset.encode(message.collateralAsset, writer.uint32(18).fork()).ldelim();
    }
    if (message.collateralizationRatio !== "") {
      writer.uint32(26).string(message.collateralizationRatio);
    }
    if (message.debtIssued !== "") {
      writer.uint32(34).string(message.debtIssued);
    }
    if (message.owner !== "") {
      writer.uint32(42).string(message.owner);
    }
    if (message.targetAsset !== undefined) {
      Asset.encode(message.targetAsset, writer.uint32(50).fork()).ldelim();
    }
    if (message.txId !== "") {
      writer.uint32(58).string(message.txId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventLoanOpen {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventLoanOpen();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.collateralDeposited = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.collateralAsset = Asset.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.collateralizationRatio = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.debtIssued = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.owner = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.targetAsset = Asset.decode(reader, reader.uint32());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.txId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventLoanOpen {
    return {
      collateralDeposited: isSet(object.collateralDeposited) ? globalThis.String(object.collateralDeposited) : "",
      collateralAsset: isSet(object.collateralAsset) ? Asset.fromJSON(object.collateralAsset) : undefined,
      collateralizationRatio: isSet(object.collateralizationRatio)
        ? globalThis.String(object.collateralizationRatio)
        : "",
      debtIssued: isSet(object.debtIssued) ? globalThis.String(object.debtIssued) : "",
      owner: isSet(object.owner) ? globalThis.String(object.owner) : "",
      targetAsset: isSet(object.targetAsset) ? Asset.fromJSON(object.targetAsset) : undefined,
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
    };
  },

  toJSON(message: EventLoanOpen): unknown {
    const obj: any = {};
    if (message.collateralDeposited !== "") {
      obj.collateralDeposited = message.collateralDeposited;
    }
    if (message.collateralAsset !== undefined) {
      obj.collateralAsset = Asset.toJSON(message.collateralAsset);
    }
    if (message.collateralizationRatio !== "") {
      obj.collateralizationRatio = message.collateralizationRatio;
    }
    if (message.debtIssued !== "") {
      obj.debtIssued = message.debtIssued;
    }
    if (message.owner !== "") {
      obj.owner = message.owner;
    }
    if (message.targetAsset !== undefined) {
      obj.targetAsset = Asset.toJSON(message.targetAsset);
    }
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventLoanOpen>, I>>(base?: I): EventLoanOpen {
    return EventLoanOpen.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventLoanOpen>, I>>(object: I): EventLoanOpen {
    const message = createBaseEventLoanOpen();
    message.collateralDeposited = object.collateralDeposited ?? "";
    message.collateralAsset = (object.collateralAsset !== undefined && object.collateralAsset !== null)
      ? Asset.fromPartial(object.collateralAsset)
      : undefined;
    message.collateralizationRatio = object.collateralizationRatio ?? "";
    message.debtIssued = object.debtIssued ?? "";
    message.owner = object.owner ?? "";
    message.targetAsset = (object.targetAsset !== undefined && object.targetAsset !== null)
      ? Asset.fromPartial(object.targetAsset)
      : undefined;
    message.txId = object.txId ?? "";
    return message;
  },
};

function createBaseEventLoanRepayment(): EventLoanRepayment {
  return { collateralWithdrawn: "", collateralAsset: undefined, debtRepaid: "", owner: "", txId: "" };
}

export const EventLoanRepayment = {
  encode(message: EventLoanRepayment, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.collateralWithdrawn !== "") {
      writer.uint32(10).string(message.collateralWithdrawn);
    }
    if (message.collateralAsset !== undefined) {
      Asset.encode(message.collateralAsset, writer.uint32(18).fork()).ldelim();
    }
    if (message.debtRepaid !== "") {
      writer.uint32(26).string(message.debtRepaid);
    }
    if (message.owner !== "") {
      writer.uint32(34).string(message.owner);
    }
    if (message.txId !== "") {
      writer.uint32(58).string(message.txId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventLoanRepayment {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventLoanRepayment();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.collateralWithdrawn = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.collateralAsset = Asset.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.debtRepaid = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.owner = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.txId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventLoanRepayment {
    return {
      collateralWithdrawn: isSet(object.collateralWithdrawn) ? globalThis.String(object.collateralWithdrawn) : "",
      collateralAsset: isSet(object.collateralAsset) ? Asset.fromJSON(object.collateralAsset) : undefined,
      debtRepaid: isSet(object.debtRepaid) ? globalThis.String(object.debtRepaid) : "",
      owner: isSet(object.owner) ? globalThis.String(object.owner) : "",
      txId: isSet(object.txId) ? globalThis.String(object.txId) : "",
    };
  },

  toJSON(message: EventLoanRepayment): unknown {
    const obj: any = {};
    if (message.collateralWithdrawn !== "") {
      obj.collateralWithdrawn = message.collateralWithdrawn;
    }
    if (message.collateralAsset !== undefined) {
      obj.collateralAsset = Asset.toJSON(message.collateralAsset);
    }
    if (message.debtRepaid !== "") {
      obj.debtRepaid = message.debtRepaid;
    }
    if (message.owner !== "") {
      obj.owner = message.owner;
    }
    if (message.txId !== "") {
      obj.txId = message.txId;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventLoanRepayment>, I>>(base?: I): EventLoanRepayment {
    return EventLoanRepayment.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventLoanRepayment>, I>>(object: I): EventLoanRepayment {
    const message = createBaseEventLoanRepayment();
    message.collateralWithdrawn = object.collateralWithdrawn ?? "";
    message.collateralAsset = (object.collateralAsset !== undefined && object.collateralAsset !== null)
      ? Asset.fromPartial(object.collateralAsset)
      : undefined;
    message.debtRepaid = object.debtRepaid ?? "";
    message.owner = object.owner ?? "";
    message.txId = object.txId ?? "";
    return message;
  },
};

function createBaseEventTHORName(): EventTHORName {
  return {
    name: "",
    chain: "",
    address: "",
    registrationFee: "",
    fundAmt: "",
    expire: Long.ZERO,
    owner: new Uint8Array(0),
  };
}

export const EventTHORName = {
  encode(message: EventTHORName, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (message.chain !== "") {
      writer.uint32(18).string(message.chain);
    }
    if (message.address !== "") {
      writer.uint32(26).string(message.address);
    }
    if (message.registrationFee !== "") {
      writer.uint32(34).string(message.registrationFee);
    }
    if (message.fundAmt !== "") {
      writer.uint32(42).string(message.fundAmt);
    }
    if (!message.expire.isZero()) {
      writer.uint32(48).int64(message.expire);
    }
    if (message.owner.length !== 0) {
      writer.uint32(58).bytes(message.owner);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventTHORName {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventTHORName();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.chain = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.address = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.registrationFee = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.fundAmt = reader.string();
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.expire = reader.int64() as Long;
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.owner = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventTHORName {
    return {
      name: isSet(object.name) ? globalThis.String(object.name) : "",
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      address: isSet(object.address) ? globalThis.String(object.address) : "",
      registrationFee: isSet(object.registrationFee) ? globalThis.String(object.registrationFee) : "",
      fundAmt: isSet(object.fundAmt) ? globalThis.String(object.fundAmt) : "",
      expire: isSet(object.expire) ? Long.fromValue(object.expire) : Long.ZERO,
      owner: isSet(object.owner) ? bytesFromBase64(object.owner) : new Uint8Array(0),
    };
  },

  toJSON(message: EventTHORName): unknown {
    const obj: any = {};
    if (message.name !== "") {
      obj.name = message.name;
    }
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (message.address !== "") {
      obj.address = message.address;
    }
    if (message.registrationFee !== "") {
      obj.registrationFee = message.registrationFee;
    }
    if (message.fundAmt !== "") {
      obj.fundAmt = message.fundAmt;
    }
    if (!message.expire.isZero()) {
      obj.expire = (message.expire || Long.ZERO).toString();
    }
    if (message.owner.length !== 0) {
      obj.owner = base64FromBytes(message.owner);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventTHORName>, I>>(base?: I): EventTHORName {
    return EventTHORName.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventTHORName>, I>>(object: I): EventTHORName {
    const message = createBaseEventTHORName();
    message.name = object.name ?? "";
    message.chain = object.chain ?? "";
    message.address = object.address ?? "";
    message.registrationFee = object.registrationFee ?? "";
    message.fundAmt = object.fundAmt ?? "";
    message.expire = (object.expire !== undefined && object.expire !== null)
      ? Long.fromValue(object.expire)
      : Long.ZERO;
    message.owner = object.owner ?? new Uint8Array(0);
    return message;
  },
};

function createBaseEventSetMimir(): EventSetMimir {
  return { key: "", value: "" };
}

export const EventSetMimir = {
  encode(message: EventSetMimir, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== "") {
      writer.uint32(18).string(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventSetMimir {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventSetMimir();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.key = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.value = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventSetMimir {
    return {
      key: isSet(object.key) ? globalThis.String(object.key) : "",
      value: isSet(object.value) ? globalThis.String(object.value) : "",
    };
  },

  toJSON(message: EventSetMimir): unknown {
    const obj: any = {};
    if (message.key !== "") {
      obj.key = message.key;
    }
    if (message.value !== "") {
      obj.value = message.value;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventSetMimir>, I>>(base?: I): EventSetMimir {
    return EventSetMimir.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventSetMimir>, I>>(object: I): EventSetMimir {
    const message = createBaseEventSetMimir();
    message.key = object.key ?? "";
    message.value = object.value ?? "";
    return message;
  },
};

function createBaseEventSetNodeMimir(): EventSetNodeMimir {
  return { key: "", value: "", address: "" };
}

export const EventSetNodeMimir = {
  encode(message: EventSetNodeMimir, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== "") {
      writer.uint32(18).string(message.value);
    }
    if (message.address !== "") {
      writer.uint32(26).string(message.address);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventSetNodeMimir {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventSetNodeMimir();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.key = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.value = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.address = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventSetNodeMimir {
    return {
      key: isSet(object.key) ? globalThis.String(object.key) : "",
      value: isSet(object.value) ? globalThis.String(object.value) : "",
      address: isSet(object.address) ? globalThis.String(object.address) : "",
    };
  },

  toJSON(message: EventSetNodeMimir): unknown {
    const obj: any = {};
    if (message.key !== "") {
      obj.key = message.key;
    }
    if (message.value !== "") {
      obj.value = message.value;
    }
    if (message.address !== "") {
      obj.address = message.address;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventSetNodeMimir>, I>>(base?: I): EventSetNodeMimir {
    return EventSetNodeMimir.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventSetNodeMimir>, I>>(object: I): EventSetNodeMimir {
    const message = createBaseEventSetNodeMimir();
    message.key = object.key ?? "";
    message.value = object.value ?? "";
    message.address = object.address ?? "";
    return message;
  },
};

function createBaseEventVersion(): EventVersion {
  return { version: "" };
}

export const EventVersion = {
  encode(message: EventVersion, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.version !== "") {
      writer.uint32(10).string(message.version);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventVersion {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventVersion();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.version = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventVersion {
    return { version: isSet(object.version) ? globalThis.String(object.version) : "" };
  },

  toJSON(message: EventVersion): unknown {
    const obj: any = {};
    if (message.version !== "") {
      obj.version = message.version;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EventVersion>, I>>(base?: I): EventVersion {
    return EventVersion.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EventVersion>, I>>(object: I): EventVersion {
    const message = createBaseEventVersion();
    message.version = object.version ?? "";
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
