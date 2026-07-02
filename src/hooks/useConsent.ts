'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'user_consent'

/**
 * 用户是否已同意免责声明
 * - 首次访问 hydrated=false（SSR/CSR 不一致），需要等 useEffect 读 localStorage
 * - hydrated=true 后 hasConsented 才可信
 */
export function useConsent() {
  const [hasConsented, setHasConsented] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHasConsented(localStorage.getItem(STORAGE_KEY) === 'true')
    setHydrated(true)
  }, [])

  const giveConsent = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {}
    setHasConsented(true)
  }

  const revokeConsent = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    setHasConsented(false)
  }

  return { hasConsented, giveConsent, revokeConsent, hydrated }
}

/**
 * 一站式"开屏弹窗"控制 hook：
 * - 未同意时自动弹出（hydrated 后判断）
 * - confirm：同意并关闭
 * - cancel：占位（调用方可以覆盖，比如 alert 或 router.push）
 */
export function useConsentModal() {
  const { hasConsented, giveConsent, hydrated } = useConsent()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (hydrated && !hasConsented) {
      setShowModal(true)
    }
  }, [hydrated, hasConsented])

  const handleConfirm = () => {
    giveConsent()
    setShowModal(false)
  }

  const handleCancel = () => {
    // 默认行为：什么都不做，弹窗继续显示
    // 调用方可在外层包一层并传入自己的 onCancel
  }

  return { showModal, handleConfirm, handleCancel, hasConsented, hydrated }
}
