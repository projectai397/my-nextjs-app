# User Creation Feature - Deployment Guide

**Date:** November 5, 2025  
**Feature:** Add User Creation Functionality  
**Production Server:** http://13.200.17.121:9008

---

## ✅ Current Status

The user creation functionality is **already implemented** in the codebase:

### Components Available:
1. **CreateUserForm.tsx** - Complete user creation form component (90,938 bytes)
2. **EditCreate.tsx** - User edit component (107,985 bytes)
3. **Users Page** - Integrated with Create button and dialog

### Features Included:
- ✅ Complete user creation form with validation
- ✅ Role selection (Super Admin, Admin, Manager, Trader, User)
- ✅ Field validation (username, email, password, phone)
- ✅ Backend API integration (`user/create` endpoint)
- ✅ Group assignment functionality
- ✅ Success/error handling with toast notifications
- ✅ Automatic user list refresh after creation

---

## 📋 User Creation Form Fields

The `CreateUserForm` component includes the following fields:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Username | Text | Yes | Unique, alphanumeric |
| Email | Email | Yes | Valid email format |
| Password | Password | Yes | Min 8 characters |
| Phone | Text | Yes | Valid phone number |
| Role | Dropdown | Yes | 5 roles available |
| Group | Multi-select | Optional | Assign trading groups |
| Status | Toggle | Yes | Active/Inactive |
| Leverage | Number | Optional | Trading leverage |
| Brokerage | Number | Optional | Brokerage percentage |

---

## 🚀 How to Access on Production

### Step 1: Login
1. Navigate to `http://13.200.17.121:9008`
2. Login with your credentials:
   - **Super Admin:** Full access to create users
   - **Admin:** Can create users with limited roles
   - **Master:** Can create child users

### Step 2: Navigate to Users Page
1. Click **User Management** in the sidebar
2. Click **User List**
3. You should see the users table

### Step 3: Create New User
1. Click the **"Create"** button (yellow button with Plus icon) at the top right
2. Fill in the user creation form:
   - Enter username, email, password
   - Select role from dropdown
   - Optionally assign groups
   - Set leverage and brokerage
3. Click **"Create User"** to submit
4. The new user will appear in the list

---

## 🔧 Deployment to Production Server

If the production server (`http://13.200.17.121:9008`) doesn't have the latest code, follow these steps:

### Option 1: Deploy from GitHub

```bash
# SSH into the production server
ssh ubuntu@13.200.17.121

# Navigate to the project directory
cd /path/to/project

# Pull latest changes from GitHub
git pull origin main

# Install dependencies
pnpm install

# Build the application
pnpm build

# Restart the server
pm2 restart all
# OR
pkill -f "next-server" && pnpm start -p 9008
```

### Option 2: Manual File Transfer

If you need to transfer specific files:

```bash
# From your local machine, copy the updated files
scp /home/ubuntu/components/users/CreateUserForm.tsx ubuntu@13.200.17.121:/path/to/project/components/users/
scp /home/ubuntu/app/admin/users/page.tsx ubuntu@13.200.17.121:/path/to/project/app/admin/users/

# Then SSH and rebuild
ssh ubuntu@13.200.17.121
cd /path/to/project
pnpm build
pm2 restart all
```

---

## 🧪 Testing the Feature

### Test Case 1: Create Basic User
1. Click "Create" button
2. Fill in:
   - Username: `testuser123`
   - Email: `test@example.com`
   - Password: `Test@2025!`
   - Phone: `1234567890`
   - Role: `User`
3. Click "Create User"
4. **Expected:** User appears in the list with success toast

### Test Case 2: Validation Testing
1. Try creating user with existing username
2. **Expected:** Error message "Username already exists"

3. Try creating user with invalid email
4. **Expected:** Error message "Invalid email format"

5. Try creating user with weak password
6. **Expected:** Error message "Password must be at least 8 characters"

### Test Case 3: Role-Based Creation
1. Login as **Admin**
2. Try creating a **Super Admin** user
3. **Expected:** Should not be allowed (only Super Admin can create Super Admin)

---

## 🔍 Troubleshooting

### Issue 1: "Create" Button Not Visible
**Cause:** User doesn't have permission  
**Solution:** Login with Super Admin or Admin account

### Issue 2: Form Doesn't Submit
**Cause:** Backend API not responding  
**Solution:** Check backend server status and API endpoint configuration

### Issue 3: "User already exists" Error
**Cause:** Username or email already in database  
**Solution:** Use a different username/email

### Issue 4: Session Expires Quickly
**Cause:** JWT token expiration settings  
**Solution:** Check `NEXTAUTH_SECRET` and session timeout in `.env`

---

## 📊 Backend API Integration

The user creation calls the following API endpoint:

```typescript
POST /api/v1/user/create

Headers:
  Authorization: Bearer {jwt_token}
  Content-Type: application/json
  deviceType: web

Body:
{
  "data": "{encrypted_payload}"
}

Encrypted Payload Contains:
{
  "userName": "testuser123",
  "email": "test@example.com",
  "password": "Test@2025!",
  "phone": "1234567890",
  "roleId": "64b63755c71461c502ea4717",
  "status": 1,
  "leverage": 100,
  "brokerage": 0.5,
  "groupIds": ["group1", "group2"]
}
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": "{encrypted_user_data}",
  "meta": {
    "message": "User created successfully"
  }
}
```

---

## 📝 Code Locations

| Component | File Path |
|-----------|-----------|
| User Creation Form | `/components/users/CreateUserForm.tsx` |
| Users Page | `/app/admin/users/page.tsx` |
| User Edit Component | `/components/users/EditCreate.tsx` |
| API Client | `/lib/axiosInstance.ts` |
| Constants | `/constant/index.ts` |
| Encryption Utils | `/hooks/crypto.ts` |

---

## ✨ Additional Features

The CreateUserForm also includes:

1. **Real-time Validation** - Validates fields as user types
2. **Password Strength Indicator** - Shows password strength
3. **Group Multi-Select** - Assign multiple trading groups
4. **Auto-generated Device ID** - For tracking
5. **IP Address Capture** - For security logging
6. **Browser Detection** - Tracks user agent
7. **Responsive Design** - Works on mobile and desktop

---

## 🎯 Next Steps

1. **Deploy to Production** - Follow deployment steps above
2. **Test Thoroughly** - Use all test cases
3. **Train Admins** - Show them how to use the feature
4. **Monitor** - Check logs for any errors
5. **Collect Feedback** - Get user feedback for improvements

---

## 📞 Support

If you encounter any issues:

1. Check browser console for errors (F12)
2. Check server logs for backend errors
3. Verify API endpoint is accessible
4. Confirm user has proper permissions
5. Check database connectivity

---

**Status:** ✅ **Feature Complete and Ready**  
**Last Updated:** November 5, 2025  
**Version:** 2.0
