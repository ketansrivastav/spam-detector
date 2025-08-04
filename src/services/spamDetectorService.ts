import {
  CacheClient,
  Logger,
  PostAnalysisRequest,
  PostAnalysisResult,
  SocialMediaService,
  SpamDetection,
} from "../types";

import { RulesEngine } from "./rulesEngine";
import { TwitterService } from "./socialMedia/twitterService";

export class SpamDetectionService implements SpamDetection {
  constructor(
    private rulesEngine: RulesEngine,
    private cacheService: CacheClient,
    private database: any,
    private messageQueue: any,
    private logger: Logger,
  ) {}

  getSocialService(request: PostAnalysisRequest): SocialMediaService {
    if (!request.userID) throw new Error("username not provided");
    switch (request.platform) {
      case "twitter":
        return new TwitterService(request, this.cacheService);
      default:
        throw new Error("Unknown Platform " + request.platform);
    }
  }
  async analyzePost(request: PostAnalysisRequest): Promise<PostAnalysisResult> {
    try {
      const socialService = this.getSocialService(request);
      const analysisData = await socialService.getEnrichedData();
      const result =  await this.rulesEngine.analyzePost(request,analysisData);
      if (result.action == "FLAG") {
        this.logger.log ("info", "[SpamDetectionService]: Post was flagged. Sending to message queue for deep analysis ")
        this.logger.log ("info", "[SpamDetectionService]: Post was flagged. Adding to manual analysis database")
        this.database.addToFlagTable(result);

        this.messageQueue.sendForDeeperAnalyis(result)
      }

        return result
    } catch (e) {
      const error = e as any;
      throw new Error(error?.message);
    }
  }
}
