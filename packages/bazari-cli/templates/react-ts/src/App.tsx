import { useBazari } from './hooks/useBazari';
import { UserCard } from './components/UserCard';

function App() {
  const { sdk, user, balance, isLoading, error, isInBazari } = useBazari();

  const handleShowToast = async () => {
    if (sdk && isInBazari) {
      await sdk.ui.success('Hello from {{name}}!');
    } else {
      alert('Toast: Hello from {{name}}!');
    }
  };

  const handleShowBalance = async () => {
    if (sdk && isInBazari) {
      await sdk.ui.info(`Seu saldo: ${balance} BZR`);
    } else {
      alert(`Saldo: ${balance} BZR`);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">{{name}}</h1>
        <p className="app-description">{{description}}</p>
      </header>

      {isLoading ? (
        <div className="loading">
          <div className="loading-spinner" />
          <p>Carregando...</p>
        </div>
      ) : error ? (
        <div className="error-card">
          <div className="error-title">Erro</div>
          <div className="error-text">{error}</div>
        </div>
      ) : !isInBazari ? (
        <div className="warning-card">
          <div className="warning-icon">⚠️</div>
          <div className="warning-title">Modo de Desenvolvimento</div>
          <div className="warning-text">
            Este app deve rodar dentro do Bazari para funcionar completamente.
            <br />
            Use o Preview Mode no Developer Portal.
          </div>
        </div>
      ) : user ? (
        <>
          <UserCard user={user} balance={balance} />
          <div className="actions">
            <button className="btn btn-primary" onClick={handleShowToast}>
              Mostrar Toast
            </button>
            <button className="btn btn-secondary" onClick={handleShowBalance}>
              Ver Saldo
            </button>
          </div>
        </>
      ) : (
        <div className="not-connected">
          <div className="not-connected-icon">👤</div>
          <h3>Usuário não conectado</h3>
          <p>Conecte sua carteira para usar o app</p>
        </div>
      )}
    </div>
  );
}

export default App;
