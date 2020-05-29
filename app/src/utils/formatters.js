import BN from 'bn.js'

const PCT_BASE = new BN(1000000)

export function percentageFromDecimals(pct) {
  return pct.mul(new BN(100)).div(PCT_BASE.div(new BN(100))) / 100
}
