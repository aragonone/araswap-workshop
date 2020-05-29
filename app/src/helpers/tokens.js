import { first, map } from 'rxjs/operators'
import tokenSymbolAbi from '../abi/token-symbol'
import tokenDecimalsAbi from '../abi/token-decimals'

const tokenCache = new Map()

export async function getToken(app, address) {
  if (!tokenCache.has(address)) {
    const [decimals, symbol] = await Promise.all([
      loadTokenDecimals(app, address),
      loadTokenSymbol(app, address),
    ])

    tokenCache.set(address, { address, decimals, symbol })
  }

  return tokenCache.get(address)
}

function loadTokenDecimals(app, address) {
  return app
    .external(address, tokenDecimalsAbi)
    .decimals()
    .pipe(first())
    .pipe(map(value => parseInt(value)))
    .toPromise()
}

function loadTokenSymbol(app, address) {
  return app
    .external(address, tokenSymbolAbi)
    .symbol()
    .pipe(first())
    .toPromise()
}
