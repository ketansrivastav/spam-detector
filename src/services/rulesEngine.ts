import {
  CacheClient,
  Logger,
  SpamRules,
  PostAnalysisRequest,
  PostAnalysisResult,
} from "../types";
import * as rules from "../config/rules.json";

interface RulesEngineIf {
  loadRules(): Promise<object>;
}

export interface ContentAnalysis {
  urls: string[];
  hashtags: string[];
  hasExcessiveCaps: boolean;
  hasRepetitiveChars: boolean;
  keywordMatches: string[];
}

export interface BehaviorData {
  recentPostCount: number;
  duplicateContentFound: boolean;
  postingVelocity: number;
  suspiciousTimePosting: boolean;
}

export class RulesEngine implements RulesEngineIf {
  constructor(
    private readonly logger: Logger,
    private readonly cacheService: CacheClient,
  ) {
    this.loadRules();
  }

  async analyzePost(
    request: PostAnalysisRequest,
    data: any,
  ): Promise<PostAnalysisResult> {
    const rules = await this.loadRules();

    // content analysis
    const hashtagScore = calculateHashtagScore(
      request.content,
      rules.contentRules.spamHashtags,
    );

    const spamKeywords = getKeywordMatches(
      request.content,
      rules.contentRules.spamKeywords,
    );
    const URLscore = calculateURLscore(
      request.content,
      rules.contentRules.urlRegex,
    );
    const capsScore = calculateCapitalWords(request.content);

    // behavioural analysis
    const latestAccountInfo = data[0].author; //assuming the api return is sorted by date (default API behaviour)
    const userData = {
      followers: latestAccountInfo.followers_count,
      description: latestAccountInfo.description,
      name: latestAccountInfo.screen_name,
      verfication: latestAccountInfo.verified,
    };

    const descriptionSpamScore = getKeywordMatches(
      userData.description,
      rules.contentRules.spamKeywords,
    );
    const descriptionHashtagsScore = calculateHashtagScore(
      userData.description,
      rules.contentRules.spamHashtags,
    );
    const descriptionURLScore = calculateURLscore(
      userData.description,
      rules.contentRules.urlRegex,
    );

    const spamyUsernameScore: number = rules.contentRules.spamUsernames.some(
      (word: string) => userData.name.includes(word),
    )
      ? 1
      : 0;

    const lowFollowerCountScore: number =
      userData.followers <=
      rules.behaviorRules.userReputation.lowFollowerThreshold
        ? 1
        : 0;
    const userVerifiedScore: number = !userData.verfication ? 1 : 0;
    // historical analysis

    const tweetsTimestamps = data.map((tweet: any) => tweet.created_at);
    const postFrequencyScore = getPostFrequency(tweetsTimestamps);

    const weights = rules.scoring.weights;
    const scoreArray: [string, number][] = [
      ["spam keywords", spamKeywords],
      ["spam hashtags", hashtagScore],
      ["excessive urls", URLscore],
      ["excessive score", capsScore],
      ["low follower count", lowFollowerCountScore],
      ["spam bio", descriptionSpamScore],
      ["spam bio hashtag", descriptionHashtagsScore],
      ["spam bio URLs", descriptionURLScore],
      ["spam username", spamyUsernameScore],
      ["not verified", userVerifiedScore],
      ["posting too often", postFrequencyScore],
    ];
    const weightsArray = [
      weights.spamKeywords,
      weights.excessiveHashtags,
      weights.excessiveUrls,
      weights.caps,
      weights.isLowFollowers,
      weights.userDescriotionSpamKeywords,
      weights.userDescriptionExcessiveHashtag,
      weights.userDescriptionExcessiveUrls,
      weights.userNameSpamyKeywords,
      weights.isUserNotVerified,
      weights.isHistoryPostingOften,
    ];

    // calcualte total score by
    // first multiplying each score with its corrosponding weight
    // and then, add them together
    const totalScore = scoreArray
      .map(([_, score], idx) => score * weightsArray[idx])
      .reduce((sum, score) => sum + score, 0);
    const positiveScores = scoreArray.filter(([_, score]) => score > 0);
    const reasons = positiveScores.map(([reason, _]) => reason);

    const action =
      totalScore >= rules.thresholds.block
        ? "BLOCK"
        : totalScore >= rules.thresholds.flag
          ? "FLAG"
          : "ALLOW";
    const confidenceRatio = positiveScores.length / scoreArray.length;
    const confidence =
      confidenceRatio < 0.5
        ? (1 - confidenceRatio) * 100 // Flip for low values
        : confidenceRatio * 100; // Normal for high values
    return {
      confidence,
      action,
      score: totalScore,
      reasons,
      requestId: request.requestId,
      processedAt: Date.now(),
    };
  }

  async loadRules(): Promise<SpamRules> {
    //checking the cache
    const cached = await this.cacheService.get("spam:rules");
    if (cached) {
      return JSON.parse(cached);
    }

    // load from file
    const rulesInMemory = rules;
    // cache for 1 hour
    await this.cacheService.set("spam:rules", JSON.stringify(rules), 3600);

    return rulesInMemory;
  }
}

// pure functions for calculating scores
function calculateHashtagScore(post: string, hashtagSet: string[]): number {
  const hashtags = post.match(/#\w+/g) || [];
  const hashtagCount = hashtags.length;

  // No hashtags = 0 score
  if (hashtagCount === 0) return 0;

  const spamMatches = hashtags.filter((tag) =>
    hashtagSet.includes(tag.toLowerCase()),
  ).length;

  return spamMatches;
}

function calculateURLscore(post: string, urlRegex: string): number {
  const regex = new RegExp(urlRegex, "gi");
  const urls = post.match(regex) || [];
  return urls.length;
}

function calculateCapitalWords(post: string): number {
  const text = post.replace(/https?:\/\/[^\s]+/g, ""); // Remove URLs
  const words = text.split(/\s+/).filter((word) => word.length > 0);

  const capitalWords = words.filter((word) => {
    const letters = word.replace(/[^a-zA-Z]/g, "");
    if (letters.length === 0) return false;

    const capsCount = word.replace(/[^A-Z]/g, "").length;
    return capsCount;
  });

  return capitalWords.length;
}

function getKeywordMatches(str: string, spamKeywordSet: string[]): number {
  const text = str.toLowerCase();
  const matches: string[] = [];

  for (const keyword of spamKeywordSet) {
    const keywordLower = keyword.toLowerCase();

    // Word boundary check to avoid partial matches
    const regex = new RegExp(`\\b${keywordLower}\\b`, "gi");
    if (regex.test(text)) {
      matches.push(keyword);
    }
  }

  return matches.length;
}

function getPostFrequency(timestamps: string[]): number {
  if (timestamps.length < 2) return timestamps.length;

  const dates = timestamps
    .map((ts) => new Date(ts))
    .sort((a, b) => a.getTime() - b.getTime());

  const timeSpanHours =
    (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60);

  return timeSpanHours > 0
    ? timestamps.length / timeSpanHours
    : timestamps.length;
}
