import React from 'react'
import {
  addressesEqual,
  DataView,
  formatTokenAmount,
  IconArrowRight,
  IconArrowLeft,
  IdentityBadge,
} from '@aragon/ui'
import { useAppState, useConnectedAccount } from '@aragon/api-react'

function Purchases({ purchases }) {
  const { token } = useAppState()
  const connectedAccount = useConnectedAccount()

  return (
    <DataView
      heading={<strong>Purchases</strong>}
      fields={['Buyer', 'ETH', '', token?.symbol]}
      entries={purchases}
      renderEntry={({ buyer, ethAmount, tokenAmount, fromEth }) => {
        return [
          <IdentityBadge
            entity={buyer}
            connectedAccount={addressesEqual(buyer, connectedAccount)}
            shorten={false}
          />,
          <span>{formatTokenAmount(ethAmount, 18)}</span>,
          fromEth ? <IconArrowRight size="medium" /> : <IconArrowLeft />,
          <span>{formatTokenAmount(tokenAmount, token.decimals)}</span>,
        ]
      }}
    />
  )
}

export default Purchases
