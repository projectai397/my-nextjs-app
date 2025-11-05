"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Smartphone,
  Mail,
  Key,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
  AlertTriangle
} from 'lucide-react';
import MFASetup from '@/components/auth/MFASetup';
import { toast } from 'sonner';

interface MFAStatus {
  enabled: boolean;
  method?: 'sms' | 'email' | 'totp';
  contactInfo?: string;
  trustedDevices: TrustedDevice[];
}

interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  lastUsed: Date;
  ipAddress: string;
}

export default function MFASettingsPage() {
  const [mfaStatus, setMfaStatus] = useState<MFAStatus>({
    enabled: false,
    trustedDevices: []
  });
  const [showSetup, setShowSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'Multi-Factor Authentication | Admin Panel';
    // TODO: Fetch MFA status from API
    // fetchMFAStatus();
  }, []);

  const handleDisableMFA = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return;
    }

    setIsLoading(true);
    try {
      const password = prompt('Enter your password to confirm:');
      if (!password) return;

      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        throw new Error('Failed to disable MFA');
      }

      setMfaStatus({ ...mfaStatus, enabled: false });
      toast.success('MFA has been disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable MFA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm('Remove this trusted device?')) {
      return;
    }

    try {
      // TODO: API call to remove device
      setMfaStatus({
        ...mfaStatus,
        trustedDevices: mfaStatus.trustedDevices.filter(d => d.deviceId !== deviceId)
      });
      toast.success('Device removed');
    } catch (error: any) {
      toast.error('Failed to remove device');
    }
  };

  const getMethodIcon = (method?: string) => {
    switch (method) {
      case 'totp':
        return <Key className="h-5 w-5" />;
      case 'sms':
        return <Smartphone className="h-5 w-5" />;
      case 'email':
        return <Mail className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getMethodName = (method?: string) => {
    switch (method) {
      case 'totp':
        return 'Authenticator App';
      case 'sms':
        return 'SMS';
      case 'email':
        return 'Email';
      default:
        return 'Unknown';
    }
  };

  if (showSetup) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => setShowSetup(false)}
          className="mb-4"
        >
          ← Back to Settings
        </Button>
        <MFASetup
          onComplete={() => {
            setShowSetup(false);
            setMfaStatus({ ...mfaStatus, enabled: true });
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-500" />
          Multi-Factor Authentication
        </h1>
        <p className="text-muted-foreground mt-2">
          Protect your account with an additional layer of security
        </p>
      </div>

      {/* MFA Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>MFA Status</CardTitle>
              <CardDescription>
                Current multi-factor authentication configuration
              </CardDescription>
            </div>
            {mfaStatus.enabled ? (
              <Badge variant="default" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-2">
                <XCircle className="h-4 w-4" />
                Disabled
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {mfaStatus.enabled ? (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getMethodIcon(mfaStatus.method)}
                  <div>
                    <p className="font-medium">{getMethodName(mfaStatus.method)}</p>
                    {mfaStatus.contactInfo && (
                      <p className="text-sm text-muted-foreground">{mfaStatus.contactInfo}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisableMFA}
                  disabled={isLoading}
                >
                  Disable MFA
                </Button>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Your account is protected
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      You'll need to enter a verification code when signing in from a new device.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      MFA is not enabled
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Enable MFA to add an extra layer of security to your account.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={() => setShowSetup(true)} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Enable Multi-Factor Authentication
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Trusted Devices */}
      {mfaStatus.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Trusted Devices</CardTitle>
            <CardDescription>
              Devices that don't require MFA verification
            </CardDescription>
          </CardHeader>

          <CardContent>
            {mfaStatus.trustedDevices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No trusted devices</p>
                <p className="text-xs mt-1">
                  Devices will be added here when you choose to trust them during login
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mfaStatus.trustedDevices.map((device) => (
                  <div
                    key={device.deviceId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{device.deviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        IP: {device.ipAddress}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last used: {new Date(device.lastUsed).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDevice(device.deviceId)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Security Tips</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Use an authenticator app</p>
              <p className="text-xs text-muted-foreground">
                Authenticator apps are more secure than SMS or email
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Save your backup codes</p>
              <p className="text-xs text-muted-foreground">
                Keep backup codes in a safe place in case you lose access to your device
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <div className="mt-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">3</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Review trusted devices regularly</p>
              <p className="text-xs text-muted-foreground">
                Remove devices you no longer use or recognize
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
