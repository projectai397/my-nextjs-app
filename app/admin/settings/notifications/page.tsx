"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { notificationService, NotificationPreferences } from '@/lib/notificationService';
import { toast } from 'sonner';

export default function NotificationSettingsPage() {
  const userId = 'current-user'; // TODO: Get from auth context
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    notificationService.getPreferences(userId)
  );

  const handleSave = () => {
    notificationService.savePreferences(preferences);
    toast.success('Notification preferences saved!');
  };

  const updateChannel = (channel: keyof NotificationPreferences['channels'], value: boolean) => {
    setPreferences({
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: value,
      },
    });
  };

  const updateCategory = (category: keyof NotificationPreferences['categories'], value: boolean) => {
    setPreferences({
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: value,
      },
    });
  };

  const updateQuietHours = (field: string, value: any) => {
    setPreferences({
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [field]: value,
      },
    });
  };

  const updateFrequency = (field: string, value: any) => {
    setPreferences({
      ...preferences,
      frequency: {
        ...preferences.frequency,
        [field]: value,
      },
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage how and when you receive notifications
        </p>
      </div>

      <div className="space-y-6">
        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="in-app">In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications within the platform
                  </p>
                </div>
              </div>
              <Switch
                id="in-app"
                checked={preferences.channels.inApp}
                onCheckedChange={(value) => updateChannel('inApp', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="email">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <Switch
                id="email"
                checked={preferences.channels.email}
                onCheckedChange={(value) => updateChannel('email', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="sms">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via text message
                  </p>
                </div>
              </div>
              <Switch
                id="sms"
                checked={preferences.channels.sms}
                onCheckedChange={(value) => updateChannel('sms', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="push">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on mobile devices
                  </p>
                </div>
              </div>
              <Switch
                id="push"
                checked={preferences.channels.push}
                onCheckedChange={(value) => updateChannel('push', value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Categories</CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(preferences.categories).map(([category, enabled]) => (
              <div key={category} className="flex items-center justify-between">
                <div>
                  <Label htmlFor={category} className="capitalize">
                    {category} Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {getCategoryDescription(category)}
                  </p>
                </div>
                <Switch
                  id={category}
                  checked={enabled}
                  onCheckedChange={(value) =>
                    updateCategory(category as keyof NotificationPreferences['categories'], value)
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>
              Pause non-critical notifications during specific hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
              <Switch
                id="quiet-hours"
                checked={preferences.quietHours.enabled}
                onCheckedChange={(value) => updateQuietHours('enabled', value)}
              />
            </div>

            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={(e) => updateQuietHours('start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={(e) => updateQuietHours('end', e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Frequency */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Frequency</CardTitle>
            <CardDescription>
              Control how often you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="real-time">Real-time Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications immediately as they happen
                </p>
              </div>
              <Switch
                id="real-time"
                checked={preferences.frequency.realTime}
                onCheckedChange={(value) => updateFrequency('realTime', value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="digest">Digest Frequency</Label>
              <Select
                value={preferences.frequency.digest}
                onValueChange={(value) => updateFrequency('digest', value)}
              >
                <SelectTrigger id="digest">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Receive a summary of notifications at regular intervals
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}

function getCategoryDescription(category: string): string {
  const descriptions: { [key: string]: string } = {
    trading: 'Trade executions, order updates, and market alerts',
    account: 'Account changes, profile updates, and settings',
    security: 'Login alerts, security warnings, and suspicious activity',
    system: 'System maintenance, updates, and announcements',
    marketing: 'Promotions, new features, and product updates',
    compliance: 'KYC/AML alerts, regulatory updates, and compliance notices',
  };
  return descriptions[category] || '';
}
