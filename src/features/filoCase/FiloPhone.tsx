import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import './filo.css'

/**
 * iPhone frame for Filo's live HTML screens (Momo shows recordings; Filo renders its UI).
 * Same 874×1780 silver mockup as the Momo devices; the box keeps the 530/1080 ratio of the
 * flow recordings, so it drops into `.case__phone` slots unchanged.
 * Screen content is laid out on a 393×852 pt canvas and scaled to the frame width.
 */
export function FiloPhone({ children, className = '' }: { children: ReactNode; className?: string }) {
  const screen = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = screen.current
    if (!el) return
    const fit = () => el.style.setProperty('--filo-s', String(el.clientWidth / 393))
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div className={`filo-phone ${className}`}>
      <div ref={screen} className="filo-phone__screen" style={{ '--filo-s': 0.7 } as CSSProperties}>
        <div className="filo-phone__canvas">{children}</div>
      </div>
      <img className="filo-phone__frame" src="/work/momo/devices/iphone-silver.png" alt="" draggable={false} />
    </div>
  )
}

/** iOS status bar for a Filo screen. */
export function StatusBar({ time = '9:41', dark = false }: { time?: string; dark?: boolean }) {
  return (
    <div className="filo-status" data-dark={dark || undefined}>
      <span>{time}</span>
      <span className="filo-status__icons" aria-hidden="true">
        <svg viewBox="0 0 18 12"><path d="M1 9h2v2H1zM5 7h2v4H5zM9 4h2v7H9zM13 1h2v10h-2z" fill="currentColor" /></svg>
        <svg viewBox="0 0 16 12"><path d="M8 2.5a9 9 0 0 1 6.4 2.6l1-1A10.4 10.4 0 0 0 8 1 10.4 10.4 0 0 0 .6 4.1l1 1A9 9 0 0 1 8 2.5Zm0 3a6 6 0 0 1 4.2 1.7l1-1a7.4 7.4 0 0 0-10.4 0l1 1A6 6 0 0 1 8 5.5Zm0 3a3 3 0 0 1 2 .8L8 11.4 6 9.3a3 3 0 0 1 2-.8Z" fill="currentColor" /></svg>
        <svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="19" height="8" rx="1.8" fill="currentColor" /><path d="M24 4v4c.8-.3 1.3-1.1 1.3-2S24.8 4.3 24 4Z" fill="currentColor" opacity=".45" /></svg>
      </span>
    </div>
  )
}

/** Filo mark: a thread loop. */
export function FiloMark({ size = 20 }: { size?: number }) {
  return (
    <svg className="filo-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 17c3 0 4-3 5-6s2.4-6 5.2-6c2.4 0 3.8 1.9 3.8 4 0 3-2.8 4.8-5.6 4.4C9 13 8.6 10.5 10.6 9.6c2.6-1.2 6.2 1.4 6.6 5.1.3 2.6-1.1 4.3-3.2 4.3H21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
