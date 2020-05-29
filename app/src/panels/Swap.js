import React, { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Field,
  formatTokenAmount,
  GU,
  IconSwap,
  TextInput,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import { toDecimals } from '../utils/math-utils'
import useBalances from '../hooks/useBalances'

function Swap({ onPanelClose }) {
  const [fromEth, setFromEth] = useState(false)
  const [amount, setAmount] = useState('0')
  const [derivedAmount, setDerivedAmount] = useState('0')

  const theme = useTheme()
  const {
    api,
    appState: { token },
    connectedAccount,
  } = useAragonApi()
  const [ethBalance, tokenBalance] = useBalances(connectedAccount)

  const handleFromEthToggle = useCallback(() => {
    setFromEth(!fromEth)
  }, [fromEth])

  const handleAmountChange = useCallback((event) => {
    const newAmount = event.target.value
    setAmount(newAmount)
  }, [])

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()

      const deadline = Math.floor(Date.now() / 1000 + 120) // maximum deadline 2 minutes from now
      const convertedAmount = toDecimals(amount, fromEth ? 18 : token.decimals)
      let intentParams = {}
      const txParams = [1, deadline]

      if (fromEth) {
        intentParams = {
          value: convertedAmount,
        }
      } else {
        intentParams = {
          token: { address: token.address, value: convertedAmount },
          // While it's generally a bad idea to hardcode gas in intents, in the case of token deposits
          // it prevents metamask from doing the gas estimation and telling the user that their
          // transaction will fail (before the approve is mined).
          // The actual gas cost is around ~180k + 20k per 32 chars of text + 80k per period
          // transition but we do the estimation with some breathing room in case it is being
          // forwarded (unlikely in deposit).
          gas:
            400000 + 20000 * Math.ceil(convertedAmount.length / 32) + 80000 * 1,
        }

        txParams.unshift(convertedAmount)
      }

      txParams.push(intentParams)

      api[fromEth ? 'ethToTokenSwapInput' : 'tokenToEthSwapInput'](
        ...txParams
      ).toPromise()
      onPanelClose()
    },
    [amount, api, fromEth, onPanelClose, token]
  )

  useEffect(() => {
    let cancelled = false

    const fetchInputPrice = async () => {
      const derivedAmount = await api
        .call(
          fromEth ? 'getEthToTokenInputPrice' : 'getTokenToEthInputPrice',
          toDecimals(amount, fromEth ? 18 : token.decimals)
        )
        .toPromise()

      if (!cancelled) {
        setDerivedAmount(derivedAmount)
      }
    }

    if (amount > 0) {
      fetchInputPrice()
    }

    return () => {
      cancelled = true
    }
  }, [amount, api, fromEth, token])

  return (
    <form onSubmit={handleSubmit}>
      <div
        css={`
          text-align: center;
          margin-top: ${3 * GU}px;
        `}
      >
        <div
          css={`
            margin-bottom: ${2 * GU}px;
          `}
        >
          <Field
            label={fromEth ? 'ETH' : token.symbol}
            css={`
              margin-bottom: ${1 * GU}px;
            `}
          >
            <TextInput
              value={amount}
              onChange={handleAmountChange}
              wide
              required
            />
          </Field>
          <span
            css={`
              ${textStyle('body3')};
              color: ${theme.contentSecondary};
            `}
          >
            Your balance{' '}
            {formatTokenAmount(
              ...(fromEth ? [ethBalance, 18] : [tokenBalance, token.decimals])
            )}
          </span>
        </div>

        <div
          css={`
            margin-bottom: ${2 * GU}px;
            cursor: pointer;

            transform: rotate(90deg);
            transition: transform 0.4s ease;

            & > :active {
              transform: rotate(180deg);
            }
          `}
        >
          <IconSwap onClick={handleFromEthToggle} />
        </div>
        <div
          css={`
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: ${3 * GU}px;
          `}
        >
          <label
            css={`
              ${textStyle('body1')}
            `}
          >
            {fromEth ? token.symbol : 'ETH'}
          </label>
          <span>
            {formatTokenAmount(derivedAmount, fromEth ? token.decimals : 18)}
          </span>
        </div>
      </div>
      <Button label="Swap" type="submit" mode="strong" wide />
    </form>
  )
}

export default Swap
