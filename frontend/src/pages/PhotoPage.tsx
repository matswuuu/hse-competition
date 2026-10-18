import { useEffect, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

// §4.9 (P2): clickable mockup only — nothing is uploaded or recognised.
// Names come from `photo.sample`, in the same order.
const SAMPLE = [
  { grams: 180, kcal: 198, p: 7.6, f: 2.0, c: 38.5 },
  { grams: 130, kcal: 214, p: 40.3, f: 4.7, c: 0 },
  { grams: 90, kcal: 14, p: 0.7, f: 0.1, c: 2.7 },
  { grams: 5, kcal: 45, p: 0, f: 5.0, c: 0 },
]

function SamplePlate({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 200 200" className="photo-preview" role="img" aria-label={label}>
      <rect width="200" height="200" rx="16" fill="#e8dccb" />
      <circle cx="100" cy="100" r="82" fill="#fafafa" stroke="#ddd" strokeWidth="3" />
      <circle cx="100" cy="100" r="64" fill="#f2f2f2" />
      <path d="M50 110 Q60 70 100 72 Q120 74 118 112 Q100 140 62 132 Z" fill="#8b5a2b" />
      <path d="M108 70 Q145 62 152 92 Q150 108 120 104 Z" fill="#f1d9b5" stroke="#d9b98c" strokeWidth="2" />
      <circle cx="132" cy="128" r="11" fill="#7fbf6a" />
      <circle cx="132" cy="128" r="6" fill="#d8f0c8" />
      <circle cx="114" cy="140" r="10" fill="#7fbf6a" />
      <circle cx="114" cy="140" r="5" fill="#d8f0c8" />
    </svg>
  )
}

export default function PhotoPage() {
  const { t } = useTranslation()
  const names = t('photo.sample', { returnObjects: true })
  const [photo, setPhoto] = useState<string | null>(null)
  const [analysed, setAnalysed] = useState(false)

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo)), [photo])

  function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(URL.createObjectURL(file))
    setAnalysed(true)
  }

  const total = SAMPLE.reduce(
    (acc, i) => ({ kcal: acc.kcal + i.kcal, p: acc.p + i.p, f: acc.f + i.f, c: acc.c + i.c }),
    { kcal: 0, p: 0, f: 0, c: 0 },
  )

  return (
    <section className="auth auth-wide photo-page">
      <p className="auth-step">
        <span className="badge">{t('common.soon')}</span>
      </p>
      <h1>{t('photo.title')}</h1>
      <p className="auth-lead">{t('photo.lead')}</p>

      <div className="panel">
        {analysed ? (
          photo ? (
            <img src={photo} alt={t('photo.chosenAlt')} className="photo-preview" />
          ) : (
            <SamplePlate label={t('photo.sampleAlt')} />
          )
        ) : (
          <div className="photo-drop">
            <p className="muted">{t('photo.choosePrompt')}</p>
            <div className="photo-actions">
              <label className="button">
                {t('photo.choose')}
                <input type="file" accept="image/*" capture="environment" hidden onChange={choose} />
              </label>
              <button type="button" className="button button-secondary" onClick={() => setAnalysed(true)}>
                {t('photo.showSample')}
              </button>
            </div>
          </div>
        )}

        {analysed && (
          <>
            <div className="panel-head">
              <h3>{t('photo.result')}</h3>
              <span className="result-kcal">{Math.round(total.kcal)} {t('common.kcal')}</span>
            </div>
            <ul className="ingredients">
              {SAMPLE.map((i, idx) => (
                <li key={idx}>
                  <span>
                    {names[idx]}{' '}
                    <span className="muted">
                      · {i.grams} {t('common.g')}
                    </span>
                  </span>
                  <span className="muted">
                    {i.kcal} {t('common.kcal')}
                  </span>
                </li>
              ))}
            </ul>
            <p className="muted">
              {t('common.p')} {Math.round(total.p)} {t('common.g')} · {t('common.f')} {Math.round(total.f)}{' '}
              {t('common.g')} · {t('common.c')} {Math.round(total.c)} {t('common.g')}
            </p>
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => {
                setPhoto(null)
                setAnalysed(false)
              }}
            >
              {t('photo.retry')}
            </button>
          </>
        )}
      </div>

      <p className="auth-switch">
        <Link to="/profile/plan">{t('photo.back')}</Link>
      </p>
    </section>
  )
}
