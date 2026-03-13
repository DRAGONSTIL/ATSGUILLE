import { Suspense } from 'react'
import { LoginScreen } from '@/components/auth/login-screen'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const errorParam = resolvedSearchParams.error
  const searchError = Array.isArray(errorParam) ? errorParam[0] : errorParam

  return (
    <Suspense fallback={null}>
      <LoginScreen searchError={searchError} />
    </Suspense>
  )
}
