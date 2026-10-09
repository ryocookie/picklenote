import { useState, type FormEvent } from 'react'

interface AddPlayersProps {
  onAdd: (names: string[]) => void
  isFirstTime: boolean
}

// Commas, Japanese commas and line breaks separate names; spaces stay inside a name ("山田 太郎").
const SEPARATORS = /[,、，\n]+/

export function AddPlayers({ onAdd, isFirstTime }: AddPlayersProps) {
  const [text, setText] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const names = text.split(SEPARATORS).map((n) => n.trim()).filter(Boolean)
    if (names.length === 0) return
    onAdd(names)
    setText('')
  }

  return (
    <form className="add-players" onSubmit={submit}>
      <label className="add-players-label" htmlFor="add-players-input">
        {isFirstTime ? '参加する人の名前を入れてください' : '途中参加の人を追加'}
      </label>
      <div className="add-players-row">
        <textarea
          id="add-players-input"
          rows={isFirstTime ? 3 : 1}
          value={text}
          placeholder={isFirstTime ? 'たろう、はなこ、けん、ゆき…' : '名前'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds; Shift+Enter inserts a new line for bulk entry.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e)
          }}
        />
        <button type="submit" className="add-players-btn" disabled={!text.trim()}>
          追加
        </button>
      </div>
      <p className="add-players-hint">「、」やカンマで区切ると、まとめて追加できます</p>
    </form>
  )
}
