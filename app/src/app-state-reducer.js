import BN from 'bn.js'

const reducer = (state) => {
  if (state === null) {
    return { isSyncing: true }
  }

  const { ethPurchases = [], feePct, tokenPurchases = [] } = state

  return {
    ...state,

    feePct: new BN(feePct),

    purchases: [...ethPurchases, ...tokenPurchases].map(
      ({ buyer, ethBought, ethSold, tokensBought, tokensSold }) => ({
        buyer,
        ethAmount: new BN(ethBought || ethSold),
        tokenAmount: new BN(tokensBought || tokensSold),
        fromEth: Boolean(ethSold),
      })
    ),
  }
}

export default reducer
