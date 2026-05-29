'use client'

import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useSettingsStore } from '@/store/settingsStore'
import { captureRef } from '@/lib/referral'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useSettingsStore.getState().load()
    captureRef()
  }, [])

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{ duration: 2000, style: { borderRadius: '12px', fontSize: '13px' } }}
      />
      {children}
    </>
  )
}
