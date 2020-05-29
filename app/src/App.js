import React from 'react'
import { useAppState } from '@aragon/api-react'
import { Button, Header, Main, SidePanel, SyncIndicator } from '@aragon/ui'

import Swap from './panels/Swap'
import Overview from './components/Overview'
import Purchases from './components/Purchases'
import { usePanelState } from './hooks/usePanelState'

function App() {
  const { isSyncing, purchases } = useAppState()
  const panelState = usePanelState()

  return (
    <Main>
      {isSyncing && <SyncIndicator />}
      <Header
        primary="Araswap"
        secondary={
          <Button label="Swap" mode="strong" onClick={panelState.requestOpen} />
        }
      />

      {!isSyncing && <Overview>Hola</Overview>}
      {purchases && <Purchases purchases={purchases} />}

      <SidePanel
        title="Swap"
        opened={panelState && panelState.visible}
        onClose={panelState.requestClose}
      >
        <Swap onPanelClose={panelState.requestClose} />
      </SidePanel>
    </Main>
  )
}

export default App
