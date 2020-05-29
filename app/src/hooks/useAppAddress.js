import { useEffect, useState } from 'react'
import { useApi } from '@aragon/api-react'

export default function useAppAddress() {
  const api = useApi()
  const [appAddress, setAppAddress] = useState('')

  useEffect(() => {
    let cancelled = false

    const fetchAppAddress = async () => {
      const { appAddress } = await api.currentApp().toPromise()

      if (!cancelled) {
        setAppAddress(appAddress)
      }
    }

    fetchAppAddress()
    return () => {
      cancelled = true
    }
  }, [api])

  return appAddress
}
