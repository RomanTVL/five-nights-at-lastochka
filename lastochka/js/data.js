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
   "menuSub": "выживи до рассвета",
   "warnTip": "<b style=\"color:#c9c3b2\">F11</b> — полноэкранный режим для полного погружения<br>обязательно надень <b style=\"color:#c9c3b2\">наушники</b>"
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
   "menuSub": "survive until dawn",
   "warnTip": "<b style=\"color:#c9c3b2\">F11</b> — fullscreen for full immersion<br>be sure to wear <b style=\"color:#c9c3b2\">headphones</b>"
  }
 },
 "SUBS": [
  [
   0.5,
   4.6,
   "— Дошли. Вон твой корпус. Третий, у самого леса."
  ],
  [
   5.1,
   10,
   "— Не спрашивай, почему он один пустой. Просто слушай и запоминай."
  ],
  [
   10.5,
   16.4,
   "— Ночью по коридору кто-то ходит. Если дверь поползла — вставай и держи. Секунд пять у тебя есть."
  ],
  [
   16.9,
   22.8,
   "— И в окно постучат. Постучи в ответ, дважды. Они проверяют, есть ли внутри живые."
  ],
  [
   23.3,
   27.4,
   "— Про остальных расскажу. Если доживёшь до второй ночи."
  ],
  [
   27.9,
   31.5,
   "— В шесть утра дадут свет. Тогда и поспишь."
  ]
 ],
 "ENDING": {
  "ru": [
   "Доброе утро, Ласточка.",
   "Свет дали ровно в шесть. Как и обещали.",
   "Вожатая пересчитала отряд у крыльца — все на месте.",
   "— В третьем корпусе? — переспросила она. — Там с восемьдесят девятого никто не живёт."
  ],
  "en": [
   "Good morning, Swallow.",
   "The power came back at six sharp. Just as promised.",
   "The counselor counted the squad by the porch — everyone present.",
   "\"Cabin three?\" she asked. \"No one has lived there since eighty-nine.\""
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
    "В журнале дежурств за восемьдесят девятый вырваны страницы. Уцелела одна.",
    "«Ночью в коридоре быстрые шаги. Не человек. Вставать и давить дверь — оно жмёт снизу».",
    "Почерк рваный. Будто писали в темноте."
   ],
   [
    "День третий.",
    "В списке отряда двенадцать фамилий. Кроватей в корпусе тринадцать.",
    "На спинке тринадцатой выцарапано: «если он повернётся — не шевелись».",
    "Ниже, другой рукой: «он не злой. он слушает вместо нас»."
   ],
   [
    "День четвёртый.",
    "Под кроватью лежал фонарик. Севший, с обгрызенной кнопкой.",
    "На корпусе нацарапано имя — крупными детскими буквами.",
    "Ночью снизу постучали. Три раза. Так стучат, когда спрашивают."
   ],
   [
    "День пятый.",
    "Свет в корпусе моргает весь вечер. Точно как в ту грозу.",
    "Вожатая сказала: «Последняя ночь. Потерпи, завтра за тобой приедут».",
    "Она сказала это так, будто извинялась."
   ]
  ],
  "en": [
   [
    "Day two.",
    "Pages are torn out of the 1989 duty log. One survived.",
    "\"Fast steps in the hallway at night. Not human. Get up and push the door — it presses from below.\"",
    "The handwriting is ragged. As if written in the dark."
   ],
   [
    "Day three.",
    "The squad list has twelve names. The cabin has thirteen beds.",
    "Scratched into the thirteenth headboard: \"if he turns around, do not move\".",
    "Below, in a different hand: \"he is not evil. he listens instead of us\"."
   ],
   [
    "Day four.",
    "There was a flashlight under the bed. Dead, its button chewed.",
    "A name is scratched on the casing in large childish letters.",
    "That night something knocked from below. Three times. The way you knock to ask."
   ],
   [
    "Day five.",
    "The lights have been flickering all evening. Exactly like during that storm.",
    "The counselor said: \"Last night. Hold on, they come for you tomorrow.\"",
    "She said it like an apology."
   ]
  ]
 },
 "NIGHT7": {
  "ru": [
   "Сегодня никто не придёт. Сегодня дали свет.",
   "Тридцать семь лет никто не досиживал до шести. Ты досидел.",
   "Спасибо за свободу. Побудь ещё немного — мы расскажем, кто мы."
  ],
  "en": [
   "No one is coming tonight. Tonight the power is back.",
   "For thirty-seven years no one stayed awake until six. You did.",
   "Thank you for our freedom. Stay a little longer — we will tell you who we are."
  ]
 },
 "MONSTERS": {
  "ru": [
   {
    "kind": "door",
    "name": "Долговязый",
    "who": "Пал Палыч, электрик",
    "lines": [
     "Его звали Пал Палыч. Он чинил проводку в лагере двадцать лет.",
     "В ту грозу он полез на столб один — ждать бригаду было некогда.",
     "Свет так и не дали. Его нашли утром, у самого корпуса.",
     "Он до сих пор идёт по коридору и светит фонарём, которого нет.",
     "Он не ищет тебя. Он ищет рубильник."
    ]
   },
   {
    "kind": "window",
    "name": "Те, у окна",
    "who": "четверо из второго отряда",
    "lines": [
     "Их было четверо. Они решили, что дойдут до посёлка сами.",
     "Ночью, без фонарей, через лес — а до посёлка восемь километров.",
     "Их искали три дня. Нашли только куртки у реки.",
     "Теперь они стучат в окна: смотрят, горит ли внутри свет.",
     "Если постучать в ответ — они думают, что их всё ещё ждут."
    ]
   },
   {
    "kind": "fast",
    "name": "Рой",
    "who": "то, что было здесь раньше",
    "lines": [
     "Оно жило в этом лесу задолго до лагеря.",
     "Пока горели фонари, оно не подходило ближе опушки.",
     "Три ночи темноты — и оно выучило дорогу к корпусам.",
     "Своих глаз у него нет. Оно берёт чужие, чтобы видеть.",
     "Дверь оно не откроет. Оно ждёт, пока откроют сами."
    ]
   },
   {
    "kind": "neighbor",
    "name": "Сосед",
    "who": "Ильдар, койка у стены",
    "lines": [
     "Ильдар с соседней койки. Он и в первую тёмную ночь не закричал.",
     "Пока отряд уводили к воротам, он остался лежать и слушать.",
     "В половине двенадцатого свет ударил в корпус.",
     "Балка с потолка легла ему на лицо. Он даже не успел отвернуться.",
     "Теперь он лежит и слушает темноту. Вместо тебя."
    ]
   },
   {
    "kind": "bug",
    "name": "Тот, что под кроватью",
    "who": "самый младший",
    "lines": [
     "Самый младший в отряде. Ему было восемь.",
     "Он залез под койку с фонариком и не вышел, сколько его ни звали.",
     "Когда ударило, койка сложилась вместе с верхним ярусом.",
     "То, что нашли под ней утром, вынимали из досок. Опознали по фонарику.",
     "Он и теперь стучит снизу. Спрашивает, дали ли наконец свет."
    ]
   },
   {
    "kind": "buff",
    "name": "Вожатый",
    "who": "девятнадцать лет, первая смена",
    "lines": [
     "Ему было девятнадцать. Первая смена, первый его отряд.",
     "Когда погас свет, он повёл детей к воротам — на ощупь, по одному.",
     "Он довёл всех до ворот и вернулся. За последним.",
     "Из корпуса он больше не вышел.",
     "Он и сейчас стоит в дверях. Считает, все ли на месте."
    ]
   }
  ],
  "en": [
   {
    "kind": "door",
    "name": "The Tall One",
    "who": "Pal Palych, the electrician",
    "lines": [
     "His name was Pal Palych. He kept the camp wired for twenty years.",
     "During that storm he climbed the pole alone — there was no time to wait for a crew.",
     "The power never came back. They found him in the morning, by the cabin.",
     "He still walks the hallway, shining a flashlight that is not there.",
     "He is not looking for you. He is looking for the breaker."
    ]
   },
   {
    "kind": "window",
    "name": "The Ones at the Window",
    "who": "four from the second squad",
    "lines": [
     "There were four of them. They decided to reach the village on their own.",
     "At night, without lights, through the forest — and the village is five miles away.",
     "They searched for three days. They only found the jackets by the river.",
     "Now they knock on windows, checking whether a light is on inside.",
     "Knock back, and they believe someone is still waiting for them."
    ]
   },
   {
    "kind": "fast",
    "name": "The Swarm",
    "who": "what was here before",
    "lines": [
     "It lived in this forest long before the camp did.",
     "While the lamps burned, it never came closer than the treeline.",
     "Three nights of darkness, and it learned the way to the cabins.",
     "It has no eyes of its own. It takes others to see.",
     "It will not open the door. It waits for the door to be opened."
    ]
   },
   {
    "kind": "neighbor",
    "name": "The Neighbor",
    "who": "Ildar, the bed by the wall",
    "lines": [
     "Ildar from the next bed. He did not scream even on the first dark night.",
     "While the squad was led to the gates, he stayed behind to listen.",
     "At half past eleven the current reached the cabin.",
     "A ceiling beam came down across his face. He never even turned away.",
     "Now he lies and listens to the dark. Instead of you."
    ]
   },
   {
    "kind": "bug",
    "name": "The One Under the Bed",
    "who": "the youngest",
    "lines": [
     "The youngest in the squad. He was eight.",
     "He crawled under the bed with a flashlight and would not come out, however they called.",
     "When it struck, the bunk folded in on itself, upper tier and all.",
     "What they found under it in the morning was pulled out of the boards. They identified him by the flashlight.",
     "He still knocks from below. Asking whether the power is back yet."
    ]
   },
   {
    "kind": "buff",
    "name": "The Counselor",
    "who": "nineteen, his first season",
    "lines": [
     "He was nineteen. His first season, his first squad.",
     "When the lights died, he led the children to the gates — by touch, one by one.",
     "He got them all to the gates and went back. For the last one.",
     "He never walked out of that cabin again.",
     "He still stands in the doorway. Counting whether everyone is there."
    ]
   }
  ]
 }
};
