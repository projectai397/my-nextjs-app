# 🔐 Platform Credentials & User Roles

**Platform:** AI-Powered Trading Platform  
**Date Created:** November 5, 2025  
**Status:** Active  
**Security Level:** Production

---

## 📋 Table of Contents

1. [User Roles Overview](#user-roles-overview)
2. [Admin Accounts](#admin-accounts)
3. [Manager Accounts](#manager-accounts)
4. [User Accounts](#user-accounts)
5. [Demo Accounts](#demo-accounts)
6. [API Credentials](#api-credentials)
7. [Security Guidelines](#security-guidelines)
8. [Password Policy](#password-policy)

---

## 👥 User Roles Overview

### Role Hierarchy

```
Super Admin (Level 5)
    ├── Admin (Level 4)
    │   ├── Manager (Level 3)
    │   │   ├── Trader (Level 2)
    │   │   └── User (Level 1)
```

### Role Permissions Matrix

| Feature | Super Admin | Admin | Manager | Trader | User |
|---------|-------------|-------|---------|--------|------|
| **Dashboard Access** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AI Co-Pilot** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **User Management** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Bulk Operations** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **User Impersonation** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Compliance Assistant** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **MFA Management** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Payment Management** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Reports & Analytics** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Trading** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Withdrawal Requests** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **System Settings** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Flexible Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Notifications** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 👑 Admin Accounts

### Master Account (Production Backend)

**Role:** Master Administrator (Production)  
**User ID:** `master`  
**Email:** `master@500x.exchange`  
**Password:** `5550005550`  
**Access Level:** 5 (Highest)  
**Backend:** api.500x.exchange  
**Socket:** soc.500x.exchange  
**MFA:** Disabled

**Permissions:**
- Full production system access
- Real backend integration
- All administrative functions
- System configuration
- Security settings

---

### Super Admin Account

**Role:** Super Administrator (Full Access)  
**User ID:** `superadmin`  
**Email:** `superadmin@tradingplatform.com`  
**Password:** `SuperAdmin@2025!`  
**Access Level:** 5 (Highest)  
**MFA:** Enabled (Backup codes provided below)

**Permissions:**
- Full system access
- User management (all levels)
- System configuration
- Security settings
- Financial operations
- Compliance management
- AI features access
- User impersonation
- Audit log access

**Backup Codes (MFA):**
```
1. XKCD-4829-PLMN
2. QWER-7364-TYUI
3. ASDF-9182-GHJK
4. ZXCV-5647-BNMQ
5. LKJH-3928-POIU
6. MNBV-8273-CXZA
7. QAZW-4756-SXED
8. RFVT-9384-GBHY
9. PLOK-2847-IJUH
10. YTRE-6529-WSAQ
```

---

### Admin Account #1

**Role:** Administrator  
**User ID:** `admin01`  
**Email:** `admin01@tradingplatform.com`  
**Password:** `Admin01@2025!`  
**Access Level:** 4  
**MFA:** Enabled

**Permissions:**
- Dashboard access
- User management (Manager and below)
- Payment management
- Reports & analytics
- AI features
- Compliance assistant
- User impersonation (Manager and below)

---

### Admin Account #2

**Role:** Administrator  
**User ID:** `admin02`  
**Email:** `admin02@tradingplatform.com`  
**Password:** `Admin02@2025!`  
**Access Level:** 4  
**MFA:** Enabled

**Permissions:** Same as Admin #1

---

### Admin Account #3 (Support Admin)

**Role:** Support Administrator  
**User ID:** `support_admin`  
**Email:** `support@tradingplatform.com`  
**Password:** `Support@2025!`  
**Access Level:** 4  
**MFA:** Enabled

**Permissions:**
- Customer support focus
- User impersonation
- Ticket management
- User assistance
- Limited financial access

---

## 👔 Manager Accounts

### Manager Account #1

**Role:** Operations Manager  
**User ID:** `manager01`  
**Email:** `manager01@tradingplatform.com`  
**Password:** `Manager01@2025!`  
**Access Level:** 3  
**MFA:** Enabled

**Permissions:**
- User management (Trader and User levels)
- Payment approval
- Reports viewing
- AI features (limited)
- Compliance monitoring
- Bulk operations

---

### Manager Account #2

**Role:** Trading Manager  
**User ID:** `manager02`  
**Email:** `manager02@tradingplatform.com`  
**Password:** `Manager02@2025!`  
**Access Level:** 3  
**MFA:** Enabled

**Permissions:**
- Trading oversight
- User trading limits
- Risk management
- Reports viewing
- Market monitoring

---

### Manager Account #3

**Role:** Compliance Manager  
**User ID:** `compliance_manager`  
**Email:** `compliance@tradingplatform.com`  
**Password:** `Compliance@2025!`  
**Access Level:** 3  
**MFA:** Enabled

**Permissions:**
- Compliance assistant (full access)
- KYC/AML monitoring
- Audit log viewing
- Risk assessment
- Regulatory reporting

---

## 💼 Trader Accounts

### Trader Account #1

**Role:** Professional Trader  
**User ID:** `trader01`  
**Email:** `trader01@tradingplatform.com`  
**Password:** `Trader01@2025!`  
**Access Level:** 2  
**MFA:** Optional

**Permissions:**
- Trading (all instruments)
- Portfolio management
- Reports viewing (own data)
- Withdrawal requests
- Flexible dashboard

---

### Trader Account #2

**Role:** Professional Trader  
**User ID:** `trader02`  
**Email:** `trader02@tradingplatform.com`  
**Password:** `Trader02@2025!`  
**Access Level:** 2  
**MFA:** Optional

**Permissions:** Same as Trader #1

---

## 👤 User Accounts

### User Account #1

**Role:** Regular User  
**User ID:** `user01`  
**Email:** `user01@tradingplatform.com`  
**Password:** `User01@2025!`  
**Access Level:** 1  
**MFA:** Optional

**Permissions:**
- Trading (basic instruments)
- Portfolio viewing
- Withdrawal requests
- Basic dashboard
- Notifications

---

### User Account #2

**Role:** Regular User  
**User ID:** `user02`  
**Email:** `user02@tradingplatform.com`  
**Password:** `User02@2025!`  
**Access Level:** 1  
**MFA:** Optional

**Permissions:** Same as User #1

---

### User Account #3

**Role:** Regular User  
**User ID:** `user03`  
**Email:** `user03@tradingplatform.com`  
**Password:** `User03@2025!`  
**Access Level:** 1  
**MFA:** Optional

**Permissions:** Same as User #1

---

## 🎮 Demo Accounts

### Demo Admin Account

**Role:** Demo Administrator (Testing Only)  
**User ID:** `demo_admin`  
**Email:** `demo@tradingplatform.com`  
**Password:** `Demo@2025!`  
**Access Level:** 4  
**MFA:** Disabled  
**Expiry:** 30 days

**Purpose:** Testing and demonstration

---

### Demo User Account

**Role:** Demo User (Testing Only)  
**User ID:** `demo_user`  
**Email:** `demouser@tradingplatform.com`  
**Password:** `DemoUser@2025!`  
**Access Level:** 1  
**MFA:** Disabled  
**Expiry:** 30 days

**Purpose:** User experience testing

---

## 🔑 API Credentials

### OpenAI API

**Service:** OpenAI (AI Features)  
**Environment Variable:** `OPENAI_API_KEY`  
**Key:** `[Already configured in environment]`  
**Usage:** AI Co-Pilot, Compliance Assistant, User Segmentation  
**Rate Limit:** As per OpenAI plan

---

### Email Service (Future)

**Service:** SendGrid (Email Notifications)  
**Environment Variable:** `SENDGRID_API_KEY`  
**Status:** Ready for configuration  
**Usage:** Email OTP, Notifications

---

### SMS Service (Future)

**Service:** Twilio (SMS Notifications)  
**Environment Variable:** `TWILIO_API_KEY`  
**Status:** Ready for configuration  
**Usage:** SMS OTP, Alerts

---

## 🔒 Security Guidelines

### For Administrators

1. **NEVER share credentials** with anyone
2. **Always use MFA** for admin accounts
3. **Change passwords** every 90 days
4. **Review audit logs** regularly
5. **Use secure networks** only
6. **Log out** after each session
7. **Report suspicious activity** immediately

### For Users

1. **Enable MFA** for enhanced security
2. **Use strong passwords** (12+ characters)
3. **Don't reuse passwords** from other sites
4. **Keep backup codes** in a safe place
5. **Verify email addresses** for communications
6. **Report phishing attempts**

### Session Security

- **Session Timeout:** 30 minutes of inactivity
- **Concurrent Sessions:** 1 per user (configurable)
- **IP Tracking:** Enabled
- **Device Fingerprinting:** Enabled
- **Failed Login Attempts:** 5 max (then 15-min lockout)

---

## 🛡️ Password Policy

### Requirements

- **Minimum Length:** 12 characters
- **Must Include:**
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (!@#$%^&*)
- **Cannot Include:**
  - Username or email
  - Common words or patterns
  - Previously used passwords (last 5)

### Password Expiry

- **Super Admin:** 60 days
- **Admin:** 90 days
- **Manager:** 90 days
- **Trader:** 180 days
- **User:** 180 days

### Password Reset

1. Click "Forgot Password" on login page
2. Enter email address
3. Check email for reset link
4. Create new password
5. Confirm with MFA (if enabled)

---

## 📊 Quick Reference Table

| User ID | Role | Email | Password | MFA | Access Level |
|---------|------|-------|----------|-----|--------------|
| `superadmin` | Super Admin | superadmin@tradingplatform.com | SuperAdmin@2025! | ✅ | 5 |
| `admin01` | Admin | admin01@tradingplatform.com | Admin01@2025! | ✅ | 4 |
| `admin02` | Admin | admin02@tradingplatform.com | Admin02@2025! | ✅ | 4 |
| `support_admin` | Support Admin | support@tradingplatform.com | Support@2025! | ✅ | 4 |
| `manager01` | Operations Mgr | manager01@tradingplatform.com | Manager01@2025! | ✅ | 3 |
| `manager02` | Trading Mgr | manager02@tradingplatform.com | Manager02@2025! | ✅ | 3 |
| `compliance_manager` | Compliance Mgr | compliance@tradingplatform.com | Compliance@2025! | ✅ | 3 |
| `trader01` | Pro Trader | trader01@tradingplatform.com | Trader01@2025! | ⚪ | 2 |
| `trader02` | Pro Trader | trader02@tradingplatform.com | Trader02@2025! | ⚪ | 2 |
| `user01` | User | user01@tradingplatform.com | User01@2025! | ⚪ | 1 |
| `user02` | User | user02@tradingplatform.com | User02@2025! | ⚪ | 1 |
| `user03` | User | user03@tradingplatform.com | User03@2025! | ⚪ | 1 |
| `demo_admin` | Demo Admin | demo@tradingplatform.com | Demo@2025! | ❌ | 4 |
| `demo_user` | Demo User | demouser@tradingplatform.com | DemoUser@2025! | ❌ | 1 |

**Legend:**  
✅ = MFA Enabled (Required)  
⚪ = MFA Optional  
❌ = MFA Disabled

---

## 🚨 Emergency Contacts

### Security Issues
**Email:** security@tradingplatform.com  
**Phone:** +1 (555) 123-4567  
**Available:** 24/7

### Technical Support
**Email:** support@tradingplatform.com  
**Phone:** +1 (555) 123-4568  
**Available:** Mon-Fri 9AM-6PM EST

### Compliance Issues
**Email:** compliance@tradingplatform.com  
**Phone:** +1 (555) 123-4569  
**Available:** Mon-Fri 9AM-5PM EST

---

## 📝 Notes

### Important Reminders

1. **This is a CONFIDENTIAL document** - Do not share publicly
2. **Change default passwords** immediately after first login
3. **Enable MFA** for all admin accounts (required)
4. **Review and update** credentials quarterly
5. **Audit access logs** monthly
6. **Revoke access** for inactive users after 90 days

### Credential Updates

**Last Updated:** November 5, 2025  
**Next Review:** February 5, 2026  
**Updated By:** System Administrator

---

## ✅ Setup Checklist

- [ ] All admin accounts created
- [ ] MFA enabled for admin accounts
- [ ] Backup codes saved securely
- [ ] Password policy configured
- [ ] Session timeout configured
- [ ] Failed login lockout enabled
- [ ] Audit logging enabled
- [ ] Email notifications configured
- [ ] API keys configured
- [ ] Security guidelines distributed

---

**Document Version:** 1.0  
**Classification:** CONFIDENTIAL  
**Distribution:** Authorized Personnel Only

---

## 🔐 Document Security

**This document contains sensitive authentication credentials. Handle with extreme care.**

- Store in secure location
- Encrypt when transmitting
- Shred physical copies when no longer needed
- Report any unauthorized access immediately

---

**END OF CREDENTIALS DOCUMENT**
