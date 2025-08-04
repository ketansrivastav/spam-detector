import { RulesEngine } from "../../src/services/rulesEngine";
import { CacheMock } from "../cacheMock";
import analysisData from "../mockTwttierApi.json";
import { PostAnalysisRequest } from "../../src/types";

describe("Create method", () => {
  const rulesEngine = new RulesEngine(console, new CacheMock());
  it("Should result in ALLOW", async () => {
    const expectedResult = {
      confidence: 72.72727272727273,
      action: "ALLOW",
      score: 36.338149873963616,
      reasons: ["excessive urls", "not verified", "posting too often"],
      requestId: "11111111",
    };
    const request: PostAnalysisRequest = {
      userID: "NatGeo",
      content:
        "this is a test tweet www.occamm.com www.reddit.com www.google.com",
      platform: "twitter",
      requestId: "11111111",
    };
    const result = await rulesEngine.analyzePost(request, analysisData);
    console.log(result);
    expect(result).toMatchObject(expectedResult);
  });
});
