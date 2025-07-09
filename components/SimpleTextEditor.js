import { useState, useEffect } from 'react'
import styles from '../styles/SimpleTextEditor.module.css'

export default function SimpleTextEditor({ content, setContent, isGenerating }) {
  const [wordCount, setWordCount] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0)
    setWordCount(words.length || 0)
  }, [content])

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.')
      }, 500)
      return () => clearInterval(interval)
    } else {
      setDots('')
    }
  }, [isGenerating])

  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorHeader}>
        <h3>Text Editor</h3>
        <span className={styles.wordCount}>{wordCount} words</span>
      </div>
      <textarea
        value={isGenerating ? `${content}${dots}` : content}
        onChange={(e) => !isGenerating && setContent(e.target.value)}
        className={styles.editor}
        readOnly={isGenerating}
        style={{ cursor: isGenerating ? 'wait' : 'text' }}
      />
    </div>
  )
}