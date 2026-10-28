// Chat rules shared by the UI and every backend adapter.
export const MAX_MESSAGE_LENGTH = 1000
export const COUNTER_FROM = 900 // show the character counter past this
export const QUICK_EMOJIS = ['👋', '🙏', '👍', '😊', '🎉', '🔥', '✅', '🙌']

export const hasEmoji = (text) => /\p{Extended_Pictographic}/u.test(text)
