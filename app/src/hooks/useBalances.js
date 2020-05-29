import { useEffect, useState } from 'react'
import { useAragonApi } from '@aragon/api-react'
import tokenBalanceOfAbi from '../abi/token-balanceOf.json'

export default function useBalances(address) {
  const { appState, api } = useAragonApi()
  const { token } = appState

  const [ethBalance, setEthBalance] = useState(-1)
  const [tokenBalance, setTokenBalance] = useState(-1)

  useEffect(() => {
    let cancelled = false

    const fetchUserBalance = async () => {
      const [ethBalance, tokenBalance] = await Promise.all([
        api.web3Eth('getBalance', address).toPromise(),
        api
          .external(token.address, tokenBalanceOfAbi)
          .balanceOf(address)
          .toPromise(),
      ])

      if (!cancelled) {
        setEthBalance(ethBalance)
        setTokenBalance(tokenBalance)
      }
    }

    if (token && address) {
      fetchUserBalance()
    }

    return () => {
      cancelled = true
    }
  }, [api, address, token])

  return [ethBalance, tokenBalance]
}
