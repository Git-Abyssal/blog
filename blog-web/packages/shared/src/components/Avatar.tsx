import React from 'react'

interface AvatarProps {
  size?: 'sm' | 'md' | 'lg'
  fallbackName?: string
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
}

const Avatar: React.FC<AvatarProps> = ({ size = 'md', fallbackName = '访客' }) => {
  const initial = fallbackName.trim().charAt(0).toUpperCase() || '访'

  return (
    <span
      aria-hidden
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300`}
    >
      {initial}
    </span>
  )
}

export default Avatar
