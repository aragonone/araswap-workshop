import 'core-js/stable'
import 'regenerator-runtime/runtime'
import Aragon, { events } from '@aragon/api'
import { getToken } from './helpers/tokens'

const app = new Aragon()

app.store(
  async (state, { event, returnValues }) => {
    const nextState = {
      ...state,
    }

    try {
      switch (event) {
        case events.SYNC_STATUS_SYNCING:
          return { ...nextState, isSyncing: true }
        case events.SYNC_STATUS_SYNCED:
          return { ...nextState, isSyncing: false }
        case 'TokenPurchase':
          return onTokenPurchase(nextState, returnValues)
        case 'EthPurchase':
          return onEthPurchase(nextState, returnValues)
        case 'AddLiquidity':
          return { ...nextState }
        case 'RemoveLiquidity':
          return { ...nextState }
        default:
          return state
      }
    } catch (err) {
      console.log(err)
    }
  },
  {
    init: initializeState(),
  }
)

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

function initializeState() {
  return async (cachedState) => {
    const [tokenAddress, feePct] = await Promise.all([
      app.call('token').toPromise(),
      app.call('feePct').toPromise(),
    ])
    const tokenData = await getToken(app, tokenAddress)

    return {
      ...cachedState,
      token: tokenData,
      feePct,
    }
  }
}

function onTokenPurchase(state, { buyer, eth_sold, tokens_bought }) {
  const { tokenPurchases = [] } = state

  return {
    ...state,
    tokenPurchases: [
      ...tokenPurchases,
      { buyer, ethSold: eth_sold, tokensBought: tokens_bought },
    ],
  }
}

function onEthPurchase(state, { buyer, tokens_sold, eth_bought }) {
  const { ethPurchases = [] } = state
  return {
    ...state,
    ethPurchases: [
      ...ethPurchases,
      { buyer, tokensSold: tokens_sold, ethBought: eth_bought },
    ],
  }
}
