import {type ChangeEvent, createElement, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link} from 'react-router'
import {macrosLine} from '@hse/shared/format'
import {PHOTO_SAMPLE, PHOTO_TOTAL, SAMPLE_PLATE} from '@hse/shared/photo'

function SamplePlate({ label }: { label: string }) {
  return (
    <svg viewBox={SAMPLE_PLATE.viewBox} className="photo-preview" role="img" aria-label={label}>
      {SAMPLE_PLATE.shapes.map(({ type, ...attrs }, i) => createElement(type, { key: i, ...attrs }))}
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
              <span className="result-kcal">
                {Math.round(PHOTO_TOTAL.kcal)} {t('common.kcal')}
              </span>
            </div>
            <ul className="ingredients">
              {PHOTO_SAMPLE.map((i, idx) => (
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
              {macrosLine(PHOTO_TOTAL.p, PHOTO_TOTAL.f, PHOTO_TOTAL.c)}
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
