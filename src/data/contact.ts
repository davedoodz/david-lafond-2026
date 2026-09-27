export const EMAIL = 'davidkhanhlafond@gmail.com'

export const SOCIAL = {
  linkedin: 'https://www.linkedin.com/in/davidlafondx/',
  github: 'https://github.com/davedoodz',
  x: 'https://x.com/davidlafondx',
} as const

export const RESUME_URL = '/resume/David-Lafond-Resume.pdf'

export function mailtoUrl(subject: string, body: string) {
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
