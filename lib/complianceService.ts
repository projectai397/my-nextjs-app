export interface ComplianceCheck {
  id: string;
  userId: string;
  type: 'kyc' | 'aml' | 'transaction' | 'behavior' | 'document';
  status: 'pending' | 'approved' | 'rejected' | 'review_required';
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: ComplianceFinding[];
  aiAnalysis: string;
  recommendations: string[];
  checkedAt: Date;
  checkedBy: 'ai' | 'manual' | 'hybrid';
  reviewedBy?: string;
  reviewedAt?: Date;
  metadata?: {
    [key: string]: any;
  };
}

export interface ComplianceFinding {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  recommendation: string;
  confidence: number; // 0-100
}

export interface KYCData {
  userId: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  documentType: 'passport' | 'drivers_license' | 'national_id';
  documentNumber: string;
  documentExpiry: string;
  documentImages: string[];
  selfieImage?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
}

export interface AMLAlert {
  id: string;
  userId: string;
  alertType: 'suspicious_transaction' | 'high_risk_country' | 'pep' | 'sanctions' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: string;
  triggeredAt: Date;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export class ComplianceService {
  private storageKey = 'compliance-checks';
  private kycStorageKey = 'kyc-data';
  private amlStorageKey = 'aml-alerts';

  // AI-powered KYC verification
  async verifyKYC(kycData: KYCData): Promise<ComplianceCheck> {
    const findings: ComplianceFinding[] = [];
    let riskScore = 0;

    // Document verification
    const docVerification = this.verifyDocument(kycData);
    findings.push(...docVerification.findings);
    riskScore += docVerification.risk;

    // Age verification
    const ageVerification = this.verifyAge(kycData.dateOfBirth);
    findings.push(...ageVerification.findings);
    riskScore += ageVerification.risk;

    // Address verification
    const addressVerification = this.verifyAddress(kycData.address);
    findings.push(...addressVerification.findings);
    riskScore += addressVerification.risk;

    // Sanctions screening
    const sanctionsCheck = await this.checkSanctions(kycData.fullName, kycData.nationality);
    findings.push(...sanctionsCheck.findings);
    riskScore += sanctionsCheck.risk;

    // Calculate final risk score
    riskScore = Math.min(100, riskScore);
    const riskLevel = this.calculateRiskLevel(riskScore);

    // AI analysis
    const aiAnalysis = await this.generateAIAnalysis('kyc', findings, kycData);

    // Generate recommendations
    const recommendations = this.generateRecommendations(findings);

    const check: ComplianceCheck = {
      id: this.generateId(),
      userId: kycData.userId,
      type: 'kyc',
      status: riskScore > 70 ? 'review_required' : riskScore > 40 ? 'pending' : 'approved',
      riskScore,
      riskLevel,
      findings,
      aiAnalysis,
      recommendations,
      checkedAt: new Date(),
      checkedBy: 'ai',
    };

    this.saveCheck(check);
    return check;
  }

  // AI-powered AML monitoring
  async monitorAML(userId: string, transactions: any[]): Promise<ComplianceCheck> {
    const findings: ComplianceFinding[] = [];
    let riskScore = 0;

    // Transaction pattern analysis
    const patternAnalysis = this.analyzeTransactionPatterns(transactions);
    findings.push(...patternAnalysis.findings);
    riskScore += patternAnalysis.risk;

    // Volume analysis
    const volumeAnalysis = this.analyzeTransactionVolume(transactions);
    findings.push(...volumeAnalysis.findings);
    riskScore += volumeAnalysis.risk;

    // Velocity analysis
    const velocityAnalysis = this.analyzeTransactionVelocity(transactions);
    findings.push(...velocityAnalysis.findings);
    riskScore += velocityAnalysis.risk;

    // Geographic risk
    const geoAnalysis = this.analyzeGeographicRisk(transactions);
    findings.push(...geoAnalysis.findings);
    riskScore += geoAnalysis.risk;

    // Structuring detection
    const structuringCheck = this.detectStructuring(transactions);
    findings.push(...structuringCheck.findings);
    riskScore += structuringCheck.risk;

    // Calculate final risk score
    riskScore = Math.min(100, riskScore);
    const riskLevel = this.calculateRiskLevel(riskScore);

    // AI analysis
    const aiAnalysis = await this.generateAIAnalysis('aml', findings, { userId, transactions });

    // Generate recommendations
    const recommendations = this.generateRecommendations(findings);

    const check: ComplianceCheck = {
      id: this.generateId(),
      userId,
      type: 'aml',
      status: riskScore > 70 ? 'review_required' : riskScore > 40 ? 'pending' : 'approved',
      riskScore,
      riskLevel,
      findings,
      aiAnalysis,
      recommendations,
      checkedAt: new Date(),
      checkedBy: 'ai',
    };

    this.saveCheck(check);

    // Create AML alert if high risk
    if (riskScore > 60) {
      this.createAMLAlert(userId, findings, riskScore);
    }

    return check;
  }

  // Document verification
  private verifyDocument(kycData: KYCData): { findings: ComplianceFinding[]; risk: number } {
    const findings: ComplianceFinding[] = [];
    let risk = 0;

    // Check document expiry
    const expiryDate = new Date(kycData.documentExpiry);
    const now = new Date();
    
    if (expiryDate < now) {
      findings.push({
        id: this.generateId(),
        category: 'Document Verification',
        severity: 'high',
        description: 'Document has expired',
        evidence: [`Expiry date: ${kycData.documentExpiry}`],
        recommendation: 'Request updated document',
        confidence: 100,
      });
      risk += 30;
    } else if ((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) < 30) {
      findings.push({
        id: this.generateId(),
        category: 'Document Verification',
        severity: 'medium',
        description: 'Document expires soon',
        evidence: [`Expiry date: ${kycData.documentExpiry}`],
        recommendation: 'Monitor and request renewal',
        confidence: 100,
      });
      risk += 10;
    }

    // Check document images
    if (!kycData.documentImages || kycData.documentImages.length === 0) {
      findings.push({
        id: this.generateId(),
        category: 'Document Verification',
        severity: 'critical',
        description: 'No document images provided',
        evidence: ['Missing document images'],
        recommendation: 'Request document upload',
        confidence: 100,
      });
      risk += 50;
    }

    return { findings, risk };
  }

  // Age verification
  private verifyAge(dateOfBirth: string): { findings: ComplianceFinding[]; risk: number } {
    const findings: ComplianceFinding[] = [];
    let risk = 0;

    const dob = new Date(dateOfBirth);
    const now = new Date();
    const age = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

    if (age < 18) {
      findings.push({
        id: this.generateId(),
        category: 'Age Verification',
        severity: 'critical',
        description: 'User is underage',
        evidence: [`Age: ${age} years`],
        recommendation: 'Reject application',
        confidence: 100,
      });
      risk += 100;
    } else if (age < 21) {
      findings.push({
        id: this.generateId(),
        category: 'Age Verification',
        severity: 'medium',
        description: 'User is below recommended age',
        evidence: [`Age: ${age} years`],
        recommendation: 'Additional verification required',
        confidence: 100,
      });
      risk += 20;
    }

    return { findings, risk };
  }

  // Address verification
  private verifyAddress(address: string): { findings: ComplianceFinding[]; risk: number } {
    const findings: ComplianceFinding[] = [];
    let risk = 0;

    if (!address || address.length < 10) {
      findings.push({
        id: this.generateId(),
        category: 'Address Verification',
        severity: 'high',
        description: 'Incomplete address provided',
        evidence: ['Address too short or missing'],
        recommendation: 'Request complete address',
        confidence: 90,
      });
      risk += 25;
    }

    return { findings, risk };
  }

  // Sanctions screening
  private async checkSanctions(name: string, nationality: string): Promise<{ findings: ComplianceFinding[]; risk: number }> {
    const findings: ComplianceFinding[] = [];
    let risk = 0;

    // High-risk countries (example list)
    const highRiskCountries = ['North Korea', 'Iran', 'Syria', 'Cuba'];
    
    if (highRiskCountries.includes(nationality)) {
      findings.push({
        id: this.generateId(),
        category: 'Sanctions Screening',
        severity: 'critical',
        description: 'User from high-risk country',
        evidence: [`Nationality: ${nationality}`],
        recommendation: 'Enhanced due diligence required',
        confidence: 100,
      });
      risk += 80;
    }

    return { findings, risk };
  }

  // Transaction pattern analysis
  private analyzeTransactionPatterns(transactions: any[]): { findings: ComplianceFinding[]; risk: number } {
    const findings: ComplianceFinding[] = [];
    let risk = 0;

    if (transactions.length === 0) return { findings, risk };

    // Check for round number transactions (potential structuring)
    const roundNumbers = transactions.filter(t => t.amount % 1000 === 0);
    if (roundNumbers.length / transactions.length > 0.7) {
      findings.push({
        id: this.generateId(),
        category: 'Transaction Patterns',
        severity: 'medium',
        description: 'High frequency of round number transactions',
        evidence: [`${roundNumbers.length} of ${transactions.length} transactions are round numbers`],
        recommendation: 'Investigate for potential structuring',
        confidence: 75,
      });
      risk += 15;
    }

    return { findings, risk };
  }

  // Transaction volume analysis
  private analyzeTransactionVolume(transactions: any[]): { findings: ComplianceFinding[]; risk: number } {
    const findings: ComplianceFinding[] = [];
    let risk = 0;

    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    if (totalVolume > 1000000) {
      findings.push({
        id: this.generateId(),
        category: 'Transaction Volume',
        severity: 'high',
        description: 'Unusually high transaction volume',
        evidence: [`Total volume: $${totalVolume.toLocaleString()}`],
        recommendation: 'Enhanced monitoring required',
        confidence: 85,
      });
      risk += 25;
    }

    return { findings, risk };
  }

  // Transaction velocity analysis
  private analyzeTransactionVelocity(transactions: any[]): { findings: ComplianceFinding[]; risk: number } {
    const findings: ComplianceFinding[] = [];
    let risk = 0;

    if (transactions.length > 50) {
      findings.push({
        id: this.generateId(),
        category: 'Transaction Velocity',
        severity: 'medium',
        description: 'High transaction frequency',
        evidence: [`${transactions.length} transactions in period`],
        recommendation: 'Monitor for unusual activity',
        confidence: 70,
      });
      risk += 15;
    }

    return { findings, risk };
  }

  // Geographic risk analysis
  private analyzeGeographicRisk(transactions: any[]): { findings: ComplianceFinding[]; risk: number } {
    const findings: ComplianceFinding[] = [];
    let risk = 0;

    // This would integrate with actual geolocation data
    // For now, using mock data
    
    return { findings, risk };
  }

  // Structuring detection
  private detectStructuring(transactions: any[]): { findings: ComplianceFinding[]; risk: number } {
    const findings: ComplianceFinding[] = [];
    let risk = 0;

    // Check for transactions just below reporting threshold ($10,000)
    const nearThreshold = transactions.filter(t => t.amount >= 9000 && t.amount < 10000);
    
    if (nearThreshold.length >= 3) {
      findings.push({
        id: this.generateId(),
        category: 'Structuring Detection',
        severity: 'critical',
        description: 'Potential structuring detected',
        evidence: [`${nearThreshold.length} transactions just below $10,000 threshold`],
        recommendation: 'File SAR (Suspicious Activity Report)',
        confidence: 90,
      });
      risk += 50;
    }

    return { findings, risk };
  }

  // Calculate risk level
  private calculateRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  // Generate AI analysis
  private async generateAIAnalysis(type: string, findings: ComplianceFinding[], data: any): Promise<string> {
    // This would call OpenAI API for detailed analysis
    // For now, generating based on findings
    
    if (findings.length === 0) {
      return `No compliance issues detected. User profile appears normal with low risk indicators.`;
    }

    const criticalFindings = findings.filter(f => f.severity === 'critical');
    const highFindings = findings.filter(f => f.severity === 'high');
    
    if (criticalFindings.length > 0) {
      return `Critical compliance issues detected requiring immediate attention. ${criticalFindings.length} critical finding(s) identified including ${criticalFindings[0].description}. Recommend manual review and enhanced due diligence.`;
    }

    if (highFindings.length > 0) {
      return `High-risk indicators detected. ${highFindings.length} high-severity finding(s) require review. Primary concern: ${highFindings[0].description}. Additional monitoring recommended.`;
    }

    return `Moderate risk profile with ${findings.length} finding(s). No immediate action required but continued monitoring advised.`;
  }

  // Generate recommendations
  private generateRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations = new Set<string>();
    
    findings.forEach(f => {
      recommendations.add(f.recommendation);
    });

    return Array.from(recommendations);
  }

