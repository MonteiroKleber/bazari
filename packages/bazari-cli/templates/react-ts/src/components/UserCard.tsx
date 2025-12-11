import { SDKUser } from '@bazari.libervia.xyz/app-sdk';

interface UserCardProps {
  user: SDKUser;
  balance: string;
}

export function UserCard({ user, balance }: UserCardProps) {
  const displayName = user.displayName || user.handle || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  // Format balance for display
  const formatBalance = (bal: string) => {
    const num = parseFloat(bal);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <div className="user-card">
      <div className="user-info">
        {user.avatar ? (
          <img src={user.avatar} alt={displayName} className="user-avatar" />
        ) : (
          <div className="user-avatar">{initial}</div>
        )}
        <div className="user-details">
          <h3>{displayName}</h3>
          <span className="user-handle">@{user.handle}</span>
        </div>
      </div>
      <div className="balance-section">
        <div className="balance-label">Saldo</div>
        <div className="balance-value">
          {formatBalance(balance)}
          <span className="balance-currency">BZR</span>
        </div>
      </div>
    </div>
  );
}
