Mines Collector + Plumber Send
=============================

Tampermonkey userscript для автоматического сбора результатов игры Stake Mines
и передачи их в аналитический backend (R Plumber, API, база данных, Shiny и т.д).

Скрипт:

– отслеживает завершённые раунды Mines

– сохраняет их в браузере

– группирует по каналам

– отправляет на HTTP API

– показывает удобную панель управления



RU

1. Что делает скрипт

Скрипт автоматически собирает все завершённые игры Mines на сайте Stake.
Каждый раунд сохраняется в локальное хранилище браузера (localStorage).

Скрипт не делает ставок и не вмешивается в игру — он только читает состояние
игрового поля и записывает результат.


2. Каналы

Скрипт использует 20 каналов:

test_1, test_2, …, test_20

Обычно они используются для разделения данных по количеству мин.
Например:

test_3  → игры с 3 минами  

test_10 → игры с 10 минами  

test_14 → игры с 14 минами  

Каждый канал — это независимый буфер данных.
Активный канал выбирается в панели и сохраняется в браузере.


3. Какие данные сохраняются

Для каждого раунда сохраняется:

– время (timestamp)

– сумма ставки

– количество мин

– сколько клеток было открыто

– win или loss

– полная карта поля (каждая клетка: индекс, открыта или нет, статус)


Это позволяет полностью восстанавливать и анализировать игру.


4. Как определяется конец раунда

Раунд считается завершённым, когда:

– открыта хотя бы одна клетка

– и больше нет клеток со статусом "idle"

Дополнительно используется сигнатура поля, чтобы один и тот же раунд
не был сохранён дважды.


5. Отправка данных

Через заданный интервал (по умолчанию 15 секунд) скрипт отправляет все
сохранённые данные текущего канала в backend:

http://127.0.0.1:8000/test

Отправляется один JSON с:

– источником (stake)

– игрой (mines)

– каналом

– временем отправки

– количеством записей

– массивом всех результатов


Если сервер отвечает успешно (HTTP 2xx), данные из этого канала
очищаются из браузера.


6. Панель управления

В правом нижнем углу появляется панель:

– выбор канала

– сколько игр сохранено

– результат последней игры (win или loss)

– кнопка очистки текущего канала


Панель можно перетаскивать мышью.
Её позиция сохраняется в браузере.


7. Назначение

Скрипт предназначен для:

– сбора истории Mines

– статистики

– поиска паттернов

– построения аналитики в R / Shiny / базе данных

– автоматизированных исследований стратегий


EN

1. What the script does

This script automatically collects finished Stake Mines game rounds.
Each round is stored locally in the browser (localStorage).

The script does NOT place bets and does NOT interact with gameplay.
It only reads the game state and records the result.


2. Channels

The script provides 20 channels:

test_1, test_2, …, test_20

They are usually mapped to mine counts.
For example:
test_3  → 3 mines  
test_10 → 10 mines  
test_14 → 14 mines  

Each channel is an independent data buffer.
The active channel is selected in the UI and saved in the browser.


3. What is stored

For each round the following data is saved:

– timestamp

– bet amount

– mines count

– number of revealed tiles

– win or loss

– full tile map (index, revealed, status)

This allows full reconstruction and deep statistical analysis.


4. How round completion is detected

A round is considered finished when:

– at least one tile is revealed

– and no tile has the status "idle"


A field signature is also used so the same round is never saved twice.


5. Data sending

At fixed intervals (default: 15 seconds) all data of the active channel
is sent to the backend:

http://127.0.0.1:8000/test

A single JSON object is sent with:

– source (stake)

– game (mines)

– channel

– send timestamp

– record count

– full results array


If the server returns HTTP 2xx, the local channel buffer is cleared.


6. Control panel

A floating panel appears in the bottom-right corner:

– channel selector

– saved rounds count

– last round result (win or loss)

– clear channel button


The panel is draggable and remembers its position.


7. Purpose

The script is designed for:

– collecting Mines history
– statistics
– pattern discovery
– R / Shiny / database analytics
– automated strategy research
