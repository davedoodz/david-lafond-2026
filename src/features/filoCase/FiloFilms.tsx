import { useEffect, useRef } from 'react'
import { FILM_CROPS, FILM_GROUPS, FILO_FILMS } from './filoFilmPlan'
import type { FiloFilm, FilmGroup } from './filoFilmPlan'
import './filoFilms.css'

function Film({ film }: { film: FiloFilm }) {
  const ref = useRef<HTMLVideoElement>(null)
  const crop = FILM_CROPS[film.crop]
  useEffect(() => {
    const video = ref.current
    if (!video) return
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const sync = () => {
      const play = visible && !motion.matches && !document.hidden
      video.autoplay = play
      if (!play) { video.pause(); return }
      if (!video.dataset.loaded) {
        for (const source of video.querySelectorAll('source[data-src]')) source.setAttribute('src', source.getAttribute('data-src')!)
        video.dataset.loaded = 'true'
        video.load()
      }
      // A browser can deny autoplay; the meaningful poster stays visible in that case.
      void video.play().catch(() => {})
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: 0.15 })
    observer.observe(video)
    motion.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { observer.disconnect(); motion.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); video.pause() }
  }, [film.id])
  return <figure className={`filo-film filo-film--${film.crop}`} data-film={film.id}>
    <video ref={ref} width={crop.width * 2} height={crop.height * 2} poster={`/work/filo/films/${film.id}.webp`} muted loop playsInline preload="none" disablePictureInPicture aria-hidden="true">
      <source data-src={`/work/filo/films/${film.id}.mov`} type={'video/quicktime; codecs="hvc1"'} />
      <source data-src={`/work/filo/films/${film.id}.webm`} type="video/webm" />
    </video>
    <figcaption className="visually-hidden">{film.label}. Silent prototype recording.</figcaption>
  </figure>
}

/** Videos only: no simulated form controls, flow selectors, or interactive app states. */
export function FiloFilms({ group }: { group: FilmGroup }) {
  return <div className={`filo-films filo-films--${group}`} data-film-group={group}>
    <div className="filo-films__grid">{FILM_GROUPS[group].map(id => <Film key={id} film={FILO_FILMS[id]} />)}</div>
  </div>
}
