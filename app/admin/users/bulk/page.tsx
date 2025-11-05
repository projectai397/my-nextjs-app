"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Download,
  Users,
  Mail,
  MessageSquare,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface BulkOperation {
  id: string;
  type: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  failureCount: number;
  errors: any[];
}

export default function BulkOperationsPage() {
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [csvContent, setCSVContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [currentOperation, setCurrentOperation] = useState<BulkOperation | null>(null);

  // Bulk update states
  const [selectedUserIds, setSelectedUserIds] = useState('');
  const [newStatus, setNewStatus] = useState('active');

  // Email campaign states
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // SMS campaign states
  const [smsMessage, setSMSMessage] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCSVFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCSVContent(content);
      };
      reader.readAsText(file);
    }
  };

  const validateCSV = async () => {
    if (!csvContent) {
      toast.error('Please upload a CSV file first');
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch('/api/bulk/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          validateOnly: true
        })
      });

      if (!response.ok) throw new Error('Validation failed');

      const data = await response.json();
      setValidationResult(data.data);

      if (data.data.valid) {
        toast.success(`Validation passed! ${data.data.validRows} valid rows found.`);
      } else {
        toast.error(`Validation failed with ${data.data.errors.length} errors`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to validate CSV');
    } finally {
      setIsValidating(false);
    }
  };

  const importUsers = async () => {
    if (!csvContent || !validationResult?.valid) {
      toast.error('Please validate CSV first');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/bulk/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          validateOnly: false
        })
      });

      if (!response.ok) throw new Error('Import failed');

      const data = await response.json();
      setCurrentOperation(data.data);
      toast.success('Import started successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to import users');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = `email,name,role,phone,country,initialBalance,leverage,status
user@example.com,John Doe,trader,+1234567890,US,10000,5,active`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const bulkUpdateStatus = async () => {
    const userIds = selectedUserIds.split('\n').map(id => id.trim()).filter(Boolean);
    
    if (userIds.length === 0) {
      toast.error('Please enter user IDs');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/bulk/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'update_status',
          data: { userIds, status: newStatus }
        })
      });

      if (!response.ok) throw new Error('Bulk update failed');

      const data = await response.json();
      setCurrentOperation(data.data);
      toast.success(`Status update started for ${userIds.length} users`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update users');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendBulkEmail = async () => {
    const userIds = selectedUserIds.split('\n').map(id => id.trim()).filter(Boolean);
    
    if (userIds.length === 0 || !emailSubject || !emailBody) {
      toast.error('Please fill all fields');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/bulk/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'send_email',
          data: { userIds, subject: emailSubject, body: emailBody }
        })
      });

      if (!response.ok) throw new Error('Bulk email failed');

      const data = await response.json();
      setCurrentOperation(data.data);
      toast.success(`Email campaign started for ${userIds.length} users`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send emails');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendBulkSMS = async () => {
    const userIds = selectedUserIds.split('\n').map(id => id.trim()).filter(Boolean);
    
    if (userIds.length === 0 || !smsMessage) {
      toast.error('Please fill all fields');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/bulk/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'send_sms',
          data: { userIds, message: smsMessage }
        })
      });

      if (!response.ok) throw new Error('Bulk SMS failed');

      const data = await response.json();
      setCurrentOperation(data.data);
      toast.success(`SMS campaign started for ${userIds.length} users`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send SMS');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-500" />
          Bulk Operations
        </h1>
        <p className="text-muted-foreground mt-2">
          Perform bulk actions on multiple users simultaneously
        </p>
      </div>

      {/* Current Operation Status */}
      {currentOperation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Operation in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{currentOperation.type}</p>
              </div>
              <Badge>{currentOperation.status}</Badge>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{currentOperation.processedRecords} / {currentOperation.totalRecords}</span>
              </div>
              <Progress 
                value={(currentOperation.processedRecords / currentOperation.totalRecords) * 100} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Success</p>
                  <p className="text-lg font-bold">{currentOperation.successCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-lg font-bold">{currentOperation.failureCount}</p>
                </div>
              </div>
            </div>

            {currentOperation.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Errors ({currentOperation.errors.length})
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {currentOperation.errors.slice(0, 5).map((error, idx) => (
                    <p key={idx} className="text-xs text-red-700 dark:text-red-300">
                      Row {error.row}: {error.error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk Operations Tabs */}
      <Tabs defaultValue="import">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import">Import Users</TabsTrigger>
          <TabsTrigger value="update">Update Status</TabsTrigger>
          <TabsTrigger value="email">Email Campaign</TabsTrigger>
          <TabsTrigger value="sms">SMS Campaign</TabsTrigger>
        </TabsList>

        {/* Import Users Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Users from CSV
              </CardTitle>
              <CardDescription>
                Upload a CSV file to create multiple users at once
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="csv-file">Upload CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </div>

              {csvFile && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm font-medium">File: {csvFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Size: {(csvFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}

              {validationResult && (
                <div className={`p-4 rounded-lg ${
                  validationResult.valid 
                    ? 'bg-green-50 dark:bg-green-950' 
                    : 'bg-red-50 dark:bg-red-950'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {validationResult.valid ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <p className="font-medium">
                      {validationResult.valid ? 'Validation Passed' : 'Validation Failed'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Rows</p>
                      <p className="font-bold">{validationResult.totalRows}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valid</p>
                      <p className="font-bold text-green-600">{validationResult.validRows}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Invalid</p>
                      <p className="font-bold text-red-600">{validationResult.invalidRows}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={validateCSV}
                  disabled={!csvFile || isValidating}
                  variant="outline"
                  className="gap-2"
                >
                  {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Validate CSV
                </Button>
                <Button
                  onClick={importUsers}
                  disabled={!validationResult?.valid || isProcessing}
                  className="gap-2"
                >
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import Users
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Update Status Tab */}
        <TabsContent value="update" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Update User Status</CardTitle>
              <CardDescription>
                Update status for multiple users at once
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-ids">User IDs (one per line)</Label>
                <Textarea
                  id="user-ids"
                  placeholder="USR-001&#10;USR-002&#10;USR-003"
                  value={selectedUserIds}
                  onChange={(e) => setSelectedUserIds(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-status">New Status</Label>
                <select
                  id="new-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <Button
                onClick={bulkUpdateStatus}
                disabled={isProcessing}
                className="w-full gap-2"
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Status
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Campaign Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Bulk Email Campaign
              </CardTitle>
              <CardDescription>
                Send emails to multiple users at once
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-users">User IDs (one per line)</Label>
                <Textarea
                  id="email-users"
                  placeholder="USR-001&#10;USR-002"
                  value={selectedUserIds}
                  onChange={(e) => setSelectedUserIds(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  placeholder="Your email subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-body">Message</Label>
                <Textarea
                  id="email-body"
                  placeholder="Your email message"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={6}
                />
              </div>

              <Button
                onClick={sendBulkEmail}
                disabled={isProcessing}
                className="w-full gap-2"
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Emails
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Campaign Tab */}
        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Bulk SMS Campaign
              </CardTitle>
              <CardDescription>
                Send SMS messages to multiple users at once
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sms-users">User IDs (one per line)</Label>
                <Textarea
                  id="sms-users"
                  placeholder="USR-001&#10;USR-002"
                  value={selectedUserIds}
                  onChange={(e) => setSelectedUserIds(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sms-message">Message (max 160 characters)</Label>
                <Textarea
                  id="sms-message"
                  placeholder="Your SMS message"
                  value={smsMessage}
                  onChange={(e) => setSMSMessage(e.target.value)}
                  maxLength={160}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {smsMessage.length} / 160 characters
                </p>
              </div>

              <Button
                onClick={sendBulkSMS}
                disabled={isProcessing}
                className="w-full gap-2"
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                Send SMS
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
