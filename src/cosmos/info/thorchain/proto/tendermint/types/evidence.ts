/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Timestamp } from "../../google/protobuf/timestamp";
import { Vote } from "./types";

export const protobufPackage = "tendermint.types";

/**
 * DuplicateVoteEvidence contains evidence a validator signed two conflicting
 * votes.
 */
export interface DuplicateVoteEvidence {
  voteA?: Vote | undefined;
  voteB?: Vote | undefined;
  timestamp?: Date | undefined;
}

export interface Evidence {
  duplicateVoteEvidence?: DuplicateVoteEvidence | undefined;
}

/** EvidenceData contains any evidence of malicious wrong-doing by validators */
export interface EvidenceData {
  evidence: Evidence[];
  hash: Uint8Array;
}

function createBaseDuplicateVoteEvidence(): DuplicateVoteEvidence {
  return { voteA: undefined, voteB: undefined, timestamp: undefined };
}

export const DuplicateVoteEvidence = {
  encode(message: DuplicateVoteEvidence, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.voteA !== undefined) {
      Vote.encode(message.voteA, writer.uint32(10).fork()).ldelim();
    }
    if (message.voteB !== undefined) {
      Vote.encode(message.voteB, writer.uint32(18).fork()).ldelim();
    }
    if (message.timestamp !== undefined) {
      Timestamp.encode(toTimestamp(message.timestamp), writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DuplicateVoteEvidence {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDuplicateVoteEvidence();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.voteA = Vote.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.voteB = Vote.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.timestamp = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DuplicateVoteEvidence {
    return {
      voteA: isSet(object.voteA) ? Vote.fromJSON(object.voteA) : undefined,
      voteB: isSet(object.voteB) ? Vote.fromJSON(object.voteB) : undefined,
      timestamp: isSet(object.timestamp) ? fromJsonTimestamp(object.timestamp) : undefined,
    };
  },

  toJSON(message: DuplicateVoteEvidence): unknown {
    const obj: any = {};
    if (message.voteA !== undefined) {
      obj.voteA = Vote.toJSON(message.voteA);
    }
    if (message.voteB !== undefined) {
      obj.voteB = Vote.toJSON(message.voteB);
    }
    if (message.timestamp !== undefined) {
      obj.timestamp = message.timestamp.toISOString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<DuplicateVoteEvidence>, I>>(base?: I): DuplicateVoteEvidence {
    return DuplicateVoteEvidence.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<DuplicateVoteEvidence>, I>>(object: I): DuplicateVoteEvidence {
    const message = createBaseDuplicateVoteEvidence();
    message.voteA = (object.voteA !== undefined && object.voteA !== null) ? Vote.fromPartial(object.voteA) : undefined;
    message.voteB = (object.voteB !== undefined && object.voteB !== null) ? Vote.fromPartial(object.voteB) : undefined;
    message.timestamp = object.timestamp ?? undefined;
    return message;
  },
};

function createBaseEvidence(): Evidence {
  return { duplicateVoteEvidence: undefined };
}

export const Evidence = {
  encode(message: Evidence, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.duplicateVoteEvidence !== undefined) {
      DuplicateVoteEvidence.encode(message.duplicateVoteEvidence, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Evidence {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEvidence();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.duplicateVoteEvidence = DuplicateVoteEvidence.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Evidence {
    return {
      duplicateVoteEvidence: isSet(object.duplicateVoteEvidence)
        ? DuplicateVoteEvidence.fromJSON(object.duplicateVoteEvidence)
        : undefined,
    };
  },

  toJSON(message: Evidence): unknown {
    const obj: any = {};
    if (message.duplicateVoteEvidence !== undefined) {
      obj.duplicateVoteEvidence = DuplicateVoteEvidence.toJSON(message.duplicateVoteEvidence);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Evidence>, I>>(base?: I): Evidence {
    return Evidence.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Evidence>, I>>(object: I): Evidence {
    const message = createBaseEvidence();
    message.duplicateVoteEvidence =
      (object.duplicateVoteEvidence !== undefined && object.duplicateVoteEvidence !== null)
        ? DuplicateVoteEvidence.fromPartial(object.duplicateVoteEvidence)
        : undefined;
    return message;
  },
};

function createBaseEvidenceData(): EvidenceData {
  return { evidence: [], hash: new Uint8Array(0) };
}

export const EvidenceData = {
  encode(message: EvidenceData, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.evidence) {
      Evidence.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.hash.length !== 0) {
      writer.uint32(18).bytes(message.hash);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EvidenceData {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEvidenceData();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.evidence.push(Evidence.decode(reader, reader.uint32()));
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.hash = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EvidenceData {
    return {
      evidence: globalThis.Array.isArray(object?.evidence) ? object.evidence.map((e: any) => Evidence.fromJSON(e)) : [],
      hash: isSet(object.hash) ? bytesFromBase64(object.hash) : new Uint8Array(0),
    };
  },

  toJSON(message: EvidenceData): unknown {
    const obj: any = {};
    if (message.evidence?.length) {
      obj.evidence = message.evidence.map((e) => Evidence.toJSON(e));
    }
    if (message.hash.length !== 0) {
      obj.hash = base64FromBytes(message.hash);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<EvidenceData>, I>>(base?: I): EvidenceData {
    return EvidenceData.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<EvidenceData>, I>>(object: I): EvidenceData {
    const message = createBaseEvidenceData();
    message.evidence = object.evidence?.map((e) => Evidence.fromPartial(e)) || [];
    message.hash = object.hash ?? new Uint8Array(0);
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

function toTimestamp(date: Date): Timestamp {
  const seconds = numberToLong(date.getTime() / 1_000);
  const nanos = (date.getTime() % 1_000) * 1_000_000;
  return { seconds, nanos };
}

function fromTimestamp(t: Timestamp): Date {
  let millis = (t.seconds.toNumber() || 0) * 1_000;
  millis += (t.nanos || 0) / 1_000_000;
  return new globalThis.Date(millis);
}

function fromJsonTimestamp(o: any): Date {
  if (o instanceof globalThis.Date) {
    return o;
  } else if (typeof o === "string") {
    return new globalThis.Date(o);
  } else {
    return fromTimestamp(Timestamp.fromJSON(o));
  }
}

function numberToLong(number: number) {
  return Long.fromNumber(number);
}

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
