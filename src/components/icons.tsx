/** Icon set from the Paper file (Material Symbols geometry), drawn in currentColor. */
type IconProps = { className?: string }

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M16.175 13H4v-2h12.175l-5.6-5.6L12 4l8 8-8 8-1.425-1.4z" />
    </svg>
  )
}

/** Shared with text links built outside React (EditableText's dev editing mode). */
export const ARROW_UP_RIGHT_PATH = 'M6.4 18 5 16.6 14.6 7H6V5h12v12h-2V8.4z'

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={ARROW_UP_RIGHT_PATH} />
    </svg>
  )
}

export function ArrowDownIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M11 4h2v12.175l5.6-5.6L20 12l-8 8-8-8 1.4-1.425 5.6 5.6z" />
    </svg>
  )
}

export function ArrowDownRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M19 19V7h-2v8.6L7.4 6 6 7.4l9.6 9.6H7v2z" />
    </svg>
  )
}

export function BookIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M12 6.6C10 5.1 7.4 4.6 3 5v13.2c4.4-.4 7 .1 9 1.6 2-1.5 4.6-2 9-1.6V5c-4.4-.4-7 .1-9 1.6Zm0 0v13.2"
      />
    </svg>
  )
}

/** YouTube play button: rounded tile with the triangle cut out. */
export function YouTubeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.27 5 12 5 12 5s-6.27 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.77 1.77C5.73 19 12 19 12 19s6.27 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8M10 15V9l5.2 3z"
      />
    </svg>
  )
}

/** GitHub's Invertocat mark. */
export function GitHubIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"
      />
    </svg>
  )
}

export function GridIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 11V3h8v8zm0 10v-8h8v8zm10-10V3h8v8zm0 10v-8h8v8zM5 9h4V5H5zm10 0h4V5h-4zm0 10h4v-4h-4zM5 19h4v-4H5z"
      />
    </svg>
  )
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="m14 18-6-6 6-6 1.4 1.4-4.6 4.6 4.6 4.6z" />
    </svg>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12.6 12 8 7.4 9.4 6l6 6-6 6-1.4-1.4z" />
    </svg>
  )
}

export function FirstPageIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M6 18V6h2v12zm11 0-6-6 6-6 1.4 1.4-4.6 4.6 4.6 4.6z" />
    </svg>
  )
}

export function LastPageIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M6.6 18 5.2 16.6 9.8 12 5.2 7.4 6.6 6l6 6zM16 18V6h2v12z" />
    </svg>
  )
}

