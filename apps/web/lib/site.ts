const githubRepo = "https://github.com/Hanggesimida/keyboard-designer"

export const siteConfig = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kbd.weihangli.dev",
  githubRepo,
  githubIssues: `${githubRepo}/issues`,
  license: `${githubRepo}/blob/main/LICENSE`,
  authorSite: "https://www.weihangli.dev/",
} as const
