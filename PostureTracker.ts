import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the shape of the user profile
interface UserProfile {
  username: string;
  level: number;
  totalPoints: number;
  currentLevelPoints: number;
  achievements: string[];
  streakDays: number;
  lastPostureSessionDate: string;
}

interface LevelConfig {
  level: number;
  pointsRequired: number;
  title: string;
}

class PostureTracker {
  // Publicly accessible profile
  profile: UserProfile;

  // Level configurations
  levelConfigs: LevelConfig[] = [
    { level: 1, pointsRequired: 0, title: 'Posture Novice' },
    { level: 2, pointsRequired: 100, title: 'Spine Apprentice' },
    { level: 3, pointsRequired: 250, title: 'Alignment Adept' },
    { level: 4, pointsRequired: 500, title: 'Posture Master' },
    { level: 5, pointsRequired: 1000, title: 'Ergonomic Expert' }
  ];

  constructor() {
    // Initialize profile
    this.profile = {
      username: 'PostureWarrior',
      level: 1,
      totalPoints: 0,
      currentLevelPoints: 0,
      achievements: [],
      streakDays: 0,
      lastPostureSessionDate: new Date().toISOString()
    };

    // Load saved profile
    this.initializeProfile();
  }

  // Method to initialize profile (changed from async to synchronous-looking)
  async initializeProfile() {
    try {
      const savedProfile = await AsyncStorage.getItem('userProfile');
      if (savedProfile) {
        // Merge saved profile with default
        this.profile = {
          ...this.profile,
          ...JSON.parse(savedProfile)
        };
      }
      // Save merged profile
      await this.saveProfile();
    } catch (error) {
      console.error('Error initializing profile:', error);
    }
  }

  // Method to save profile
  async saveProfile() {
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(this.profile));
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }

  // Method to award points
  async awardPoints(duration: number, postureQuality: 'poor' | 'good' | 'excellent') {
    const pointMultipliers = {
      'poor': 1,
      'good': 2,
      'excellent': 3
    };

    const points = Math.round(duration * pointMultipliers[postureQuality]);
    
    this.profile.totalPoints += points;
    this.profile.currentLevelPoints += points;

    // Check for level progression
    await this.checkLevelProgression();

    // Save updated profile
    await this.saveProfile();

    return {
      pointsEarned: points,
      newTotalPoints: this.profile.totalPoints,
      currentLevel: this.profile.level
    };
  }

  // Check and handle level progression
  async checkLevelProgression() {
    const currentLevelConfig = this.levelConfigs.find(
      config => config.level === this.profile.level
    );

    if (currentLevelConfig && 
        this.profile.currentLevelPoints >= currentLevelConfig.pointsRequired) {
      // Level up!
      this.profile.level++;
      this.profile.currentLevelPoints -= currentLevelConfig.pointsRequired;
      
      console.log(`Congratulations! You've reached level ${this.profile.level}`);
    }
  }

  // Getter methods
  getUserProfile() {
    return this.profile;
  }

  getLevelConfig() {
    return this.levelConfigs;
  }
}

export default PostureTracker;