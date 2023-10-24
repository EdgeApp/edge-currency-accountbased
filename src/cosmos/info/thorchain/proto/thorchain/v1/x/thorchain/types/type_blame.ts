/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "types";

export interface Node {
  pubkey: string;
  blameData: Uint8Array;
  blameSignature: Uint8Array;
}

export interface Blame {
  failReason: string;
  isUnicast: boolean;
  blameNodes: Node[];
  round: string;
}

function createBaseNode(): Node {
  return { pubkey: "", blameData: new Uint8Array(0), blameSignature: new Uint8Array(0) };
}

export const Node = {
  encode(message: Node, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pubkey !== "") {
      writer.uint32(10).string(message.pubkey);
    }
    if (message.blameData.length !== 0) {
      writer.uint32(18).bytes(message.blameData);
    }
    if (message.blameSignature.length !== 0) {
      writer.uint32(26).bytes(message.blameSignature);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Node {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNode();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.pubkey = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.blameData = reader.bytes();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.blameSignature = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Node {
    return {
      pubkey: isSet(object.pubkey) ? globalThis.String(object.pubkey) : "",
      blameData: isSet(object.blameData) ? bytesFromBase64(object.blameData) : new Uint8Array(0),
      blameSignature: isSet(object.blameSignature) ? bytesFromBase64(object.blameSignature) : new Uint8Array(0),
    };
  },

  toJSON(message: Node): unknown {
    const obj: any = {};
    if (message.pubkey !== "") {
      obj.pubkey = message.pubkey;
    }
    if (message.blameData.length !== 0) {
      obj.blameData = base64FromBytes(message.blameData);
    }
    if (message.blameSignature.length !== 0) {
      obj.blameSignature = base64FromBytes(message.blameSignature);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Node>, I>>(base?: I): Node {
    return Node.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Node>, I>>(object: I): Node {
    const message = createBaseNode();
    message.pubkey = object.pubkey ?? "";
    message.blameData = object.blameData ?? new Uint8Array(0);
    message.blameSignature = object.blameSignature ?? new Uint8Array(0);
    return message;
  },
};

function createBaseBlame(): Blame {
  return { failReason: "", isUnicast: false, blameNodes: [], round: "" };
}

export const Blame = {
  encode(message: Blame, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.failReason !== "") {
      writer.uint32(10).string(message.failReason);
    }
    if (message.isUnicast === true) {
      writer.uint32(16).bool(message.isUnicast);
    }
    for (const v of message.blameNodes) {
      Node.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.round !== "") {
      writer.uint32(34).string(message.round);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Blame {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBlame();
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

          message.blameNodes.push(Node.decode(reader, reader.uint32()));
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.round = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Blame {
    return {
      failReason: isSet(object.failReason) ? globalThis.String(object.failReason) : "",
      isUnicast: isSet(object.isUnicast) ? globalThis.Boolean(object.isUnicast) : false,
      blameNodes: globalThis.Array.isArray(object?.blameNodes)
        ? object.blameNodes.map((e: any) => Node.fromJSON(e))
        : [],
      round: isSet(object.round) ? globalThis.String(object.round) : "",
    };
  },

  toJSON(message: Blame): unknown {
    const obj: any = {};
    if (message.failReason !== "") {
      obj.failReason = message.failReason;
    }
    if (message.isUnicast === true) {
      obj.isUnicast = message.isUnicast;
    }
    if (message.blameNodes?.length) {
      obj.blameNodes = message.blameNodes.map((e) => Node.toJSON(e));
    }
    if (message.round !== "") {
      obj.round = message.round;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Blame>, I>>(base?: I): Blame {
    return Blame.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Blame>, I>>(object: I): Blame {
    const message = createBaseBlame();
    message.failReason = object.failReason ?? "";
    message.isUnicast = object.isUnicast ?? false;
    message.blameNodes = object.blameNodes?.map((e) => Node.fromPartial(e)) || [];
    message.round = object.round ?? "";
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
