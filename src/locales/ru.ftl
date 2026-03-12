# Localization for Russian

start-welcome = 
    👋 Привет, { $name }!
    
    Я AI-бот для прогнозов на футбол ⚽
    🎯 Что я умею:
    
    • Показывать расписание матчей
    • Показывать статистику команд
    • Генерировать AI-прогнозы на матчи
    
    Выберите лигу для начала:

league-select = Выберите лигу:
league-no-matches = В ближайшее время матчей в этой лиге нет.
league-error = Произошла ошибка при загрузке.
loading-matches = Загружаю матчи...
no-upcoming-matches = Предстоящих матчей не найдено
error-fetching-matches = Произошла ошибка при загрузке матчей
loading-details = Загружаю детали...
match-not-found = Матч не найден
status = Статус
score = Счет
match-not-started = Матч еще не начался
team-stats = Статистика команд
get-ai-prediction = Получить AI прогноз
back-to-matches = К списку матчей
error-loading-details = Произошла ошибка при загрузке деталей
bet-select = Выберите прогноз

upcoming-matches = Предстоящие матчи
match-click-hint = Нажми на номер матча для деталей

btn-back = Назад
btn-menu = Главное меню
btn-next = Далее
btn-refresh = Обновить
btn-other-predict = Другой прогноз
btn-stats = Статистика
btn-to-match = К матчу
btn-standings = Таблица

match-details = { $homeTeam } vs { $awayTeam }
match-date = Дата: { $date }
match-league = Лига: { $competition }

stats-title = Статистика матча
stats-form = Форма: { $form }
stats-goals = Забито: { $goals }
stats-basic = Основная статистика
stats-home = Домашняя статистика
stats-away = Выездная статистика
stats-h2h = История встреч
stats-full = Развернутая статистика

stats-loading = Загружаю статистику...
stats-last-matches = Последние встречи:
stats-already-on-page = Вы уже на этой странице
stats-home-title = Домашняя статистика: { $team }
stats-away-title = Выездная статистика: { $team }
stats-goals-for = Забито: { $total } ({ $avg } в среде)
stats-goals-against = Пропущено: { $total } ({ $avg } в среде)
stats-avg = в среднем
stats-wins-draws-losses = Побед: { $wins } | Ничьих: { $draws } | Поражений: { $losses }
stats-h2h-not-found = История встреч не найдена
stats-h2h-recent = Последние встречи:
stats-avg-goals = Среднее голов: { $avg }
stats-full-teaser = Развернутая статистика скоро будет доступна!

predict-ai = AI Прогноз
predict-loading = Генерирую прогноз, пожалуйста подождите...
predict-process = Генерирую AI прогноз...
predict-gathering = Собираю статистику...
predict-analyzing = Анализирую данные...
predict-wait = Это займет ~5-10 секунд
predict-error = Ошибка генерации.
predict-insufficient = Недостаточно статистики для { $type }.
predict-try-later = Попробуйте позже.
predict-try-other = Попробуйте другой прогноз.

predict-title-outcome = Исход матча
predict-title-corners = Угловые
predict-title-cards = Карточки
predict-title-offsides = Офсайды
predict-title-total = Тотал голов (ТБ/ТМ 2.5)
predict-title-btts = Обе забьют

predict-prob-title = ВЕРОЯТНОСТИ
predict-prob-home = { $team }
predict-prob-draw = Ничья
predict-prob-away = { $team }

predict-recomm-title = РЕКОМЕНДАЦИЯ
predict-recomm-win = Победа { $team }
predict-recomm-draw = Ничья

predict-conf-title = УВЕРЕННОСТЬ
predict-reason-title = ОБОСНОВАНИЕ
predict-disclaimer = _Прогноз не гарантирует результат_

predict-goals-over = Тотал больше { $val }:
predict-goals-under = Тотал меньше { $val }:
predict-total-over = Тотал больше 2.5:
predict-total-under = Тотал меньше 2.5:
predict-total-expected = Ожидаемый тотал голов:
predict-btts-yes = Обе забьют - Да:
predict-btts-no = Обе забьют - Нет:
predict-btn-total = Тотал ТБ/ТМ 2.5
predict-btn-btts = Обе забьют
predict-yes = Да
predict-no = Нет
predict-expected-title = ОЖИДАЕМЫЕ ЗНАЧЕННЯ:
predict-expected-total = - Всего { $type }:
predict-expected-yellow = - Желтые карточки:
predict-expected-red = - Красные карточки:

btn-follow = Следить
btn-unfollow = Отписаться
notify-subscribed = Вы будете получать уведомления об этом матче
notify-unsubscribed = Уведомления отключены

notify-pre-match-title = Матч начнется через 15 минут!
notify-post-match-title = Матч завершен!
notify-no-predictions = 📋 У вас нет прогнозов по этому матчу
notify-your-predictions = 📊 Ваши прогнозы:
notify-type-outcome = Исход
notify-type-total = Тотал
notify-type-btts = Обе забьют
notify-type-corners = Угловые
notify-type-cards = Карточки
notify-type-offsides = Офсайды

standings-title = Таблица: { $league }
standings-error = Ошибка загрузки таблицы.
standings-loading = Загружаю таблицу...
standings-not-found = Таблица не найдена
standings-season = Сезон { $start }/{ $end }
standings-points = Очки
standings-stats-short = И:{ $played } В:{ $won } Н:{ $draw } П:{ $lost }
standings-header-form = Форма
standings-header-goals = Голы
standings-header-gd = Разница голов

# Timezone
tz-select = 🌍 Выберите регион:
tz-select-city = 🕐 Выберите город:
tz-saved = ✅ Часовой пояс установлен: **{$city}**
tz-change = 🕐 Сменить часовой пояс
