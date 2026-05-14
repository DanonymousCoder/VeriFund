/**
 * Member profile and dashboard data hooks.
 * Provides components with a clean interface for accessing member data.
 */

import { useState, useCallback, useEffect } from 'react'
import type { MemberProfile, DashboardData } from '../types/storage'
import { storageService } from '../services/storage'

/**
 * Hook for managing member profile data.
 * Abstracts the storage mechanism from the component.
 */
export function useMemberProfile() {
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await storageService.member.getProfile()
      setProfile(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const save = useCallback(
    async (newProfile: MemberProfile | null) => {
      try {
        await storageService.member.setProfile(newProfile)
        setProfile(newProfile)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save profile')
      }
    },
    [],
  )

  // Load profile on mount
  useEffect(() => {
    load()
  }, [load])

  return { profile, isLoading, error, save, load }
}

/**
 * Hook for managing dashboard data.
 * Abstracts the storage mechanism from the component.
 */
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const dashboardData = await storageService.dashboard.getData()
      setData(dashboardData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const save = useCallback(
    async (newData: DashboardData | null) => {
      try {
        await storageService.dashboard.setData(newData)
        setData(newData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save dashboard data')
      }
    },
    [],
  )

  // Load data on mount
  useEffect(() => {
    load()
  }, [load])

  return { data, isLoading, error, save, load }
}
