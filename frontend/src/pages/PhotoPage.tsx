import {type ChangeEvent, createElement, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link} from 'react-router'
import {macrosLine} from '@hse/shared/format'
import {downscalePhoto, SAMPLE_PLATE, sampleRecognition} from '@hse/shared/photo'
import {isApiError} from '@hse/shared/api/client'
import {type PhotoRecognition, recognize, status} from '@hse/shared/api/photo'

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
  // null while the status request is in flight.
  const [available, setAvailable] = useState<boolean | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [result, setResult] = useState<PhotoRecognition | null>(null)
  const [isSample, setIsSample] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    status()
      .then((s) => active && setAvailable(s.available))
      .catch(() => active && setAvailable(false))
    return () => void (active = false)
  }, [])

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo)), [photo])

  function showSample() {
    setResult(sampleRecognition(names))
    setIsSample(true)
  }

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhoto(URL.createObjectURL(file))
    setError(null)
    if (!available) {
      showSample()
      return
    }
    setAnalysing(true)
    try {
      setResult(await recognize(await downscalePhoto(file)))
      setIsSample(false)
    } catch (err) {
      setError(
        t(
          isApiError(err, 413) || isApiError(err, 415)
            ? 'photo.badFile'
            : isApiError(err, 503)
              ? 'photo.unavailable'
              : 'photo.failed',
        ),
      )
    } finally {
      setAnalysing(false)
    }
  }

  function reset() {
    setPhoto(null)
    setResult(null)
    setError(null)
  }

  const demo = available === false
  const unmatched = result?.items.some((i) => !i.facts) ?? false

  return (
    <section className="auth auth-wide photo-page">
      {demo && (
        <p className="auth-step">
          <span className="badge">{t('common.soon')}</span>
        </p>
      )}
      <h1>{t('photo.title')}</h1>
      <p className="auth-lead">{t(demo ? 'photo.leadDemo' : 'photo.lead')}</p>

      <div className="panel">
        {photo || result ? (
          photo ? (
            <img src={photo} alt={t('photo.chosenAlt')} className="photo-preview" />
          ) : (
            <SamplePlate label={t('photo.sampleAlt')} />
          )
        ) : (
          <div className="photo-drop">
            <p className="muted">{t('photo.choosePrompt')}</p>
            <div className="photo-actions">
              <label className="button" aria-disabled={available === null}>
                {t('photo.choose')}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  disabled={available === null}
                  onChange={choose}
                />
              </label>
              <button type="button" className="button button-secondary" onClick={showSample}>
                {t('photo.showSample')}
              </button>
            </div>
          </div>
        )}

        {analysing && <p className="muted">{t('photo.analysing')}</p>}
        {error && <p className="form-error">{error}</p>}

        {result && !analysing && (
          <>
            <div className="panel-head">
              <h3>{t(isSample ? 'photo.resultSample' : 'photo.result')}</h3>
              <span className="result-kcal">
                {Math.round(result.total.kcal)} {t('common.kcal')}
              </span>
            </div>
            {result.items.length === 0 ? (
              <p className="muted">{t('photo.noFood')}</p>
            ) : (
              <ul className="ingredients">
                {result.items.map((i, idx) => (
                  <li key={idx}>
                    <span>
                      {i.name}{' '}
                      <span className="muted">
                        · {i.grams} {t('common.g')}
                      </span>
                    </span>
                    <span className="muted">
                      {i.facts ? `${Math.round(i.facts.kcal)} ${t('common.kcal')}` : t('photo.notCounted')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted">{macrosLine(result.total.proteinG, result.total.fatG, result.total.carbsG)}</p>
            {unmatched && <p className="muted">{t('photo.unmatchedNote')}</p>}
            {!isSample && <p className="muted">{t('photo.estimateNote')}</p>}
          </>
        )}

        {(result || error) && !analysing && (
          <button type="button" className="button button-secondary button-small" onClick={reset}>
            {t('photo.retry')}
          </button>
        )}
      </div>

      <p className="auth-switch">
        <Link to="/profile/plan">{t('photo.back')}</Link>
      </p>
    </section>
  )
}
