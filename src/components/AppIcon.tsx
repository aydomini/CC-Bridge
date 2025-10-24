import React from 'react'

const AppIcon: React.FC<{ size?: number }> = ({ size = 40 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="24" cy="24" r="22" fill="#6366f1" />

      {/* Switch icon - thicker arrows without dots */}
      <path
        d="M14 18 L34 18 M34 18 L30 14 M34 18 L30 22"
        stroke="white"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M34 30 L14 30 M14 30 L18 26 M14 30 L18 34"
        stroke="white"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export default AppIcon
