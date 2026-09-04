import "@workspace/ui/globals.css"
import Link from "next/link"
import { fontVariables } from "@/lib/fonts"

export default function RootNotFound() {
  return (
    <html lang="en" className={fontVariables}>
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.3em]">
            404
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Page not found
          </h1>
          <Link href="/" className="mt-8 text-sm underline underline-offset-4">
            Back to home
          </Link>
        </div>
      </body>
    </html>
  )
}
