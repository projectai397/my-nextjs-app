# Production Deployment Instructions

**Target Server:** http://13.200.17.121:9008  
**Date:** November 5, 2025  
**Deployment Type:** UI/UX Upgrade with AI Dashboard Integration

---

## 1. **Pre-Deployment Checklist**

Before starting the deployment, ensure you have:

- [ ] SSH access to the production server (`13.200.17.121`)
- [ ] Backup of the current production code
- [ ] Access to the GitHub repository
- [ ] Production database backup (if applicable)
- [ ] Notification sent to users about potential downtime

---

## 2. **Deployment Steps**

### **Step 1: Connect to Production Server**

```bash
ssh username@13.200.17.121
```

Replace `username` with your actual SSH username (e.g., `ubuntu`, `root`, `admin`).

---

### **Step 2: Navigate to Project Directory**

```bash
cd /path/to/your/project
# Common paths:
# cd /var/www/html/trading-platform
# cd /home/ubuntu/app
# cd /opt/trading-platform
```

---

### **Step 3: Backup Current Code**

```bash
# Create a backup directory
mkdir -p ~/backups
cp -r . ~/backups/backup-$(date +%Y%m%d-%H%M%S)

# Or create a Git tag for the current version
git tag -a v1.0-pre-upgrade -m "Backup before UI/UX upgrade"
```

---

### **Step 4: Pull Latest Code from GitHub**

```bash
# Fetch latest changes
git fetch origin

# Pull the latest code
git pull origin main
# Or if using a different branch:
# git pull origin master
```

**Alternative: If Git is not configured on production:**

1. On your local machine, create a deployment package:
   ```bash
   cd /home/ubuntu
   tar -czf ui-ux-upgrade.tar.gz \
     app/admin/users/page.tsx \
     components/users/UserStatisticsCards.tsx \
     components/users/AIInsightsPanel.tsx \
     components/users/BulkOperationsBar.tsx \
     components/users/AdvancedFilters.tsx
   ```

2. Transfer to production server:
   ```bash
   scp ui-ux-upgrade.tar.gz username@13.200.17.121:/tmp/
   ```

3. On production server, extract:
   ```bash
   cd /path/to/your/project
   tar -xzf /tmp/ui-ux-upgrade.tar.gz
   ```

---

### **Step 5: Install Dependencies**

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install
```

---

### **Step 6: Build the Application**

```bash
# Using pnpm
pnpm build

# Or using npm
npm run build

# Or using yarn
yarn build
```

**Expected output:** Build should complete successfully with no errors.

---

### **Step 7: Stop Current Production Server**

```bash
# Find the running Next.js process
ps aux | grep next

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or if using PM2
pm2 stop all

# Or if using systemd
sudo systemctl stop trading-platform
```

---

### **Step 8: Start the Updated Server**

```bash
# Using pnpm (on port 9008)
pnpm start -p 9008

# Or using PM2 (recommended for production)
pm2 start npm --name "trading-platform" -- start -- -p 9008
pm2 save

# Or using systemd
sudo systemctl start trading-platform
```

---

### **Step 9: Verify Deployment**

1. **Check server is running:**
   ```bash
   curl http://localhost:9008
   ```

2. **Check logs:**
   ```bash
   # If using PM2
   pm2 logs trading-platform

   # If using systemd
   sudo journalctl -u trading-platform -f

   # Or check application logs
   tail -f /var/log/trading-platform.log
   ```

3. **Access the application:**
   - Open browser: http://13.200.17.121:9008
   - Login with admin credentials
   - Navigate to User Management → User List
   - Verify new features are visible

---

## 3. **Post-Deployment Verification**

### **Verify New Features:**

- [ ] **Statistics Cards** - Visible at the top of the users page
- [ ] **AI Insights Panel** - Displaying recommendations and alerts
- [ ] **Advanced Filters** - Button visible next to Export/Create
- [ ] **Bulk Operations Bar** - Appears when users are selected
- [ ] **Delete Functionality** - Available in user actions menu

### **Test Functionality:**

1. **Statistics Cards:**
   - Check that user counts are accurate
   - Verify percentages are calculating correctly

2. **AI Insights:**
   - Confirm insights are displaying
   - Check that priorities are color-coded

3. **Advanced Filters:**
   - Test filtering by balance range
   - Test filtering by P/L range
   - Test filtering by status
   - Test filtering by last activity

4. **Bulk Operations:**
   - Select multiple users
   - Verify bulk operations bar appears
   - Test each bulk action (activate, deactivate, export, delete)

5. **Delete User:**
   - Open user actions menu
   - Verify "Delete User" option is present
   - Test delete confirmation dialog

---

## 4. **Rollback Procedure (If Needed)**

If any issues occur during deployment:

```bash
# Stop the current server
kill -9 <PID>  # or pm2 stop all

# Restore from backup
cd /path/to/your/project
rm -rf *
cp -r ~/backups/backup-YYYYMMDD-HHMMSS/* .

# Or revert Git changes
git reset --hard v1.0-pre-upgrade

# Rebuild
pnpm install
pnpm build

# Restart server
pnpm start -p 9008
```

---

## 5. **Troubleshooting**

### **Issue: Build Fails**

**Solution:**
```bash
# Clear cache and reinstall
rm -rf .next node_modules
pnpm install
pnpm build
```

### **Issue: Server Won't Start**

**Solution:**
```bash
# Check if port 9008 is already in use
lsof -i :9008
# Kill the process using the port
kill -9 <PID>
# Start server again
pnpm start -p 9008
```

### **Issue: New Components Not Showing**

**Solution:**
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

# Or clear Next.js cache
rm -rf .next
pnpm build
pnpm start -p 9008
```

---

## 6. **Support & Documentation**

**Documentation Files:**
- `UI_UX_UPGRADE_DEPLOYMENT_REPORT.md` - Complete deployment report
- `UI_UX_UPGRADE_IMPLEMENTATION_GUIDE.md` - Technical implementation details
- `CRUD_OPERATIONS_DOCUMENTATION.md` - CRUD operations guide

**GitHub Repository:**
- Latest commit: Contains all UI/UX upgrade changes
- All new components are in `/components/users/` directory

---

## 7. **Deployment Completion Checklist**

- [ ] Code deployed successfully
- [ ] Application built without errors
- [ ] Server started and running
- [ ] All new features verified
- [ ] Performance is acceptable
- [ ] No console errors
- [ ] Users notified of new features
- [ ] Documentation updated
- [ ] Backup created and verified

---

**Deployment Status:** Ready for Production  
**Estimated Time:** 30-45 minutes  
**Risk Level:** Low (all changes are additive, no breaking changes)

---

**For assistance, refer to the attached documentation or contact your development team.**
