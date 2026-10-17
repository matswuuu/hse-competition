import { Link } from 'react-router'
import { useAuth } from '@/auth/context'

const features = [
  {
    title: 'Цели по КБЖУ',
    text: 'Калории, белки, жиры и углеводы рассчитываются по вашему росту, весу, активности и цели — и отдельно для тренировочных дней.',
  },
  {
    title: 'План на неделю',
    text: 'Готовое меню на каждый день с нужным количеством приёмов пищи. Не понравилось блюдо — замените его в один клик.',
  },
  {
    title: 'Без лишнего',
    text: 'Исключите продукты, которые вы не едите, укажите время на готовку и бюджет на день — план это учтёт.',
  },
  {
    title: 'Список покупок',
    text: 'Все ингредиенты на неделю собраны в один список, чтобы сходить в магазин один раз.',
  },
]

const steps = [
  { title: 'Заполните анкету', text: 'Пара минут: параметры, активность, цель и предпочтения в еде.' },
  { title: 'Получите план', text: 'Мы рассчитаем нормы и составим меню на неделю.' },
  { title: 'Следуйте и отмечайте', text: 'Отмечайте съеденное, меняйте блюда и следите за прогрессом.' },
]

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="landing">
      <section className="hero">
        <h1>
          Персональный план питания
          <br />
          под ваши цели
        </h1>
        <p className="hero-lead">
          Похудеть, набрать массу или держать форму — ответьте на несколько вопросов, и мы составим меню на неделю с
          учётом ваших тренировок, вкусов и бюджета.
        </p>
        <div className="hero-actions">
          {user ? (
            <>
              <p className="hero-greeting">С возвращением, {user.username}!</p>
              <Link to="/profile" className="button">
                Мой план питания
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="button">
                Начать бесплатно
              </Link>
              <Link to="/login" className="button button-secondary">
                У меня есть аккаунт
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="landing-section">
        <h2>Что вы получите</h2>
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
        <h2>Как это работает</h2>
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
          <h2>Готовы начать?</h2>
          <p>Регистрация займёт меньше минуты.</p>
          <Link to="/register" className="button">
            Создать аккаунт
          </Link>
        </section>
      )}
    </div>
  )
}
