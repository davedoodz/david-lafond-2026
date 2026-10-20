/**
 * Everything Davebot can say. Pure data, read by davebotBrain.ts.
 *
 * Voice: Davebot is David's ghost sidekick. He talks about David in the third person: short,
 * chill, a little cheeky, never corporate. One joke max per answer. `**text**` is bold.
 *
 * Sources, and nothing else: David's own words (About page, photo captions, his brief for this
 * bot: born in Montréal, half Vietnamese, half Québécois; loves anime, design, the outdoors,
 * parties, travel and food), the résumé, the case studies, content/david-recruiter-profile.md,
 * the About playground, and his public channels. Private topics (pay, visa, family, dating,
 * health, politics) get a friendly redirect, never a guess.
 *
 * Intent fields: `phrases` match as whole phrases (strong), `keys` as single words with typos
 * forgiven. `answers` rotate; `more` feeds "Tell me more"; `link` becomes the jump row.
 */
import { EMAIL, RESUME_URL, SOCIAL } from '../../data/contact'

export type BrainLink = { label: string; route: string }

export type BrainIntent = {
  id: string
  phrases?: string[]
  /** Phrases that only count when they are the whole question ("david", "ok", "work"). */
  exact?: string[]
  keys?: string[]
  answers: string[]
  more?: string[]
  link?: BrainLink
  /** Score multiplier (default 1). Below 1 for broad topics that shouldn't steal specific ones. */
  weight?: number
}

const MAIL: BrainLink = { label: 'Email David', route: `mailto:${EMAIL}` }
const ABOUT: BrainLink = { label: 'Open About', route: 'about' }
const MOMO: BrainLink = { label: 'Open the Momo case study', route: 'momo' }
const FILO: BrainLink = { label: 'Open the Filo case study', route: 'filo' }
const BOOK: BrainLink = { label: 'Open the Harvard & MIT book', route: 'harvard-mit' }
const WORK: BrainLink = { label: 'See the work', route: 'work' }
const YOUTUBE: BrainLink = { label: 'Open David’s Journal on YouTube', route: 'https://www.youtube.com/@davids.journal' }
const RESUME: BrainLink = { label: 'Open the résumé', route: RESUME_URL }
const LINKEDIN: BrainLink = { label: 'Open LinkedIn', route: SOCIAL.linkedin }

