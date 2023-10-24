/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface ChainContract {
  chain: string;
  router: string;
}

function createBaseChainContract(): ChainContract {
  return { chain: "", router: "" };
}

export const ChainContract = {
  encode(message: ChainContract, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.chain !== "") {
      writer.uint32(10).string(message.chain);
    }
    if (message.router !== "") {
      writer.uint32(18).string(message.router);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ChainContract {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseChainContract();
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

          message.router = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ChainContract {
    return {
      chain: isSet(object.chain) ? globalThis.String(object.chain) : "",
      router: isSet(object.router) ? globalThis.String(object.router) : "",
    };
  },

  toJSON(message: ChainContract): unknown {
    const obj: any = {};
    if (message.chain !== "") {
      obj.chain = message.chain;
    }
    if (message.router !== "") {
      obj.router = message.router;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ChainContract>, I>>(base?: I): ChainContract {
    return ChainContract.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ChainContract>, I>>(object: I): ChainContract {
    const message = createBaseChainContract();
    message.chain = object.chain ?? "";
    message.router = object.router ?? "";
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
