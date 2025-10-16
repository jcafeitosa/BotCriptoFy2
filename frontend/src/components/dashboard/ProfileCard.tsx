/**
 * @fileoverview Profile Card Component
 * @description Displays user profile information dynamically
 */

import { useState, useEffect } from "react";
import type { FC } from "react";

interface UserProfile {
  userId: string;
  role: "admin" | "manager" | "trader" | "viewer";
  profileType: "company" | "trader" | "influencer";
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ProfileCardProps {
  className?: string;
}

export const ProfileCard: FC<ProfileCardProps> = ({ className = "" }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/user/profile", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className={`animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load profile</p>
        </div>
        <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const roleColors = {
    admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    trader: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    viewer: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };

  const profileTypeLabels = {
    company: "Company",
    trader: "Trader",
    influencer: "Influencer",
  };

  const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
  const profileTypeLabel = profileTypeLabels[profile.profileType];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Avatar */}
        <div className="relative">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-700">
              <span className="text-white text-2xl font-bold">
                {profile.userId.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          {profile.isActive && (
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {profileTypeLabel} Account
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleColors[profile.role]}`}>
              {roleLabel}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ID: {profile.userId.substring(0, 12)}...
          </p>
          {profile.phone && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              📞 {profile.phone}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile.isActive ? "Active" : "Inactive"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
          </div>
        </div>
      </div>
    </div>
  );
};

