'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',          label: 'Catalog'    },
  { href: '/gardens',   label: 'My Gardens' },
  { href: '/explore',   label: 'Explore'    },
  { href: '/designer',  label: 'Designer'   },
  { href: '/tasks',     label: 'Tasks'      },
  { href: '/calendar',  label: 'Calendar'   },
  { href: '/botanist',  label: 'Botanist'   },
  { href: '/settings',  label: 'Settings'   },
] as const

export function NavLinks() {
  const pathname = usePathname()

  return (
    <>
      {links.map(({ href, label }) => {
        const isActive =
          href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? 'text-zinc-900 dark:text-zinc-50 font-medium transition-colors'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors'
            }
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}