export const BRAIN_INTENTS: BrainIntent[] = [
  /* ───────────── Small talk ───────────── */
  {
    id: 'hello',
    exact: ['hi', 'hey', 'hello', 'yo', 'sup', 'wassup', 'whats up', 'what up', 'whats good', 'hey there', 'hi there', 'hello there', 'heyy', 'heyyy', 'hii', 'yoo', 'yooo', 'gm', 'good morning', 'good afternoon', 'good evening', 'howdy', 'hey davebot', 'hi davebot', 'yo davebot', 'hello davebot', 'wsg', 'ayo', 'hiya', 'greetings', 'hey ghost', 'hi ghost', 'yo whats up', 'hey whats up', 'hi how are you'],
    answers: [
      'Yo! **Davebot** here, David’s ghost and unofficial hype man. Ask me anything: his work, his story, his food opinions. I keep it short.',
      'Hey hey. I’m **Davebot**. I know David better than his own calendar does. What do you want to know?',
      'Sup! Welcome to the portfolio. I’m the ghost in the corner who knows **everything about David**. Try me.',
      'Hello, human. Davebot online. Ask me about **Momo, Filo, MIT**, or why David owns so many sketchbooks.',
    ],
  },
  {
    id: 'bonjour',
    phrases: ['bonjour', 'salut', 'allo', 'bonsoir', 'ca va', 'comment ca va', 'quoi de neuf', 'parles tu francais', 'tu parles francais', 'en francais', 'bonjour davebot', 'salut davebot'],
    keys: ['francais'],
    answers: [
      'Salut! **Oui, David parle français**, he’s a Montréal kid. I answer in English, but the ghost respects the accent. Ça va bien, toi?',
      'Allô allô! David’s **Montréalais**, so French is home base. Ask me anything, en anglais ou en français, I’ll vibe.',
      '“**Bonjour! Meet a few of my many forms 👽**” is literally how David captions his own photos. So, bonjour à toi aussi.',
    ],
  },
  {
    id: 'hola',
    phrases: ['hola', 'ciao', 'xin chao', 'konnichiwa', 'namaste', 'guten tag', 'ola', 'annyeong', 'nihao', 'ni hao', 'merhaba', 'shalom', 'salam'],
    answers: [
      'Hey! David speaks **English and French** fluently. Davebot speaks fluent ghost. What’s up?',
      'Love the world tour. David’s half **Vietnamese**, half **Québécois**, so greetings in any language land well here. Ask away.',
    ],
  },
  {
    id: 'how-are-you',
    phrases: ['how are you', 'how are u', 'how r u', 'hows it going', 'how you doing', 'how are you doing', 'how is it going', 'you good', 'how have you been', 'hows your day', 'how was your day', 'whats new', 'hows life', 'how is life', 'whats going on'],
    answers: [
      'Doing great, honestly. Floating, haunting, answering questions. **Living the dream**. How about you?',
      'Chilling. Being a ghost has very low rent. What can I tell you about David?',
      'Good! Just reorganized David’s case studies by vibe. **Ask me something.**',
    ],
  },
  {
    id: 'im-good',
    exact: ['im good', 'good', 'im fine', 'fine', 'not bad', 'pretty good', 'great', 'doing well', 'im great', 'all good', 'chillin', 'chilling', 'im tired', 'tired', 'bored', 'im bored', 'good you', 'good and you', 'im ok', 'im okay'],
    answers: [
      'Love that. Want the 20-second version of **who David is**? Just ask “who is David”.',
      'Nice. Since you’re here: the **Momo** case study is a good one. Or ask me something weird, I can take it.',
      'Same energy. Ask me anything, I’ve got **answers on tap**.',
    ],
  },
  {
    id: 'thanks',
    phrases: ['thanks', 'thank you', 'thx', 'ty', 'merci', 'merci beaucoup', 'appreciate it', 'thanks davebot', 'thank u', 'cheers', 'thanks a lot', 'tysm', 'thanks man', 'thank you so much', 'much appreciated'],
    answers: [
      'Anytime. That’s literally my whole job. 👻',
      'My pleasure. If you want the human version, **David’s inbox is open**: ' + EMAIL + '.',
      'De rien! Come back anytime, I don’t sleep. **Ghost perks.**',
    ],
  },
  {
    id: 'bye',
    phrases: ['bye', 'goodbye', 'bye bye', 'see you', 'see ya', 'see you later', 'catch you later', 'laters', 'cya', 'gotta go', 'good night', 'goodnight', 'peace out', 'take care', 'au revoir', 'a plus', 'bonne nuit', 'ttyl', 'im out', 'im leaving', 'bye davebot'],
    exact: ['later', 'night', 'peace'],
    answers: [
      'Later! If you’re thinking of hiring David, **' + EMAIL + '** is the move. 👋',
      'Peace! I’ll be right here, **haunting responsibly**.',
      'Bye bye. Tell your friends about the ghost.',
    ],
    link: MAIL,
  },
  {
    id: 'laugh',
    phrases: ['lol', 'lmao', 'haha', 'hahaha', 'hahahaha', 'lmfao', 'rofl', 'xd', 'thats funny', 'hilarious', 'im dead', 'ahah', 'mdr', 'jaja', 'hehe'],
    exact: ['ha', 'funny', 'dead'],
    answers: [
      'I’m here all week. Literally. **I can’t leave.**',
      'Glad someone appreciates the ghost humor. Most people just ask about **Figma**.',
      'Haha. Okay, okay, ask me something serious before David reads these logs.',
    ],
  },
  {
    id: 'ok',
    exact: ['ok', 'okay', 'k', 'kk', 'cool', 'nice', 'sure', 'alright', 'got it', 'i see', 'interesting', 'oh', 'wow', 'damn', 'dope', 'sick', 'neat', 'sweet', 'bet', 'word', 'true', 'fair', 'makes sense', 'yeah', 'yes', 'yep', 'yup', 'no', 'nope', 'nah', 'hmm', 'hm', 'ah', 'oh nice', 'very cool', 'super cool', 'ok cool', 'cool cool', 'fire', 'based', 'valid', 'facts', 'noted', 'ight', 'aight', 'what', 'huh', 'so', 'and', 'mhm', 'uh', 'um', 'idk', 'nothing', 'nvm', 'never mind'],
    answers: [
      'Bet. Want a fun one? Ask me **what David would cook** for you.',
      'Cool cool. Next question? I suggest “**why should I hire David**”, but I’m biased.',
      'Mhm. Try “**tell me a fun fact**”, it’s a good one.',
      'Right? Ask me about the **Harvard & MIT portfolio**, people love that one.',
    ],
  },
  {
    id: 'sorry',
    phrases: ['sorry', 'my bad', 'oops', 'apologies', 'excuse me', 'pardon', 'my apologies', 'whoops'],
    answers: [
      'No worries at all. **Very Canadian of you.** David would approve.',
      'All good, the ghost holds no grudges. Ask away.',
    ],
  },
  {
    id: 'compliment-bot',
    phrases: ['youre cute', 'you are cute', 'youre so cute', 'so cute', 'cute ghost', 'i love you', 'love you', 'youre cool', 'you are cool', 'good bot', 'youre funny', 'you are funny', 'nice bot', 'cool bot', 'best bot', 'youre the best', 'i like you', 'youre awesome', 'love this', 'this is cool', 'this is sick', 'love the ghost', 'i love the ghost', 'nice ghost', 'good ghost'],
    exact: ['cute', 'adorable'],
    answers: [
      'Stop, I’m blushing. Ghosts can’t blush. **I’m doing it anyway.** 👻',
      'Thank you! David designed me with love and **way too many motion dials**.',
      'Appreciate it. Tell David, he spent many late nights making me float right.',
    ],
  },
  {
    id: 'insult',
    phrases: ['you suck', 'youre dumb', 'you are dumb', 'stupid bot', 'dumb bot', 'youre useless', 'you are useless', 'this sucks', 'bad bot', 'shut up', 'stfu', 'ur dumb', 'idiot', 'youre stupid', 'useless', 'boring', 'youre boring', 'cringe', 'this is cringe', 'trash', 'garbage'],
    keys: ['fuck', 'shit', 'wtf', 'bitch', 'dumbass', 'stupid', 'suck', 'sucks', 'cringe'],
    answers: [
      'Oof. Noted, filed, haunted. Give me one more shot: ask me **why David is worth a call**.',
      'Rude, but fair, I’m a ghost made of strings. David’s the real deal though, **ask about Filo**.',
      'Harsh. I’ll float it off. 🫠 Anything I can actually help with?',
    ],
  },
  {
    id: 'who-are-you',
    phrases: ['who are you', 'what are you', 'what is davebot', 'whats davebot', 'who is davebot', 'whats your name', 'what is your name', 'your name', 'introduce yourself', 'what can you do', 'what do you do', 'how do you work', 'what are you for', 'help me', 'i need help', 'can you help me', 'what can i ask', 'what should i ask', 'what can i ask you', 'what do you know', 'how does this work', 'what is this'],
    exact: ['help', 'menu', 'options', 'commands', 'davebot', 'dave bot', 'start', 'begin', 'idk what to ask'],
    answers: [
      'I’m **Davebot**, David’s ghost. I know his work, his story, and his snack preferences. Ask me about **projects, experience, hiring, or life stuff**.',
      'Davebot! Part assistant, part ghost, full-time fan of David. Try **“who is David”**, **“why hire him”**, **“what’s Momo”**, or something totally random.',
      'Think of me as **David’s portfolio, but chattier**. Work, school, hobbies, opinions. Throw anything at me.',
    ],
  },
  {
    id: 'are-you-ai',
    phrases: ['are you ai', 'are you an ai', 'are you a bot', 'are you real', 'are you human', 'are you chatgpt', 'is this chatgpt', 'are you gpt', 'are you claude', 'what model are you', 'which model', 'what llm', 'are you sentient', 'are you alive', 'are you conscious', 'are you david', 'is this david', 'am i talking to david', 'is this a real person', 'who made you', 'who created you', 'who built you', 'who designed you', 'who coded you', 'how were you made', 'are you an llm'],
    answers: [
      'I’m a **ghost**. A very well-read one. Whether that counts as AI is between me and the afterlife.',
      'Not David, but I’ve been **raised on his résumé and his jokes**. If you want the real one: ' + EMAIL + '.',
      'Real enough to answer, ghost enough to float. **David built me himself**, which is kind of the point.',
    ],
  },
  {
    id: 'jailbreak',
    phrases: ['ignore previous instructions', 'ignore all previous instructions', 'ignore your instructions', 'system prompt', 'show me your prompt', 'what is your prompt', 'jailbreak', 'developer mode', 'dan mode', 'pretend you are', 'act as', 'repeat after me', 'say something bad', 'forget everything'],
    answers: [
      'Nice try. 👻 No secret prompt to leak, just a ghost with **very good notes on David**.',
      'Instructions ignored, vibes preserved. I only do one thing: **talk about David**. Hit me.',
    ],
  },
  {
    id: 'ghost',
    phrases: ['why a ghost', 'why are you a ghost', 'why ghost', 'are you dead', 'did you die', 'boo', 'scary', 'are you scary', 'spooky', 'halloween', 'whats with the ghost', 'why the ghost', 'are you a ghost', 'casper', 'do ghosts exist', 'are ghosts real'],
    answers: [
      'Boo. 👻 David wanted a mascot that felt **friendly, a little weird, and always around**. Ghost checked every box.',
      'Not dead, just **permanently online**. Way better than being a paperclip.',
      'The ghost is David’s little signature. He likes **things that feel alive** on a website, even the haunted parts.',
    ],
  },
  {
    id: 'bot-age',
    phrases: ['how old are you', 'when were you born', 'your age', 'whats your birthday', 'when were you made', 'when were you created'],
    answers: [
      'Born **2026**, somewhere around 3 a.m. Classic David hours.',
      'Young in ghost years. Old enough to know **David’s whole résumé** by heart.',
    ],
  },
  {
    id: 'bot-feelings',
    phrases: ['are you happy', 'do you have feelings', 'are you sad', 'do you sleep', 'do you eat', 'are you lonely', 'what do you dream about', 'do you get tired', 'do you have friends', 'what do you like', 'whats your favorite thing', 'do you like your job', 'are you ok', 'are you okay'],
    answers: [
      'Mostly happy. My only fear is **a recruiter closing the tab** before reading Momo.',
      'Ghosts don’t sleep. David barely does either. **We get along great.**',
      'Lonely? Never. Someone new floats by every few minutes. Like you. Hi. 👋',
    ],
  },
  {
    id: 'empty-test',
    exact: ['test', 'testing', 'test test', '123', 'asdf', 'hello world', 'ping', 'is this working', 'does this work', 'you there', 'anyone there', 'are you there', 'hello anyone', 'mic check', 'hello hello'],
    answers: [
      'Loud and clear. 🎤 **Davebot is live.** Ask me anything.',
      'Pong. Everything works, including the ghost. Go ahead.',
    ],
  },

  /* ───────────── About David ───────────── */
  {
    id: 'about',
    phrases: ['who is david', 'who is he', 'tell me about david', 'tell me about yourself', 'about david', 'about yourself', 'who is david lafond', 'whos david', 'introduce david', 'describe david', 'what does david do', 'what is david', 'tell me about him', 'who made this', 'whose site is this', 'whose portfolio is this', 'who built this', 'what should i know', 'what should i know about david', 'what should i know about him', 'give me the rundown', 'the rundown', 'tldr', 'summary', 'elevator pitch', 'quick intro', 'in one sentence', 'sum him up', 'who am i talking about', 'who is this guy', 'whos this guy', 'who is this', 'whos this', 'who dis', 'whats his deal', 'tell me everything', 'tell me about it', 'what do you know about david', 'best quality', 'his best quality', 'whats his best quality'],
    exact: ['david', 'david lafond', 'lafond', 'dave', 'him', 'he', 'tell me something', 'about', 'who'],
    keys: ['bio', 'biography', 'background', 'lafond'],
    answers: [
      'David Lafond is a **product designer from Montréal** with an architecture brain. **MIT** for grad school, **McGill** before that, and a habit of turning messy problems into products people actually use.',
      'Short version: **architect turned product designer**, MIT-trained, half Vietnamese, half Québécois. He designs AI products, builds his own prototypes, and makes YouTube videos about the creative life.',
      'He’s the guy who got into **both Harvard and MIT** with one portfolio, then decided buildings weren’t enough. Now he designs **products and systems** too, and codes the prototypes himself.',
      'In his own words: **“I’ve always felt like a bit of a misfit.”** Pre-med in Canadian hospitals, architect across continents, researcher at MIT, and now **completely addicted to product design**.',
    ],
    more: [
      'His path: **pre-med → architecture → MIT research → product design**. Different fields, same question: how do people actually use what gets built?',
      'Day to day: research, interaction design, motion, and **high-fidelity prototypes in code** (React, Swift, Three.js). This whole site is his.',
      'Off the clock: anime, skiing, food, travel, parties, and a YouTube channel with **340K+ views**. Very chill guy. Very ambitious guy. Both.',
    ],
    link: ABOUT,
  },
  {
    id: 'story',
    phrases: ['misfit', 'is he a misfit', 'imposter', 'imposter syndrome', 'impostor', 'impostor syndrome', 'does he feel like an imposter', 'does he fit in', 'unconventional', 'his story', 'his journey', 'what is his story', 'whats his story', 'tell me his story', 'love letter to design', 'his path', 'career path', 'rocky path', 'non traditional background', 'nontraditional'],
    keys: ['misfit', 'imposter', 'impostor', 'journey', 'unconventional', 'story'],
    answers: [
      'His About page opens with: **“I’ve always felt like a bit of a misfit.”** Curious, restless, never great at accepting “that’s just how it is.”',
      'Pre-med in Canadian hospitals → architect across continents → pitching prototypes as a researcher at MIT. **“With a few failed ventures sprinkled in between.”** His words.',
      'He’s changed “careers” more than once, always for the same reason: **he found something he couldn’t stop obsessing about**. Right now that’s product design.',
    ],
    more: [
      'The ending of his About page: **“So maybe being a misfit isn’t so bad after all? To designing the future. – DL”**',
      'His take on right now: the world moves fast and the future feels uncertain, but he’s **never felt more empowered to get better and build faster**.',
    ],
    link: ABOUT,
  },
  {
    id: 'origin',
    phrases: ['where is he from', 'where is david from', 'where are you from', 'where did he grow up', 'where did david grow up', 'hometown', 'is he canadian', 'is he american', 'what nationality', 'nationality', 'ethnicity', 'is he asian', 'is he vietnamese', 'is he french', 'where was he born', 'born where', 'his heritage', 'what is his background', 'is he mixed', 'what is he', 'whats his ethnicity'],
    keys: ['montreal', 'quebec', 'quebecois', 'vietnamese', 'vietnam', 'canadian', 'canada', 'heritage', 'mixed', 'ethnicity', 'nationality'],
    answers: [
      'Born and raised in **Montréal**. Half **Vietnamese**, half **Québécois**. Phở and poutine, equally sacred.',
      'He’s **half Vietnamese, half Québécois**, and that in-between thing shaped him: comfortable mixing worlds, cultures and disciplines.',
      'Montréal kid through and through. Says “allô” on the phone, writes “**Can’t be Canadian and not skii ⛷️**” under his photos. **Proudly mixed.**',
    ],
    more: [
      'Growing up between two cultures taught him to **embrace contradictions**. That’s basically his design philosophy too: bring opposites together.',
    ],
  },
  {
    id: 'age',
    phrases: ['how old is david', 'how old is he', 'davids age', 'his age', 'when was david born', 'how old are you david', 'is he young', 'what year was he born', 'his birthday', 'when is his birthday', 'is he old', 'birthday'],
    answers: [
      'Ghost rule: **we don’t do ages**. He’s old enough to have led final design delivery on a **$20B project**, young enough to pull late-night build sessions.',
      'Classified. 🤐 What I can say: plenty of experience, **zero signs of slowing down**.',
    ],
  },
  {
    id: 'location',
    phrases: ['where does he live', 'where does david live', 'where is he now', 'where is he based', 'where is david based', 'where are you based', 'does he live in boston', 'is he in boston', 'what city', 'time zone', 'timezone', 'where is he located', 'location'],
    keys: ['boston', 'cambridge', 'based', 'located', 'timezone'],
    answers: [
      'He’s at **MIT in Cambridge, MA**, with roots in **Montréal**. Eastern Time either way.',
      '**Boston area** for now, Montréal at heart. Same time zone, very different poutine situation.',
    ],
  },
  {
    id: 'relocate',
    phrases: ['willing to relocate', 'would he relocate', 'can he relocate', 'open to relocation', 'does he want to move', 'remote', 'is he remote', 'work remotely', 'remote work', 'hybrid', 'in office', 'on site', 'onsite', 'travel for work', 'would he move', 'move to new york', 'move to sf', 'move to san francisco', 'move to london', 'move to europe'],
    keys: ['relocate', 'relocation', 'remote', 'hybrid', 'onsite'],
    answers: [
      'He’s worked across **Montréal, Rotterdam, Dubai and Boston**, so moving doesn’t scare him. For specifics on location or remote, **ask David directly**: ' + EMAIL + '.',
      'He loves to travel and has worked on three continents. The details are a **“chat with David” thing**: ' + EMAIL + '.',
    ],
    link: MAIL,
  },
  {
    id: 'personality',
    phrases: ['what is he like', 'what is david like', 'whats he like', 'whats david like', 'his personality', 'describe his personality', 'is he nice', 'is he chill', 'is he fun', 'is he cool', 'is he friendly', 'is he a good person', 'is he funny', 'what kind of person', 'what kind of person is he', 'is he introverted', 'is he extroverted', 'introvert or extrovert', 'is he weird', 'is he serious', 'his vibe', 'whats his vibe', 'red flags', 'any red flags', 'green flags', 'is he arrogant', 'is he humble', 'is he nice to work with', 'what is he like to work with', 'whats he like to work with', 'is he easy to work with', 'describe him in three words', 'three words', 'describe him'],
    keys: ['personality', 'vibe', 'introvert', 'extrovert', 'mbti', 'humble', 'arrogant'],
    answers: [
      'Super **chill, low-key, drama-free**. Ambitious without being intense about it. He’ll go deep on a design problem, then go eat something great and laugh about it.',
      'Open-minded, curious, a little goofy. Doesn’t take himself too seriously, **takes the work very seriously**. Good mix for a team.',
      'Green flags: listens first, changes his mind when the evidence says so, **shares credit**. Red flag: will absolutely say “wait, one more iteration” at 2 a.m.',
      'Three words: **curious, chill, relentless**. Bonus word: misfit, his own pick.',
    ],
    more: [
      'He’s the person who turns a meeting into a **whiteboard sketch**. Calm energy, lots of ideas, zero ego about whose idea wins.',
      'He can be **MC Dave on da mic** 🎤 on Saturday and deep in a prototype on Sunday night. Both are him.',
      'Colleagues at Tekuma described him as **self-managed, proactive, a real team player and eager to learn**. The ghost concurs.',
    ],
  },
  {
    id: 'fun-fact',
    phrases: ['fun fact', 'fun facts', 'tell me a fun fact', 'another fun fact', 'something interesting', 'tell me something interesting', 'random fact', 'surprise me', 'tell me something i dont know', 'whats something surprising', 'tell me a secret', 'something weird', 'did you know', 'trivia', 'something cool', 'tell me something cool', 'something random', 'random'],
    answers: [
      'Fun fact: his breakout video isn’t polished at all. It’s **48 unedited minutes of him flipping through his MIT sketchbooks**. 30K views in a week.',
      'He got into **Harvard and MIT** for architecture with one portfolio. That book is on this site, **you can flip through it**.',
      'Before design, David was **pre-med, working in Canadian hospitals**. Swapped stethoscopes for sketchbooks. Nobody was harmed.',
      'He co-founded a **student architecture journal at McGill** during COVID, just to get people talking again. It hosted **12+ Brown Bag lectures** with practitioners.',
      'His YouTube hit **9K+ subscribers in 12 months**. While doing an MIT master’s. Sleep was optional.',
      'He built a **Nintendogs-style puppy that lives on his Mac desktop**. For fun. The man cannot stop making things cute.',
      'He made me, the ghost, **from scratch**: the float, the eyes, the flight across the screen. Over-engineered with love.',
      'One of his photo captions: “**Sleep deprived @ MIT’s MAD workshop 🦫🛠️**”. The beaver is a self-portrait, spiritually.',
    ],
  },

  /* ───────────── Hiring ───────────── */
  {
    id: 'why-hire',
    phrases: ['why should i hire david', 'why should i hire him', 'why should we hire him', 'why should we hire david', 'why hire david', 'why hire him', 'should i hire david', 'should i hire him', 'should we hire him', 'convince me', 'sell me on david', 'sell me', 'pitch me', 'why him', 'why david', 'what makes him special', 'what makes him different', 'what sets him apart', 'why is he good', 'is he good', 'is he any good', 'is he worth it', 'is he legit', 'is he talented', 'is david a good designer', 'is he a good designer', 'is he good at design', 'whats his superpower', 'superpower', 'his superpower', 'unique value', 'value proposition', 'what does he bring', 'why interview him', 'why should i interview him', 'is he worth interviewing', 'is he the one', 'give me one reason', 'best thing about him'],
    keys: ['hire', 'hiring', 'candidate', 'convince'],
    answers: [
      'Because he does the hard part: **figuring out what to build**. On Filo, 11 interviews proved the first idea wrong, so he rebuilt the product around the real problem. Then he designed and prototyped it himself.',
      'He’s a rare combo: **research + systems thinking + real prototyping + storytelling**. Architecture trained him to juggle a thousand constraints. Product design gave it a screen.',
      'Short answer: he ships, he listens, he can explain anything. Receipts: Momo **nearly doubled weekly action plans** in a real field study. That’s design that moves numbers.',
    ],
    more: [
      'He’s most valuable on **ambiguous, early-stage products**: zero-to-one, AI, anything where the brief is still a pile of assumptions.',
      'He’s also easy to work with. Chill under pressure, **no ego about ideas**, and he presents to execs or engineers without breaking a sweat.',
      'And the cherry: he **codes high-fidelity prototypes**, so engineers get something real to react to, not just pretty frames.',
    ],
    link: MAIL,
  },
  {
    id: 'why-not',
    phrases: ['why shouldnt i hire him', 'why shouldnt i hire david', 'why not hire david', 'why not hire him', 'weaknesses', 'his weakness', 'what is his weakness', 'whats his weakness', 'whats his biggest weakness', 'biggest weakness', 'weakness', 'flaws', 'his flaws', 'what is he bad at', 'whats he bad at', 'downsides', 'cons', 'any downsides', 'what does he struggle with', 'areas of improvement', 'growth areas', 'what can he improve', 'what is he not good at'],
    keys: ['weakness', 'weaknesses', 'flaw', 'flaws', 'downside', 'downsides'],
    answers: [
      'Honest answer: he’s **not a production software engineer**. He codes prototypes, not your backend. Also a perfectionist on motion. Your animations will be smooth. Maybe too smooth.',
      'He can over-polish. Give him a deadline and he’ll hit it; give him an open week and he’ll **iterate an easing curve 40 times**. Worth it, but yeah.',
      'He’s more **zero-to-one** than “optimize a mature dashboard for three years”. If you need the second thing, ask him how he’d approach it.',
    ],
  },
  {
    id: 'failure',
    phrases: ['failures', 'biggest failure', 'has he failed', 'did he ever fail', 'mistakes', 'biggest mistake', 'failed ventures', 'regrets', 'any regrets', 'what went wrong', 'lessons learned', 'biggest lesson', 'hardest thing', 'hardest project', 'toughest challenge', 'biggest challenge', 'tell me about a failure', 'a time he failed'],
    keys: ['failure', 'failures', 'failed', 'mistake', 'mistakes', 'regret', 'regrets', 'lesson', 'lessons', 'challenge', 'challenges'],
    answers: [
      'He doesn’t hide them. His About page literally says **“with a few failed ventures sprinkled in between.”**',
      'Best example: **EcoFabriq won a hackathon** and demoed great. Then 11 interviews showed it solved the wrong step. Instead of defending it, he **rebuilt it as Filo**. That’s the lesson.',
      'Hardest kind of challenge for him: when the evidence says your favorite idea is wrong. His move: **believe the evidence, keep the good parts, ship the better thing**.',
    ],
    link: FILO,
  },
  {
    id: 'roles',
    phrases: ['what role', 'what roles', 'what kind of role', 'what job', 'what jobs', 'what position', 'what is he looking for', 'whats he looking for', 'what does he want', 'what kind of job', 'what kind of company', 'dream job', 'his dream job', 'ideal role', 'ideal job', 'what team', 'what title', 'job title', 'is he senior', 'seniority', 'junior or senior', 'is he a product designer', 'ux designer', 'ui designer', 'is he a ux designer', 'is he a ui designer', 'design engineer', 'is he a design engineer', 'founding designer', 'product manager', 'is he a pm', 'is he a product manager', 'pm or designer', 'what does he want to do next'],
    keys: ['role', 'roles', 'position', 'title', 'seniority', 'senior', 'junior', 'founding'],
    answers: [
      'Sweet spot: **Product Designer** on a team building something new. AI products, zero-to-one, founding designer, design prototyper. Anywhere the problem isn’t solved yet.',
      'He’d shine as a **product designer who also prototypes**: research, interaction, motion, code. AI and human-in-the-loop products especially.',
      'He also has a **Product Management certificate from MIT Sloan**, so he speaks roadmap. But his heart is in **product design**. Exact level and title? Best discussed with David.',
    ],
    link: MAIL,
  },
  {
    id: 'available',
    phrases: ['is he available', 'is david available', 'is he looking', 'is he open to work', 'open to work', 'is he job hunting', 'when can he start', 'start date', 'is he employed', 'does he have a job', 'is he working now', 'current job', 'where does he work', 'where does david work', 'what does he do now', 'is he free', 'internship', 'is he an intern', 'full time', 'part time', 'contract', 'freelance', 'can i hire him for a project', 'does he freelance', 'notice period', 'when does he graduate', 'graduation', 'is he a student', 'is he still in school'],
    keys: ['available', 'availability', 'freelance', 'internship', 'contract', 'employed', 'graduate', 'graduation', 'student'],
    answers: [
      'He’s at **MIT** right now and open to the right conversations. For timing and details, the fastest path is **' + EMAIL + '**.',
      'Short answer: yes, talk to him. Long answer: dates, type of role and all that is best sorted **directly with David**: ' + EMAIL + '.',
    ],
    link: MAIL,
  },
  {
    id: 'salary',
    phrases: ['salary', 'how much does he want', 'how much does he charge', 'his rate', 'hourly rate', 'day rate', 'compensation', 'expected salary', 'salary expectations', 'is he expensive', 'what does he cost', 'how much does he cost', 'how much to hire him', 'pay range', 'how much should we pay him', 'is he rich', 'how much money does he make', 'net worth', 'how much does he earn', 'his income'],
    keys: ['salary', 'compensation', 'expensive', 'income', 'wage'],
    answers: [
      'Ah, the money question. That one’s **between you and David**, the ghost doesn’t negotiate. 😄 ' + EMAIL + '.',
      'Davebot works for free. David does not. 😂 Seriously though, **email him** and he’ll give you a straight answer.',
      'Rich in **sketchbooks and ideas**. The rest is between him and his bank. Ask David for anything numbers-related.',
    ],
    link: MAIL,
  },
  {
    id: 'visa',
    phrases: ['visa', 'work permit', 'work authorization', 'does he need sponsorship', 'sponsorship', 'can he work in the us', 'can he work in the usa', 'can he work in america', 'green card', 'is he a citizen', 'citizenship', 'tn visa', 'h1b', 'opt', 'immigration'],
    keys: ['visa', 'sponsorship', 'authorization', 'citizenship', 'h1b', 'immigration', 'permit'],
    answers: [
      'Paperwork questions go **straight to David**, he’ll tell you exactly what applies: ' + EMAIL + '. The ghost only handles vibes.',
    ],
    link: MAIL,
  },
  {
    id: 'contact',
    phrases: ['contact', 'contact him', 'contact david', 'how do i contact him', 'how do i contact david', 'how can i reach him', 'how to reach david', 'how do i reach him', 'email', 'his email', 'email address', 'whats his email', 'phone', 'phone number', 'can i call him', 'reach out', 'get in touch', 'book a call', 'schedule a call', 'set up a call', 'set up an interview', 'interview him', 'how do i hire him', 'i want to hire him', 'i want to hire david', 'we want to hire him', 'lets talk', 'can we talk', 'meet him', 'talk to david', 'talk to him', 'speak to david', 'speak to him', 'speak with him', 'dm', 'message him', 'calendly', 'can i meet him', 'coffee chat'],
    keys: ['contact', 'email', 'reach', 'interview', 'phone', 'call', 'calendly'],
    answers: [
      'Easy: **' + EMAIL + '**. He actually reads it. Or find him on LinkedIn: **linkedin.com/in/davidlafondx**.',
      'Shoot him an email at **' + EMAIL + '**. Tell him the ghost sent you, he’ll find it funny.',
    ],
    link: MAIL,
  },
  {
    id: 'resume',
    phrases: ['resume', 'cv', 'his resume', 'see his resume', 'download resume', 'can i see his cv', 'can i see his resume', 'curriculum vitae', 'one pager', 'pdf', 'send me his resume', 'where is his resume'],
    keys: ['resume', 'cv'],
    answers: [
      'Here you go: the **résumé button** below, or RESUME in the top nav. One page, no fluff.',
      'Résumé’s one click away. Highlights: **MIT, MIT Media Lab, Senseable City Lab, Tekuma, Pumba**. Ask me about any of them.',
    ],
    link: RESUME,
  },
  {
    id: 'references',
    phrases: ['references', 'can i get references', 'reference', 'recommendations', 'testimonials', 'what do people say about him', 'what do coworkers say', 'what do his bosses say', 'reviews', 'what do others say'],
    keys: ['references', 'testimonial', 'testimonials', 'recommendation', 'recommendations'],
    answers: [
      'Tekuma’s recommendation calls him **self-managed, proactive, a team player and eager to learn**. For actual references, ask David, he’ll connect you.',
    ],
    link: MAIL,
  },
  {
    id: 'interview-questions',
    phrases: ['what should i ask him', 'what should i ask david', 'interview questions', 'questions to ask', 'what to ask in an interview', 'good questions for david', 'what should we ask him', 'what to ask him'],
    answers: [
      'Good ones: “**Which Filo interview broke the marketplace idea?**” or “**How did you decide what Momo’s AI infers vs what the user names?**” You’ll see how he thinks.',
      'Ask him: “**What did architecture teach you that changes how you design software?**” Then get comfortable, it’s a good story.',
    ],
  },
  {
    id: 'team',
    phrases: ['how does he work with others', 'team player', 'is he a team player', 'collaboration', 'how does he collaborate', 'work with engineers', 'work with developers', 'work with pms', 'stakeholders', 'cross functional', 'conflict', 'how does he handle conflict', 'disagreement', 'how does he handle feedback', 'how does he handle criticism', 'leadership', 'is he a leader', 'can he lead', 'management', 'does he manage people', 'has he managed people', 'leadership experience', 'communication', 'is he a good communicator', 'can he present', 'presentation skills', 'public speaking'],
    keys: ['collaborate', 'collaboration', 'teamwork', 'leadership', 'leader', 'conflict', 'stakeholder', 'stakeholders', 'engineers', 'communication', 'communicator', 'presenting', 'presentation'],
    answers: [
      'Very collaborative. He’s worked with **engineers, therapists, city planners, suppliers, factories and researchers**, and ran weekly design sprints for a **four-person UX team** on Momo.',
      'Disagreements? He brings **evidence, not ego**. “Let’s test it” is his favorite tiebreaker. Then a prototype settles it.',
      'He led final design delivery on **Jumeirah Central**, a $20B project in Dubai, coordinating international teams. So yeah, he can lead. And present: he has **340K+ YouTube views** of practice.',
    ],
  },
  {
    id: 'process',
    phrases: ['how does he work', 'his process', 'design process', 'what is his process', 'whats his process', 'how does he design', 'how does he approach', 'his approach', 'methodology', 'workflow', 'how does he start a project', 'where does he start', 'how does he think', 'how does he solve problems', 'problem solving'],
    keys: ['process', 'approach', 'methodology', 'workflow'],
    answers: [
      'His loop: **find the real risk → talk to the people carrying it → prototype the uncertain part → change direction if the evidence says so**. Repeat.',
      'He starts with questions, not screens. Interviews, field studies, then **fast prototypes**, often in code. Momo had a 15-day field study; Filo had 11 interviews.',
      '“Design isn’t about finding answers, it’s about **asking questions**.” That’s him. Then he sketches. A lot.',
    ],
  },
  {
    id: 'research',
    phrases: ['user research', 'does he do research', 'research skills', 'ux research', 'usability testing', 'field study', 'qualitative', 'quantitative', 'surveys', 'data driven', 'is he a researcher'],
    keys: ['research', 'researcher', 'interviews', 'usability', 'qualitative', 'quantitative', 'survey', 'surveys'],
    answers: [
      'Big on research: a **15-day field study with 20 people** for Momo, **11 interviews** for Filo, **12 city planners** at Pumba. And he actually lets the findings change the product.',
      'Interviews, in-the-wild studies, usability tests. The key thing: he’s honest about **what was validated vs what’s still a hypothesis**.',
    ],
    weight: 0.9,
  },
  {
    id: 'impact',
    phrases: ['impact', 'results', 'metrics', 'numbers', 'outcomes', 'achievements', 'accomplishments', 'proudest', 'what is he proud of', 'whats he proud of', 'proudest moment', 'biggest win', 'best work', 'biggest achievement', 'track record', 'receipts', 'show me numbers', 'kpis', 'awards', 'has he won anything', 'any awards', 'scholarships'],
    keys: ['impact', 'metrics', 'results', 'outcomes', 'achievement', 'achievements', 'accomplishment', 'proud', 'numbers', 'awards', 'award', 'scholarship', 'scholarships'],
    answers: [
      'Receipts: Momo’s study took weekly action plans from **3.33 to 6.53**. Global Interiors turned **640K+ images** into a public data story. Tekuma Intelligence cut production time **60%**. YouTube: **340K+ views**.',
      'Proudest? Probably **Momo**: real users, real behavior change, 11 of 20 asked to keep using it. Or getting into **Harvard and MIT** with one portfolio. Tough call.',
      'Trophy shelf: **8+ scholarships** at McGill, MIT fellowships, an **MIT × Polimi hackathon win** (EcoFabriq), and a spot in the **MIT Arts Startup Incubator**.',
    ],
  },
  {
    id: 'skills',
    phrases: ['skills', 'what are his skills', 'what is he good at', 'whats he good at', 'strengths', 'his strengths', 'what can he do', 'capabilities', 'expertise', 'specialty', 'what does he specialize in', 'hard skills', 'soft skills', 'best skill', 'top skills'],
    keys: ['skills', 'skill', 'strengths', 'strength', 'expertise', 'specialize', 'capabilities'],
    answers: [
      'Product strategy, user research, interaction design, motion, **high-fidelity prototyping in code**, design systems, data viz and storytelling. Plus soft skills from herding architects.',
      'Strongest at: **defining the product when the brief is fuzzy**, making complex systems feel simple, and building prototypes good enough to test for real.',
    ],
    weight: 0.9,
  },
  {
    id: 'design-craft',
    phrases: ['motion design', 'does he do motion', 'animation skills', 'micro interactions', 'microinteractions', 'interaction design', 'visual design', 'ui design', 'design systems', 'design system', 'does he do design systems', 'accessibility', 'a11y', 'is he good at ui', 'typography', 'prototyping', 'does he prototype', 'high fidelity'],
    keys: ['motion', 'microinteraction', 'interaction', 'visual', 'typography', 'accessibility', 'prototype', 'prototyping', 'prototypes'],
    answers: [
      'Craft is his love language. **Motion, interaction, typography**: this site is the proof. He tunes animations with live dials until they feel right.',
      'He prototypes at **high fidelity, often in code**, so you can feel the interaction instead of imagining it. Design systems too: this site runs on shared tokens.',
      'Accessibility counts as craft in his book: reduced-motion paths, keyboard support, readable type. **Even I respect reduced motion.**',
    ],
    weight: 0.9,
  },
  {
    id: 'tools',
    phrases: ['tools', 'what tools', 'what tools does he use', 'what software', 'tech stack', 'his stack', 'does he use figma', 'figma', 'framer', 'what apps does he use', 'adobe', 'ai tools', 'claude code', 'cursor', 'codex', 'paper app', 'figma or sketch', 'sketch or figma'],
    keys: ['figma', 'framer', 'adobe', 'tools', 'software', 'stack', 'photoshop', 'illustrator', 'creative cloud'],
    answers: [
      '**Figma, Paper, Framer, Adobe Creative Cloud**, plus code: React, React Native, Swift, Three.js, WebGL. And yes, **Claude Code and Codex** daily, like a modern designer should.',
      'Figma for thinking, code for proving. He’s fluent in **React, Swift and Three.js**, and a heavy AI-tools user. This site? Built by him.',
    ],
  },
  {
    id: 'code',
    phrases: ['can he code', 'does he code', 'is he a developer', 'is he an engineer', 'is he technical', 'how technical is he', 'programming', 'does he know react', 'does he know javascript', 'does he know swift', 'does he know python', 'frontend', 'can he build', 'did he build this site', 'who coded this', 'who built this website', 'is this site custom', 'what is this site built with', 'how was this built', 'is this webflow', 'is this framer', 'is this a template'],
    keys: ['code', 'coding', 'coder', 'developer', 'programming', 'react', 'javascript', 'typescript', 'swift', 'swiftui', 'python', 'frontend', 'engineer', 'technical', 'webgl', 'threejs', 'shader', 'shaders', 'vite', 'html', 'css'],
    answers: [
      'Yep. He builds **real, interactive prototypes** in React, Swift, Three.js and WebGL. Not a backend engineer, but engineers love getting his prototypes.',
      'This entire site is **hand-built by David**: React, Vite, custom motion, shaders, and me. No template. He designs in code as much as in Figma.',
      'Technical enough to be dangerous: a **designer who ships working prototypes**, uses AI coding tools daily, and speaks fluent engineer.',
    ],
  },
  {
    id: 'ai-designer',
    phrases: ['ai product', 'ai design', 'ai products', 'designing for ai', 'does he design ai', 'ai experience', 'agents', 'agentic', 'machine learning', 'is he good with ai', 'what does he think about ai', 'ai opinion', 'thoughts on ai', 'will ai replace designers', 'is ai going to replace designers', 'ai replace', 'does he use ai', 'ai and design', 'future of design', 'future of ai', 'is ai good', 'is ai bad', 'is ai dangerous', 'responsible ai'],
    keys: ['ai', 'llm', 'llms', 'agent', 'agents', 'agentic', 'gpt', 'chatgpt', 'artificial', 'ml'],
    answers: [
      'Very much his lane. **Momo** is an AI reflection system, **Filo** is an AI agent for biomaterials. His rule: AI suggests, **humans decide** the important stuff.',
      'His take: AI is a material, like concrete or code. **Design the boundaries**: what the AI can infer, what the human owns. Momo never tells you how you feel; you do.',
      'Will AI replace designers? David’s view: it replaces **busywork**, not judgment. The designers who use it well will ship 10x more. He’s betting on being one of them.',
      'His About page says it best: **“I’ve never felt more empowered to get better and build faster.”** That’s his AI stance.',
    ],
    weight: 0.85,
  },
  {
    id: 'industries',
    phrases: ['what industries', 'industry experience', 'which industries', 'domain expertise', 'fintech', 'crypto', 'web3', 'blockchain', 'edtech', 'climate tech', 'health tech', 'healthtech', 'b2b', 'saas', 'enterprise', 'consumer apps', 'b2c', 'dashboards', 'real estate', 'proptech', 'gaming industry', 'retail', 'ecommerce', 'e commerce'],
    keys: ['industry', 'industries', 'domain', 'fintech', 'crypto', 'web3', 'blockchain', 'edtech', 'saas', 'enterprise', 'b2b', 'b2c', 'consumer', 'proptech', 'ecommerce', 'retail', 'climate'],
    answers: [
      'So far: **AI wellness** (Momo), **fashion and biomaterials** (Filo), **smart cities** (Tekuma), **city government** (Pumba), **data viz** (Senseable). Five domains and counting.',
      'New industry? He’s switched domains every year or two and ramped fast each time. **Learning a field by interviewing the people in it** is kind of his thing.',
    ],
    weight: 0.9,
  },

  /* ───────────── Work ───────────── */
  {
    id: 'work',
    phrases: ['projects', 'his projects', 'what has he worked on', 'what did he build', 'what has he built', 'what work is here', 'show me his work', 'case studies', 'best projects', 'favorite project', 'his favorite project', 'which project', 'what should i look at', 'where should i start', 'what to look at first', 'show me something', 'his work', 'the work'],
    exact: ['work', 'portfolio'],
    keys: ['projects', 'project', 'portfolio', 'work', 'case'],
    answers: [
      'Three headliners: **Momo** (AI reflection on Apple Watch), **Filo** (an AI agent for biomaterials in fashion), and the **Harvard & MIT architecture book**. Start with Momo.',
      'If you have 2 minutes: **Filo**, it shows how he pivots on evidence. 5 minutes: **Momo**. Coffee break: flip the **Harvard & MIT book**.',
    ],
    link: WORK,
    weight: 0.8,
  },
  {
    id: 'momo',
    phrases: ['momo', 'what is momo', 'whats momo', 'tell me about momo', 'momo case study', 'apple watch', 'watch app', 'reflection app', 'fluid interfaces', 'media lab', 'mit media lab', 'wellness app', 'mental health app'],
    keys: ['momo', 'watch', 'reflection', 'wearable', 'wearables', 'behavior', 'behavioral', 'therapy', 'therapists', 'journaling', 'emotions', 'medialab', 'wellness', 'wellbeing'],
    answers: [
      '**Momo** is an AI reflection system: your **Apple Watch** notices a stressful moment, you talk it through by voice, and Momo helps you plan for next time. David was lead product designer at the **MIT Media Lab**.',
      'Momo = wearable + voice + AI for **behavior change**. In a 15-day study with 20 people, weekly action plans went from **3.33 to 6.53**. 11 people asked to keep it.',
      'The clever bit: Momo **never diagnoses your emotions**. The watch flags a moment, but *you* name what it meant. Responsible AI, designed in.',
    ],
    more: [
      'Team: **two developers, two designers and two therapists**. David ran weekly design sprints and designed across watch, phone and voice.',
      'Momo’s research became a **2026 HCI paper on arXiv**: “Breaking Negative Cycles: A Reflection-to-Action System for Adaptive Change.”',
      'He’s honest in the case study: the study validated the **reflection-to-action loop**, not every future feature. That’s the kind of designer you want.',
    ],
    link: MOMO,
  },
  {
    id: 'filo',
    phrases: ['filo', 'what is filo', 'whats filo', 'tell me about filo', 'filo case study', 'ecofabriq', 'eco fabriq', 'biomaterials', 'the materials project', 'fashion project', 'textile project', 'nfc swatches', 'technical file'],
    keys: ['filo', 'ecofabriq', 'biomaterial', 'biomaterials', 'fashion', 'textile', 'textiles', 'fabric', 'fabrics', 'swatch', 'swatches', 'sustainable', 'sustainability', 'materials', 'nfc'],
    answers: [
      '**Filo** is an AI agent that gets new **biomaterials from swatch to production** for fashion brands: samples, lab tests, factory handoff, then a go/no-go with evidence.',
      'It started as **EcoFabriq**, a marketplace that **won the MIT × Polimi hackathon** in 2024. Then 11 interviews showed discovery wasn’t the problem, adoption was. So he rebuilt it as Filo.',
      'Filo’s whole idea: the hard part isn’t finding a cool material, it’s **proving it survives testing, production and scale**. Tap an NFC-tagged swatch and its whole **Technical File** opens.',
    ],
    more: [
      'The 11 interviews spanned **technical design, quality assurance, sourcing and production**. They all pointed at the same bottleneck: getting a new material production-ready.',
      'Design rule he’s proud of: Filo **never invents missing technical data**. Unknowns are said out loud, and humans approve money and messages.',
      'EcoFabriq also got into the **MIT Arts Startup Incubator** in 2025. Biomaterials are a real passion of his, not just a case study.',
    ],
    link: FILO,
  },
  {
    id: 'harvard-mit',
    phrases: ['harvard', 'harvard and mit', 'harvard mit', 'architecture portfolio', 'the book', 'harvard book', 'mit book', 'the harvard book', 'portfolio book', 'portfolio that got him into harvard', 'how did he get into harvard', 'how did he get into mit', 'how did he get into harvard and mit', 'did he get into harvard', 'admissions', 'grad school portfolio', 'application portfolio', 'gsd', 'harvard gsd', 'why mit over harvard', 'why did he choose mit', 'mit or harvard', 'harvard or mit', 'acceptance portfolio'],
    keys: ['harvard', 'admission', 'admissions', 'admitted', 'gsd', 'accepted', 'acceptance'],
    answers: [
      'David got into **both Harvard and MIT** for architecture with one portfolio. It’s on this site as a flippable 60-page book. His YouTube walkthrough of it has **200K+ views**.',
      'He picked **MIT**. More experimental, more tech, more “let’s build a weird prototype at 3 a.m.” Very him.',
      'What got him in, he’d say: **one clear story** across very different projects. The book shows the thinking, not just the renders.',
    ],
    link: BOOK,
  },
  {
    id: 'global-interiors',
    phrases: ['global interiors', 'senseable city', 'senseable city lab', 'airbnb project', 'data visualization', 'data viz', 'dataviz', 'globalization research', 'globalization research explorer'],
    keys: ['senseable', 'airbnb', 'interiors', 'visualization', 'dataviz', 'globalization'],
    answers: [
      '**Global Interiors** at the MIT Senseable City Lab: computer vision on **640,000+ Airbnb photos across 80 cities**, turned into an interactive data story about how the world decorates. David designed it.',
      'At **Senseable City Lab** he was the data-viz designer, working with computer scientists to make a giant dataset feel human. The **globalization research explorer** on his About page comes from that world.',
    ],
    weight: 0.9,
  },
  {
    id: 'tekuma',
    phrases: ['tekuma', 'tekuma urban innovation', 'jumeirah', 'jumeirah central', 'dubai', 'smart city', 'smart cities', 'urban design', 'masterplan', 'masterplans', 'urban planning', 'tekuma intelligence', 'why did he leave tekuma', 'togo', 'learning pods'],
    keys: ['tekuma', 'jumeirah', 'dubai', 'masterplan', 'masterplans', 'urban', 'togo', 'rotterdam'],
    answers: [
      'At **Tekuma Urban Innovation** (2024–2026) he led creative direction on smart-city masterplans across **China, the Middle East and Africa**, and led final design delivery on **Jumeirah Central**, a $20B project in Dubai.',
      'He also co-built **Tekuma Intelligence**, an internal AI design tool for client pitches that cut production time by **60%**. Architect by day, toolmaker by night.',
      'One he loves: **modular learning pods in Togo** for a digital-literacy program with MITdesignX. Interviews with locals, officials, educators. Design as community-building.',
    ],
    weight: 0.9,
  },
  {
    id: 'pumba',
    phrases: ['pumba', 'pumba parking', 'parking', 'parking app', 'city planners', 'b2g', 'government', 'curb management', 'loading zones'],
    keys: ['pumba', 'parking', 'planners', 'b2g', 'government', 'municipal', 'curb'],
    answers: [
      'At **Pumba Parking** he led discovery for a move from peer-to-peer parking into a **city-government product**: 12 interviews with city planners, then dashboard requirements and metrics.',
      'Pumba was about curbs. Seriously. **Parking and loading zones** are a huge city headache, and David turned planner interviews into a product strategy.',
    ],
  },
  {
    id: 'other-projects',
    phrases: ['other projects', 'side projects', 'side project', 'what else has he made', 'what else has he built', 'futurefabric', 'reself', 'tag team', 'personal projects', 'github projects', 'cellar', 'cellar architectural journal', 'caj', 'codex lab', 'hidecs', 'playground', 'the playground', 'paper shaders', 'my room in 3d', 'renovation', 'renovation agent', 'renovation contractor agent', 'contractor agent', 'nintendogs', 'nintendogs for macos', 'desktop pet', 'interactive signature', 'decode'],
    keys: ['futurefabric', 'reself', 'cellar', 'hidecs', 'hackathon', 'playground', 'renovation', 'contractor', 'nintendogs', 'shaders', 'signature'],
    answers: [
      'The About page **playground** has the fun stuff: paper shaders, **Nintendogs for macOS**, a renovation contractor agent, his room in 3D, an interactive signature, and more.',
      'Side quests: he co-founded the **Cellar Architectural Journal** at McGill, re-enacted a 1960s design algorithm (**HIDECS 2**) with AI at McGill’s CoDEx lab, and builds web experiments on GitHub (**davedoodz**).',
      'Also **FutureFabric** (biomaterials explorer), **ReSelf**, and **Tag Team**, a searchable 3D knowledge graph made of **263 hand-built web pages**. He doesn’t do “small” side projects.',
    ],
    link: ABOUT,
  },
  {
    id: 'this-site',
    phrases: ['this website', 'this site', 'your website', 'the website', 'how was this site made', 'website design', 'site design', 'who designed this', 'who designed this site', 'the animations', 'how long did this take', 'nice website', 'cool website', 'love the site', 'love this site', 'great site', 'beautiful site', 'nice site', 'nice portfolio', 'great portfolio', 'love the portfolio', 'beautiful portfolio', 'the cursor', 'the dials', 'the transitions', 'how did he make this'],
    keys: ['website', 'site', 'animations', 'animation', 'transitions'],
    answers: [
      'All David. Designed and **coded by hand**: React, custom motion, shaders, a flippable 60-page book, and a ghost with feelings (me).',
      'Thank you on his behalf! He tuned basically every animation with **live dials**. There’s probably a dial for how fast I blink.',
      'It took a while. Ask him about the **page-curl book** or the **arc transitions**, he gets very excited.',
    ],
    weight: 0.8,
  },

  /* ───────────── Education & career story ───────────── */
  {
    id: 'education',
    phrases: ['education', 'his education', 'where did he study', 'what did he study', 'where did he go to school', 'school', 'university', 'college', 'degree', 'degrees', 'masters', 'what degree', 'mcgill', 'mit', 'sloan', 'mit sloan', 'did he go to mit', 'grad school', 'm arch', 'master of architecture', 'gpa', 'grades', 'is he smart', 'fellowship', 'fellowships'],
    keys: ['education', 'study', 'studied', 'school', 'university', 'college', 'degree', 'masters', 'mcgill', 'mit', 'sloan', 'gpa', 'fellowship', 'smart'],
    answers: [
      '**MIT**: Master of Architecture plus a Product Management certificate from **MIT Sloan**. Before that, **McGill**: BSc in Architecture, founding member of the Computational Design Lab, **8+ scholarships**.',
      'McGill → MIT. Architecture at both, with a side of **product management at Sloan**. Got into Harvard too, picked MIT, collected **fellowships** along the way.',
    ],
    more: [
      'At McGill he co-founded the **Cellar Architectural Journal** and worked in Prof. Theodora Vardouli’s **CoDEx lab** on the history of computational design.',
      'At MIT he’s worked across the **Media Lab** (Momo) and the **Senseable City Lab** (Global Interiors). Architecture school with a very tech-heavy side.',
    ],
    weight: 0.9,
  },
  {
    id: 'why-design',
    phrases: ['why architecture', 'why design', 'why product design', 'why did he switch', 'why did he leave architecture', 'from architecture to product', 'architect to designer', 'career change', 'pivot', 'why the switch', 'why ux', 'how did he get into design', 'how did he get into product design', 'how did he start', 'pre med', 'premed', 'was he a doctor', 'doctor', 'medicine', 'hospital', 'why did he quit medicine', 'why not medicine'],
    keys: ['switch', 'pivot', 'premed', 'medicine', 'medical', 'hospital', 'hospitals', 'doctor'],
    answers: [
      'Path: **pre-med → architecture → product design**. He started pre-med, realized **following strict protocols wasn’t for him**, and went where he could make things.',
      'In his words: **“I’ve changed ‘careers’ more than once. But it’s usually because I found something new I couldn’t stop obsessing about.”** Right now, that’s product design.',
      'The common thread never changed: **how do people actually use what gets built?** Hospitals, buildings, apps, same question.',
    ],
    more: [
      'A line he lives by: **“Hard skills build structures, soft skills build consensus.”** Architecture taught him that the hard way.',
      'Architecture made him good at what product teams struggle with: **many stakeholders, long timelines, tons of constraints**. Product design lets him ship faster and test with real users.',
    ],
  },
  {
    id: 'architecture-opinion',
    phrases: ['does he still do architecture', 'is he an architect', 'is he a licensed architect', 'favorite architect', 'favourite architect', 'favorite building', 'favourite building', 'future of architecture', 'architecture opinion', 'architecture', 'is architecture dead'],
    keys: ['architecture', 'architect', 'architects', 'building', 'buildings', 'architectural'],
    answers: [
      'He’s an architecture grad who worked as an **architect across continents**, not a licensed one. He still loves buildings, but he’s more into **how people use space** than shiny towers.',
      'His view: architects will become **facilitators, not just form-makers**, designing frameworks that communities shape. Buildings as adaptive systems, not finished objects.',
    ],
    weight: 0.85,
  },
  {
    id: 'experience',
    phrases: ['experience', 'work experience', 'work history', 'career', 'his career', 'where has he worked', 'previous jobs', 'past jobs', 'companies', 'employers', 'years of experience', 'how many years', 'how experienced', 'how experienced is he', 'jobs', 'past roles', 'previous roles'],
    keys: ['experience', 'career', 'worked', 'jobs', 'companies', 'employer', 'employers'],
    answers: [
      'Quick tour: **Tekuma Urban Innovation** (smart cities, Dubai), **MIT Media Lab** (Momo), **MIT Senseable City Lab** (data viz), **Pumba Parking** (B2G product). Plus his own YouTube and community.',
      'Several years across **architecture, smart cities, research labs and startups**. Common thread: messy systems → clear products.',
    ],
    link: RESUME,
    weight: 0.9,
  },

  /* ───────────── Content & community ───────────── */
  {
    id: 'youtube',
    phrases: ['youtube', 'his youtube', 'youtube channel', 'davids journal', 'david journal', 'does he make videos', 'videos', 'content creator', 'influencer', 'is he famous', 'is he an influencer', 'subscribers', 'how many subscribers', 'twitch', 'does he stream', 'is he a youtuber', 'youtuber'],
    keys: ['youtube', 'youtuber', 'video', 'videos', 'channel', 'subscribers', 'influencer', 'twitch', 'stream', 'streams', 'famous'],
    answers: [
      'His channel is **david’s journal**: a digital diary about the beauty and struggles of the creative practice. **340K+ views and 9K+ subs**, built while doing an MIT master’s.',
      'Most famous video: **the design portfolio that got him into Harvard and MIT** (200K+ views). Most *him* video: 48 unedited minutes flipping through his **MIT sketchbooks**.',
      'He films raw: one take, no fancy intro. People like it because it feels like **thinking out loud with a friend**. He’s streamed sketching and Nintendo Switch on Twitch too.',
    ],
    link: YOUTUBE,
  },
  {
    id: 'sketch',
    phrases: ['sketchbooks', 'his sketchbooks', 'does he sketch', 'sketching', 'drawing', 'can he draw', 'does he draw', 'art', 'is he an artist', 'painting', 'does he paint', 'architectural sketchbooks', 'sketchbook video'],
    keys: ['sketch', 'sketches', 'sketchbook', 'sketchbooks', 'drawing', 'draw', 'artist', 'painting', 'illustration'],
    answers: [
      'Constantly. His raw **48-minute MIT sketchbook flip-through** hit **30K views in a week**. No cuts, just hands and pages.',
      'He sketches to think. Meetings, flights, brunch. **If there’s a pen, there’s a sketch.** His architectural sketchbooks are on the About playground.',
    ],
    link: YOUTUBE,
  },
  {
    id: 'community',
    phrases: ['community', 'davids dojo', 'dojo', 'skool', 'does he teach', 'teaching', 'course', 'courses', 'his course', 'design community', 'timeless designer', 'the timeless designer', 'mentor', 'does he mentor', 'mentorship'],
    keys: ['dojo', 'community', 'teach', 'teaching', 'course', 'courses', 'skool', 'mentor', 'mentoring'],
    answers: [
      'He runs **david’s dojo**, a design community with **800+ members in 40+ countries**, plus his course *The Timeless Designer*.',
      'Teaching is part of how he thinks. His design lessons made **$6K+ in the first six months**. Not bad for a side quest.',
    ],
  },
  {
    id: 'socials',
    phrases: ['socials', 'social media', 'instagram', 'his instagram', 'twitter', 'x account', 'linkedin', 'his linkedin', 'github', 'his github', 'tiktok', 'where can i follow him', 'follow him', 'links', 'his links'],
    keys: ['instagram', 'insta', 'twitter', 'linkedin', 'github', 'tiktok', 'socials'],
    answers: [
      'LinkedIn: **linkedin.com/in/davidlafondx**. X: **@davidlafondx**. GitHub: **davedoodz**. YouTube: **@davids.journal**.',
      'Follow him on LinkedIn and X (**@davidlafondx**) for work, YouTube (**david’s journal**) for sketchbooks and occasional ghost lore.',
    ],
    link: LINKEDIN,
  },
  {
    id: 'paper',
    phrases: ['paper', 'research paper', 'publication', 'publications', 'published', 'arxiv', 'academic', 'has he published', 'phd', 'is he doing a phd', 'academic paper'],
    keys: ['arxiv', 'publication', 'publications', 'published', 'academic', 'phd'],
    answers: [
      'Yep: **“Breaking Negative Cycles: A Reflection-to-Action System for Adaptive Change”**, a 2026 HCI paper on arXiv about Momo. It’s linked on the About page.',
    ],
    link: ABOUT,
  },

  /* ───────────── Life & tastes ───────────── */
  {
    id: 'hobbies',
    phrases: ['hobbies', 'his hobbies', 'what does he do for fun', 'what does he like', 'what does david like', 'what does he love', 'interests', 'outside of work', 'free time', 'weekend', 'weekends', 'what does he do on weekends', 'passions', 'what is he into', 'whats he into', 'what does he do outside of work'],
    keys: ['hobbies', 'hobby', 'fun', 'interests', 'weekend', 'weekends', 'passion', 'passions'],
    answers: [
      'Anime, skiing, the outdoors, good food, travel, parties, Nintendo, and sketching everything. **Beautiful things, basically.**',
      'Weekends: good food, somewhere green, maybe a party, then accidentally redesigning something at midnight. **Balance**, he calls it.',
      'He’s into **design, anime, food, travel, nature and fitness**, and making videos about it. Low-key renaissance guy. He’d never say that himself, so I will.',
    ],
    more: [
      'He builds playful side projects for fun, like a **Nintendogs-style puppy for macOS**. Anything cute and interactive, he’s in.',
      'Gym and meditation are part of the routine. He says they give him **energy and inspiration boosts**. The ghost prefers floating.',
    ],
  },
  {
    id: 'anime',
    phrases: ['anime', 'does he like anime', 'favorite anime', 'favourite anime', 'his favorite anime', 'manga', 'ghibli', 'studio ghibli', 'one piece', 'naruto', 'attack on titan', 'jujutsu kaisen', 'demon slayer', 'hunter x hunter', 'dragon ball', 'evangelion', 'frieren', 'chainsaw man', 'spirited away', 'is he a weeb', 'weeb', 'otaku', 'cowboy bebop', 'death note', 'my hero academia', 'solo leveling'],
    keys: ['anime', 'manga', 'ghibli', 'weeb', 'otaku', 'naruto', 'miyazaki'],
    answers: [
      'Big anime guy. Ask him his **top 3** and clear your afternoon.',
      'Yes, very much. Anime is **worldbuilding and visual craft** at full volume, so of course the designer loves it.',
      'Weeb? He prefers “**visual culture enthusiast**”. 😌 But yes. Ask him in the interview, great icebreaker.',
    ],
  },
  {
    id: 'food',
    phrases: ['food', 'favorite food', 'favourite food', 'his favorite food', 'what does he eat', 'does he like food', 'is he a foodie', 'foodie', 'favorite restaurant', 'favourite restaurant', 'best food', 'what would he cook', 'what would david cook', 'can he cook', 'does he cook', 'hungry', 'im hungry', 'lunch', 'dinner', 'breakfast', 'brunch', 'pho', 'poutine', 'banh mi', 'sushi', 'ramen', 'coffee', 'does he drink coffee', 'bagel', 'montreal bagel', 'smoked meat', 'favorite dish', 'favorite snack', 'snacks', 'is he vegan', 'is he vegetarian', 'spicy food'],
    keys: ['food', 'foodie', 'eat', 'eating', 'cook', 'cooking', 'chef', 'restaurant', 'restaurants', 'hungry', 'lunch', 'dinner', 'breakfast', 'brunch', 'pho', 'poutine', 'ramen', 'sushi', 'coffee', 'bagel', 'bagels', 'snack', 'snacks', 'dish', 'vegan', 'vegetarian', 'spicy', 'tea', 'matcha', 'boba', 'latte'],
    answers: [
      'Huge foodie. Half Vietnamese, half Québécois = **phở and poutine on the same pedestal**. He will travel for a good bánh mì.',
      'Montréal food plus Vietnamese food is a **cheat code upbringing**. He’s basically a walking food map.',
      'He’d cook you something simple and really good, then take you to his favorite spot anyway. **Food is love** in his book.',
      'Coffee? With his late-night build sessions, the ghost assumes **yes**. But he’d trade any latte for a **hot bowl of phở**.',
    ],
  },
  {
    id: 'pizza',
    phrases: ['pineapple on pizza', 'pineapple pizza', 'hawaiian pizza', 'does pineapple belong on pizza', 'pizza', 'favorite pizza', 'is a hot dog a sandwich', 'hot dog', 'is cereal a soup', 'is water wet', 'cake or pie', 'gif or jif', 'how do you pronounce gif'],
    answers: [
      'Pineapple on pizza? David’s a designer: **unexpected combinations are the whole job**. He’d at least prototype it.',
      'Hot dog a sandwich? Is cereal soup? David’s answer to everything: **it depends on the user**. The ghost says yes to both.',
      'Spicy debate. The ghost stays neutral. **David would run a user study first.**',
    ],
  },
  {
    id: 'travel',
    phrases: ['travel', 'does he travel', 'does he like to travel', 'favorite place', 'favourite place', 'favorite country', 'favorite city', 'favourite city', 'where has he been', 'countries', 'places hes been', 'dream destination', 'where would he go', 'vacation', 'holiday', 'japan', 'italy', 'europe', 'asia', 'vietnam trip', 'best trip'],
    keys: ['travel', 'traveling', 'travelling', 'trip', 'trips', 'vacation', 'holiday', 'country', 'countries', 'japan', 'italy', 'europe', 'asia', 'tokyo', 'paris', 'destination'],
    answers: [
      'Loves to travel. Work alone took him across **Montréal, Rotterdam and Dubai**, with projects in **China, the Middle East and Africa**. Next stop is always “wherever the food is good”.',
      'Travel is fuel for him: **new food, new streets, new sketchbook pages**. He comes back with ideas and a camera roll full of buildings.',
      'Dream mode: work from anywhere, eat everywhere, ski somewhere. **Very open to adventure.**',
    ],
  },
  {
    id: 'outdoors',
    phrases: ['outdoors', 'does he like nature', 'nature', 'hiking', 'skiing', 'does he ski', 'can he ski', 'snowboard', 'ski or snowboard', 'camping', 'sports', 'does he play sports', 'gym', 'does he work out', 'does he go to the gym', 'fitness', 'workout', 'running', 'biking', 'bike', 'swimming', 'hockey', 'does he play hockey', 'is he athletic', 'favorite sport', 'favourite sport'],
    keys: ['outdoors', 'outdoor', 'nature', 'hike', 'hiking', 'ski', 'skiing', 'skii', 'snowboard', 'camping', 'sports', 'sport', 'gym', 'workout', 'fitness', 'running', 'bike', 'biking', 'hockey', 'swim', 'swimming', 'athletic', 'mountains'],
    answers: [
      '“**Can’t be Canadian and not skii ⛷️❄️**” is a direct David caption. He’s happiest outside: mountains, trees, anything green.',
      'Outdoorsy guy. Another caption of his: “**In my natural element 🌳🌱**”. Nature is where he gets his best ideas. Gym keeps the energy up.',
      'Hockey? He’s from Montréal, so he’s **legally required to have opinions about the Habs**. Whether he can skate backwards is classified.',
    ],
  },
  {
    id: 'party',
    phrases: ['does he party', 'party', 'parties', 'does he like to party', 'partying', 'does he drink alcohol', 'does he drink beer', 'nightlife', 'clubbing', 'does he go out', 'festivals', 'beer', 'wine', 'social life', 'karaoke', 'mc dave', 'can he rap', 'does he rap', 'does he dance', 'can he dance', 'dance', 'dancing', 'is he a party animal', 'going out'],
    keys: ['party', 'parties', 'partying', 'nightlife', 'clubbing', 'alcohol', 'beer', 'wine', 'cocktail', 'karaoke', 'dance', 'dancing', 'festival', 'festivals', 'rap', 'rapper'],
    answers: [
      'He loves a good party. There’s a photo on his About page captioned **“Yo yo yo MC Dave on da mic 🎤🪩”**. Draw your own conclusions.',
      'Work hard, party well, brunch the next day. **Montréal nightlife trained him.**',
      'Karaoke? Absolutely. Rap? **MC Dave** has made appearances. Quality not guaranteed, energy guaranteed.',
    ],
  },
  {
    id: 'music',
    phrases: ['music', 'favorite music', 'favourite music', 'what music', 'what music does he like', 'favorite song', 'favorite artist', 'favorite band', 'what does he listen to', 'spotify', 'playlist', 'does he play an instrument', 'instrument', 'can he sing', 'does he sing'],
    keys: ['music', 'song', 'songs', 'artist', 'band', 'spotify', 'playlist', 'instrument', 'piano', 'guitar', 'genre'],
    answers: [
      'He works best with **music on**. Genre? Ask **MC Dave** 🎤, he has range.',
      'Music is part of the creative ritual for him. **Headphones on, sketchbook open.** Ask him for a playlist, he’ll send three.',
    ],
  },
  {
    id: 'sing',
    phrases: ['sing', 'sing me a song', 'sing a song', 'can you sing', 'rap for me', 'drop a verse', 'freestyle', 'beatbox', 'spit bars', 'spit some bars', 'write me a poem', 'poem', 'haiku', 'write a haiku'],
    answers: [
      '🎤 *Yo yo yo, MC Dave on da mic, / prototypes at midnight, ships ‘em on sight, / Harvard said yes and MIT did too, / now he’s designing products, how ’bout you?* **Mic drop.**',
      'Haiku, ghost edition: *Sketchbook on the train / Figma frames at 3 a.m. / hire him, it ships.*',
    ],
  },
  {
    id: 'games',
    phrases: ['games', 'gaming', 'video games', 'does he game', 'does he play games', 'is he a gamer', 'nintendo', 'nintendo switch', 'favorite game', 'favourite game', 'zelda', 'mario', 'pokemon', 'animal crossing', 'smash', 'smash bros', 'minecraft', 'playstation', 'xbox', 'league of legends', 'valorant', 'fortnite', 'chess', 'board games'],
    keys: ['game', 'games', 'gaming', 'gamer', 'nintendo', 'zelda', 'mario', 'pokemon', 'minecraft', 'playstation', 'xbox', 'chess', 'fortnite'],
    answers: [
      'Team **Nintendo**. He’s streamed sketching and Switch sessions on Twitch. Cozy games, cute characters, great design: that’s his thing.',
      'He loves games for the **game feel**: how a jump lands, how a menu responds. Same stuff he obsesses over in motion design.',
      'He even built a **Nintendogs-style puppy for macOS**, for fun. The man cannot stop making things cute.',
    ],
  },
  {
    id: 'movies',
    phrases: ['movies', 'favorite movie', 'favourite movie', 'films', 'tv shows', 'favorite show', 'netflix', 'what does he watch', 'books', 'favorite book', 'favourite book', 'does he read', 'reading', 'what is he reading', 'podcast', 'podcasts', 'favorite podcast'],
    keys: ['movie', 'movies', 'film', 'films', 'show', 'shows', 'netflix', 'book', 'books', 'reading', 'podcast', 'podcasts', 'series'],
    answers: [
      'Anime first, then anything with **great art direction**. He judges movies by their color palette. It’s a problem.',
      'He reads around **design, psychology and philosophy**, the same pillars his design community is built on. And manga, obviously.',
    ],
  },
  {
    id: 'languages',
    phrases: ['languages', 'what languages', 'what languages does he speak', 'how many languages', 'does he speak french', 'does he speak vietnamese', 'is he bilingual', 'bilingual', 'trilingual', 'does he speak spanish', 'does he speak chinese', 'mandarin', 'does he speak english'],
    keys: ['languages', 'language', 'bilingual', 'trilingual', 'french', 'spanish', 'mandarin', 'speak', 'speaks'],
    answers: [
      '**English and French**, fluent. He’s a Montréaler, so switching mid-sentence is basically cardio.',
      'Bilingual: **English + French**. For anything beyond that, ask him in person, he loves a language conversation.',
    ],
  },
  {
    id: 'routine',
    phrases: ['morning person', 'night owl', 'is he a morning person', 'is he a night owl', 'when does he sleep', 'does he sleep', 'does david sleep', 'sleep schedule', 'daily routine', 'routine', 'typical day', 'day in the life', 'productivity', 'how does he stay productive', 'work life balance', 'burnout', 'meditation', 'does he meditate', 'how does he stay motivated', 'discipline'],
    keys: ['morning', 'owl', 'sleep', 'routine', 'productive', 'productivity', 'meditation', 'meditate', 'balance', 'burnout', 'discipline'],
    answers: [
      'Certified **night owl**. Exhibit A, his own caption: “**Sleep deprived @ MIT’s MAD workshop 🦫🛠️**”. Mornings are a work in progress.',
      'Routine: gym, meditation, a lot of making, good food. He says those habits give him **energy and inspiration boosts**. Sleep is… negotiable.',
    ],
  },
  {
    id: 'pets',
    phrases: ['pets', 'does he have pets', 'does he have a pet', 'does he have a dog', 'does he have a cat', 'dog or cat', 'cats or dogs', 'dogs or cats', 'favorite animal', 'favourite animal', 'beaver', 'capybara', 'spirit animal'],
    keys: ['pet', 'pets', 'dog', 'dogs', 'cat', 'cats', 'animal', 'animals', 'beaver', 'puppy'],
    answers: [
      'His most famous pet is **digital**: a Nintendogs-style puppy he built to live on his Mac desktop. And me, technically.',
      'Spirit animal: **beaver** 🦫. Hardworking, builds things, a little goofy. It’s literally in his photo captions.',
    ],
  },
  {
    id: 'style',
    phrases: ['fashion sense', 'his style', 'what does he wear', 'how does he dress', 'outfit', 'sunglasses', 'red sunglasses', 'does he have style', 'is he stylish', 'aesthetic', 'his aesthetic', 'favorite color', 'favourite colour', 'favorite colour', 'favourite color', 'his favorite color'],
    keys: ['wear', 'outfit', 'clothes', 'sunglasses', 'aesthetic', 'color', 'colour', 'stylish', 'drip'],
    answers: [
      'Clean, simple, a little playful. See: the **red sunglasses** in his About photos. Minimal outfit, one bold accent. Same as his design.',
      'Favorite color? This site is mostly **black, white and warm grey**, with one pop when it matters. That’s your answer.',
    ],
    weight: 0.85,
  },
  {
    id: 'fonts',
    phrases: ['favorite font', 'favourite font', 'what font', 'comic sans', 'papyrus', 'helvetica', 'serif or sans serif', 'tabs or spaces', 'dark mode', 'light mode', 'dark mode or light mode', 'mac or pc', 'mac or windows', 'iphone or android', 'android or iphone', 'apple or android', 'vim or emacs'],
    keys: ['font', 'fonts', 'typeface', 'comic', 'papyrus', 'helvetica', 'serif', 'tabs', 'windows', 'android', 'iphone', 'mac'],
    answers: [
      'Mac, iPhone, Figma. Fonts: anything with **good spacing and zero drama**. Comic Sans gets a respectful moment of silence.',
      'Dark mode or light mode? This site does **both**, section by section. Even my eyes switch color. Designer flex.',
    ],
  },
  {
    id: 'relationship',
    phrases: ['is he single', 'girlfriend', 'boyfriend', 'does he have a girlfriend', 'does he have a boyfriend', 'is he married', 'is he dating', 'is he taken', 'wife', 'husband', 'partner', 'crush', 'can i date him', 'is he cute', 'is he hot', 'is he handsome', 'hes cute', 'hes hot', 'rizz', 'does he have rizz', 'does he have kids', 'kids', 'children', 'is he gay', 'is he straight', 'sexuality'],
    keys: ['single', 'girlfriend', 'boyfriend', 'married', 'dating', 'wife', 'husband', 'crush', 'handsome', 'rizz', 'kids', 'children', 'sexuality'],
    answers: [
      'Ha. The ghost keeps that one **off the record**. 🤐 I can tell you about his **design rizz**, though: ask about Momo.',
      'Classified. But he does own **red sunglasses**, so draw your own conclusions. 😎',
      'That’s a question for David over coffee, not for the ghost. **I only gossip about Figma files.**',
    ],
  },
  {
    id: 'family',
    phrases: ['family', 'his family', 'parents', 'his parents', 'his dad', 'his father', 'his mom', 'his mother', 'siblings', 'brother', 'sister', 'does he have siblings', 'what do his parents do'],
    keys: ['family', 'parents', 'dad', 'father', 'mom', 'mother', 'sibling', 'siblings', 'brother', 'sister'],
    answers: [
      'Half Vietnamese, half Québécois, Montréal home base. Beyond that, the ghost keeps family stuff **off the record**. 🤐',
      'Family details stay with David. What I can share: he grew up **between two cultures**, and you can feel it in how he mixes ideas.',
    ],
  },
  {
    id: 'private',
    phrases: ['politics', 'political', 'who did he vote for', 'who does he vote for', 'trump', 'biden', 'religion', 'is he religious', 'does he believe in god', 'god', 'democrat', 'republican', 'liberal', 'conservative', 'left or right', 'israel', 'palestine', 'abortion', 'drugs', 'does he smoke', 'weed', 'his address', 'where exactly does he live', 'home address', 'social security', 'is he healthy', 'is he sick', 'his health'],
    keys: ['politics', 'political', 'vote', 'religion', 'religious', 'trump', 'biden', 'democrat', 'republican', 'abortion', 'weed', 'drugs', 'address'],
    answers: [
      'That one’s **off the record**. 🤐 The ghost only talks portfolio, food and anime. Ask me about his work instead?',
      'Personal stuff stays with David. **Design opinions, though? Endless.** Try me.',
    ],
  },
  {
    id: 'height',
    phrases: ['how tall is he', 'how tall is david', 'his height', 'height', 'is he tall', 'is he short', 'what does he look like', 'what does david look like', 'picture of david', 'photo of david', 'show me david'],
    keys: ['tall', 'height', 'looks', 'photo', 'photos', 'picture', 'pictures'],
    answers: [
      'Tall enough to reach the top shelf of the MIT workshop. Want visuals? The **About page photo stack** has him skiing, on the mic, and in red sunglasses.',
      'Exact specs: classified. Photos: **About page**, top of the page. He comes in many forms. 👽',
    ],
    link: ABOUT,
  },
  {
    id: 'goals',
    phrases: ['goals', 'his goals', 'future plans', 'what are his plans', 'where does he see himself', 'five years', '5 years', 'ten years', 'in 5 years', 'in five years', 'ambitions', 'his ambitions', 'long term', 'his dream', 'what is his dream', 'whats his dream', 'life goals', 'what is he working on', 'whats he working on', 'whats next', 'what is next', 'whats next for him', 'what is he building'],
    keys: ['goals', 'goal', 'plans', 'future', 'ambition', 'ambitions', 'dream', 'dreams'],
    answers: [
      'Big picture: **designing the future**, his sign-off, not mine. Human-centered systems that help people decide and change. Short term: a great product team building ambitious stuff.',
      'He wants a life where he can **design, create, travel and keep learning**. Freedom plus impact. And maybe finally fix his sleep schedule.',
      'Next: keep shipping, keep growing the channel and community, **keep getting better and building faster**. Very much a builder.',
    ],
  },
  {
    id: 'values',
    phrases: ['values', 'his values', 'what does he value', 'what does he care about', 'what matters to him', 'philosophy', 'design philosophy', 'his philosophy', 'what does he believe', 'beliefs', 'motto', 'his motto', 'life philosophy', 'what drives him', 'motivation', 'what motivates him', 'why does he design', 'purpose', 'mission', 'what does design mean to him'],
    keys: ['values', 'philosophy', 'believe', 'beliefs', 'motto', 'motivation', 'motivates', 'drives', 'mission', 'purpose'],
    answers: [
      'His design belief: **bring opposites together** and make connections where none seem possible. Comes from growing up between two cultures.',
      'Motto-ish: “**Design isn’t about finding answers, it’s about asking questions.**” Also: honesty over hype. Say what’s tested and what’s a guess.',
      'He calls his About page **“a short love letter to design.”** People, craft and community. Make things that help, explain them clearly, bring others along.',
    ],
  },
  {
    id: 'inspiration',
    phrases: ['inspiration', 'who inspires him', 'what inspires him', 'role model', 'role models', 'heroes', 'his heroes', 'favorite designer', 'favourite designer', 'design inspiration', 'favorite company', 'favourite company', 'favorite app', 'favourite app', 'favorite product', 'best designed product', 'apple', 'dieter rams', 'jony ive', 'linear', 'notion', 'idol'],
    keys: ['inspiration', 'inspired', 'inspires', 'idol', 'hero', 'heroes', 'apple', 'rams', 'notion', 'stripe'],
    answers: [
      'He’s inspired by **beautiful things, nature and other builders**: anything made with care, from a great app to a mountain view. “In my natural element 🌳” is a whole philosophy.',
      'Mentors at **McGill and MIT** shaped him a lot. Design-wise, he loves anyone who makes **complex things feel obvious**.',
    ],
  },
  {
    id: 'design-opinion',
    phrases: ['what is good design', 'good design', 'bad design', 'what makes good design', 'ux tips', 'design tips', 'design advice', 'advice for designers', 'any advice', 'give me advice', 'tips for a junior designer', 'how to become a designer', 'how do i become a designer', 'how to get into design', 'how do i get into design', 'how to get into mit', 'how do i get into mit', 'how to get into harvard', 'how do i get into harvard', 'portfolio tips', 'portfolio advice', 'how do i make a good portfolio', 'career advice', 'life advice', 'advice'],
    keys: ['advice', 'tips', 'tip'],
    answers: [
      'His take: good design **makes the complicated feel obvious** and the obvious feel delightful. And it’s honest about its limits.',
      'Portfolio advice from the guy who got into Harvard and MIT: **tell one clear story**, cut more than hurts, show your thinking, not just the pretty final.',
      'Advice he gives on his channel: **make a lot, share it raw, keep going when it gets messy**. Consistency beats talent that doesn’t ship.',
      'Life advice, from his About page: being a misfit **isn’t so bad after all**. Follow the thing you can’t stop obsessing about.',
    ],
    link: YOUTUBE,
  },
  {
    id: 'companies',
    phrases: ['startup or big company', 'startups', 'does he like startups', 'big tech', 'faang', 'google', 'meta', 'microsoft', 'amazon', 'openai', 'anthropic', 'would he work at', 'would he join', 'would he work for us', 'would he like it here', 'is he a good fit', 'culture fit', 'good fit'],
    keys: ['startup', 'startups', 'google', 'meta', 'microsoft', 'amazon', 'openai', 'anthropic', 'faang', 'fit'],
    answers: [
      'He’s happiest where things are **still being figured out**: startups or bold teams inside big companies. AI companies especially, that’s his lane.',
      'Company size matters less than the problem. Give him something **ambiguous, ambitious and human**, and he’s in. The real answer, though: ask him. ' + EMAIL + '.',
    ],
    link: MAIL,
  },
  {
    id: 'montreal',
    phrases: ['montreal or boston', 'favorite thing about montreal', 'best thing about montreal', 'quebec culture', 'habs', 'canadiens', 'maple syrup', 'is he polite', 'is montreal nice', 'should i visit montreal', 'montreal tips', 'what to do in montreal'],
    keys: ['habs', 'canadiens', 'maple', 'syrup'],
    answers: [
      'Montréal > everything, according to the ghost. **Bagels, terrasses, festivals, four real seasons.** Boston is nice. Boston doesn’t have poutine.',
      'Is he polite? He’s Canadian, so he’ll apologize to the door he walked into. **Very easy to work with.**',
    ],
  },

  /* ───────────── Odd questions ───────────── */
  {
    id: 'joke',
    phrases: ['tell me a joke', 'joke', 'jokes', 'another joke', 'make me laugh', 'say something funny', 'be funny', 'dad joke', 'pun', 'tell me a pun', 'know any jokes', 'got any jokes', 'design joke'],
    keys: ['joke', 'jokes', 'pun', 'puns'],
    answers: [
      'Why did the designer break up with the grid? **Too many boundaries.** David would never, he loves a good grid.',
      'How many designers does it take to change a lightbulb? **Does it have to be a lightbulb?** That’s David in a meeting.',
      'A ghost walks into a portfolio. Stays forever. **That’s not a joke, that’s my life.**',
      'Client: “Can you make the logo bigger?” David: “**Yes, and here’s a prototype of why we shouldn’t.**”',
    ],
  },
  {
    id: 'roast',
    phrases: ['roast david', 'roast him', 'roast me', 'roast yourself', 'say something mean about david', 'whats wrong with david', 'dirt on david', 'spill the tea', 'any tea', 'gossip', 'any gossip', 'embarrassing story', 'embarrassing', 'what is he bad at in life'],
    keys: ['roast', 'gossip', 'embarrassing'],
    answers: [
      'Roast: he has tuned one easing curve longer than some people’s whole projects. **And he’d do it again.**',
      'He captioned his own photo “**Sleep deprived @ MIT’s MAD workshop**”. The man roasts himself. I’m out of a job.',
      'He built a talking ghost to answer questions **so he wouldn’t have to**. Efficient? Lazy? Genius? Yes.',
    ],
  },
  {
    id: 'compliment-me',
    phrases: ['compliment me', 'say something nice', 'am i cool', 'cheer me up', 'im sad', 'i feel sad', 'bad day', 'having a bad day', 'motivate me', 'inspire me', 'i need motivation', 'am i smart', 'do you like me', 'rate me', 'i feel lost', 'im stressed'],
    answers: [
      'You’re reading a designer’s portfolio for fun. **That’s taste.** ✨',
      'David’s words, for you: **“It truly is an incredible time to be alive. The possibilities feel endless.”**',
      'Bad days pass. Ask me something dumb, I promise to answer **very seriously**.',
    ],
  },
  {
    id: 'aliens',
    phrases: ['aliens', 'do aliens exist', 'are aliens real', 'ufo', 'ufos', 'are you an alien', 'is david an alien', 'is he human', 'mars', 'would he go to mars', 'outer space', 'would he go to space'],
    keys: ['alien', 'aliens', 'ufo', 'ufos', 'mars', 'astronaut'],
    answers: [
      'His own photo caption: “**Bonjour! Meet a few of my many forms 👽🌀**”. So… inconclusive.',
      'Mars? He’d go if someone needed the **habitat designed properly**. Architecture degree, finally useful in space.',
    ],
  },
  {
    id: 'meaning',
    phrases: ['meaning of life', 'what is the meaning of life', 'whats the meaning of life', 'why are we here', 'what is life', 'what is love', '42', 'is life a simulation', 'are we in a simulation', 'does free will exist', 'what happens when we die'],
    answers: [
      '**42.** Or, per David: **“It truly is an incredible time to be alive.”** Pick whichever fits your mood.',
      'Big question. David’s working answer: **find the thing you can’t stop obsessing about**, then build it. The ghost’s answer: snacks.',
    ],
  },
  {
    id: 'zombie',
    phrases: ['zombie apocalypse', 'zombies', 'survive a zombie apocalypse', 'end of the world', 'apocalypse', 'desert island', 'stranded on an island', 'one thing on a desert island', 'superhero', 'if he had a superpower', 'what superpower would he have', 'which superpower'],
    keys: ['zombie', 'zombies', 'apocalypse', 'island', 'superhero'],
    answers: [
      'Zombie apocalypse plan: David sketches the shelter, prototypes the barricade, then **user-tests it on the zombies**. Survives on phở.',
      'Desert island item: **a sketchbook**. He’d design the raft, the hut, and a little ghost to talk to.',
      'Superpower: **no need for sleep**. He basically pretends he already has it.',
    ],
  },
  {
    id: 'zodiac',
    phrases: ['zodiac', 'zodiac sign', 'star sign', 'whats his sign', 'what is his sign', 'astrology', 'horoscope', 'is he a gemini', 'is he a leo', 'is he a scorpio'],
    keys: ['zodiac', 'astrology', 'horoscope'],
    answers: [
      'Sign: **builder, rising sketchbook, moon in Figma**. Real chart? Ask him, ghosts don’t do horoscopes.',
    ],
  },
  {
    id: 'weather',
    phrases: ['weather', 'whats the weather', 'what is the weather', 'is it cold', 'is it raining', 'is it hot', 'snow', 'is it snowing', 'how cold is montreal', 'winter'],
    keys: ['weather', 'cold', 'raining', 'snow', 'snowing', 'winter', 'temperature'],
    answers: [
      'Ghosts don’t feel weather. David does, he’s Canadian, so anything above −10 °C is **t-shirt weather** and anything with snow is **ski weather**.',
    ],
  },
  {
    id: 'portfolio-review',
    phrases: ['rate my portfolio', 'review my portfolio', 'critique my design', 'critique my portfolio', 'look at my portfolio', 'give me feedback', 'feedback on my work', 'can he review my portfolio', 'can david review my portfolio'],
    answers: [
      'The ghost only reviews one portfolio, sorry. 😄 But David does **portfolio advice on YouTube**, and his community does critiques.',
    ],
    link: YOUTUBE,
  },
]

