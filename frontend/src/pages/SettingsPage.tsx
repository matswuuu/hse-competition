import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { ApiError } from '@/api/client'
import * as questionnaireApi from '@/api/questionnaire'
import type { QuestionnaireResponse } from '@/api/questionnaire'
import { useAuth } from '@/auth/context'
import QuestionnaireForm from '@/components/QuestionnaireForm'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; questionnaire: QuestionnaireResponse | null }

export default function SettingsPage() {
  const { user } = useAuth()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    questionnaireApi
      .latest()
      .then((questionnaire) => !cancelled && setState({ status: 'ready', questionnaire }))
      .catch((err) => {
        if (cancelled) return
        // 404: the user registered but never finished the questionnaire.
        setState(
          err instanceof ApiError && err.status === 404 ? { status: 'ready', questionnaire: null } : { status: 'error' },
        )
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) return <Navigate to="/login" replace state={{ from: '/settings' }} />

  return (
    <section className="auth auth-wide">
      <h1>Настройки</h1>
      <p className="auth-lead">
        Измените данные анкеты — новые нормы и план будут рассчитаны по ним.
      </p>
      {state.status === 'loading' && <p className="muted">Загрузка…</p>}
      {state.status === 'error' && (
        <p className="form-error" role="alert">
          Не удалось загрузить анкету. Попробуйте позже
        </p>
      )}
      {state.status === 'ready' && (
        <>
          {saved && (
            <p className="form-success" role="status">
              Изменения сохранены
            </p>
          )}
          <QuestionnaireForm
            // Remount after save so the form reflects what the server stored.
            key={state.questionnaire?.id ?? 'new'}
            initial={state.questionnaire}
            submitLabel="Сохранить"
            onSubmitted={(questionnaire) => {
              setState({ status: 'ready', questionnaire })
              setSaved(true)
            }}
          />
        </>
      )}
    </section>
  )
}
