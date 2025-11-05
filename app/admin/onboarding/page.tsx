"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  CheckCircle2,
  Circle,
  RotateCcw,
  BookOpen,
  Rocket,
  Users,
  Shield,
  Bot,
  LayoutGrid,
} from "lucide-react";
import { onboardingService, type OnboardingTour } from "@/lib/onboardingService";

export default function OnboardingPage() {
  const [tours, setTours] = useState<OnboardingTour[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  useEffect(() => {
    loadTours();
  }, []);

  const loadTours = () => {
    const allTours = onboardingService.getAllTours();
    setTours(allTours);
    setCompletionPercentage(onboardingService.getCompletionPercentage());
  };

  const startTour = (tourId: string) => {
    onboardingService.startTour(tourId);
    // Reload after a delay to update completion status
    setTimeout(loadTours, 1000);
  };

  const resetTour = (tourId: string) => {
    onboardingService.resetTour(tourId);
    loadTours();
  };

  const resetAll = () => {
    if (confirm('Are you sure you want to reset all tour progress?')) {
      onboardingService.resetAllProgress();
      loadTours();
    }
  };

  const getTourIcon = (tourId: string) => {
    const icons: Record<string, any> = {
      'admin-dashboard': Rocket,
      'ai-features': Bot,
      'user-management': Users,
      'security-features': Shield,
      'flexible-dashboard': LayoutGrid,
    };
    const Icon = icons[tourId] || BookOpen;
    return <Icon className="h-6 w-6" />;
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" style={{ backgroundColor: '#0B0E11' }}>
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-[#F0B90B]" />
            Interactive Onboarding
          </h2>
          <p className="text-gray-400 mt-1">
            Step-by-step guided tours to help you master the platform
          </p>
        </div>
        <Button
          onClick={resetAll}
          variant="outline"
          className="border-gray-700 text-white hover:bg-gray-800"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All Progress
        </Button>
      </div>

      {/* Progress Card */}
      <Card style={{ backgroundColor: '#1E2329', borderColor: '#2B3139' }}>
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Your Progress</span>
            <span className="text-[#F0B90B]">{completionPercentage}%</span>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Complete all tours to become a platform expert
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
            <span>{tours.filter(t => t.completed).length} of {tours.length} tours completed</span>
            <span>{tours.filter(t => !t.completed).length} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Tours Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour) => (
          <Card
            key={tour.id}
            style={{ backgroundColor: '#1E2329', borderColor: '#2B3139' }}
            className="hover:border-[#F0B90B]/50 transition-colors"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#F0B90B]/10">
                    {getTourIcon(tour.id)}
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">{tour.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        tour.completed
                          ? 'bg-green-500/10 text-green-500 border-green-500/20 mt-1'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/20 mt-1'
                      }
                    >
                      {tour.completed ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Circle className="h-3 w-3 mr-1" />
                          Not Started
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 mb-4">{tour.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>{tour.steps.length} steps</span>
                <span>~{Math.ceil(tour.steps.length * 0.5)} min</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => startTour(tour.id)}
                  className="flex-1 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {tour.completed ? 'Replay' : 'Start Tour'}
                </Button>
                {tour.completed && (
                  <Button
                    onClick={() => resetTour(tour.id)}
                    variant="outline"
                    className="border-gray-700 text-white hover:bg-gray-800"
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips Card */}
      <Card style={{ backgroundColor: '#1E2329', borderColor: '#2B3139' }}>
        <CardHeader>
          <CardTitle className="text-white">💡 Pro Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#F0B90B] mt-0.5 flex-shrink-0" />
              <span>Complete tours in order for the best learning experience</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#F0B90B] mt-0.5 flex-shrink-0" />
              <span>You can pause and resume tours at any time</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#F0B90B] mt-0.5 flex-shrink-0" />
              <span>Replay tours anytime to refresh your knowledge</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#F0B90B] mt-0.5 flex-shrink-0" />
              <span>Look for the 🎓 icon throughout the platform for contextual help</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
