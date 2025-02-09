'use client'

import SignInButton from '../app/components/SignInButton'
import Link from 'next/link'

export default function Template({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Link href="/" className="text-2xl font-bold text-indigo-600">
                  PersonalCRM
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <SignInButton />
            </div>
          </div>
        </div>
      </nav>
      {children}
    </>
  )
} 