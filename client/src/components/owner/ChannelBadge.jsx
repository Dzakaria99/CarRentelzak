import React from 'react'

/** Online vs Walk-in badge — used across bookings, calendar, CRM */
const ChannelBadge = ({ channel, className = '' }) => {
  const isWalkIn = channel === 'walk_in'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded ${
        isWalkIn
          ? 'bg-amber-100 text-amber-800 border border-amber-200'
          : 'bg-sky-100 text-sky-800 border border-sky-200'
      } ${className}`}
    >
      {isWalkIn ? 'Walk-in' : 'Online'}
    </span>
  )
}

export default ChannelBadge
