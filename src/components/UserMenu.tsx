import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './UserMenu.css'

function UserMenu() {
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    await logout()
    setShowMenu(false)
  }

  if (!user) return null

  const initials = user.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user.email?.[0].toUpperCase()

  return (
    <div className="user-menu-container">
      <button
        className="user-avatar"
        onClick={() => setShowMenu(!showMenu)}
        title={user.displayName || user.email || 'User'}
      >
        {initials}
      </button>

      {showMenu && (
        <div className="user-menu-dropdown">
          <div className="user-info">
            <div className="user-name">{user.displayName || 'User'}</div>
            <div className="user-email">{user.email}</div>
          </div>
          <hr className="menu-divider" />
          <button className="menu-item logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
