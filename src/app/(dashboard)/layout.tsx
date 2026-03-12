'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DashboardProvider } from '@/components/layout/dashboard-context'
import { GlobalDialogsProvider } from '@/components/layout/global-dialogs'

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardProvider>
            <GlobalDialogsProvider>
                <DashboardLayout>
                    {children}
                </DashboardLayout>
            </GlobalDialogsProvider>
        </DashboardProvider>
    )
}
