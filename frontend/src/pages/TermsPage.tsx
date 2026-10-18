import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { currentLanguage } from '@/i18n'

export default function TermsPage() {
  useTranslation() // re-render on language change
  return currentLanguage() === 'en' ? <TermsEn /> : <TermsRu />
}

function TermsRu() {
  return (
    <article className="legal">
      <h1>Условия использования</h1>
      <p className="legal-updated">Редакция от 18 октября 2026 г.</p>

      <h2>1. Общие положения</h2>
      <p>
        Настоящие условия регулируют использование сервиса HSE Competition (далее — «Сервис»), который составляет
        персональные планы питания на основе данных анкеты. Регистрируясь или пользуясь Сервисом, вы подтверждаете, что
        прочитали и принимаете эти условия. Если вы с ними не согласны, не используйте Сервис.
      </p>

      <h2>2. Не медицинская консультация</h2>
      <p>
        Рекомендации Сервиса носят информационный характер и не являются медицинской консультацией, диагнозом или
        лечением. Нормы калорий и БЖУ рассчитываются по общим формулам и могут не учитывать особенности вашего здоровья.
      </p>
      <p>
        Перед изменением рациона проконсультируйтесь с врачом или диетологом, особенно если у вас есть хронические
        заболевания, пищевая аллергия, расстройства пищевого поведения, беременность или период кормления грудью. Сервис
        не предназначен для лиц младше 14 лет.
      </p>

      <h2>3. Аккаунт</h2>
      <ul>
        <li>Вы отвечаете за сохранность своего пароля и за действия, совершённые под вашим аккаунтом.</li>
        <li>Указывайте в анкете достоверные данные — от них зависит точность расчётов.</li>
        <li>Не используйте чужие аккаунты и не создавайте аккаунты от имени других людей.</li>
      </ul>

      <h2>4. Допустимое использование</h2>
      <p>Запрещается:</p>
      <ul>
        <li>пытаться получить несанкционированный доступ к Сервису или данным других пользователей;</li>
        <li>нарушать работу Сервиса, в том числе создавать чрезмерную нагрузку автоматическими запросами;</li>
        <li>использовать Сервис для целей, нарушающих законодательство.</li>
      </ul>

      <h2>5. Ограничение ответственности</h2>
      <p>
        Сервис предоставляется «как есть». Мы стараемся обеспечить точность данных о продуктах и расчётов, но не
        гарантируем отсутствие ошибок и бесперебойную работу. Состав блюд и пищевая ценность являются ориентировочными.
        Проверяйте состав продуктов самостоятельно, если у вас есть аллергия или непереносимость.
      </p>
      <p>
        Мы не несём ответственности за последствия для здоровья, связанные с применением рекомендаций Сервиса без
        консультации специалиста.
      </p>

      <h2>6. Персональные данные</h2>
      <p>
        Порядок сбора и обработки ваших данных описан в <Link to="/privacy">Политике конфиденциальности</Link>.
      </p>

      <h2>7. Изменение условий</h2>
      <p>
        Мы можем обновлять эти условия. Новая редакция вступает в силу с момента публикации на этой странице. Продолжая
        пользоваться Сервисом после изменений, вы принимаете новую редакцию.
      </p>
    </article>
  )
}

function TermsEn() {
  return (
    <article className="legal">
      <h1>Terms of use</h1>
      <p className="legal-updated">Version of 18 October 2026</p>

      <h2>1. General</h2>
      <p>
        These terms govern the use of the HSE Competition service (the “Service”), which builds personal meal plans from
        questionnaire data. By signing up or using the Service you confirm that you have read and accept these terms. If
        you do not agree with them, do not use the Service.
      </p>

      <h2>2. Not medical advice</h2>
      <p>
        The Service’s recommendations are for information only and are not medical advice, diagnosis or treatment.
        Calorie and macro targets are calculated with general formulas and may not account for your health specifics.
      </p>
      <p>
        Consult a doctor or dietitian before changing your diet, especially if you have chronic conditions, food
        allergies, eating disorders, are pregnant or breastfeeding. The Service is not intended for persons under 14.
      </p>

      <h2>3. Account</h2>
      <ul>
        <li>You are responsible for keeping your password safe and for actions taken under your account.</li>
        <li>Provide accurate data in the questionnaire — the accuracy of calculations depends on it.</li>
        <li>Do not use other people’s accounts or create accounts on behalf of others.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>attempt to gain unauthorised access to the Service or other users’ data;</li>
        <li>disrupt the Service, including by creating excessive load with automated requests;</li>
        <li>use the Service for unlawful purposes.</li>
      </ul>

      <h2>5. Limitation of liability</h2>
      <p>
        The Service is provided “as is”. We strive for accurate product data and calculations but do not guarantee the
        absence of errors or uninterrupted operation. Dish composition and nutritional values are approximate. Check
        product composition yourself if you have an allergy or intolerance.
      </p>
      <p>
        We are not liable for health consequences resulting from following the Service’s recommendations without
        consulting a specialist.
      </p>

      <h2>6. Personal data</h2>
      <p>
        How we collect and process your data is described in the <Link to="/privacy">Privacy policy</Link>.
      </p>

      <h2>7. Changes to these terms</h2>
      <p>
        We may update these terms. A new version takes effect once published on this page. By continuing to use the
        Service after changes you accept the new version.
      </p>
    </article>
  )
}
