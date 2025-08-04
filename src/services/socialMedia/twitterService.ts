import {
  CacheClient,
  Logger,
  SocialMedaiPlatform,
  PostAnalysisRequest,
  PostAnalysisResult,
  UserContext,
  SocialMediaService,
  TweetSpamData,
  TwitterSpamData,
  TwitterUserSpamProfile,
  TwitterAPIReturn,
} from "../../types";

import * as rules from "../../config/rules.json";

interface TwitterAPIConfig {
  baseUrl?: string;
  bearerToken?: string;
}

interface Instruction {
  type: string;
  entries?: Entry[];
}

interface Entry {
  content?: {
    itemContent?: {
      itemType: string;
      tweet_results?: {
        result: any;
      };
      user_results?: {
        result: any;
      };
    };
    __typename?: string;
    items?: any[];
  };
}

interface TweetEntry {
  content: {
    itemContent: {
      itemType: string;
      tweet_results: {
        result: {
          rest_id: string;
          legacy: {
            full_text: string;
            created_at: string;
            favorite_count: number;
            retweet_count: number;
            reply_count: number;
          };
          core: {
            user_results: {
              result: {
                rest_id: string;
                legacy: {
                  name: string;
                  screen_name: string;
                  description: string;
                  followers_count: number;
                  friends_count: number;
                  verified: boolean;
                  profile_image_url_https: string;
                  url: string;
                };
              };
            };
          };
        };
      };
    };
  };
}

interface UserEntry {
  content: {
    __typename: string;
    items?: Array<{
      item: {
        itemContent: {
          itemType: string;
          user_results: {
            result: {
              rest_id: string;
              legacy: {
                name: string;
                screen_name: string;
                description: string;
                followers_count: number;
                friends_count: number;
                verified: boolean;
                profile_image_url_https: string;
              };
            };
          };
        };
      };
    }>;
  };
}

export class TwitterService implements SocialMediaService {
  private apiConfig: TwitterAPIConfig;
  private readonly postForAnalysis: PostAnalysisRequest;
  private readonly cacheService: CacheClient;
  private userNumericId: Promise<string>;
  constructor(request: PostAnalysisRequest, cacheService: CacheClient) {
    this.postForAnalysis = request;
    this.cacheService = cacheService;
    this.apiConfig = {
      baseUrl: process.env.TWITTER_BASE_URL,
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
    };
    this.userNumericId = new Promise((resolve, reject) => {
      const urlParam = new URLSearchParams({ username: request.userID });

      this.request("/user?" + urlParam.toString())
        .then((response: any) => {
          // Validate the expected structure exists
          const restId = response?.result?.data.user?.result?.rest_id;

          if (typeof restId === "string") {
            resolve(restId);
          } else {
            reject(new Error("rest_id not found or invalid type"));
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  // pure function that returns structed data from the API response
  private extractData(data: any) {
    const {
      result: {
        timeline: { instructions },
      },
    } = data;
    if (instructions) {
      const tweetEntries: TweetEntry[] = instructions
        .filter((ele: Instruction) => ele.type === "TimelineAddEntries")
        .flatMap(
          (rootEle: Instruction) =>
            rootEle?.entries?.filter(
              (ele) => ele.content?.itemContent?.itemType === "TimelineTweet",
            ) || [],
        );

      // Extract tweet data
      const tweetsWithUserData = tweetEntries.map((entry) => {
        const tweet = entry?.content?.itemContent?.tweet_results.result;
        const author = tweet?.core.user_results.result;

        return {
          id: tweet.rest_id,
          text: tweet.legacy.full_text,
          created_at: tweet.legacy.created_at,
          favorite_count: tweet.legacy.favorite_count,
          retweet_count: tweet.legacy.retweet_count,
          reply_count: tweet.legacy.reply_count,
          author: {
            id: author.rest_id,
            name: author.legacy.name,
            screen_name: author.legacy.screen_name,
            description: author.legacy.description,
            followers_count: author.legacy.followers_count,
            following_count: author.legacy.friends_count,
            verified: author.legacy.verified,
            profile_image: author.legacy.profile_image_url_https,
            url: author.legacy.url,
          },
        };
      });
      return tweetsWithUserData;
    } else {
      throw new Error("Twitter API response is invalid");
    }
  }

  public async getEnrichedData() {
    // first check in the cache
     // const cached = await this.cacheService.get(
     //   rules.platformSpecific.twitter.cachePrefix + this.postForAnalysis.userID,
     // );
     // if (cached) {
    
     //  return JSON.parse(cached); // returning enriched data from cache
    // }
    // if cache miss
    const user = await this.userNumericId;
    const count: string = String(
      rules.platformSpecific.twitter.postHistoryCount,
    );
    const params = new URLSearchParams({ user, count });
    const res = await this.request("/user-tweets?" + params.toString());
    const extractedData = this.extractData(res);
    // store in cache
    await this.cacheService.set(
      rules.platformSpecific.twitter.cachePrefix + this.postForAnalysis.userID,
      JSON.stringify(extractedData),
      rules.platformSpecific.twitter.cacheTTL,
    );

    return extractedData;
  }

  // makes http resquest to twitter endpoints
  private async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> {
    try {
      const response = await fetch(`${this.apiConfig.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "x-rapidapi-host": "twitter241.p.rapidapi.com",
          "x-rapidapi-key": this.apiConfig.bearerToken || "",
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          errors: [
            {
              message: `HTTP ${response.status}: ${response.statusText}`,
              ...data,
            },
          ],
        };
      }

      return data;
    } catch (error) {
      return {
        errors: [
          { message: error instanceof Error ? error.message : "Network error" },
        ],
      };
    }
  }
}
