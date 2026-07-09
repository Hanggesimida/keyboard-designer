import { Suspense } from "react"
import { ProfileSettingsContent } from "@/modules/profile/components/ProfileSettingsContent"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function ProfileSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      }
    >
      <ProfileSettingsContent />
    </Suspense>
  )
}
