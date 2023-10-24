/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { PubKeySet } from "../../../common/common";

export const protobufPackage = "types";

export enum NodeStatus {
  Unknown = 0,
  Whitelisted = 1,
  Standby = 2,
  Ready = 3,
  Active = 4,
  Disabled = 5,
  UNRECOGNIZED = -1,
}

export function nodeStatusFromJSON(object: any): NodeStatus {
  switch (object) {
    case 0:
    case "Unknown":
      return NodeStatus.Unknown;
    case 1:
    case "Whitelisted":
      return NodeStatus.Whitelisted;
    case 2:
    case "Standby":
      return NodeStatus.Standby;
    case 3:
    case "Ready":
      return NodeStatus.Ready;
    case 4:
    case "Active":
      return NodeStatus.Active;
    case 5:
    case "Disabled":
      return NodeStatus.Disabled;
    case -1:
    case "UNRECOGNIZED":
    default:
      return NodeStatus.UNRECOGNIZED;
  }
}

export function nodeStatusToJSON(object: NodeStatus): string {
  switch (object) {
    case NodeStatus.Unknown:
      return "Unknown";
    case NodeStatus.Whitelisted:
      return "Whitelisted";
    case NodeStatus.Standby:
      return "Standby";
    case NodeStatus.Ready:
      return "Ready";
    case NodeStatus.Active:
      return "Active";
    case NodeStatus.Disabled:
      return "Disabled";
    case NodeStatus.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export enum NodeType {
  TypeValidator = 0,
  TypeVault = 1,
  TypeUnknown = 2,
  UNRECOGNIZED = -1,
}

export function nodeTypeFromJSON(object: any): NodeType {
  switch (object) {
    case 0:
    case "TypeValidator":
      return NodeType.TypeValidator;
    case 1:
    case "TypeVault":
      return NodeType.TypeVault;
    case 2:
    case "TypeUnknown":
      return NodeType.TypeUnknown;
    case -1:
    case "UNRECOGNIZED":
    default:
      return NodeType.UNRECOGNIZED;
  }
}

export function nodeTypeToJSON(object: NodeType): string {
  switch (object) {
    case NodeType.TypeValidator:
      return "TypeValidator";
    case NodeType.TypeVault:
      return "TypeVault";
    case NodeType.TypeUnknown:
      return "TypeUnknown";
    case NodeType.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface NodeAccount {
  nodeAddress: Uint8Array;
  status: NodeStatus;
  pubKeySet?: PubKeySet | undefined;
  validatorConsPubKey: string;
  bond: string;
  activeBlockHeight: Long;
  bondAddress: string;
  statusSince: Long;
  signerMembership: string[];
  requestedToLeave: boolean;
  forcedToLeave: boolean;
  leaveScore: Long;
  ipAddress: string;
  version: string;
  type: NodeType;
}

export interface BondProvider {
  bondAddress: Uint8Array;
  bond: string;
}

export interface BondProviders {
  nodeAddress: Uint8Array;
  nodeOperatorFee: string;
  providers: BondProvider[];
}

export interface MinJoinLast {
  lastChangedHeight: Long;
  version: string;
}

function createBaseNodeAccount(): NodeAccount {
  return {
    nodeAddress: new Uint8Array(0),
    status: 0,
    pubKeySet: undefined,
    validatorConsPubKey: "",
    bond: "",
    activeBlockHeight: Long.ZERO,
    bondAddress: "",
    statusSince: Long.ZERO,
    signerMembership: [],
    requestedToLeave: false,
    forcedToLeave: false,
    leaveScore: Long.UZERO,
    ipAddress: "",
    version: "",
    type: 0,
  };
}

export const NodeAccount = {
  encode(message: NodeAccount, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.nodeAddress.length !== 0) {
      writer.uint32(10).bytes(message.nodeAddress);
    }
    if (message.status !== 0) {
      writer.uint32(16).int32(message.status);
    }
    if (message.pubKeySet !== undefined) {
      PubKeySet.encode(message.pubKeySet, writer.uint32(26).fork()).ldelim();
    }
    if (message.validatorConsPubKey !== "") {
      writer.uint32(34).string(message.validatorConsPubKey);
    }
    if (message.bond !== "") {
      writer.uint32(42).string(message.bond);
    }
    if (!message.activeBlockHeight.isZero()) {
      writer.uint32(48).int64(message.activeBlockHeight);
    }
    if (message.bondAddress !== "") {
      writer.uint32(58).string(message.bondAddress);
    }
    if (!message.statusSince.isZero()) {
      writer.uint32(64).int64(message.statusSince);
    }
    for (const v of message.signerMembership) {
      writer.uint32(74).string(v!);
    }
    if (message.requestedToLeave === true) {
      writer.uint32(80).bool(message.requestedToLeave);
    }
    if (message.forcedToLeave === true) {
      writer.uint32(88).bool(message.forcedToLeave);
    }
    if (!message.leaveScore.isZero()) {
      writer.uint32(96).uint64(message.leaveScore);
    }
    if (message.ipAddress !== "") {
      writer.uint32(106).string(message.ipAddress);
    }
    if (message.version !== "") {
      writer.uint32(114).string(message.version);
    }
    if (message.type !== 0) {
      writer.uint32(120).int32(message.type);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): NodeAccount {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNodeAccount();
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

          message.status = reader.int32() as any;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.pubKeySet = PubKeySet.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.validatorConsPubKey = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.bond = reader.string();
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.activeBlockHeight = reader.int64() as Long;
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.bondAddress = reader.string();
          continue;
        case 8:
          if (tag !== 64) {
            break;
          }

          message.statusSince = reader.int64() as Long;
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.signerMembership.push(reader.string());
          continue;
        case 10:
          if (tag !== 80) {
            break;
          }

          message.requestedToLeave = reader.bool();
          continue;
        case 11:
          if (tag !== 88) {
            break;
          }

          message.forcedToLeave = reader.bool();
          continue;
        case 12:
          if (tag !== 96) {
            break;
          }

          message.leaveScore = reader.uint64() as Long;
          continue;
        case 13:
          if (tag !== 106) {
            break;
          }

          message.ipAddress = reader.string();
          continue;
        case 14:
          if (tag !== 114) {
            break;
          }

          message.version = reader.string();
          continue;
        case 15:
          if (tag !== 120) {
            break;
          }

          message.type = reader.int32() as any;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): NodeAccount {
    return {
      nodeAddress: isSet(object.nodeAddress) ? bytesFromBase64(object.nodeAddress) : new Uint8Array(0),
      status: isSet(object.status) ? nodeStatusFromJSON(object.status) : 0,
      pubKeySet: isSet(object.pubKeySet) ? PubKeySet.fromJSON(object.pubKeySet) : undefined,
      validatorConsPubKey: isSet(object.validatorConsPubKey) ? globalThis.String(object.validatorConsPubKey) : "",
      bond: isSet(object.bond) ? globalThis.String(object.bond) : "",
      activeBlockHeight: isSet(object.activeBlockHeight) ? Long.fromValue(object.activeBlockHeight) : Long.ZERO,
      bondAddress: isSet(object.bondAddress) ? globalThis.String(object.bondAddress) : "",
      statusSince: isSet(object.statusSince) ? Long.fromValue(object.statusSince) : Long.ZERO,
      signerMembership: globalThis.Array.isArray(object?.signerMembership)
        ? object.signerMembership.map((e: any) => globalThis.String(e))
        : [],
      requestedToLeave: isSet(object.requestedToLeave) ? globalThis.Boolean(object.requestedToLeave) : false,
      forcedToLeave: isSet(object.forcedToLeave) ? globalThis.Boolean(object.forcedToLeave) : false,
      leaveScore: isSet(object.leaveScore) ? Long.fromValue(object.leaveScore) : Long.UZERO,
      ipAddress: isSet(object.ipAddress) ? globalThis.String(object.ipAddress) : "",
      version: isSet(object.version) ? globalThis.String(object.version) : "",
      type: isSet(object.type) ? nodeTypeFromJSON(object.type) : 0,
    };
  },

  toJSON(message: NodeAccount): unknown {
    const obj: any = {};
    if (message.nodeAddress.length !== 0) {
      obj.nodeAddress = base64FromBytes(message.nodeAddress);
    }
    if (message.status !== 0) {
      obj.status = nodeStatusToJSON(message.status);
    }
    if (message.pubKeySet !== undefined) {
      obj.pubKeySet = PubKeySet.toJSON(message.pubKeySet);
    }
    if (message.validatorConsPubKey !== "") {
      obj.validatorConsPubKey = message.validatorConsPubKey;
    }
    if (message.bond !== "") {
      obj.bond = message.bond;
    }
    if (!message.activeBlockHeight.isZero()) {
      obj.activeBlockHeight = (message.activeBlockHeight || Long.ZERO).toString();
    }
    if (message.bondAddress !== "") {
      obj.bondAddress = message.bondAddress;
    }
    if (!message.statusSince.isZero()) {
      obj.statusSince = (message.statusSince || Long.ZERO).toString();
    }
    if (message.signerMembership?.length) {
      obj.signerMembership = message.signerMembership;
    }
    if (message.requestedToLeave === true) {
      obj.requestedToLeave = message.requestedToLeave;
    }
    if (message.forcedToLeave === true) {
      obj.forcedToLeave = message.forcedToLeave;
    }
    if (!message.leaveScore.isZero()) {
      obj.leaveScore = (message.leaveScore || Long.UZERO).toString();
    }
    if (message.ipAddress !== "") {
      obj.ipAddress = message.ipAddress;
    }
    if (message.version !== "") {
      obj.version = message.version;
    }
    if (message.type !== 0) {
      obj.type = nodeTypeToJSON(message.type);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<NodeAccount>, I>>(base?: I): NodeAccount {
    return NodeAccount.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<NodeAccount>, I>>(object: I): NodeAccount {
    const message = createBaseNodeAccount();
    message.nodeAddress = object.nodeAddress ?? new Uint8Array(0);
    message.status = object.status ?? 0;
    message.pubKeySet = (object.pubKeySet !== undefined && object.pubKeySet !== null)
      ? PubKeySet.fromPartial(object.pubKeySet)
      : undefined;
    message.validatorConsPubKey = object.validatorConsPubKey ?? "";
    message.bond = object.bond ?? "";
    message.activeBlockHeight = (object.activeBlockHeight !== undefined && object.activeBlockHeight !== null)
      ? Long.fromValue(object.activeBlockHeight)
      : Long.ZERO;
    message.bondAddress = object.bondAddress ?? "";
    message.statusSince = (object.statusSince !== undefined && object.statusSince !== null)
      ? Long.fromValue(object.statusSince)
      : Long.ZERO;
    message.signerMembership = object.signerMembership?.map((e) => e) || [];
    message.requestedToLeave = object.requestedToLeave ?? false;
    message.forcedToLeave = object.forcedToLeave ?? false;
    message.leaveScore = (object.leaveScore !== undefined && object.leaveScore !== null)
      ? Long.fromValue(object.leaveScore)
      : Long.UZERO;
    message.ipAddress = object.ipAddress ?? "";
    message.version = object.version ?? "";
    message.type = object.type ?? 0;
    return message;
  },
};

function createBaseBondProvider(): BondProvider {
  return { bondAddress: new Uint8Array(0), bond: "" };
}

export const BondProvider = {
  encode(message: BondProvider, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.bondAddress.length !== 0) {
      writer.uint32(10).bytes(message.bondAddress);
    }
    if (message.bond !== "") {
      writer.uint32(18).string(message.bond);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): BondProvider {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBondProvider();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.bondAddress = reader.bytes();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.bond = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): BondProvider {
    return {
      bondAddress: isSet(object.bondAddress) ? bytesFromBase64(object.bondAddress) : new Uint8Array(0),
      bond: isSet(object.bond) ? globalThis.String(object.bond) : "",
    };
  },

  toJSON(message: BondProvider): unknown {
    const obj: any = {};
    if (message.bondAddress.length !== 0) {
      obj.bondAddress = base64FromBytes(message.bondAddress);
    }
    if (message.bond !== "") {
      obj.bond = message.bond;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<BondProvider>, I>>(base?: I): BondProvider {
    return BondProvider.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<BondProvider>, I>>(object: I): BondProvider {
    const message = createBaseBondProvider();
    message.bondAddress = object.bondAddress ?? new Uint8Array(0);
    message.bond = object.bond ?? "";
    return message;
  },
};

function createBaseBondProviders(): BondProviders {
  return { nodeAddress: new Uint8Array(0), nodeOperatorFee: "", providers: [] };
}

export const BondProviders = {
  encode(message: BondProviders, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.nodeAddress.length !== 0) {
      writer.uint32(10).bytes(message.nodeAddress);
    }
    if (message.nodeOperatorFee !== "") {
      writer.uint32(18).string(message.nodeOperatorFee);
    }
    for (const v of message.providers) {
      BondProvider.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): BondProviders {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBondProviders();
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
          if (tag !== 18) {
            break;
          }

          message.nodeOperatorFee = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.providers.push(BondProvider.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): BondProviders {
    return {
      nodeAddress: isSet(object.nodeAddress) ? bytesFromBase64(object.nodeAddress) : new Uint8Array(0),
      nodeOperatorFee: isSet(object.nodeOperatorFee) ? globalThis.String(object.nodeOperatorFee) : "",
      providers: globalThis.Array.isArray(object?.providers)
        ? object.providers.map((e: any) => BondProvider.fromJSON(e))
        : [],
    };
  },

  toJSON(message: BondProviders): unknown {
    const obj: any = {};
    if (message.nodeAddress.length !== 0) {
      obj.nodeAddress = base64FromBytes(message.nodeAddress);
    }
    if (message.nodeOperatorFee !== "") {
      obj.nodeOperatorFee = message.nodeOperatorFee;
    }
    if (message.providers?.length) {
      obj.providers = message.providers.map((e) => BondProvider.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<BondProviders>, I>>(base?: I): BondProviders {
    return BondProviders.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<BondProviders>, I>>(object: I): BondProviders {
    const message = createBaseBondProviders();
    message.nodeAddress = object.nodeAddress ?? new Uint8Array(0);
    message.nodeOperatorFee = object.nodeOperatorFee ?? "";
    message.providers = object.providers?.map((e) => BondProvider.fromPartial(e)) || [];
    return message;
  },
};

function createBaseMinJoinLast(): MinJoinLast {
  return { lastChangedHeight: Long.ZERO, version: "" };
}

export const MinJoinLast = {
  encode(message: MinJoinLast, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.lastChangedHeight.isZero()) {
      writer.uint32(8).int64(message.lastChangedHeight);
    }
    if (message.version !== "") {
      writer.uint32(18).string(message.version);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MinJoinLast {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMinJoinLast();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.lastChangedHeight = reader.int64() as Long;
          continue;
        case 2:
          if (tag !== 18) {
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

  fromJSON(object: any): MinJoinLast {
    return {
      lastChangedHeight: isSet(object.lastChangedHeight) ? Long.fromValue(object.lastChangedHeight) : Long.ZERO,
      version: isSet(object.version) ? globalThis.String(object.version) : "",
    };
  },

  toJSON(message: MinJoinLast): unknown {
    const obj: any = {};
    if (!message.lastChangedHeight.isZero()) {
      obj.lastChangedHeight = (message.lastChangedHeight || Long.ZERO).toString();
    }
    if (message.version !== "") {
      obj.version = message.version;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MinJoinLast>, I>>(base?: I): MinJoinLast {
    return MinJoinLast.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MinJoinLast>, I>>(object: I): MinJoinLast {
    const message = createBaseMinJoinLast();
    message.lastChangedHeight = (object.lastChangedHeight !== undefined && object.lastChangedHeight !== null)
      ? Long.fromValue(object.lastChangedHeight)
      : Long.ZERO;
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