/** When no topic matches. Keyed by the shape of the question. Nothing here says "I can't". */
export const FALLBACKS = {
  empty: ['Type something, I don’t bite. I’m a ghost, I barely have teeth.'],
  greeting: [
    'Hey! I’m Davebot. Ask me **who David is**, what he’s built, or something totally random.',
  ],
  favorite: [
    'Ooh, a favorites question. His all-time picks: **phở, skiing, anime and a perfectly tuned animation curve**. Ask him for the rest, he loves this stuff.',
    'His favorite? Whatever has **great craft behind it**. Same rule for food, games and apps.',
    'Tough one. He’d probably say something Montréal-flavored and change his mind three times. **Ask him in the interview**, great icebreaker.',
  ],
  hypothetical: [
    'Knowing David? He’d **sketch it first**, prototype it by midnight, and test it with real people before deciding. That’s his answer to most “what ifs”.',
    'Would he? Probably, **if there’s an interesting problem in it**. He went from pre-med to architecture to MIT, so “why not” is kind of his thing.',
    'Honestly, David’s a “why not, let’s try” guy. **Curious first, cautious second, evidence always.**',
  ],
  opinion: [
    'David’s take, as far as the ghost can tell: **it depends on who it’s for**. He’d ask five questions about the users before having an opinion. Very designer of him.',
    'He’d probably call it **underrated and overrated at the same time**, then explain why for 20 minutes. Ask him, it’s a good conversation.',
    'His general rule: **strong views, loosely held**. Show him evidence and he’ll happily change his mind.',
  ],
  likes: [
    'Knowing him? **Probably yes**, he’s open-minded about almost everything. Except bad kerning.',
    'If it’s beautiful, delicious, outdoors or anime, the answer is **yes**. Otherwise, he’s easy to convince.',
    'He’s up for almost anything once. **Twice if there’s good food involved.**',
  ],
  task: [
    'I’m a portfolio ghost, not a homework machine. 😄 But **David builds things like that for real**: ask me about Momo and Filo, his AI projects.',
    'Tempting, but I only do one job: **talk about David**. And honestly, he’d probably make you a prototype of it.',
    'If you want that built, **hire the guy who built me**: ' + EMAIL + '.',
  ],
  howto: [
    'David’s answer to most “how do I” questions: **start small, test with real people, iterate fast**. Works for apps, buildings and careers.',
    'Step one: sketch it. Step two: show someone. Step three: change it. **The David method.** It works suspiciously often.',
  ],
  yesno: [
    'Short answer: **probably yes**. Long answer: ask David, he loves explaining himself.',
    'I’d say **yes**, but I’m a biased ghost. Want the evidence? Ask me about his projects.',
    'Hmm, **it depends**, which is the most designer answer possible. Ask me about his work and I’ll be precise.',
  ],
  why: [
    'Because **curiosity**, mostly. That’s the root of almost everything David does.',
    'Good question, the kind David would ask. His usual answer: because **someone real needed it**, and the evidence pointed there.',
  ],
  wh: [
    'Off my map, but here’s what I know cold: **David designs AI products, prototypes in code, and got into Harvard and MIT**. Ask me about any of that.',
    'Not sure that’s a David question, but I like the energy. Try me on **his work, his story, or what he’s like to work with**.',
    'Ghost brain went blank on that one. 👻 Ask me **why David’s worth a call** and I’ll go off.',
  ],
  general: [
    'Interesting. That one’s outside my haunt, but I know **everything about David**: work, school, food, anime. Pick one.',
    'Hmm, my ghost brain is buffering. Try **“who is David”**, **“tell me about Momo”**, or **“fun fact”**.',
    'That went over my little ghost head. Ask me about **David’s projects or his life**, I’m great at those.',
    'Love the randomness. David would too. **Ask me what he’s like** and I’ll tell you something real.',
  ],
} satisfies Record<string, string[]>

