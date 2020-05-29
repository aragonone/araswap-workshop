import React from 'react'
import { Box, formatTokenAmount, GU } from '@aragon/ui'
import { useAppState, useCurrentApp } from '@aragon/api-react'
import useBalances from '../hooks/useBalances'
import { percentageFromDecimals } from '../utils/formatters'

function Overview() {
  const { token, isSyncing, feePct } = useAppState()

  const currentApp = useCurrentApp()
  const [ethBalance, tokenBalance] = useBalances(currentApp?.appAddress)

  const adjustedFeePct = percentageFromDecimals(feePct)

  return (
    <Box heading="Overview">
      {!isSyncing && (
        <div
          css={`
            display: grid;
            grid-template-columns: repeat(3, ${20 * GU}px);
            grid-gap: ${2 * GU}px;
          `}
        >
          <Field label="ETH" value={formatTokenAmount(ethBalance, 18)} />
          <Field
            label={token?.symbol}
            value={formatTokenAmount(tokenBalance, token.decimals)}
          />
          <Field label="Fee" value={`% ${adjustedFeePct}`} />
        </div>
      )}
    </Box>
  )
}

const Field = ({ label, value }) => {
  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      `}
    >
      <strong
        css={`
          margin-bottom: ${1 * GU}px;
        `}
      >
        {label}
      </strong>
      <span css="">{value}</span>
    </div>
  )
}

export default Overview
