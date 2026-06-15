"use client"

import { DashboardLayout } from "@/components/layouts/dashboard"
import { profileNavGroups } from "@/modules/profile/config"

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout navGroups={profileNavGroups}>
      {children}
    </DashboardLayout>
  )
}
