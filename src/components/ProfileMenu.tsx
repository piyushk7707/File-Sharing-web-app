import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './ProfileMenu.css'

interface ProfileMenuProps {
  onSignInClick: () => void
}

function ProfileMenu({ onSignInClick }: ProfileMenuProps) {
  const { user, logout, isAuthenticated } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    await logout()
    setShowMenu(false)
  }

  if (isAuthenticated) {
    return (
      <div className="profile-menu">
        <div className="profile-wrapper">
          <button
            className="profile-button"
            onClick={() => setShowMenu(!showMenu)}
            title={user?.displayName || user?.email || 'User'}
          >
            <span className="profile-name">
              {user?.displayName || user?.email?.split('@')[0] || 'Account'}
            </span>
            <span className="profile-status">Signed In</span>
          </button>

          {showMenu && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-name">{user?.displayName || 'User Account'}</div>
                <div className="dropdown-email">{user?.email}</div>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout-item" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <button className="signin-button" onClick={onSignInClick}>
      Sign In
    </button>
  )
}

export default ProfileMenu