  // Create AML alert
  private createAMLAlert(userId: string, findings: ComplianceFinding[], riskScore: number): void {
    const alert: AMLAlert = {
      id: this.generateId(),
      userId,
      alertType: 'suspicious_transaction',
      severity: riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : 'medium',
      description: `Suspicious activity detected with risk score ${riskScore}`,
      details: findings.map(f => f.description).join('; '),
      triggeredAt: new Date(),
      status: 'open',
    };

    this.saveAMLAlert(alert);
  }

  // Storage methods
  private saveCheck(check: ComplianceCheck): void {
    if (typeof window === 'undefined') return;
    
    const checks = this.getAllChecks();
    checks.push(check);
    localStorage.setItem(this.storageKey, JSON.stringify(checks.slice(-100))); // Keep last 100
  }

  private getAllChecks(): ComplianceCheck[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];

    try {
      return JSON.parse(stored).map((c: any) => ({
        ...c,
        checkedAt: new Date(c.checkedAt),
        reviewedAt: c.reviewedAt ? new Date(c.reviewedAt) : undefined,
      }));
    } catch {
      return [];
    }
  }

  private saveAMLAlert(alert: AMLAlert): void {
    if (typeof window === 'undefined') return;
    
    const alerts = this.getAllAMLAlerts();
    alerts.push(alert);
    localStorage.setItem(this.amlStorageKey, JSON.stringify(alerts.slice(-100))); // Keep last 100
  }

  private getAllAMLAlerts(): AMLAlert[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(this.amlStorageKey);
    if (!stored) return [];

    try {
      return JSON.parse(stored).map((a: any) => ({
        ...a,
        triggeredAt: new Date(a.triggeredAt),
        resolvedAt: a.resolvedAt ? new Date(a.resolvedAt) : undefined,
      }));
    } catch {
      return [];
    }
  }

  private generateId(): string {
    return `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for retrieving data
  getChecksByUser(userId: string): ComplianceCheck[] {
    return this.getAllChecks().filter(c => c.userId === userId);
  }

  getAMLAlertsByUser(userId: string): AMLAlert[] {
    return this.getAllAMLAlerts().filter(a => a.userId === userId);
  }

  getOpenAMLAlerts(): AMLAlert[] {
    return this.getAllAMLAlerts().filter(a => a.status === 'open');
  }
}

export const complianceService = new ComplianceService();
