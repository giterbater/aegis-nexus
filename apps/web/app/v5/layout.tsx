import type { ReactNode } from 'react'

export default function V5Layout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-black">{children}</div>
}
