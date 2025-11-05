"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Smartphone,
  Mail,
  Key,
  Check,
  Copy,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

interface MFASetupProps {
  onComplete?: () => void;
}

const MFASetup: React.FC<MFASetupProps> = ({ onComplete }) => {
  const [activeMethod, setActiveMethod] = useState<'sms' | 'email' | 'totp'>('totp');
  const [step, setStep] = useState<'select' | 'setup' | 'verify' | 'complete'>('select');
  const [isLoading, setIsLoading] = useState(false);
  
  // Setup data
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  
  // Verification
  const [verificationCode, setVerificationCode] = useState('');

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      let contactInfo: string | undefined;
      
      if (activeMethod === 'sms') {
        if (!phoneNumber) {
          toast.error('Please enter your phone number');
          return;
        }
        contactInfo = phoneNumber;
      } else if (activeMethod === 'email') {
        if (!email) {
          toast.error('Please enter your email');
          return;
        }
        contactInfo = email;
      }

      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: activeMethod,
          contactInfo
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Setup failed');
      }

      const data = await response.json();

      if (activeMethod === 'totp' && data.data.qrCode) {
        // Generate QR code image
        const qrUrl = await QRCode.toDataURL(data.data.qrCode);
        setQrCodeUrl(qrUrl);
        setSecret(data.data.secret);
      }

      setBackupCodes(data.data.backupCodes || []);
      setStep('verify');
      toast.success('MFA setup initiated. Please verify.');
    } catch (error: any) {
      console.error('Setup Error:', error);
      toast.error(error.message || 'Failed to setup MFA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verificationCode,
          method: activeMethod,
          secret: activeMethod === 'totp' ? secret : undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }

      setStep('complete');
      toast.success('MFA enabled successfully!');
      
      if (onComplete) {
        setTimeout(onComplete, 2000);
      }
    } catch (error: any) {
      console.error('Verification Error:', error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  if (step === 'complete') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">MFA Enabled Successfully!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your account is now protected with multi-factor authentication.
              </p>
            </div>
            
            {backupCodes.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Save Your Backup Codes
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Store these codes in a safe place. You can use them to access your account if you lose your device.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                      {backupCodes.map((code, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded border">
                          {code}
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={downloadBackupCodes}
                    >
                      Download Codes
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <CardTitle>Enable Multi-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 'select' && (
          <Tabs value={activeMethod} onValueChange={(v) => setActiveMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="totp" className="gap-2">
                <Key className="h-4 w-4" />
                App
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-2">
                <Smartphone className="h-4 w-4" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="totp" className="space-y-4 mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">Authenticator App</h4>
                <p className="text-sm text-muted-foreground">
                  Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator.
                </p>
                <Badge variant="secondary">Recommended</Badge>
              </div>
              <Button onClick={handleSetup} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue with Authenticator App
              </Button>
            </TabsContent>

            <TabsContent value="sms" className="space-y-4 mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">SMS Verification</h4>
                <p className="text-sm text-muted-foreground">
                  Receive verification codes via text message.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <Button onClick={handleSetup} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue with SMS
              </Button>
            </TabsContent>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">Email Verification</h4>
                <p className="text-sm text-muted-foreground">
                  Receive verification codes via email.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button onClick={handleSetup} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue with Email
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            {activeMethod === 'totp' && qrCodeUrl && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="font-medium mb-2">Scan QR Code</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Scan this QR code with your authenticator app
                  </p>
                  <img src={qrCodeUrl} alt="QR Code" className="mx-auto border rounded-lg p-4" />
                </div>
                
                <div className="space-y-2">
                  <Label>Or enter this key manually:</Label>
                  <div className="flex gap-2">
                    <Input value={secret} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(secret)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {(activeMethod === 'sms' || activeMethod === 'email') && (
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm">
                  A verification code has been sent to your {activeMethod === 'sms' ? 'phone' : 'email'}.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('select')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={isLoading || verificationCode.length !== 6}
                className="flex-1"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify & Enable
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MFASetup;
