import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useAuth } from '@/auth/context'

export default function HomePage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const features = t('home.features', { returnObjects: true })
  const steps = t('home.steps', { returnObjects: true })

  return (
    <div className="landing">
      <section className="hero">
        <h1>
          {t('home.title1')}
          <br />
          {t('home.title2')}
        </h1>
        <p className="hero-lead">{t('home.lead')}</p>
        <div className="hero-actions">
          {user ? (
            <>
              <p className="hero-greeting">{t('home.greeting', { name: user.username })}</p>
              <Link to="/profile/plan" className="button">
                {t('home.myPlan')}
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="button">
                {t('home.start')}
              </Link>
              <Link to="/login" className="button button-secondary">
                {t('home.haveAccount')}
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="landing-section">
        <h2>{t('home.featuresTitle')}</h2>
        <div className="feature-grid">
          {features.map((f) => (
            <article key={f.title} className="feature-card">
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2>{t('home.stepsTitle')}</h2>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s.title} className="step">
              <span className="step-number">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {!user && (
        <section className="landing-cta">
          <h2>{t('home.ctaTitle')}</h2>
          <p>{t('home.ctaText')}</p>
          <Link to="/register" className="button">
            {t('home.ctaButton')}
          </Link>
        </section>
      )}
    </div>
  )
}
