import { getLocale } from "next-intl/server"
import { redirect } from "@/i18n/navigation"

export default async function RegisterPage() {
  const locale = await getLocale()
  redirect({ href: "/login", locale })
}
