/** Icon set from the Paper file (Material Symbols geometry), drawn in currentColor. */
type IconProps = { className?: string }

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M16.175 13H4v-2h12.175l-5.6-5.6L12 4l8 8-8 8-1.425-1.4z" />
    </svg>
  )
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M6.4 18 5 16.6 14.6 7H6V5h12v12h-2V8.4z" />
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

export function CopyIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 18q-.825 0-1.412-.587T7 16V4q0-.825.588-1.412T9 2h9q.825 0 1.413.588T20 4v12q0 .825-.587 1.413T18 18zm0-2h9V4H9zm-4 6q-.825 0-1.412-.587T3 20V6h2v14h11v2z"
      />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="m9.55 18-5.7-5.7 1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z" />
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

export function ZoomInIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="m19.6 21-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5 6.313 6.313 5 9.5t1.313 3.188T9.5 14M8.5 12.5v-2h-2v-2h2v-2h2v2h2v2h-2v2z"
      />
    </svg>
  )
}

export function ZoomOutIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="m19.6 21-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5 6.313 6.313 5 9.5t1.313 3.188T9.5 14M7 10.5v-2h5v2z"
      />
    </svg>
  )
}
