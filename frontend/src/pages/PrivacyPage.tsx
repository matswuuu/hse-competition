import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { currentLanguage } from '@/i18n'

export default function PrivacyPage() {
  useTranslation() // re-render on language change
  return currentLanguage() === 'en' ? <PrivacyEn /> : <PrivacyRu />
}

function PrivacyRu() {
  return (
    <article className="legal">
      <h1>Политика конфиденциальности</h1>
      <p className="legal-updated">Редакция от 18 октября 2026 г.</p>

      <p>
        Эта политика описывает, какие данные собирает сервис HSE Competition (далее — «Сервис»), зачем и как они
        используются. Пользуясь Сервисом, вы соглашаетесь с её условиями. Общие правила работы Сервиса приведены в{' '}
        <Link to="/terms">Условиях использования</Link>.
      </p>

      <h2>1. Какие данные мы собираем</h2>
      <ul>
        <li>
          <strong>Данные аккаунта:</strong> имя пользователя и пароль. Пароль хранится только в виде хеша — мы не можем
          его прочитать.
        </li>
        <li>
          <strong>Данные анкеты:</strong> пол, возраст, рост, вес, уровень активности, дни тренировок, цель, количество
          приёмов пищи, исключённые продукты, допустимое время на готовку и бюджет.
        </li>
        <li>
          <strong>Данные об использовании:</strong> события в Сервисе — начало и завершение анкеты, создание плана,
          просмотр и замена блюд, отметки о съеденном — с указанием времени.
        </li>
      </ul>

      <h2>2. Зачем мы их используем</h2>
      <ul>
        <li>чтобы рассчитать ваши нормы калорий и БЖУ и составить план питания;</li>
        <li>чтобы сохранить ваш план, историю анкет и отметки между сеансами;</li>
        <li>чтобы анализировать, как используется Сервис, и улучшать его.</li>
      </ul>
      <p>Мы не продаём ваши данные и не используем их для рекламы.</p>

      <h2>3. Передача третьим лицам</h2>
      <p>
        Для составления меню Сервис может использовать модель искусственного интеллекта стороннего провайдера. В этом
        случае провайдеру передаются только дневные нормы калорий и БЖУ, список исключённых продуктов и ограничение по
        времени готовки. Имя пользователя, пароль, а также рост, вес, возраст и пол не передаются.
      </p>
      <p>Помимо этого, данные раскрываются третьим лицам только в случаях, предусмотренных законом.</p>

      <h2>4. Хранение и защита</h2>
      <p>
        Данные хранятся на серверах Сервиса, пока существует ваш аккаунт. Каждое изменение анкеты сохраняется как новая
        запись, для расчётов используется последняя. Мы применяем разумные технические меры защиты, но ни один способ
        передачи и хранения данных не гарантирует абсолютной безопасности.
      </p>
      <p>
        Для входа браузер хранит ваши учётные данные в локальном хранилище до выхода из аккаунта. Не входите в Сервис на
        чужих устройствах или выходите из аккаунта после использования.
      </p>

      <h2>5. Ваши права</h2>
      <ul>
        <li>изменить данные анкеты в любой момент в разделе «Мои данные» профиля;</li>
        <li>запросить копию своих данных или их удаление вместе с аккаунтом, обратившись к администратору Сервиса;</li>
        <li>отозвать согласие на обработку данных — в этом случае аккаунт будет удалён.</li>
      </ul>

      <h2>6. Изменение политики</h2>
      <p>
        Мы можем обновлять эту политику. Новая редакция вступает в силу с момента публикации на этой странице.
      </p>
    </article>
  )
}

function PrivacyEn() {
  return (
    <article className="legal">
      <h1>Privacy policy</h1>
      <p className="legal-updated">Version of 18 October 2026</p>

      <p>
        This policy describes what data the HSE Competition service (the “Service”) collects, why and how it is used. By
        using the Service you agree to its terms. General rules of the Service are set out in the{' '}
        <Link to="/terms">Terms of use</Link>.
      </p>

      <h2>1. What data we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> username and password. The password is stored only as a hash — we cannot read
          it.
        </li>
        <li>
          <strong>Questionnaire data:</strong> sex, age, height, weight, activity level, training days, goal, number of
          meals, excluded foods, acceptable cooking time and budget.
        </li>
        <li>
          <strong>Usage data:</strong> events in the Service — starting and completing the questionnaire, creating a
          plan, viewing and replacing dishes, marking meals as eaten — with timestamps.
        </li>
      </ul>

      <h2>2. Why we use it</h2>
      <ul>
        <li>to calculate your calorie and macro targets and build a meal plan;</li>
        <li>to keep your plan, questionnaire history and marks between sessions;</li>
        <li>to analyse how the Service is used and improve it.</li>
      </ul>
      <p>We do not sell your data or use it for advertising.</p>

      <h2>3. Sharing with third parties</h2>
      <p>
        To build menus the Service may use an artificial intelligence model from a third-party provider. In that case only
        the daily calorie and macro targets, the list of excluded foods and the cooking time limit are shared with the
        provider. Your username, password, height, weight, age and sex are not shared.
      </p>
      <p>Otherwise, data is disclosed to third parties only where required by law.</p>

      <h2>4. Storage and protection</h2>
      <p>
        Data is stored on the Service’s servers for as long as your account exists. Every questionnaire change is saved
        as a new record; calculations use the latest one. We apply reasonable technical safeguards, but no method of
        transmission or storage guarantees absolute security.
      </p>
      <p>
        To keep you logged in, the browser stores your credentials in local storage until you log out. Do not log in on
        other people’s devices, or log out after use.
      </p>

      <h2>5. Your rights</h2>
      <ul>
        <li>change your questionnaire data at any time in the “My data” section of your profile;</li>
        <li>request a copy of your data or its deletion together with your account by contacting the administrator;</li>
        <li>withdraw consent to data processing — in that case your account will be deleted.</li>
      </ul>

      <h2>6. Changes to this policy</h2>
      <p>We may update this policy. A new version takes effect once published on this page.</p>
    </article>
  )
}
