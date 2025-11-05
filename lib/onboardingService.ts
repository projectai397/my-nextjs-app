import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";

export interface OnboardingTour {
  id: string;
  name: string;
  description: string;
  role: 'admin' | 'user' | 'all';
  steps: DriveStep[];
  completed: boolean;
}

export class OnboardingService {
  private storageKey = 'onboarding-progress';
  private driverInstance: ReturnType<typeof driver> | null = null;

  // Define all available tours
  private tours: OnboardingTour[] = [
    {
      id: 'admin-dashboard',
      name: 'Admin Dashboard Tour',
      description: 'Learn how to navigate the admin dashboard',
      role: 'admin',
      completed: false,
      steps: [
        {
          element: '[data-tour="dashboard"]',
          popover: {
            title: 'Welcome to Your Dashboard! 🎉',
            description: 'This is your main control center. Here you can see key metrics, user statistics, and system health at a glance.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="sidebar"]',
          popover: {
            title: 'Navigation Sidebar',
            description: 'Use this sidebar to navigate between different sections: Users, Payments, Reports, and more.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="notifications"]',
          popover: {
            title: 'Notification Center 🔔',
            description: 'Stay updated with real-time notifications about user activities, system alerts, and important events.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="user-menu"]',
          popover: {
            title: 'User Menu',
            description: 'Access your account settings, profile, and logout options here.',
            side: 'bottom',
            align: 'end',
          },
        },
      ],
    },
    {
      id: 'ai-features',
      name: 'AI Features Tour',
      description: 'Discover powerful AI-powered features',
      role: 'admin',
      completed: false,
      steps: [
        {
          element: '[data-tour="ai-dashboard"]',
          popover: {
            title: 'AI Co-Pilot Dashboard 🤖',
            description: 'Your intelligent assistant for natural language queries. Ask questions like "Show me high-risk users" and get instant insights!',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="ai-query"]',
          popover: {
            title: 'Natural Language Queries',
            description: 'Type your questions in plain English. The AI will understand and provide relevant data and insights.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="risk-score"]',
          popover: {
            title: 'AI Risk Scoring',
            description: 'Get real-time risk assessments for users based on their trading patterns, behavior, and transaction history.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="ai-insights"]',
          popover: {
            title: 'AI Insights',
            description: 'Receive intelligent recommendations and predictions to help you make better decisions.',
            side: 'right',
            align: 'start',
          },
        },
      ],
    },
    {
      id: 'user-management',
      name: 'User Management Tour',
      description: 'Learn how to manage users effectively',
      role: 'admin',
      completed: false,
      steps: [
        {
          element: '[data-tour="user-list"]',
          popover: {
            title: 'User List 👥',
            description: 'View and manage all users in your platform. Filter, search, and take actions on user accounts.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="user-segments"]',
          popover: {
            title: 'User Segments 🎯',
            description: 'AI-powered user categorization. Automatically group users into segments like Pro Traders, Casual Traders, and more.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="bulk-operations"]',
          popover: {
            title: 'Bulk Operations ⚡',
            description: 'Perform actions on multiple users at once. Import from CSV, export data, and apply bulk changes efficiently.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="activity-timeline"]',
          popover: {
            title: 'Activity Timeline 📊',
            description: 'Track user activities chronologically. See login history, trades, transactions, and more in a visual timeline.',
            side: 'top',
            align: 'start',
          },
        },
      ],
    },
    {
      id: 'security-features',
      name: 'Security Features Tour',
      description: 'Explore enterprise-grade security tools',
      role: 'admin',
      completed: false,
      steps: [
        {
          element: '[data-tour="mfa"]',
          popover: {
            title: 'Multi-Factor Authentication 🔒',
            description: 'Enable MFA for enhanced security. Supports authenticator apps, SMS, and email verification.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="impersonation"]',
          popover: {
            title: 'User Impersonation 👤',
            description: 'Securely view the platform as a specific user for support and troubleshooting. All actions are logged.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="compliance"]',
          popover: {
            title: 'AI Compliance Assistant ⚖️',
            description: 'Automated KYC/AML monitoring with AI-powered risk assessment. Stay compliant effortlessly.',
            side: 'left',
            align: 'start',
          },
        },
      ],
    },
    {
      id: 'flexible-dashboard',
      name: 'Flexible Dashboard Tour',
      description: 'Customize your dashboard layout',
      role: 'admin',
      completed: false,
      steps: [
        {
          element: '[data-tour="flexible-dashboard"]',
          popover: {
            title: 'Flexible Dashboard 🎨',
            description: 'Drag and drop widgets to create your perfect workspace. Resize, rearrange, and customize to your needs.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="widget-selector"]',
          popover: {
            title: 'Add Widgets',
            description: 'Choose from various widgets: Market Data, Portfolio, AI Insights, Quick Stats, and more.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="layout-controls"]',
          popover: {
            title: 'Layout Controls',
            description: 'Lock/unlock editing, save layouts, and reset to defaults. Your preferences are automatically saved.',
            side: 'top',
            align: 'end',
          },
        },
      ],
    },
  ];

  // Start a specific tour
  startTour(tourId: string): void {
    const tour = this.tours.find(t => t.id === tourId);
    if (!tour) {
      console.error(`Tour ${tourId} not found`);
      return;
    }

    const config: Config = {
      showProgress: true,
      steps: tour.steps,
      onDestroyStarted: () => {
        if (this.driverInstance) {
          this.driverInstance.destroy();
        }
      },
      onDestroyed: () => {
        this.markTourCompleted(tourId);
      },
    };

    this.driverInstance = driver(config);
    this.driverInstance.drive();
  }

  // Get all tours
  getAllTours(): OnboardingTour[] {
    const progress = this.getProgress();
    return this.tours.map(tour => ({
      ...tour,
      completed: progress[tour.id] || false,
    }));
  }

  // Get tours for specific role
  getToursByRole(role: 'admin' | 'user'): OnboardingTour[] {
    return this.getAllTours().filter(tour => tour.role === role || tour.role === 'all');
  }

  // Mark tour as completed
  markTourCompleted(tourId: string): void {
    if (typeof window === 'undefined') return;
    
    const progress = this.getProgress();
    progress[tourId] = true;
    localStorage.setItem(this.storageKey, JSON.stringify(progress));
  }

  // Reset tour progress
  resetTour(tourId: string): void {
    if (typeof window === 'undefined') return;
    
    const progress = this.getProgress();
    delete progress[tourId];
    localStorage.setItem(this.storageKey, JSON.stringify(progress));
  }

  // Reset all progress
  resetAllProgress(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.storageKey);
  }

  // Get progress
  private getProgress(): Record<string, boolean> {
    if (typeof window === 'undefined') return {};
    
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return {};

    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }

  // Check if user should see onboarding
  shouldShowOnboarding(): boolean {
    const progress = this.getProgress();
    return Object.keys(progress).length === 0;
  }

  // Get completion percentage
  getCompletionPercentage(): number {
    const progress = this.getProgress();
    const completed = Object.values(progress).filter(Boolean).length;
    return Math.round((completed / this.tours.length) * 100);
  }

  // Highlight element (for contextual help)
  highlightElement(selector: string, title: string, description: string): void {
    const config: Config = {
      showProgress: false,
      steps: [
        {
          element: selector,
          popover: {
            title,
            description,
            side: 'bottom',
            align: 'start',
          },
        },
      ],
    };

    this.driverInstance = driver(config);
    this.driverInstance.drive();
  }

  // Destroy current driver instance
  destroy(): void {
    if (this.driverInstance) {
      this.driverInstance.destroy();
      this.driverInstance = null;
    }
  }
}

export const onboardingService = new OnboardingService();
