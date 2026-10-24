// Chat rules shared by the UI and every backend adapter.
export const MAX_MESSAGE_LENGTH = 1000
export const COUNTER_FROM = 900 // show the character counter past this
export const QUICK_EMOJIS = ['👋', '🙏', '👍', '😊', '🎉', '🔥', '✅', '🙌']

export const shortlistNote = (jobTitle) => `You were shortlisted for ${jobTitle}. Say hi 👋`
export const previewOf = (body) => body.replace(/\s+/g, ' ').trim().slice(0, 120)
export const hasEmoji = (text) => /\p{Extended_Pictographic}/u.test(text)
