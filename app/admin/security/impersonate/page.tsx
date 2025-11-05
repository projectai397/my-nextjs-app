"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  UserCircle,
  Shield,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  History,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface ImpersonationSession {
  id: string;
  adminId: string;
  adminName: string;
  targetUserId: string;
  targetUserName: string;
  startedAt: string;
  expiresAt: string;
  reason: string;
  isActive: boolean;
  actions: any[];
}

export default function ImpersonatePage() {
  const [activeSession, setActiveSession] = useState<ImpersonationSession | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(30);
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'User Impersonation | Admin Panel';
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const response = await fetch('/api/impersonate/end');
      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.data);
      }
    } catch (error) {
      console.error('Failed to check active session:', error);
    }
  };

  const startImpersonation = async () => {
    if (!targetUserId || !targetUserName || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (reason.length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/impersonate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          targetUserName,
          reason,
          duration,
          mfaCode: mfaCode || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start impersonation');
      }

      setActiveSession(data.data);
      toast.success('Impersonation session started successfully');

      // Clear form
      setTargetUserId('');
      setTargetUserName('');
      setReason('');
      setMfaCode('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start impersonation');
    } finally {
      setIsLoading(false);
    }
  };

  const endImpersonation = async () => {
    if (!activeSession) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/impersonate/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end impersonation');
      }

      setActiveSession(null);
      toast.success('Impersonation session ended');
    } catch (error: any) {
      toast.error(error.message || 'Failed to end impersonation');
    } finally {
      setIsLoading(false);
    }
  };

  const getRemainingTime = () => {
    if (!activeSession) return '';
    const now = new Date();
    const expires = new Date(activeSession.expiresAt);
    const diff = expires.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minutes`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-500" />
          User Impersonation
        </h1>
        <p className="text-muted-foreground mt-2">
          Securely view the platform as a specific user for support purposes
        </p>
      </div>

      {/* Security Warning */}
      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                Security Notice
              </h3>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <li>• All impersonation sessions are logged and audited</li>
                <li>• Maximum session duration is 30 minutes</li>
                <li>• MFA verification is required</li>
                <li>• Users may be notified of impersonation</li>
                <li>• Only use for legitimate support purposes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Session */}
      {activeSession && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Eye className="h-5 w-5" />
              Active Impersonation Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Target User</p>
                <p className="font-medium">{activeSession.targetUserName}</p>
                <p className="text-xs text-muted-foreground">{activeSession.targetUserId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Started At</p>
                <p className="font-medium">
                  {new Date(activeSession.startedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Reason</p>
              <p className="text-sm">{activeSession.reason}</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Time Remaining</p>
                  <p className="text-lg font-bold text-blue-600">{getRemainingTime()}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actions Performed</p>
                <p className="text-lg font-bold">{activeSession.actions?.length || 0}</p>
              </div>
            </div>

            <Button
              onClick={endImpersonation}
              disabled={isLoading}
              variant="destructive"
              className="w-full gap-2"
            >
              <EyeOff className="h-4 w-4" />
              End Impersonation Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Start Impersonation Form */}
      {!activeSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Start Impersonation Session
            </CardTitle>
            <CardDescription>
              Enter user details and reason to begin impersonation
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target-user-id">Target User ID *</Label>
                <Input
                  id="target-user-id"
                  placeholder="USR-12345"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-user-name">Target User Name *</Label>
                <Input
                  id="target-user-name"
                  placeholder="John Doe"
                  value={targetUserName}
                  onChange={(e) => setTargetUserName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Impersonation *</Label>
              <Textarea
                id="reason"
                placeholder="Detailed reason (minimum 10 characters)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {reason.length} / 10 characters minimum
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Maximum: 30 minutes</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfa-code">MFA Code *</Label>
                <Input
                  id="mfa-code"
                  placeholder="123456"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">6-digit code from authenticator</p>
              </div>
            </div>

            <Button
              onClick={startImpersonation}
              disabled={isLoading || !targetUserId || !targetUserName || !reason || !mfaCode}
              className="w-full gap-2"
            >
              <Eye className="h-4 w-4" />
              Start Impersonation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Impersonation Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">1.</span>
              <p><strong>Legitimate Purpose:</strong> Only use impersonation for customer support, troubleshooting, or investigation purposes.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">2.</span>
              <p><strong>Documentation:</strong> Always provide a detailed reason that explains why impersonation is necessary.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">3.</span>
              <p><strong>Time Limit:</strong> Sessions automatically expire after the specified duration (max 30 minutes).</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">4.</span>
              <p><strong>Audit Trail:</strong> All actions performed during impersonation are logged and can be reviewed.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">5.</span>
              <p><strong>Privacy:</strong> Respect user privacy and only access information necessary for the support task.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">6.</span>
              <p><strong>End Session:</strong> Always end the session immediately after completing your task.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Sessions Today</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">15m</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Active</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
