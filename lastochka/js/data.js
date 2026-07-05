// ДАННЫЕ ИГРЫ «5 НОЧЕЙ В ЛАСТОЧКЕ» — тексты и баланс. Логика в app.js.
window.GAME_DATA={
 "L": {
  "ru": {
   "warnTitle": "⚠ ПРЕДУПРЕЖДЕНИЕ",
   "warnBody": "Игра содержит <b style=\"color:#c9c3b2\">скримеры</b>, резкие <b style=\"color:#c9c3b2\">громкие звуки</b>, вспышки и мерцание изображения.<br>Не рекомендуется людям с фоточувствительной эпилепсией,<br>слабой нервной системой и детям.<br><br>Играй в наушниках, в темноте… если осмелишься.",
   "warnBtn": "МНЕ ЕСТЬ 13, ПРОДОЛЖИТЬ",
   "gameTitle": "5 НОЧЕЙ В <span class=\"tBlood\">ЛАСТ</span><span class=\"tGlitch\">ОЧКЕ</span>",
   "startBody": "Переживи ночь до <b>6 утра</b>. Слушай, что происходит, и реагируй вовремя.<br><br><b>ПРОБЕЛ</b> — встать · <b>S</b> — лечь / смотреть вверх · <b>зажать мышь</b> — держать дверь<br><b>тянуть мышью</b> — крутить головой · <b>клик</b> — по двери или окну<br><br>ошибёшься или замешкаешься — скример. каждый свой.",
   "startBtn": "ВОЙТИ",
   "setTitle": "НАСТРОЙКИ",
   "lblVol": "Громкость",
   "lblBright": "Яркость",
   "lblShake": "Тряска и вспышки",
   "lblDiff": "Сложность",
   "setBack": "НАЗАД",
   "openSettings": "НАСТРОЙКИ",
   "d1t": "Свеча",
   "d1d": "больше времени",
   "d2t": "Полночь",
   "d2d": "как задумано",
   "d3t": "Бессонница",
   "d3d": "оно быстрее тебя",
   "cue_doorslow": "дверь открывается… ПРОБЕЛ",
   "cue_holddoor": "держи дверь!",
   "cue_short": "тихий топот… ляг (S)",
   "cue_fast": "быстрый топот… ПРОБЕЛ",
   "cue_fasthold": "в дверь ломятся — зажми мышь, держи!",
   "cue_window": "стук в окно… ответь стуком",
   "cue_neighbor": "сосед поворачивается… ЗАМРИ",
   "cue_bug": "стучат под кроватью… встань (ПРОБЕЛ)",
   "cue_buglie": "теперь ложись (S)",
   "died": "ты не дожил",
   "again": "СНАЧАЛА",
   "winT": "6 утра",
   "winP": "ты пережил ночь",
   "r_door": "дверь открылась — ты не успел её удержать",
   "r_buff": "ты не лёг вовремя — он вошёл",
   "r_fast": "кто-то ворвался, пока ты медлил",
   "r_window": "стук в окно длился слишком долго — сосед повернулся",
   "r_neighbor": "сосед смотрел на тебя, а ты пошевелился",
   "r_bug": "ты не встал — оно вылезло из-под кровати",
   "hint": "тяни мышью — повернуть голову",
   "dpTitle": "ВЫБЕРИ СВОЮ НОЧЬ",
   "dpHint": "выбор обязателен · нажми на карту",
   "dp1": "У тебя есть время подумать.<br>Оно двигается медленно.",
   "dp2": "Так, как эта ночь<br>должна была случиться.",
   "dp3": "Оно уже знает, где ты.<br>Оно быстрее тебя.",
   "menuSub": "выживи до рассвета"
  },
  "en": {
   "warnTitle": "⚠ WARNING",
   "warnBody": "This game contains <b style=\"color:#c9c3b2\">jumpscares</b>, sudden <b style=\"color:#c9c3b2\">loud sounds</b>, flashes and flickering images.<br>Not recommended for people with photosensitive epilepsy,<br>anxiety conditions, or young children.<br><br>Play with headphones, in the dark… if you dare.",
   "warnBtn": "I AM 13+, CONTINUE",
   "gameTitle": "5 NIGHTS AT THE <span class=\"tBlood\">SWAL</span><span class=\"tGlitch\">LOW</span>",
   "startBody": "Survive the night until <b>6 AM</b>. Listen carefully and react in time.<br><br><b>SPACE</b> — stand up · <b>S</b> — lie down / look up · <b>hold mouse</b> — hold the door<br><b>drag mouse</b> — turn your head · <b>click</b> — door or window<br><br>hesitate or slip up — a jumpscare. each one unique.",
   "startBtn": "ENTER",
   "setTitle": "SETTINGS",
   "lblVol": "Volume",
   "lblBright": "Brightness",
   "lblShake": "Shake & flashes",
   "lblDiff": "Difficulty",
   "setBack": "BACK",
   "openSettings": "SETTINGS",
   "d1t": "Candle",
   "d1d": "more time",
   "d2t": "Midnight",
   "d2d": "as intended",
   "d3t": "Insomnia",
   "d3d": "it is faster than you",
   "cue_doorslow": "the door is opening… SPACE",
   "cue_holddoor": "hold the door!",
   "cue_short": "quiet footsteps… lie down (S)",
   "cue_fast": "fast footsteps… SPACE",
   "cue_fasthold": "they are breaking in — hold the mouse!",
   "cue_window": "knocking on the window… knock back",
   "cue_neighbor": "the neighbor is turning… FREEZE",
   "cue_bug": "knocking under the bed… stand up (SPACE)",
   "cue_buglie": "now lie down (S)",
   "died": "you did not survive",
   "again": "RESTART",
   "winT": "6 AM",
   "winP": "you survived the night",
   "r_door": "the door opened — you failed to hold it",
   "r_buff": "you did not lie down in time — he came in",
   "r_fast": "someone broke in while you hesitated",
   "r_window": "the knocking went on too long — the neighbor turned",
   "r_neighbor": "the neighbor was watching and you moved",
   "r_bug": "you did not get up — it crawled out from under the bed",
   "hint": "drag the mouse to turn your head",
   "dpTitle": "CHOOSE YOUR NIGHT",
   "dpHint": "choice is required · tap a card",
   "dp1": "You have time to think.<br>It moves slowly.",
   "dp2": "The way this night<br>was meant to happen.",
   "dp3": "It already knows where you are.<br>It is faster than you.",
   "menuSub": "survive until dawn"
  }
 },
 "SUBS": [
  [
   0.5,
   4.5,
   "— Дошли. Вон твой корпус, у самого леса."
  ],
  [
   5,
   9.8,
   "— Ночью здесь двое гостей. Запомни обоих."
  ],
  [
   10.3,
   16.2,
   "— Первый ходит по коридору. Если дверь поползла — вставай и держи. Секунд пять у тебя есть."
  ],
  [
   16.7,
   22.6,
   "— Вторые приходят к окну. Постучат — постучи в ответ, дважды. Они просто проверяют, живой ли."
  ],
  [
   23.1,
   27,
   "— Остальных тебе знать пока рано."
  ],
  [
   27.5,
   31,
   "— Шесть утра — и ты свободен. Спокойной ночи."
  ]
 ],
 "ENDING": {
  "ru": [
   "Доброе утро, Ласточка.",
   "Вожатая пересчитала отряд — все на месте. Кроме твоего соседа.",
   "Его кровать была заправлена. Идеально. Как будто в ней никогда не спали.",
   "— Какой сосед? — сказала она. — Ты всю смену жил один."
  ],
  "en": [
   "Good morning, Swallow.",
   "The counselor counted the squad — everyone present. Except your neighbor.",
   "His bed was made. Perfectly. As if no one had ever slept in it.",
   "\"What neighbor?\" she said. \"You have been alone all along.\""
  ]
 },
 "NIGHTS": [
  {
   "f": 2.1,
   "c": 2.4
  },
  {
   "f": 1.45,
   "c": 1.7
  },
  {
   "f": 1,
   "c": 1.2
  },
  {
   "f": 0.7,
   "c": 0.85
  },
  {
   "f": 0.5,
   "c": 0.55
  }
 ],
 "NIGHT_POOL": {
  "1": [
   "door_slow",
   "window"
  ],
  "2": [
   "door_slow",
   "window",
   "fast"
  ],
  "3": [
   "door_slow",
   "window",
   "fast",
   "neighbor"
  ],
  "4": [
   "door_slow",
   "window",
   "fast",
   "neighbor",
   "bug"
  ],
  "5": [
   "door_slow",
   "window",
   "fast",
   "neighbor",
   "bug",
   "short"
  ]
 },
 "INTER": {
  "ru": [
   [
    "День второй.",
    "Сосед на завтрак не пришёл. Зато под полом всю ночь что-то скреблось.",
    "Завхоз буркнул: «Услышишь быстрый топот — вставай и дави дверь. Оно маленькое, но настырное».",
    "Он не шутил."
   ],
   [
    "День третий.",
    "В списке отряда — двенадцать фамилий. Кроватей — тринадцать.",
    "Вожатая шепнула: «Если сосед повернётся к тебе — замри. Совсем. Он слушает вместо них».",
    "Ты решил не спрашивать, вместо кого."
   ],
   [
    "День четвёртый.",
    "На доске почёта — выцветшее фото смены 1989-го. Третий слева очень похож на твоего соседа.",
    "Сторож сказал: «Застучит под кроватью — вставай сразу. Не жди, пока края покраснеют».",
    "Подпись под фото стёрта ногтем."
   ],
   [
    "День пятый.",
    "Вожатая поймала тебя у ворот: «Последняя ночь. Теперь придут все. И быстрее, чем раньше».",
    "Она сказала это так, будто извинялась."
   ]
  ],
  "en": [
   [
    "Day two.",
    "Your neighbor never came to breakfast. But something scratched under the floor all night.",
    "The caretaker muttered: \"Fast footsteps — get up and push the door. It is small but stubborn.\"",
    "He was not joking."
   ],
   [
    "Day three.",
    "The squad list has twelve names. The cabin has thirteen beds.",
    "The counselor whispered: \"If your neighbor turns to you — freeze. Completely. He listens for them.\"",
    "You chose not to ask instead of whom."
   ],
   [
    "Day four.",
    "On the honor board — a faded photo of the 1989 session. The third boy from the left looks familiar.",
    "The watchman said: \"Knocking under the bed — get up at once. Do not wait for the edges to turn red.\"",
    "The caption is scratched out with a fingernail."
   ],
   [
    "Day five.",
    "The counselor caught you by the gates: \"Last night. Now they all come. Faster than before.\"",
    "She said it like an apology."
   ]
  ]
 }
};