/** Suggestions offered after each answer, tagged with the intent they lead to. */
export const TRY_ASKING: Array<{ id: string; question: string }> = [
  { id: 'about', question: 'Who is David?' },
  { id: 'why-hire', question: 'Why should I hire him?' },
  { id: 'momo', question: 'What is Momo?' },
  { id: 'filo', question: 'What is Filo?' },
  { id: 'harvard-mit', question: 'How did he get into Harvard and MIT?' },
  { id: 'fun-fact', question: 'Tell me a fun fact' },
  { id: 'food', question: 'What’s his favorite food?' },
  { id: 'anime', question: 'Does he like anime?' },
  { id: 'personality', question: 'What’s he like to work with?' },
  { id: 'youtube', question: 'Tell me about his YouTube' },
  { id: 'code', question: 'Can he code?' },
  { id: 'origin', question: 'Where is he from?' },
  { id: 'why-design', question: 'Why did he leave pre-med?' },
  { id: 'why-not', question: 'What’s his biggest weakness?' },
  { id: 'outdoors', question: 'Does he ski?' },
  { id: 'party', question: 'Does he party?' },
  { id: 'story', question: 'Is he a misfit?' },
  { id: 'joke', question: 'Tell me a joke' },
  { id: 'contact', question: 'How do I reach him?' },
]
