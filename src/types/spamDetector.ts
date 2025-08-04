import { SocialMediaService } from "./socialMedia";
export type SpamDetectionAction = "ALLOW" | "BLOCK" | "FLAG";
export type SocialMedaiPlatform = "twitter" | "linkedin" | "facebook";

export interface SpamDetection {
  getSocialService(platform: PostAnalysisRequest): SocialMediaService;
  analyzePost(request: PostAnalysisRequest): Promise<PostAnalysisResult>;

}

export interface PostAnalysisRequest {
  content: string;
  userID: string;
  platform: SocialMedaiPlatform;
  requestId: string;
  clientMetadata?: {
    userAgent?: string;
    ipAddress?: string;
    timestamp?: string;
  };
}

export interface PostAnalysisResult {

  action: SpamDetectionAction;
  confidence: number;
  score: number;
  reasons: string[];
  requestId: string;
  processedAt: number;
}

// to be changed to actual type...
export type SpamRules = any;
