import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Icon>
)

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Icon>
)

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const OpenIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 16 17 7M9 7h8v8" />
  </Icon>
)

export const MoreIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2.5}>
    <path d="M6 12h.01M12 12h.01M18 12h.01" />
  </Icon>
)

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4h6l-1 6 3 3H7l3-3-1-6ZM12 13v7" />
  </Icon>
)

export const BookmarkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4h10v16l-5-3.5L7 20V4Z" />
  </Icon>
)

export const NoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 4h9l3 3v13H6V4Z" />
    <path d="M9 10h6M9 14h6M9 18h3" />
  </Icon>
)

export const CollectionIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z" />
    <path d="m4 12 8 3.5 8-3.5M4 16.5 12 20l8-3.5" />
  </Icon>
)

export const HashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4 7 20M17 4l-2 16M4.5 9h16M3.5 15h16" />
  </Icon>
)

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </Icon>
)

export const KeyboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" />
  </Icon>
)

export const OfflineIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14.5 10.4A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4.5-2.8M11 5.1A15 15 0 0 1 22 9.5" />
  </Icon>
)
