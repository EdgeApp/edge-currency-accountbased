import { MidgardEngine } from './MidgardEngine'

/**
 * Mayachain (Cacao) engine that uses Midgard for transaction history
 * and standard Cosmos gas model for fee calculation.
 *
 * Inherits:
 * - CosmosEngine.calculateFee() for standard Cosmos gas model
 * - MidgardEngine.queryTransactions() for Midgard-style history
 */
export class MayachainEngine extends MidgardEngine {}
