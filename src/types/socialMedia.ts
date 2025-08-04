import SocialMedaiPlatform from "../types/socialMedia";

export interface UserContext {
  user: string;
}

export interface TwitterAPIReturn {
  id: string;
  text: string;
  created_at: string;
  favorite_count: string;
  retweet_count: string;
  reply_count: string;
  author: {
    id: string;
    name: string;
    screen_name: string;
    description: string;
    followers_count: string;
    following_count: string;
    verified: string;
    profile_image: string;
    url: string;
  };
}

export interface SocialMediaService {
  getEnrichedData: () => Promise<any>;
}

export interface TwitterUserSpamProfile {
  username: string;
  name: string;
  created_at: string;
  verified: boolean;
  is_blue_verified: boolean;
  // Profile completeness signals
  profile_image_url?: string;
  profile_banner_url?: string;
  description: string;
  location?: string;
  url?: string;

  followers_count: number;
  friends_count: number;
  statuses_count: number;
  favourites_count: number;
  listed_count: number;

  default_profile: boolean;
  default_profile_image: boolean;
  entities?: {
    description?: {
      urls?: Array<{
        expanded_url: string;
        display_url: string;
      }>;
    };
    url?: {
      urls?: Array<{
        expanded_url: string;
        display_url: string;
      }>;
    };
  };
}

export interface TweetSpamData {
  text: string;
  created_at: string;
  hashtags: string[];
}

export interface TwitterSpamData {
  user: TwitterUserSpamProfile;
  tweets: TweetSpamData[];
}
