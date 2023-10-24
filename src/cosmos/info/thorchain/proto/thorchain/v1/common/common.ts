/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "common";

export interface Asset {
  chain: string;
  symbol: string;
  ticker: string;
  synth: boolean;
}

export interface Coin {
  asset?: Asset | undefined;
  amount: string;
  decimals: Long;
}

/** PubKeySet contains two pub keys , secp256k1 and ed25519 */
export interface PubKeySet {
  secp256k1: string;
  ed25519: string;
}

export interface Tx {
  id: string;
  chain: string;
  fromAddress: string;
  toAddress: string;
  coins: Coin[];
  gas: Coin[];
  memo: string;
}

export interface Fee {
  coins: Coin[];
  poolDeduct: string;
}

export interface ProtoUint {
  value: string;
}

function createBaseAsset(): Asset {
  return { chain: "", symbol: "", ticker: "", synth: false };
}

export const Asset = {
  encode(message: Asset, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.chain !== "") {
      writer.uint32(10).string(message.chain);
    }
    if (message.symbol !== "") {
      writer.uint32(18).string(message.symbol);
    }
    if (message.ticker !== "") {
      writer.uint32(26).string(message.ticker);
    }
    if (message.synth === true) {
      writer.uint32(32).bool(message.synth);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Asset {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAsset();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.chain = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.symbol = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.ticker = reader.string();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.synth = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Asset {
    return {
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      symbol: isSet(object.symbol) ? globalThis.String(object.symbol) : "",
      ticker: isSet(object.ticker) ? globalThis.String(object.ticker) : "",
      synth: isSet(object.synth) ? globalThis.Boolean(object.synth) : false,
    };
  },

  toJSON(message: Asset): unknown {
    const obj: any = {};
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (message.symbol !== "") {
      obj.symbol = message.symbol;
    }
    if (message.ticker !== "") {
      obj.ticker = message.ticker;
    }
    if (message.synth === true) {
      obj.synth = message.synth;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Asset>, I>>(base?: I): Asset {
    return Asset.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Asset>, I>>(object: I): Asset {
    const message = createBaseAsset();
    message.chain = object.chain ?? "";
    message.symbol = object.symbol ?? "";
    message.ticker = object.ticker ?? "";
    message.synth = object.synth ?? false;
    return message;
  },
};

function createBaseCoin(): Coin {
  return { asset: undefined, amount: "", decimals: Long.ZERO };
}

export const Coin = {
  encode(message: Coin, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.asset !== undefined) {
      Asset.encode(message.asset, writer.uint32(10).fork()).ldelim();
    }
    if (message.amount !== "") {
      writer.uint32(18).string(message.amount);
    }
    if (!message.decimals.isZero()) {
      writer.uint32(24).int64(message.decimals);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Coin {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCoin();
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

          message.amount = reader.string();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.decimals = reader.int64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Coin {
    return {
      asset: isSet(object.asset) ? Asset.fromJSON(object.asset) : undefined,
      amount: isSet(object.amount) ? globalThis.String(object.amount) : "",
      decimals: isSet(object.decimals) ? Long.fromValue(object.decimals) : Long.ZERO,
    };
  },

  toJSON(message: Coin): unknown {
    const obj: any = {};
    if (message.asset !== undefined) {
      obj.asset = Asset.toJSON(message.asset);
    }
    if (message.amount !== "") {
      obj.amount = message.amount;
    }
    if (!message.decimals.isZero()) {
      obj.decimals = (message.decimals || Long.ZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Coin>, I>>(base?: I): Coin {
    return Coin.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Coin>, I>>(object: I): Coin {
    const message = createBaseCoin();
    message.asset = (object.asset !== undefined && object.asset !== null) ? Asset.fromPartial(object.asset) : undefined;
    message.amount = object.amount ?? "";
    message.decimals = (object.decimals !== undefined && object.decimals !== null)
      ? Long.fromValue(object.decimals)
      : Long.ZERO;
    return message;
  },
};

function createBasePubKeySet(): PubKeySet {
  return { secp256k1: "", ed25519: "" };
}

export const PubKeySet = {
  encode(message: PubKeySet, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.secp256k1 !== "") {
      writer.uint32(10).string(message.secp256k1);
    }
    if (message.ed25519 !== "") {
      writer.uint32(18).string(message.ed25519);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PubKeySet {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePubKeySet();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.secp256k1 = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.ed25519 = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PubKeySet {
    return {
      secp256k1: isSet(object.secp256k1) ? globalThis.String(object.secp256k1) : "",
      ed25519: isSet(object.ed25519) ? globalThis.String(object.ed25519) : "",
    };
  },

  toJSON(message: PubKeySet): unknown {
    const obj: any = {};
    if (message.secp256k1 !== "") {
      obj.secp256k1 = message.secp256k1;
    }
    if (message.ed25519 !== "") {
      obj.ed25519 = message.ed25519;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PubKeySet>, I>>(base?: I): PubKeySet {
    return PubKeySet.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PubKeySet>, I>>(object: I): PubKeySet {
    const message = createBasePubKeySet();
    message.secp256k1 = object.secp256k1 ?? "";
    message.ed25519 = object.ed25519 ?? "";
    return message;
  },
};

function createBaseTx(): Tx {
  return { id: "", chain: "", fromAddress: "", toAddress: "", coins: [], gas: [], memo: "" };
}

export const Tx = {
  encode(message: Tx, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.chain !== "") {
      writer.uint32(18).string(message.chain);
    }
    if (message.fromAddress !== "") {
      writer.uint32(26).string(message.fromAddress);
    }
    if (message.toAddress !== "") {
      writer.uint32(34).string(message.toAddress);
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    for (const v of message.gas) {
      Coin.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    if (message.memo !== "") {
      writer.uint32(58).string(message.memo);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Tx {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTx();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
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

          message.fromAddress = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.toAddress = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.coins.push(Coin.decode(reader, reader.uint32()));
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.gas.push(Coin.decode(reader, reader.uint32()));
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.memo = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Tx {
    return {
      id: isSet(object.id) ? globalThis.String(object.id) : "",
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      fromAddress: isSet(object.fromAddress) ? globalThis.String(object.fromAddress) : "",
      toAddress: isSet(object.toAddress) ? globalThis.String(object.toAddress) : "",
      coins: globalThis.Array.isArray(object?.coins) ? object.coins.map((e: any) => Coin.fromJSON(e)) : [],
      gas: globalThis.Array.isArray(object?.gas) ? object.gas.map((e: any) => Coin.fromJSON(e)) : [],
      memo: isSet(object.memo) ? globalThis.String(object.memo) : "",
    };
  },

  toJSON(message: Tx): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (message.fromAddress !== "") {
      obj.fromAddress = message.fromAddress;
    }
    if (message.toAddress !== "") {
      obj.toAddress = message.toAddress;
    }
    if (message.coins?.length) {
      obj.coins = message.coins.map((e) => Coin.toJSON(e));
    }
    if (message.gas?.length) {
      obj.gas = message.gas.map((e) => Coin.toJSON(e));
    }
    if (message.memo !== "") {
      obj.memo = message.memo;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Tx>, I>>(base?: I): Tx {
    return Tx.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Tx>, I>>(object: I): Tx {
    const message = createBaseTx();
    message.id = object.id ?? "";
    message.chain = object.chain ?? "";
    message.fromAddress = object.fromAddress ?? "";
    message.toAddress = object.toAddress ?? "";
    message.coins = object.coins?.map((e) => Coin.fromPartial(e)) || [];
    message.gas = object.gas?.map((e) => Coin.fromPartial(e)) || [];
    message.memo = object.memo ?? "";
    return message;
  },
};

function createBaseFee(): Fee {
  return { coins: [], poolDeduct: "" };
}

export const Fee = {
  encode(message: Fee, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.poolDeduct !== "") {
      writer.uint32(18).string(message.poolDeduct);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Fee {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFee();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.coins.push(Coin.decode(reader, reader.uint32()));
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.poolDeduct = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Fee {
    return {
      coins: globalThis.Array.isArray(object?.coins) ? object.coins.map((e: any) => Coin.fromJSON(e)) : [],
      poolDeduct: isSet(object.poolDeduct) ? globalThis.String(object.poolDeduct) : "",
    };
  },

  toJSON(message: Fee): unknown {
    const obj: any = {};
    if (message.coins?.length) {
      obj.coins = message.coins.map((e) => Coin.toJSON(e));
    }
    if (message.poolDeduct !== "") {
      obj.poolDeduct = message.poolDeduct;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Fee>, I>>(base?: I): Fee {
    return Fee.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Fee>, I>>(object: I): Fee {
    const message = createBaseFee();
    message.coins = object.coins?.map((e) => Coin.fromPartial(e)) || [];
    message.poolDeduct = object.poolDeduct ?? "";
    return message;
  },
};

function createBaseProtoUint(): ProtoUint {
  return { value: "" };
}

export const ProtoUint = {
  encode(message: ProtoUint, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.value !== "") {
      writer.uint32(10).string(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProtoUint {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProtoUint();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
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

  fromJSON(object: any): ProtoUint {
    return { value: isSet(object.value) ? globalThis.String(object.value) : "" };
  },

  toJSON(message: ProtoUint): unknown {
    const obj: any = {};
    if (message.value !== "") {
      obj.value = message.value;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ProtoUint>, I>>(base?: I): ProtoUint {
    return ProtoUint.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProtoUint>, I>>(object: I): ProtoUint {
    const message = createBaseProtoUint();
    message.value = object.value ?? "";
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
