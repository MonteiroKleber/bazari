// CLI Authentication Page
// Handles the browser-based authentication flow for bazari CLI

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Terminal, Loader2, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isSessionActive, getAccessToken } from '@/modules/auth';
import { api } from '@/lib/api';

type AuthStatus = 'checking' | 'not_logged_in' | 'ready' | 'authorizing' | 'success' | 'error';

export default function CliAuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  const callbackUrl = searchParams.get('callback');

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      if (!callbackUrl) {
        setStatus('error');
        setError('Missing callback URL. Please use the CLI to initiate login.');
        return;
      }

      // Validate callback URL - must be localhost
      try {
        const url = new URL(callbackUrl);
        if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
          setStatus('error');
          setError('Invalid callback URL. Only localhost callbacks are allowed.');
          return;
        }
      } catch {
        setStatus('error');
        setError('Invalid callback URL format.');
        return;
      }

      if (!isSessionActive()) {
        setStatus('not_logged_in');
      } else {
        setStatus('ready');
      }
    };

    checkAuth();
  }, [callbackUrl]);

  // Countdown after success
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [status, countdown]);

  const handleLogin = () => {
    // Redirect to login page with return URL
    const returnUrl = `/developer/cli-auth?callback=${encodeURIComponent(callbackUrl || '')}`;
    navigate(`/auth/welcome?returnTo=${encodeURIComponent(returnUrl)}`);
  };

  const handleAuthorize = async () => {
    if (!callbackUrl) return;

    setStatus('authorizing');
    setError(null);

    try {
      // Get a CLI token from the API
      const response = await api.post('/developer/cli-token', {});

      if (!response.data?.token) {
        throw new Error('Failed to generate CLI token');
      }

      const token = response.data.token;

      // Redirect to callback with token
      const redirectUrl = new URL(callbackUrl);
      redirectUrl.searchParams.set('token', token);

      setStatus('success');

      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = redirectUrl.toString();
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.error || err.message || 'Failed to authorize CLI');
    }
  };

  const handleDeny = () => {
    if (!callbackUrl) return;

    const redirectUrl = new URL(callbackUrl);
    redirectUrl.searchParams.set('error', 'access_denied');
    window.location.href = redirectUrl.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Terminal className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bazari CLI</CardTitle>
          <CardDescription>
            Authorize the CLI to access your developer account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Checking status */}
          {status === 'checking' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">Checking authentication...</p>
            </div>
          )}

          {/* Not logged in */}
          {status === 'not_logged_in' && (
            <div className="space-y-4">
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  You need to log in to authorize the CLI.
                </AlertDescription>
              </Alert>

              <Button onClick={handleLogin} className="w-full" size="lg">
                Log in with Wallet
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                After logging in, you'll be redirected back here to authorize the CLI.
              </p>
            </div>
          )}

          {/* Ready to authorize */}
          {status === 'ready' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">The CLI is requesting access to:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    View your developer profile
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Create and manage apps
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Submit apps for review
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Upload app bundles
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDeny} className="flex-1">
                  Deny
                </Button>
                <Button onClick={handleAuthorize} className="flex-1">
                  Authorize CLI
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                This will create a long-lived token for the CLI. You can revoke it anytime from your settings.
              </p>
            </div>
          )}

          {/* Authorizing */}
          {status === 'authorizing' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Authorizing...</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="mt-4 font-medium">CLI Authorized!</p>
              <p className="text-sm text-muted-foreground">
                Redirecting back to CLI...
              </p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="mt-4 font-medium text-destructive">Authorization Failed</p>
              <p className="text-sm text-center text-muted-foreground mt-2">
                {error}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.close()}
              >
                Close Window
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
