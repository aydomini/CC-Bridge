import React, { useState } from 'react'

interface Props {
  src?: string
  name: string
  size?: number
}

const FaviconIcon: React.FC<Props> = ({ src, name, size = 24 }) => {
  const [error, setError] = useState(false)

  // Generate a color based on the name
  const getColor = (str: string) => {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
      '#f59e0b', '#10b981', '#14b8a6', '#06b6d4'
    ]
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // If there's an icon and it hasn't errored, show it
  if (src && !error) {
    return (
      <img
        src={src}
        alt={`${name} favicon`}
        width={size}
        height={size}
        onError={() => setError(true)}
        style={{ borderRadius: '4px', objectFit: 'contain' }}
      />
    )
  }

  // Otherwise show a generated avatar
  const initial = name.charAt(0).toUpperCase()
  const color = getColor(name)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '4px',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 600,
        fontSize: size * 0.5,
        flexShrink: 0
      }}
    >
      {initial}
    </div>
  )
}

export default FaviconIcon
