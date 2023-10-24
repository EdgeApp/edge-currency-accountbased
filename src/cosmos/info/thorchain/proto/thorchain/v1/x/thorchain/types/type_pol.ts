/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface ProtocolOwnedLiquidity {
  runeDeposited: string;
  runeWithdrawn: string;
}

function createBaseProtocolOwnedLiquidity(): ProtocolOwnedLiquidity {
  return { runeDeposited: "", runeWithdrawn: "" };
}

export const ProtocolOwnedLiquidity = {
  encode(message: ProtocolOwnedLiquidity, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.runeDeposited !== "") {
      writer.uint32(10).string(message.runeDeposited);
    }
    if (message.runeWithdrawn !== "") {
      writer.uint32(18).string(message.runeWithdrawn);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProtocolOwnedLiquidity {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProtocolOwnedLiquidity();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.runeDeposited = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.runeWithdrawn = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ProtocolOwnedLiquidity {
    return {
      runeDeposited: isSet(object.runeDeposited) ? globalThis.String(object.runeDeposited) : "",
      runeWithdrawn: isSet(object.runeWithdrawn) ? globalThis.String(object.runeWithdrawn) : "",
    };
  },

  toJSON(message: ProtocolOwnedLiquidity): unknown {
    const obj: any = {};
    if (message.runeDeposited !== "") {
      obj.runeDeposited = message.runeDeposited;
    }
    if (message.runeWithdrawn !== "") {
      obj.runeWithdrawn = message.runeWithdrawn;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ProtocolOwnedLiquidity>, I>>(base?: I): ProtocolOwnedLiquidity {
    return ProtocolOwnedLiquidity.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProtocolOwnedLiquidity>, I>>(object: I): ProtocolOwnedLiquidity {
    const message = createBaseProtocolOwnedLiquidity();
    message.runeDeposited = object.runeDeposited ?? "";
    message.runeWithdrawn = object.runeWithdrawn ?? "";
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
